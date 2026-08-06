import {
  AUDIT_EVENTS,
  type ActionId,
  type ActionPreviewPayload,
  type CommandHistoryEntry,
  type CommandOutcome,
  type SearchResult,
} from "@lifeos/shared";
import { prisma } from "../lib/prisma.js";
import { auditLog } from "../services/audit.js";
import { actionRequiresConfirmation, getAction } from "./action-registry.js";
import { getAIProvider } from "./ai-provider.js";
import { classifyIntent } from "./intent.js";
import { getUniversalSearch } from "./search/engine.js";
import { getCommandWalletProvider } from "./wallet-adapter.js";

function sanitizeHistoryQuery(q: string): string {
  // Never persist secrets / credentials-looking material
  return q
    .replace(/\b(password|secret|token|pin|otp|cvv|bvn)\b[:\s]*\S+/gi, "[redacted]")
    .trim()
    .slice(0, 160);
}

export async function recordCommandHistory(input: {
  userId: string;
  kind: "search" | "command" | "action";
  query: string;
  intent?: string;
  actionId?: string;
}) {
  await prisma.commandHistory.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      query: sanitizeHistoryQuery(input.query),
      intent: input.intent,
      actionId: input.actionId,
    },
  });
}

export async function listRecentCommands(userId: string, limit = 20): Promise<CommandHistoryEntry[]> {
  const rows = await prisma.commandHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as CommandHistoryEntry["kind"],
    query: r.query,
    intent: r.intent,
    actionId: r.actionId,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function clearCommandHistory(userId: string) {
  await prisma.commandHistory.deleteMany({ where: { userId } });
  return { ok: true };
}

export function buildActionPreview(
  actionId: ActionId,
  params: Record<string, unknown>,
): ActionPreviewPayload {
  const action = getAction(actionId)!;
  if (actionId === "BOOK_SERVICE") {
    return {
      actionId,
      title: "Book service",
      subtitle: String(params.service ?? params.experienceId ?? "Service"),
      lines: [
        { label: "Experience", value: String(params.experienceId ?? "—") },
        { label: "Service", value: String(params.service ?? "—") },
        { label: "When", value: String(params.when ?? "Tomorrow afternoon") },
        { label: "Price", value: String(params.amount ?? "₦35,000") },
      ],
      amount: String(params.amount ?? "₦35,000"),
      params,
      confirmLabel: "Confirm booking",
    };
  }
  if (actionId === "PAY_INVOICE") {
    return {
      actionId,
      title: "Pay invoice",
      subtitle: String(params.merchant ?? "Merchant"),
      lines: [
        { label: "Merchant", value: String(params.merchant ?? "—") },
        { label: "Amount", value: String(params.amount ?? "—") },
        { label: "Reference", value: String(params.reference ?? "—") },
      ],
      amount: params.amount != null ? String(params.amount) : undefined,
      params,
      confirmLabel: "Confirm payment",
    };
  }
  if (actionId === "CHECK_IN") {
    return {
      actionId,
      title: "Check in",
      subtitle: String(params.bookingId ?? "Booking"),
      lines: [
        { label: "Experience", value: String(params.experienceId ?? "—") },
        { label: "Booking", value: String(params.bookingId ?? "—") },
      ],
      params,
      confirmLabel: "Confirm check-in",
    };
  }
  return {
    actionId,
    title: action.name,
    subtitle: action.description,
    lines: Object.entries(params).map(([label, value]) => ({
      label,
      value: String(value),
    })),
    params,
    confirmLabel: "Confirm",
  };
}

export async function runCommand(input: {
  userId: string;
  trustId: string;
  text: string;
  source?: "text" | "voice" | "touch" | "deeplink" | "notification";
}): Promise<CommandOutcome & { intent: ReturnType<typeof classifyIntent> }> {
  const ai = getAIProvider();
  const intent = await ai.classifyIntent(input.text);
  await recordCommandHistory({
    userId: input.userId,
    kind: "command",
    query: input.text,
    intent: intent.kind,
    actionId: intent.suggestedActionId,
  });

  // Navigation / show intents
  if (
    intent.suggestedActionId &&
    ["SHOW_WALLET", "SHOW_ACTIVITY", "SHOW_BOOKINGS", "NAVIGATE"].includes(intent.kind)
  ) {
    const action = getAction(intent.suggestedActionId);
    if (action?.navigateTo && !action.requiresConfirmation) {
      return {
        type: "navigate",
        path: action.navigateTo,
        message: await ai.generateResponse({ intent }),
        intent,
      };
    }
  }

  // Consequential — preview only
  if (intent.kind === "BOOK" || intent.kind === "PAY") {
    const actionId = (intent.suggestedActionId ||
      (intent.kind === "BOOK" ? "BOOK_SERVICE" : "PAY_INVOICE")) as ActionId;
    const params: Record<string, unknown> = { ...intent.slots };
    if (intent.kind === "PAY") {
      params.merchant = intent.slots.merchant || intent.query.replace(/^pay\s+/i, "");
      params.amount = params.amount ?? 10000;
    }
    if (intent.kind === "BOOK") {
      params.service = intent.slots.service || intent.query;
      params.when = intent.slots.when || "Tomorrow afternoon";
    }
    return {
      type: "preview",
      message: await ai.generateResponse({ intent }),
      preview: buildActionPreview(actionId, params),
      intent,
    };
  }

  // Wallet query → answer + navigate suggestion
  if (intent.kind === "WALLET_QUERY" || intent.kind === "ASK") {
    if (intent.kind === "WALLET_QUERY") {
      const bal = await getCommandWalletProvider().getBalance(input.trustId);
      return {
        type: "answer",
        message: `Cash balance ${bal.fiatFormatted}. Token balance ${bal.tokenFormatted}. (Preview balances — not live bank settlement.)`,
        suggestions: [
          { id: "open_wallet", label: "Open wallet", actionId: "OPEN_WALLET" },
        ],
        intent,
      };
    }
    return {
      type: "answer",
      message: await ai.generateResponse({ intent }),
      suggestions: await ai.suggestActions({ intent }),
      intent,
    };
  }

  // Default: search + structured results
  const searchQ =
    intent.slots.topic ||
    intent.slots.service ||
    intent.query.replace(/^(find( me)?|show|open|book)\s+/i, "");
  const { results } = await getUniversalSearch().search({
    userId: input.userId,
    trustId: input.trustId,
    query: searchQ || intent.query,
  });
  await recordCommandHistory({
    userId: input.userId,
    kind: "search",
    query: searchQ || intent.query,
    intent: intent.kind,
  });

  return {
    type: "results",
    message: await ai.generateResponse({ intent, results }),
    results,
    intent,
  };
}

export async function executeConfirmedAction(input: {
  userId: string;
  trustId: string;
  actionId: ActionId;
  params: Record<string, unknown>;
  confirmed: boolean;
}): Promise<CommandOutcome> {
  const action = getAction(input.actionId);
  if (!action) {
    return { type: "answer", message: "Unknown action." };
  }
  if (action.requiresConfirmation && !input.confirmed) {
    return {
      type: "preview",
      message: "Confirmation required.",
      preview: buildActionPreview(input.actionId, input.params),
    };
  }
  if (!input.confirmed && actionRequiresConfirmation(input.actionId)) {
    return {
      type: "preview",
      message: "Confirmation required.",
      preview: buildActionPreview(input.actionId, input.params),
    };
  }

  await recordCommandHistory({
    userId: input.userId,
    kind: "action",
    query: action.name,
    actionId: input.actionId,
  });

  if (input.actionId === "PAY_INVOICE") {
    const merchant = String(input.params.merchant ?? "Merchant");
    const amount = Number(input.params.amount ?? 0);
    const result = await getCommandWalletProvider().requestPayment({
      trustId: input.trustId,
      merchant,
      amount,
      reference: input.params.reference ? String(input.params.reference) : undefined,
      confirmed: true,
    });
    const activity = await prisma.activity.create({
      data: {
        userId: input.userId,
        kind: "payment",
        title: "Payment confirmed",
        detail: `Paid ${amount} to ${merchant} via Command Layer`,
        source: "command-layer",
        amount: String(amount),
        metadata: JSON.stringify({ actionId: input.actionId, params: input.params }),
      },
    });
    await auditLog(AUDIT_EVENTS.ACTION_CONFIRMED, {
      userId: input.userId,
      detail: { actionId: input.actionId },
    });
    return {
      type: "executed",
      message: result.message,
      activityId: activity.id,
    };
  }

  if (input.actionId === "BOOK_SERVICE" || input.actionId === "CHECK_IN") {
    const title = input.actionId === "CHECK_IN" ? "Check-in confirmed" : "Booking prepared";
    const activity = await prisma.activity.create({
      data: {
        userId: input.userId,
        kind: input.actionId === "CHECK_IN" ? "hotel_booking" : "experience",
        title,
        detail: String(input.params.service ?? input.params.bookingId ?? action.name),
        source: "command-layer",
        experienceId: input.params.experienceId ? String(input.params.experienceId) : null,
        deepLink: input.params.experienceId
          ? `/app/discover?open=${input.params.experienceId}`
          : "/app/activity",
        metadata: JSON.stringify({ actionId: input.actionId, params: input.params }),
      },
    });
    await auditLog(AUDIT_EVENTS.ACTION_CONFIRMED, {
      userId: input.userId,
      detail: { actionId: input.actionId },
    });
    return {
      type: "executed",
      message:
        input.actionId === "CHECK_IN"
          ? "Check-in recorded in LifeOS. Complete any remaining steps in the experience."
          : "Booking intent recorded. Open the experience to finish with the business.",
      activityId: activity.id,
    };
  }

  if (action.navigateTo) {
    return { type: "navigate", path: action.navigateTo, message: action.name };
  }

  if (input.actionId === "OPEN_EXPERIENCE" && input.params.experienceId) {
    return {
      type: "navigate",
      path: `/app/discover?open=${encodeURIComponent(String(input.params.experienceId))}`,
      message: "Opening experience",
    };
  }

  const activity = await prisma.activity.create({
    data: {
      userId: input.userId,
      kind: "command",
      title: action.name,
      detail: "Executed via Command Layer",
      source: "command-layer",
      metadata: JSON.stringify({ actionId: input.actionId, params: input.params }),
    },
  });
  await auditLog(AUDIT_EVENTS.COMMAND_EXECUTED, {
    userId: input.userId,
    detail: { actionId: input.actionId },
  });
  return { type: "executed", message: `${action.name} completed.`, activityId: activity.id };
}

export async function resolveActionPath(
  actionId: string,
  params: Record<string, unknown> = {},
): Promise<CommandOutcome> {
  const action = getAction(actionId);
  if (!action) return { type: "answer", message: "Unknown action." };
  if (action.requiresConfirmation) {
    return {
      type: "preview",
      message: "This action needs your confirmation.",
      preview: buildActionPreview(actionId as ActionId, params),
    };
  }
  if (actionId === "OPEN_EXPERIENCE" && params.experienceId) {
    return {
      type: "navigate",
      path: `/app/discover?open=${encodeURIComponent(String(params.experienceId))}`,
      message: action.name,
    };
  }
  if (action.navigateTo) {
    let path = action.navigateTo;
    if (actionId === "DISCOVER_BUSINESSES" && params.category) {
      path = `/app/discover?category=${encodeURIComponent(String(params.category))}`;
    }
    if (actionId === "SEARCH_EXPERIENCES" && params.q) {
      path = `/app/search?q=${encodeURIComponent(String(params.q))}`;
    }
    return { type: "navigate", path, message: action.name };
  }
  return { type: "answer", message: action.description };
}

export type { SearchResult };
