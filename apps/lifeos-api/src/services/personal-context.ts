import type {
  AiSafePersonalContext,
  PersonalContextSnapshot,
  PersonalPlanGroup,
  LifePlanItem,
} from "@lifeos/shared";
import { prisma } from "../lib/prisma.js";
import { recommendationProvider } from "./recommendations.js";
import {
  ActivityProvider,
  BookingProvider,
  ExperienceProvider,
  NotificationProvider,
  PlanGroupProvider,
  SavedOfferingProvider,
  WalletProvider,
  buildContinueItems,
  buildSignals,
  buildTimeline,
  partitionPlanItems,
  withTimeout,
} from "./personal-context-providers.js";

type CacheEntry = { at: number; snapshot: PersonalContextSnapshot };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15_000;

/**
 * PersonalContextService — aggregates authorized personal read models.
 * Never copies full external booking/payment ledgers.
 * Providers fail independently; partial results are OK.
 */
export class PersonalContextService {
  async getSnapshot(userId: string, trustId: string, opts?: { bypassCache?: boolean }): Promise<PersonalContextSnapshot> {
    if (!opts?.bypassCache) {
      const hit = cache.get(userId);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        return { ...hit.snapshot, stale: true };
      }
    }

    const providerErrors: string[] = [];

    const [
      bookingsRes,
      activityRes,
      notificationsRes,
      walletRes,
      experiencesRes,
      savedRes,
      groupsRes,
      searchesRes,
      pendingRes,
    ] = await Promise.all([
      withTimeout("BookingProvider", () => BookingProvider(userId)),
      withTimeout("ActivityProvider", () => ActivityProvider(userId)),
      withTimeout("NotificationProvider", () => NotificationProvider(userId)),
      withTimeout("WalletProvider", () => WalletProvider(trustId, userId)),
      withTimeout("ExperienceProvider", () => ExperienceProvider(userId)),
      withTimeout("SavedOfferingProvider", () => SavedOfferingProvider(userId)),
      withTimeout("PlanGroupProvider", () => PlanGroupProvider(userId)),
      withTimeout("SearchHistory", async () => {
        const rows = await prisma.commandHistory.findMany({
          where: { userId, kind: "search" },
          orderBy: { createdAt: "desc" },
          take: 12,
        });
        return rows.map((r) => r.query);
      }),
      withTimeout("ContinueProvider", async () =>
        prisma.actionRecord.findMany({
          where: { userId, status: { in: ["PENDING", "REQUIRES_AUTHORIZATION"] } },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
      ),
    ]);

    const bookings = bookingsRes.ok ? bookingsRes.data : [];
    if (!bookingsRes.ok) providerErrors.push(bookingsRes.error);
    const activities = activityRes.ok ? activityRes.data : [];
    if (!activityRes.ok) providerErrors.push(activityRes.error);
    const attention = notificationsRes.ok ? notificationsRes.data : [];
    if (!notificationsRes.ok) providerErrors.push(notificationsRes.error);
    const wallet = walletRes.ok ? walletRes.data : null;
    if (!walletRes.ok) providerErrors.push(walletRes.error);
    const experienceIds = experiencesRes.ok ? experiencesRes.data : [];
    if (!experiencesRes.ok) providerErrors.push(experiencesRes.error);
    const saved = savedRes.ok ? savedRes.data : [];
    if (!savedRes.ok) providerErrors.push(savedRes.error);
    const planGroups = groupsRes.ok ? groupsRes.data : [];
    if (!groupsRes.ok) providerErrors.push(groupsRes.error);
    const searches = searchesRes.ok ? searchesRes.data : [];
    if (!searchesRes.ok) providerErrors.push(searchesRes.error);
    const pending = pendingRes.ok ? pendingRes.data : [];
    if (!pendingRes.ok) providerErrors.push(pendingRes.error);

    // Merge booking + recent activity (dedupe by sourceId where possible)
    const byId = new Map<string, LifePlanItem>();
    for (const b of bookings) byId.set(b.id, b);
    for (const a of activities) {
      if (!byId.has(a.id)) byId.set(a.id, a);
    }
    const all = [...byId.values()];
    const parts = partitionPlanItems(all);
    const continueItems = buildContinueItems(pending);
    const signals = buildSignals({
      bookings,
      saved,
      searches,
      experienceIds,
    });

    let recommendations: Awaited<ReturnType<typeof recommendationProvider.recommend>> = [];
    const recRes = await withTimeout("RecommendationProvider", () =>
      recommendationProvider.recommend({
        signals,
        excludeOfferingIds: bookings.map((b) => b.offeringId).filter(Boolean) as string[],
        limit: 6,
      }),
    );
    if (recRes.ok) recommendations = recRes.data;
    else providerErrors.push(recRes.error);

    // Attention from failed actions
    for (const b of bookings.filter((x) => x.status === "FAILED" || x.status === "ATTENTION")) {
      attention.push({
        id: `att_${b.id}`,
        title: b.status === "FAILED" ? "Action needs attention" : "Confirmation required",
        detail: b.title,
        severity: b.status === "FAILED" ? "critical" : "warning",
        href: b.action?.href ?? "/app/plans",
        source: "action",
        createdAt: b.startAt ?? new Date().toISOString(),
      });
    }
    if (wallet?.upcomingPayments.length) {
      for (const p of wallet.upcomingPayments) {
        attention.push({
          id: `att_pay_${p.id}`,
          title: "Payment requires attention",
          detail: p.title,
          severity: "critical",
          href: p.href,
          source: "wallet",
          createdAt: new Date().toISOString(),
        });
      }
    }

    const snapshot: PersonalContextSnapshot = {
      userId,
      generatedAt: new Date().toISOString(),
      stale: false,
      offlineCapable: true,
      today: parts.today,
      upcoming: parts.upcoming,
      completed: parts.completed,
      timeline: buildTimeline(parts.today, parts.upcoming, parts.completed),
      continueItems,
      attention: attention.slice(0, 12),
      recommendations,
      savedCount: saved.length,
      wallet,
      signals,
      planGroups,
      providerErrors,
    };

    cache.set(userId, { at: Date.now(), snapshot });
    return snapshot;
  }

  /** Stale-while-revalidate style: return cache even if expired while refreshing. */
  getCached(userId: string): PersonalContextSnapshot | null {
    return cache.get(userId)?.snapshot ?? null;
  }

  invalidate(userId: string) {
    cache.delete(userId);
  }

  toAiSafe(snapshot: PersonalContextSnapshot): AiSafePersonalContext {
    const fmt = (items: typeof snapshot.today) =>
      items.length === 0
        ? "Nothing scheduled."
        : items
            .map((i) => {
              const when = i.startAt
                ? new Date(i.startAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "";
              return [when, i.title, i.subtitle].filter(Boolean).join(" · ");
            })
            .join("; ");

    const tonight = snapshot.today.filter((i) => {
      if (!i.startAt) return false;
      return new Date(i.startAt).getHours() >= 17;
    });
    const yesterday = snapshot.completed.filter((i) => {
      if (!i.startAt) return false;
      const d = new Date(i.startAt);
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return d.toDateString() === y.toDateString();
    });
    const spas = snapshot.recommendations
      .filter((r) => /spa|wellness|massage/i.test(`${r.name} ${r.category} ${r.businessName}`))
      .slice(0, 3);
    const payAttn = snapshot.attention.filter((a) => a.source === "wallet" || /pay/i.test(a.title));

    return {
      todaySummary: fmt(snapshot.today),
      upcomingSummary: fmt(snapshot.upcoming.slice(0, 5)),
      recentBookingsSummary: fmt(snapshot.completed.slice(0, 5)),
      savedSpasSummary:
        spas.length > 0
          ? spas.map((s) => `${s.name} at ${s.businessName}`).join("; ")
          : `You have ${snapshot.savedCount} saved offerings.`,
      tonightSummary: fmt(tonight),
      paymentAttentionSummary:
        payAttn.length > 0 ? payAttn.map((a) => a.title).join("; ") : "No payment attention items.",
      yesterdaySummary: fmt(yesterday),
      items: [...snapshot.today, ...snapshot.upcoming.slice(0, 8)].map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        when: i.startAt,
        status: i.status,
      })),
    };
  }

  async createPlanGroup(
    userId: string,
    title: string,
    items: LifePlanItem[],
  ): Promise<PersonalPlanGroup> {
    const row = await prisma.personalPlan.create({
      data: {
        userId,
        title: title.slice(0, 120),
        status: "ACTIVE",
        itemsJson: JSON.stringify(
          items.map((i) => ({
            id: i.id,
            type: i.type,
            title: i.title,
            subtitle: i.subtitle,
            source: i.source,
            sourceId: i.sourceId,
            experienceId: i.experienceId,
            offeringId: i.offeringId,
            startAt: i.startAt,
            endAt: i.endAt,
            status: i.status,
            location: i.location,
            action: i.action,
            metadata: {
              bookingSource: i.source,
              bookingId: i.sourceId,
              experienceId: i.experienceId,
              offeringId: i.offeringId,
              externalReference: i.metadata?.externalReference,
            },
          })),
        ),
      },
    });
    this.invalidate(userId);
    return {
      id: row.id,
      title: row.title,
      status: "ACTIVE",
      itemIds: items.map((i) => i.id),
      items,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

export const personalContextService = new PersonalContextService();
