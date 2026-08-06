import type { LifePlanItem, PlanItem, SavedOfferingPublic } from "@lifeos/shared";
import { listSaved } from "./saved-offerings.js";
import { personalContextService } from "./personal-context.js";
import { partitionPlanItems } from "./personal-context-providers.js";

function toLegacyPlanItem(i: LifePlanItem): PlanItem {
  const kindMap: Record<LifePlanItem["type"], PlanItem["kind"]> = {
    BOOKING: "booking",
    APPOINTMENT: "appointment",
    TICKET: "ticket",
    EVENT: "event",
    STAY: "stay",
    CLASS: "class",
    RESERVATION: "reservation",
    PAYMENT: "other",
    TASK: "other",
    OTHER: "other",
  };
  return {
    id: i.id,
    kind: kindMap[i.type],
    title: i.title,
    subtitle: i.subtitle ?? undefined,
    when: i.startAt,
    amount: i.amountFormatted,
    status: i.status,
    offeringId: i.offeringId,
    experienceId: i.experienceId,
    businessName: i.subtitle ?? null,
    deepLink: i.action?.href ?? null,
    source: i.source,
  };
}

/**
 * Plans / Today — aggregation read layer over personal context.
 * Not a booking database.
 */
export async function getPlans(
  userId: string,
  trustId?: string,
): Promise<{
  today: PlanItem[];
  tomorrow: PlanItem[];
  thisWeek: PlanItem[];
  upcoming: PlanItem[];
  completed: PlanItem[];
  saved: SavedOfferingPublic[];
  timeline: ReturnType<typeof personalContextService.getSnapshot> extends Promise<infer S>
    ? S extends { timeline: infer T }
      ? T
      : never
    : never;
  continueItems: Awaited<ReturnType<typeof personalContextService.getSnapshot>>["continueItems"];
  attention: Awaited<ReturnType<typeof personalContextService.getSnapshot>>["attention"];
  recommendations: Awaited<ReturnType<typeof personalContextService.getSnapshot>>["recommendations"];
  planGroups: Awaited<ReturnType<typeof personalContextService.getSnapshot>>["planGroups"];
  wallet: Awaited<ReturnType<typeof personalContextService.getSnapshot>>["wallet"];
  providerErrors: string[];
  /** Full LifePlanItem lists for richer UI */
  life: {
    today: LifePlanItem[];
    tomorrow: LifePlanItem[];
    thisWeek: LifePlanItem[];
    upcoming: LifePlanItem[];
    completed: LifePlanItem[];
  };
}> {
  const tid = trustId ?? "unknown";
  const snap = await personalContextService.getSnapshot(userId, tid);
  const all = [...snap.today, ...snap.upcoming, ...snap.completed];
  const parts = partitionPlanItems(all);
  const saved = await listSaved(userId).catch(() => [] as SavedOfferingPublic[]);

  return {
    today: parts.today.map(toLegacyPlanItem),
    tomorrow: parts.tomorrow.map(toLegacyPlanItem),
    thisWeek: parts.thisWeek.map(toLegacyPlanItem),
    upcoming: parts.upcoming.map(toLegacyPlanItem),
    completed: parts.completed.map(toLegacyPlanItem),
    saved,
    timeline: snap.timeline,
    continueItems: snap.continueItems,
    attention: snap.attention,
    recommendations: snap.recommendations,
    planGroups: snap.planGroups,
    wallet: snap.wallet,
    providerErrors: snap.providerErrors,
    life: {
      today: parts.today,
      tomorrow: parts.tomorrow,
      thisWeek: parts.thisWeek,
      upcoming: parts.upcoming,
      completed: parts.completed,
    },
  };
}
