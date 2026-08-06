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
import { personalContextService } from "../services/personal-context.js";
import { recommendationProvider } from "../services/recommendations.js";
import { getOfferingProvider } from "../services/offerings.js";
import { commandSessionService } from "./command-session.js";
import { planQuery } from "./query-planner.js";
import { compareResults, filterByIntent, rankSearchResults } from "./search-ranking.js";
import { locationPermissionService } from "./location.js";
import type { CommandIntent } from "@lifeos/shared";

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
      title: "Book offering",
      subtitle: String(params.service ?? params.offeringName ?? "Service"),
      lines: [
        { label: "Offering", value: String(params.service ?? params.offeringName ?? "—") },
        { label: "Provider", value: String(params.businessName ?? params.experienceId ?? "—") },
        { label: "When", value: String(params.when ?? "Tomorrow afternoon") },
        { label: "Price", value: String(params.amount ?? "—") },
      ],
      amount: params.amount != null ? String(params.amount) : undefined,
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
  sessionId?: string;
  /** ask = bias search · tell = bias task automation */
  mode?: "ask" | "tell";
}): Promise<
  CommandOutcome & {
    intent: ReturnType<typeof classifyIntent>;
    commandIntent?: CommandIntent;
    sessionId?: string;
  }
> {
  const ai = getAIProvider();
  const priorSession =
    (input.sessionId ? commandSessionService.get(input.sessionId, input.userId) : null) ??
    commandSessionService.latestForUser(input.userId);
  const plan = planQuery(input.text, {
    inputType: input.source === "voice" ? "VOICE" : "TEXT",
    prior: priorSession?.intent ?? null,
  });
  let commandIntent = plan.intent;
  const intent = await ai.classifyIntent(input.text);

  // Mode bias: Ask prefers discovery/search; Tell prefers book/pay/plan automation
  if (input.mode === "ask") {
    const searchTypes = new Set(["SEARCH", "DISCOVER", "COMPARE", "RECOMMEND", "PERSONAL_CONTEXT"]);
    if (!searchTypes.has(commandIntent.type) && !/\b(book|pay|reserve|buy|cancel)\b/i.test(input.text)) {
      commandIntent = { ...commandIntent, type: "SEARCH" };
    }
  } else if (input.mode === "tell") {
    if (commandIntent.type === "SEARCH" || commandIntent.type === "DISCOVER" || commandIntent.type === "UNKNOWN") {
      if (/\bpay\b/i.test(input.text)) commandIntent = { ...commandIntent, type: "PAY" };
      else if (/\bbuy\b|\bticket/i.test(input.text)) commandIntent = { ...commandIntent, type: "BUY" };
      else if (/\breserve\b/i.test(input.text)) commandIntent = { ...commandIntent, type: "RESERVE" };
      else if (/\bbook\b|\bcheck.?in\b/i.test(input.text)) commandIntent = { ...commandIntent, type: "BOOK" };
    }
  }

  await recordCommandHistory({
    userId: input.userId,
    kind: input.mode === "ask" ? "search" : "command",
    query: input.text,
    intent: commandIntent.type,
    actionId: intent.suggestedActionId,
  });

  // Ambiguity — ask before consequential assumptions
  if (commandIntent.needsClarification && commandIntent.clarificationPrompt) {
    const session = commandSessionService.create(input.userId, commandIntent, []);
    return {
      type: "answer",
      message: commandIntent.clarificationPrompt,
      suggestions: [
        { id: "spa", label: "Spa / massage", query: "book a massage" },
        { id: "dinner", label: "Dinner", query: "book dinner tonight" },
        { id: "hotel", label: "Hotel", query: "find a hotel" },
      ],
      clarify: true,
      intent,
      commandIntent,
      sessionId: session.sessionId,
    };
  }

  // Follow-up: book it / that one → preview from selected or top result
  if (priorSession && /^(book it|book that|that one|confirm)\b/i.test(input.text.trim())) {
    const selected =
      priorSession.results.find((r) => r.id === priorSession.selectedResultId) ??
      priorSession.results.find((r) => r.type === "OFFERING") ??
      priorSession.results[0];
    if (selected) {
      const offeringId = selected.metadata?.offeringId
        ? String(selected.metadata.offeringId)
        : undefined;
      const params = {
        ...(selected.actions[0]?.params ?? {}),
        offeringId,
        service: selected.title,
        businessName: selected.subtitle,
        amount: selected.metadata?.price != null ? selected.metadata.price : selected.description,
        when: [commandIntent.date, commandIntent.time ?? commandIntent.timeAfter]
          .filter(Boolean)
          .join(" · ") || "As selected",
      };
      const session = commandSessionService.update(priorSession.sessionId, input.userId, {
        selectedResultId: selected.id,
        pendingActionId: "BOOK_SERVICE",
      });
      return {
        type: "preview",
        message: "Confirm before anything is booked or charged.",
        preview: buildActionPreview("BOOK_SERVICE", params),
        intent,
        commandIntent,
        sessionId: session?.sessionId ?? priorSession.sessionId,
      };
    }
  }

  // Follow-up compare / filter on session results
  if (priorSession && (plan.followUp || plan.compareMode) && priorSession.results.length > 0) {
    let results = [...priorSession.results];
    const mergedIntent = commandIntent;
    results = filterByIntent(results, mergedIntent);
    results = rankSearchResults(results, mergedIntent, { query: input.text });

    if (plan.compareMode || /\bcheapest|closest|compare|which is\b/i.test(input.text)) {
      const metric = /\bclosest\b/i.test(input.text)
        ? "distance"
        : /\bcancellation\b/i.test(input.text)
          ? "cancellation"
          : /\bearliest|availability\b/i.test(input.text)
            ? "availability"
            : "price";
      const cmp = compareResults(results, metric);
      const session = commandSessionService.update(priorSession.sessionId, input.userId, {
        intent: mergedIntent,
        results: cmp.results.length ? cmp.results : results,
        reason: cmp.summary,
        selectedResultId: cmp.winnerId ?? null,
      });
      return {
        type: "compare",
        message: cmp.summary,
        results: (cmp.results.length ? cmp.results : results).slice(0, 6),
        intent,
        commandIntent: mergedIntent,
        sessionId: session?.sessionId ?? priorSession.sessionId,
      };
    }

    const session = commandSessionService.update(priorSession.sessionId, input.userId, {
      intent: mergedIntent,
      results,
      reason: `${results.length} option${results.length === 1 ? "" : "s"} remain.`,
    });
    return {
      type: "results",
      message: `${results.length} option${results.length === 1 ? "" : "s"} remain.`,
      results: results.slice(0, 8),
      intent,
      commandIntent: mergedIntent,
      sessionId: session?.sessionId ?? priorSession.sessionId,
      canCompare: results.length > 1,
    };
  }

  // Navigation / show intents
  if (
    intent.suggestedActionId &&
    ["SHOW_WALLET", "SHOW_ACTIVITY", "SHOW_BOOKINGS", "NAVIGATE"].includes(intent.kind)
  ) {
    const action = getAction(intent.suggestedActionId);
    if (action?.navigateTo && !action.requiresConfirmation) {
      // Enrich SHOW_BOOKINGS with personal context answer
      if (intent.kind === "SHOW_BOOKINGS") {
        try {
          const snap = await personalContextService.getSnapshot(input.userId, input.trustId);
          const safe = personalContextService.toAiSafe(snap);
          return {
            type: "navigate",
            path: action.navigateTo!,
            message: `Today: ${safe.todaySummary}`,
            intent,
            commandIntent,
          };
        } catch {
          /* fall through to navigate */
        }
      }
      return {
        type: "navigate",
        path: action.navigateTo,
        message: await ai.generateResponse({ intent }),
        intent,
        commandIntent,
      };
    }
  }

  // Safe navigation phrases
  if (commandIntent.type === "NAVIGATE" || /^(open|take me to|show)\s+(wallet|plans|saved|tickets|notifications)\b/i.test(input.text)) {
    const path = resolveSafeNav(input.text);
    if (path) {
      return { type: "navigate", path, message: "Opening…", intent, commandIntent };
    }
  }

  // Personal context Q&A — structured, user-scoped, no unrestricted DB
  if (intent.kind === "PERSONAL_CONTEXT" || commandIntent.type === "PERSONAL_CONTEXT") {
    const snap = await personalContextService.getSnapshot(input.userId, input.trustId);
    const safe = personalContextService.toAiSafe(snap);
    const q = intent.query.toLowerCase();

    if (
      /nothing planned/.test(q) ||
      (/what can i do/.test(q) && /(saturday|weekend|today|tonight)/.test(q)) ||
      commandIntent.type === "RECOMMEND"
    ) {
      const recs = await recommendationProvider.recommend({
        signals: snap.signals,
        limit: 4,
      });
      const results: SearchResult[] = [];
      for (const r of recs) {
        const o = await getOfferingProvider().getById(r.offeringId);
        if (!o) continue;
        results.push({
          id: `ctx_rec_${o.id}`,
          type: "OFFERING",
          title: o.name,
          subtitle: o.businessName,
          description: r.reason,
          metadata: { offeringId: o.id, price: o.price, category: o.category, availability: o.availability },
          actions: [
            {
              id: `book_${o.id}`,
              label: "Select",
              actionId: "BOOK_SERVICE",
              params: {
                offeringId: o.id,
                experienceId: o.experienceId,
                service: o.name,
                businessName: o.businessName,
                amount: o.priceFormatted,
              },
              requiresConfirmation: true,
            },
          ],
          source: "personal-context",
          score: r.score,
        });
      }
      const session = commandSessionService.create(input.userId, commandIntent, results);
      return {
        type: "results",
        message:
          "Here are a few options based on your interests and availability. Select one and I’ll prepare the action.",
        results,
        intent,
        commandIntent,
        sessionId: session.sessionId,
        reason: results[0]?.description,
        canCompare: results.length > 1,
      };
    }

    if (/attention|waiting/i.test(q)) {
      const attn = snap.attention.slice(0, 5);
      return {
        type: "answer",
        message:
          attn.length > 0
            ? attn.map((a) => a.title).join("; ")
            : "Nothing needs your attention right now.",
        suggestions: [{ id: "plans", label: "Open Today", actionId: "VIEW_BOOKINGS" }],
        intent,
        commandIntent,
      };
    }

    let message = safe.todaySummary;
    if (/weekend|coming up/.test(q)) message = `Coming up: ${safe.upcomingSummary}`;
    else if (/booked recently|did i book/.test(q)) message = `Recent: ${safe.recentBookingsSummary}`;
    else if (/saved/.test(q)) message = safe.savedSpasSummary;
    else if (/tonight|where am i going/.test(q)) message = `Tonight: ${safe.tonightSummary}`;
    else if (/pay|payment|spent/.test(q)) message = safe.paymentAttentionSummary;
    else if (/yesterday/.test(q)) message = `Yesterday: ${safe.yesterdaySummary}`;
    else if (/today|doing|happening/.test(q)) message = `Today: ${safe.todaySummary}`;
    else if (/hotel|ticket|appointment|plan/.test(q)) {
      const filtered = safe.items.filter((i) => {
        if (/hotel/.test(q)) return i.type === "STAY";
        if (/ticket/.test(q)) return i.type === "TICKET" || i.type === "EVENT";
        if (/appointment/.test(q)) return i.type === "APPOINTMENT";
        return true;
      });
      message =
        filtered.length > 0
          ? filtered.map((i) => i.title).join("; ")
          : "Nothing matching in your personal context.";
    }

    return {
      type: "answer",
      message,
      suggestions: [
        { id: "open_today", label: "Open Today", actionId: "VIEW_BOOKINGS" },
        { id: "discover", label: "Discover", actionId: "DISCOVER_BUSINESSES" },
      ],
      intent,
      commandIntent,
    };
  }

  // Recommendations (non-personal)
  if (commandIntent.type === "RECOMMEND") {
    const snap = await personalContextService.getSnapshot(input.userId, input.trustId);
    const recs = await recommendationProvider.recommend({ signals: snap.signals, limit: 4 });
    const results: SearchResult[] = [];
    for (const r of recs) {
      const o = await getOfferingProvider().getById(r.offeringId);
      if (!o) continue;
      results.push({
        id: `rec_${o.id}`,
        type: "OFFERING",
        title: o.name,
        subtitle: o.businessName,
        description: r.reason,
        metadata: { offeringId: o.id, price: o.price, category: o.category },
        actions: [
          {
            id: `sel_${o.id}`,
            label: "Select",
            actionId: "BOOK_SERVICE",
            params: {
              offeringId: o.id,
              experienceId: o.experienceId,
              service: o.name,
              amount: o.priceFormatted,
            },
            requiresConfirmation: true,
          },
        ],
        source: "recommendations",
        score: r.score,
      });
    }
    const near = locationPermissionService.nearMeLabel(input.userId);
    const session = commandSessionService.create(input.userId, commandIntent, results);
    return {
      type: "results",
      message: near
        ? `Suggestions near ${near} — ${results.length} options.`
        : `I found ${results.length} suggestion${results.length === 1 ? "" : "s"}.`,
      results,
      intent,
      commandIntent,
      sessionId: session.sessionId,
      canCompare: true,
    };
  }

  // Consequential — preview only; enrich BOOK with offering search
  if (intent.kind === "BOOK" || intent.kind === "PAY" || commandIntent.type === "BOOK" || commandIntent.type === "RESERVE" || commandIntent.type === "BUY") {
    const actionId = (intent.suggestedActionId ||
      (intent.kind === "PAY" ? "PAY_INVOICE" : "BOOK_SERVICE")) as ActionId;
    const params: Record<string, unknown> = { ...intent.slots };
    if (intent.kind === "PAY" || commandIntent.type === "PAY") {
      params.merchant = intent.slots.merchant || intent.query.replace(/^pay\s+/i, "");
      params.amount = params.amount ?? 10000;
    }
    if (intent.kind === "BOOK" || commandIntent.type === "BOOK" || commandIntent.type === "RESERVE") {
      params.service = intent.slots.service || commandIntent.offeringType || intent.query;
      params.when =
        [commandIntent.date, commandIntent.time ?? commandIntent.timeAfter].filter(Boolean).join(" · ") ||
        intent.slots.when ||
        "Tomorrow afternoon";
      try {
        const search = await getUniversalSearch().search({
          userId: input.userId,
          trustId: input.trustId,
          query: plan.searchQuery || String(params.service),
          intent: commandIntent,
          limit: 6,
        });
        if (search.providerErrors.length && search.results.length === 0) {
          return {
            type: "answer",
            message: "I can’t check availability right now.",
            suggestions: [
              { id: "retry", label: "Retry", query: input.text },
              { id: "saved", label: "Browse saved", query: "what did I save?" },
              { id: "other", label: "Another category", query: "find restaurants tonight" },
            ],
            intent,
            commandIntent,
          };
        }
        if (search.results.length > 1 && !/\bbook the\b|\bbook it\b/i.test(input.text)) {
          const session = commandSessionService.create(input.userId, commandIntent, search.results);
          const reasonParts = [
            commandIntent.date ? `for ${commandIntent.date}` : null,
            commandIntent.maxPrice != null ? `under ₦${commandIntent.maxPrice.toLocaleString()}` : null,
            commandIntent.timeAfter ? `after ${commandIntent.timeAfter}` : null,
          ].filter(Boolean);
          return {
            type: "results",
            message: `I found ${search.results.length} option${search.results.length === 1 ? "" : "s"}${reasonParts.length ? ` ${reasonParts.join(", ")}` : ""}.`,
            results: search.results,
            intent,
            commandIntent,
            sessionId: session.sessionId,
            canCompare: true,
            reason: reasonParts.join(" · ") || undefined,
          };
        }
        const top = search.results[0];
        if (top?.metadata?.offeringId) {
          params.offeringId = top.metadata.offeringId;
          params.experienceId = top.metadata.experienceId;
          params.businessName = top.subtitle;
          params.service = top.title;
          params.amount =
            top.metadata.price != null
              ? `₦${Number(top.metadata.price).toLocaleString()}`
              : top.description;
        } else {
          const matches = await getOfferingProvider().search(String(params.service));
          if (matches[0]) {
            params.offeringId = matches[0].id;
            params.experienceId = matches[0].experienceId;
            params.businessName = matches[0].businessName;
            params.service = matches[0].name;
            params.amount = matches[0].priceFormatted;
          }
        }
      } catch {
        /* offering enrichment optional */
      }
    }
    const session = commandSessionService.create(input.userId, commandIntent, []);
    return {
      type: "preview",
      message: await ai.generateResponse({ intent }),
      preview: buildActionPreview(actionId, params),
      intent,
      commandIntent,
      sessionId: session.sessionId,
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
        commandIntent,
      };
    }
    return {
      type: "answer",
      message: await ai.generateResponse({ intent }),
      suggestions: await ai.suggestActions({ intent }),
      intent,
      commandIntent,
    };
  }

  // Default: search + structured results
  const searchQ = plan.searchQuery || intent.slots.topic || intent.slots.service || intent.query;
  const { results, providerErrors } = await getUniversalSearch().search({
    userId: input.userId,
    trustId: input.trustId,
    query: searchQ || intent.query,
    intent: commandIntent,
  });
  await recordCommandHistory({
    userId: input.userId,
    kind: "search",
    query: searchQ || intent.query,
    intent: commandIntent.type,
  });

  if (providerErrors.length && results.length === 0) {
    return {
      type: "answer",
      message: "I can’t reach some search sources right now.",
      suggestions: [
        { id: "retry", label: "Retry", query: input.text },
        { id: "saved", label: "Browse saved", query: "saved" },
      ],
      intent,
      commandIntent,
    };
  }

  const session = commandSessionService.create(input.userId, commandIntent, results);
  return {
    type: "results",
    message:
      results.length > 0
        ? `I found ${results.length} option${results.length === 1 ? "" : "s"}.`
        : await ai.generateResponse({ intent, results }),
    results,
    intent,
    commandIntent,
    sessionId: session.sessionId,
    canCompare: results.filter((r) => r.type === "OFFERING").length > 1,
  };
}

