import type {
  AttentionItem,
  ContinueItem,
  LifePlanItem,
  LifePlanItemStatus,
  LifePlanItemType,
  PersonalContextSignals,
  PersonalPlanGroup,
  RecommendationItem,
  SavedOfferingPublic,
  WalletContextSummary,
} from "@lifeos/shared";
import { prisma } from "../lib/prisma.js";
import { getCommandWalletProvider } from "../command/wallet-adapter.js";
import { getExperienceProvider } from "./experience.js";
import { getOfferingProvider } from "./offerings.js";
import { listSaved } from "./saved-offerings.js";

const PROVIDER_TIMEOUT_MS = 2500;

export type ProviderResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function withTimeout<T>(
  label: string,
  fn: () => Promise<T>,
  ms = PROVIDER_TIMEOUT_MS,
): Promise<ProviderResult<T>> {
  try {
    const data = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label}_timeout`)), ms),
      ),
    ]);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: `${label}: ${(err as Error).message}` };
  }
}

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d = new Date()) {
  const x = startOfDay(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function mapActionStatus(status: string, scheduledAt: Date | null): LifePlanItemStatus {
  if (status === "FAILED") return "FAILED";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "REQUIRES_AUTHORIZATION" || status === "PENDING") return "ATTENTION";
  if (status === "SUCCESS" && scheduledAt && scheduledAt < new Date()) return "COMPLETED";
  if (status === "SUCCESS") return "UPCOMING";
  return "UPCOMING";
}

function mapType(action: string, offeringType?: string | null): LifePlanItemType {
  if (offeringType === "ROOM") return "STAY";
  if (offeringType === "TICKET" || offeringType === "SHOWTIME") return "TICKET";
  if (offeringType === "CLASS") return "CLASS";
  if (offeringType === "EVENT") return "EVENT";
  if (offeringType === "MEAL") return "RESERVATION";
  if (offeringType === "TREATMENT") return "APPOINTMENT";
  if (action === "PAY") return "PAYMENT";
  if (action === "BOOK" || action === "RESERVE") return "BOOKING";
  return "OTHER";
}

function contextualAction(type: LifePlanItemType, item: {
  offeringId?: string | null;
  experienceId?: string | null;
  status: LifePlanItemStatus;
}): LifePlanItem["action"] {
  const href = item.offeringId
    ? `/app/discover?offering=${item.offeringId}`
    : item.experienceId
      ? `/app/discover?open=${item.experienceId}`
      : "/app/plans";
  if (item.status === "ATTENTION" || type === "PAYMENT") {
    return { label: "Pay", kind: "pay", href: "/app/wallet", actionId: "PAY_INVOICE" };
  }
  if (type === "STAY" || type === "CLASS") {
    return { label: "Check In", kind: "check_in", href, actionId: "CHECK_IN" };
  }
  if (type === "TICKET" || type === "EVENT") {
    return { label: "View Ticket", kind: "ticket", href, actionId: "VIEW_TICKETS" };
  }
  if (type === "APPOINTMENT" || type === "RESERVATION" || type === "BOOKING") {
    return { label: "View", kind: "view", href, actionId: "VIEW_BOOKINGS" };
  }
  return { label: "Open", kind: "open", href };
}

export async function ActivityProvider(userId: string): Promise<LifePlanItem[]> {
  const rows = await prisma.activity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return rows.map((a) => ({
    id: `act_${a.id}`,
    type: /ticket|cinema/i.test(a.title) ? "TICKET" : /hotel|stay|room/i.test(a.title) ? "STAY" : "OTHER",
    title: a.title,
    subtitle: a.detail,
    source: "activity",
    sourceId: a.id,
    experienceId: a.experienceId,
    startAt: a.createdAt.toISOString(),
    status: "COMPLETED" as const,
    amountFormatted: a.amount ?? null,
    action: {
      label: "Open",
      kind: "open" as const,
      href: a.deepLink || "/app/activity",
    },
    metadata: { kind: a.kind },
  }));
}

export async function BookingProvider(userId: string): Promise<LifePlanItem[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      userId,
      status: { in: ["held", "confirmed"] },
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  if (bookings.length) {
    const items: LifePlanItem[] = [];
    for (const b of bookings) {
      const offering = await getOfferingProvider().getById(b.offeringId);
      const type = mapType("BOOK", offering?.type);
      const status: LifePlanItemStatus =
        b.status === "held"
          ? "ATTENTION"
          : b.scheduledAt && b.scheduledAt < new Date()
            ? "COMPLETED"
            : "UPCOMING";
      const base = {
        offeringId: b.offeringId,
        experienceId: b.experienceId,
        status,
      };
      items.push({
        id: b.id,
        type,
        title: b.title,
        subtitle: offering?.businessName ?? null,
        source: "booking-ledger",
        sourceId: b.id,
        experienceId: b.experienceId,
        offeringId: b.offeringId,
        businessId: b.businessId,
        startAt: b.scheduledAt?.toISOString() ?? b.createdAt.toISOString(),
        status,
        location: offering?.location ?? null,
        image: offering?.image ?? null,
        action: contextualAction(type, base),
        amountFormatted: offering?.priceFormatted ?? null,
        metadata: {
          bookingId: b.id,
          externalReference: b.externalReference,
          bookingStatus: b.status,
          paymentId: b.paymentId ? "[ref]" : undefined,
        },
      });
    }
    return items;
  }

  // Fallback for legacy ActionRecords before ledger migration
  const records = await prisma.actionRecord.findMany({
    where: { userId },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    take: 50,
  });
  const items: LifePlanItem[] = [];
  for (const r of records) {
    const offering = r.offeringId ? await getOfferingProvider().getById(r.offeringId) : null;
    const type = mapType(r.action, offering?.type);
    const status = mapActionStatus(r.status, r.scheduledAt);
    const base = {
      offeringId: r.offeringId,
      experienceId: r.experienceId,
      status,
    };
    items.push({
      id: r.id,
      type,
      title: offering?.name ?? r.message.split("·")[0]?.trim() ?? r.action,
      subtitle: offering?.businessName ?? null,
      source: "action-record",
      sourceId: r.id,
      experienceId: r.experienceId,
      offeringId: r.offeringId,
      businessId: r.businessId ?? offering?.businessId ?? null,
      startAt: r.scheduledAt?.toISOString() ?? r.createdAt.toISOString(),
      status,
      location: offering?.location ?? null,
      image: offering?.image ?? null,
      action: contextualAction(type, base),
      amountFormatted: offering?.priceFormatted ?? null,
      metadata: {
        action: r.action,
        bookingId: r.bookingId,
        externalReference: r.externalReference,
        paymentId: r.paymentId ? "[ref]" : undefined,
      },
    });
  }
  return items;
}

export async function NotificationProvider(userId: string): Promise<AttentionItem[]> {
  const notes = await prisma.notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return notes.map((n) => {
    let severity: AttentionItem["severity"] = "info";
    if (/fail|error|unpaid|attention/i.test(`${n.title} ${n.body}`)) severity = "critical";
    else if (/check.?in|tomorrow|available|changed/i.test(`${n.title} ${n.body}`)) severity = "warning";
    return {
      id: n.id,
      title: n.title,
      detail: n.body,
      severity,
      href: n.actionId ? `/app/notifications` : "/app/notifications",
      source: "notification" as const,
      createdAt: n.createdAt.toISOString(),
    };
  });
}

export async function WalletProvider(
  trustId: string,
  userId: string,
): Promise<WalletContextSummary> {
  try {
    const bal = await getCommandWalletProvider().getBalance(trustId);
    const failed = await prisma.actionRecord.findMany({
      where: { userId, action: "PAY", status: { in: ["FAILED", "PENDING"] } },
      take: 5,
      orderBy: { createdAt: "desc" },
    });
    const recent = await prisma.actionRecord.findMany({
      where: { userId, action: { in: ["PAY", "BUY", "BOOK", "PURCHASE_TICKET"] }, status: "SUCCESS" },
      take: 5,
      orderBy: { createdAt: "desc" },
    });
    return {
      fiatFormatted: bal.fiatFormatted,
      tokenFormatted: bal.tokenFormatted,
      available: true,
      recentPayments: recent.map((r) => ({
        id: r.id,
        title: r.message.split("·")[0]?.trim() || "Payment",
        amountFormatted: "—",
        href: r.receiptId ? `/app/wallet?receipt=${r.receiptId}` : "/app/wallet",
      })),
      upcomingPayments: failed.map((r) => ({
        id: r.id,
        title: r.message.split("·")[0]?.trim() || "Payment due",
        amountFormatted: "—",
        href: "/app/wallet",
      })),
    };
  } catch {
    return {
      available: false,
      recentPayments: [],
      upcomingPayments: [],
    };
  }
}

export async function ExperienceProvider(userId: string): Promise<string[]> {
  const connections = await getExperienceProvider().listConnections(userId);
  return connections.filter((c) => c.status === "connected").map((c) => c.experienceId);
}

export async function SavedOfferingProvider(userId: string): Promise<SavedOfferingPublic[]> {
  return listSaved(userId);
}

export async function PlanGroupProvider(userId: string): Promise<PersonalPlanGroup[]> {
  const rows = await prisma.personalPlan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map((r) => {
    let items: LifePlanItem[] = [];
    try {
      items = JSON.parse(r.itemsJson) as LifePlanItem[];
    } catch {
      items = [];
    }
    return {
      id: r.id,
      title: r.title,
      status: r.status as PersonalPlanGroup["status"],
      itemIds: items.map((i) => i.id),
      items,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

export function buildSignals(input: {
  bookings: LifePlanItem[];
  saved: SavedOfferingPublic[];
  searches: string[];
  experienceIds: string[];
  now?: Date;
}): PersonalContextSignals {
  const now = input.now ?? new Date();
  const h = now.getHours();
  const timeOfDay =
    h < 11 ? "morning" : h < 17 ? "afternoon" : h < 22 ? "evening" : "night";

  const cats = new Map<string, number>();
  const biz = new Map<string, number>();
  for (const b of input.bookings) {
    if (b.businessId) biz.set(b.businessId, (biz.get(b.businessId) ?? 0) + 1);
    const catGuess =
      b.type === "APPOINTMENT"
        ? "Wellness"
        : b.type === "CLASS"
          ? "Fitness"
          : b.type === "STAY"
            ? "Hotels"
            : b.type === "TICKET"
              ? "Entertainment"
              : b.type === "RESERVATION"
                ? "Eat"
                : null;
    if (catGuess) cats.set(catGuess, (cats.get(catGuess) ?? 0) + 1);
  }
  for (const s of input.saved) {
    cats.set(s.category, (cats.get(s.category) ?? 0) + 2);
  }

  return {
    preferredCategories: [...cats.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c]) => c),
    preferredBusinessIds: [...biz.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id),
    recentSearchTerms: input.searches.slice(0, 8),
    favoriteExperienceIds: input.experienceIds.slice(0, 8),
    timeOfDay,
  };
}

export function partitionPlanItems(items: LifePlanItem[], now = new Date()) {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrowEnd = endOfDay(addDays(now, 1));
  const weekEnd = endOfDay(addDays(now, 7));

  const active = items.filter((i) => !["CANCELLED", "EXPIRED"].includes(i.status));
  const today = active.filter((i) => {
    if (!i.startAt) return false;
    const t = new Date(i.startAt);
    return t >= todayStart && t <= todayEnd && i.status !== "COMPLETED";
  });
  const tomorrow = active.filter((i) => {
    if (!i.startAt) return false;
    const t = new Date(i.startAt);
    return t > todayEnd && t <= tomorrowEnd;
  });
  const thisWeek = active.filter((i) => {
    if (!i.startAt) return false;
    const t = new Date(i.startAt);
    return t > tomorrowEnd && t <= weekEnd;
  });
  const upcoming = active.filter((i) => {
    if (i.status === "COMPLETED" || i.status === "FAILED") return false;
    if (!i.startAt) return i.status === "UPCOMING" || i.status === "ATTENTION" || i.status === "IN_PROGRESS";
    const t = new Date(i.startAt);
    return t > todayEnd;
  });
  const completed = items.filter((i) => i.status === "COMPLETED").slice(0, 20);

  return { today, tomorrow, thisWeek, upcoming, completed };
}

export function buildContinueItems(records: Array<{
  id: string;
  action: string;
  status: string;
  offeringId: string | null;
  experienceId: string | null;
  message: string;
  metadata: string;
}>): ContinueItem[] {
  return records
    .filter((r) => ["PENDING", "REQUIRES_AUTHORIZATION"].includes(r.status))
    .map((r) => {
      let meta: Record<string, unknown> = {};
      try {
        meta = JSON.parse(r.metadata) as Record<string, unknown>;
      } catch {
        meta = {};
      }
      // Strip sensitive payment fields if present
      delete meta.cardNumber;
      delete meta.cvv;
      delete meta.token;
      delete meta.authorizationToken;
      return {
        id: r.id,
        title: `Continue ${r.action.toLowerCase()}`,
        subtitle: r.message.split("·")[0]?.trim() || null,
        experienceId: r.experienceId,
        offeringId: r.offeringId,
        href: r.offeringId
          ? `/app/discover?offering=${r.offeringId}`
          : r.experienceId
            ? `/app/discover?open=${r.experienceId}`
            : "/app/plans",
        stage: r.status,
      };
    });
}

export function buildTimeline(
  today: LifePlanItem[],
  upcoming: LifePlanItem[],
  completed: LifePlanItem[],
  now = new Date(),
) {
  const yesterdayStart = startOfDay(addDays(now, -1));
  const yesterdayEnd = endOfDay(addDays(now, -1));
  const entries: Array<{
    id: string;
    bucket: "today" | "yesterday" | "this_week" | "upcoming" | "earlier";
    label: string;
    item: LifePlanItem;
  }> = [];

  for (const item of today) {
    entries.push({
      id: `tl_${item.id}`,
      bucket: "today",
      label: "Today",
      item,
    });
  }
  for (const item of completed) {
    if (!item.startAt) continue;
    const t = new Date(item.startAt);
    if (t >= yesterdayStart && t <= yesterdayEnd) {
      entries.push({ id: `tl_${item.id}`, bucket: "yesterday", label: "Yesterday", item });
    } else if (t < yesterdayStart) {
      entries.push({ id: `tl_${item.id}`, bucket: "earlier", label: "Earlier", item });
    }
  }
  for (const item of upcoming) {
    if (today.find((t) => t.id === item.id)) continue;
    entries.push({
      id: `tl_${item.id}`,
      bucket: "upcoming",
      label: item.startAt
        ? new Date(item.startAt).toLocaleDateString(undefined, { weekday: "long" })
        : "Upcoming",
      item,
    });
  }
  return entries.slice(0, 40);
}

export { withTimeout };
export type { RecommendationItem };