function resolveSafeNav(text: string): string | null {
  const t = text.toLowerCase();
  if (/wallet/.test(t)) return "/app/wallet";
  if (/plans|today/.test(t)) return "/app/plans";
  if (/saved/.test(t)) return "/app/saved";
  if (/tickets/.test(t)) return "/app/activity?filter=tickets";
  if (/notifications/.test(t)) return "/app/notifications";
  if (/discover|explore/.test(t)) return "/app/discover";
  if (/profile/.test(t)) return "/app/profile";
  return null;
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
    const offeringId = input.params.offeringId ? String(input.params.offeringId) : null;
    const experienceId = input.params.experienceId ? String(input.params.experienceId) : null;
    const activity = await prisma.activity.create({
      data: {
        userId: input.userId,
        kind: input.actionId === "CHECK_IN" ? "hotel_booking" : "experience",
        title,
        detail: String(input.params.service ?? input.params.bookingId ?? action.name),
        source: "command-layer",
        experienceId,
        deepLink: offeringId
          ? `/app/discover?offering=${offeringId}`
          : experienceId
            ? `/app/discover?open=${experienceId}`
            : "/app/activity",
        metadata: JSON.stringify({ actionId: input.actionId, params: input.params }),
      },
    });
    await auditLog(AUDIT_EVENTS.ACTION_CONFIRMED, {
      userId: input.userId,
      detail: { actionId: input.actionId, offeringId },
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

  if (input.actionId === "OPEN_EXPERIENCE") {
    if (input.params.offeringId) {
      return {
        type: "navigate",
        path: `/app/discover?offering=${encodeURIComponent(String(input.params.offeringId))}`,
        message: "Opening offering",
      };
    }
    if (input.params.businessId) {
      return {
        type: "navigate",
        path: `/app/discover?business=${encodeURIComponent(String(input.params.businessId))}`,
        message: "Opening business",
      };
    }
    if (input.params.experienceId) {
      return {
        type: "navigate",
        path: `/app/discover?open=${encodeURIComponent(String(input.params.experienceId))}`,
        message: "Opening experience",
      };
    }
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
  if (actionId === "OPEN_EXPERIENCE" && params.offeringId) {
    return {
      type: "navigate",
      path: `/app/discover?offering=${encodeURIComponent(String(params.offeringId))}`,
      message: action.name,
    };
  }
  if (actionId === "OPEN_EXPERIENCE" && params.businessId) {
    return {
      type: "navigate",
      path: `/app/discover?business=${encodeURIComponent(String(params.businessId))}`,
      message: action.name,
    };
  }
  if (actionId === "OPEN_EXPERIENCE" && params.offeringId) {
    return {
      type: "navigate",
      path: `/app/discover?offering=${encodeURIComponent(String(params.offeringId))}`,
      message: action.name,
    };
  }
  if (actionId === "OPEN_EXPERIENCE" && params.businessId) {
    return {
      type: "navigate",
      path: `/app/discover?business=${encodeURIComponent(String(params.businessId))}`,
      message: action.name,
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
