import {
  DEFAULT_PREFERENCES,
  DEFAULT_QUICK_ACCESS_PREFS,
  type LifeOsPreferences,
  type QuickAccessItem,
  type QuickAccessPreferences,
} from "@lifeos/shared";
import { prisma } from "../lib/prisma.js";
import { getExperienceProvider } from "../services/experience.js";
import { getOfferingProvider } from "../services/offerings.js";
import { ACTION_REGISTRY } from "./action-registry.js";
import type { ActionId } from "@lifeos/shared";

function parsePrefs(raw: string): LifeOsPreferences {
  try {
    const parsed = JSON.parse(raw) as Partial<LifeOsPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      quickAccess: {
        ...DEFAULT_QUICK_ACCESS_PREFS,
        ...(parsed.quickAccess ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_PREFERENCES, quickAccess: { ...DEFAULT_QUICK_ACCESS_PREFS } };
  }
}

function hourBoost(now = new Date()): number {
  const h = now.getHours();
  if (h >= 6 && h < 11) return 0.15; // morning — book / explore
  if (h >= 11 && h < 14) return 0.1;
  if (h >= 17 && h < 22) return 0.12;
  return 0;
}

/**
 * Deterministic Quick Access ranking — replaceable scoring model.
 * score = frequency + recency + upcoming + pin + context
 */
export function scoreQuickAccessItem(input: {
  frequency: number;
  recencyMs: number;
  upcoming: boolean;
  pinned: boolean;
  contextual: boolean;
  now?: Date;
}): number {
  const recency = Math.max(0, 1 - input.recencyMs / (1000 * 60 * 60 * 24 * 14));
  return (
    input.frequency * 0.35 +
    recency * 0.25 +
    (input.upcoming ? 0.2 : 0) +
    (input.pinned ? 0.5 : 0) +
    (input.contextual ? 0.3 : 0) +
    hourBoost(input.now)
  );
}

export class QuickAccessService {
  async getItems(userId: string): Promise<QuickAccessItem[]> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const prefs = parsePrefs(user.preferences).quickAccess;
    const hidden = new Set(prefs.hidden);
    const pinned = new Set(prefs.pinned);

    const [history, connections, activities] = await Promise.all([
      prisma.commandHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      getExperienceProvider().listConnections(userId),
      prisma.activity.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const freq = new Map<string, number>();
    const lastUsed = new Map<string, number>();
    for (const h of history) {
      const key = h.actionId || h.query;
      if (!key) continue;
      freq.set(key, (freq.get(key) ?? 0) + 1);
      if (!lastUsed.has(key)) lastUsed.set(key, h.createdAt.getTime());
    }

    const items: QuickAccessItem[] = [];

    /** Utility shortcuts only — service verticals (Rooms, Food, …) are the main strip. */
    const baseActions: Array<{
      id: string;
      label: string;
      actionId: keyof typeof ACTION_REGISTRY;
      icon?: string;
      navigateTo?: string;
    }> = [
      { id: "qa_wallet", label: "Wallet", actionId: "OPEN_WALLET", icon: "wallet", navigateTo: "/app/wallet" },
      { id: "qa_tickets", label: "Tickets", actionId: "VIEW_TICKETS", icon: "ticket", navigateTo: "/app/activity?filter=tickets" },
    ];

    for (const a of baseActions) {
      if (hidden.has(a.id)) continue;
      const actionKey = a.actionId;
      const score = scoreQuickAccessItem({
        frequency: freq.get(actionKey) ?? 0,
        recencyMs: Date.now() - (lastUsed.get(actionKey) ?? Date.now() - 86400000 * 30),
        upcoming: false,
        pinned: pinned.has(a.id),
        contextual: false,
      });
      items.push({
        id: a.id,
        kind: a.actionId === "OPEN_WALLET" ? "wallet" : "action",
        label: a.label,
        icon: a.icon,
        actionId: a.actionId,
        score,
        pinned: pinned.has(a.id),
        navigateTo: a.navigateTo ?? ACTION_REGISTRY[a.actionId].navigateTo,
      });
    }

    for (const c of connections.filter((x) => x.status === "connected")) {
      const id = `qa_exp_${c.experienceId}`;
      if (hidden.has(id)) continue;
      const score = scoreQuickAccessItem({
        frequency: freq.get(c.experienceId) ?? 1,
        recencyMs: Date.now() - c.connectedAt.getTime(),
        upcoming: false,
        pinned: pinned.has(id),
        contextual: true,
      });
      items.push({
        id,
        kind: "experience",
        label: c.experience.displayName,
        subtitle: c.experience.businessName,
        actionId: "OPEN_EXPERIENCE",
        params: { experienceId: c.experienceId },
        score,
        pinned: pinned.has(id),
        contextual: true,
        navigateTo: `/app/discover?open=${c.experienceId}`,
      });
    }

    // Contextual from activity — offering-level where possible
    for (const a of activities.slice(0, 5)) {
      const blob = `${a.title} ${a.detail}`;
      if (/hotel|room|booking|check.?in/i.test(blob)) {
        const id = `qa_ctx_hotel_${a.id}`;
        if (!hidden.has(id)) {
          items.push({
            id,
            kind: "contextual",
            label: "My Hotel Room",
            subtitle: a.title,
            actionId: "VIEW_BOOKINGS",
            params: { activityId: a.id },
            score: scoreQuickAccessItem({
              frequency: 1,
              recencyMs: Date.now() - a.createdAt.getTime(),
              upcoming: true,
              pinned: pinned.has(id),
              contextual: true,
            }),
            pinned: pinned.has(id),
            contextual: true,
            navigateTo: a.deepLink || "/app/activity?filter=bookings",
          });
        }
      }
      if (/spa|massage|appointment|treatment/i.test(blob)) {
        const id = `qa_ctx_spa_${a.id}`;
        if (!hidden.has(id)) {
          items.push({
            id,
            kind: "contextual",
            label: "My Spa Appointment",
            subtitle: a.title,
            actionId: "VIEW_APPOINTMENT",
            params: { activityId: a.id },
            score: scoreQuickAccessItem({
              frequency: 1,
              recencyMs: Date.now() - a.createdAt.getTime(),
              upcoming: true,
              pinned: pinned.has(id),
              contextual: true,
            }),
            pinned: pinned.has(id),
            contextual: true,
            navigateTo: a.deepLink || "/app/services/Wellness",
          });
        }
      }
      if (/gym|class|fitness|training/i.test(blob)) {
        const id = `qa_ctx_gym_${a.id}`;
        if (!hidden.has(id)) {
          items.push({
            id,
            kind: "contextual",
            label: "My Gym Class",
            subtitle: a.title,
            actionId: "OPEN_EXPERIENCE",
            params: { experienceId: a.experienceId || "exp_peak_fitness" },
            score: scoreQuickAccessItem({
              frequency: 1,
              recencyMs: Date.now() - a.createdAt.getTime(),
              upcoming: true,
              pinned: pinned.has(id),
              contextual: true,
            }),
            pinned: pinned.has(id),
            contextual: true,
            navigateTo: "/app/services/Fitness",
          });
        }
      }
      if (/ticket|cinema|movie/i.test(blob)) {
        const id = `qa_ctx_ticket_${a.id}`;
        if (!hidden.has(id)) {
          items.push({
            id,
            kind: "contextual",
            label: "My Cinema Ticket",
            subtitle: a.title,
            actionId: "VIEW_TICKETS",
            score: scoreQuickAccessItem({
              frequency: 1,
              recencyMs: Date.now() - a.createdAt.getTime(),
              upcoming: true,
              pinned: pinned.has(id),
              contextual: true,
            }),
            pinned: pinned.has(id),
            contextual: true,
            navigateTo: "/app/activity?filter=tickets",
          });
        }
      }
      if (/restaurant|dinner|reservation|meal/i.test(blob)) {
        const id = `qa_ctx_rest_${a.id}`;
        if (!hidden.has(id)) {
          items.push({
            id,
            kind: "contextual",
            label: "My Restaurant Reservation",
            subtitle: a.title,
            actionId: "VIEW_BOOKINGS",
            score: scoreQuickAccessItem({
              frequency: 1,
              recencyMs: Date.now() - a.createdAt.getTime(),
              upcoming: true,
              pinned: pinned.has(id),
              contextual: true,
            }),
            pinned: pinned.has(id),
            contextual: true,
            navigateTo: a.deepLink || "/app/services/Eat",
          });
        }
      }
      if (/event|concert|invoice|unpaid|bill/i.test(blob)) {
        const id = `qa_ctx_pay_${a.id}`;
        if (!hidden.has(id) && /invoice|unpaid|bill/i.test(blob)) {
          items.push({
            id,
            kind: "contextual",
            label: "Pay invoice",
            subtitle: a.title,
            actionId: "PAY_INVOICE",
            params: { merchant: a.title, amount: 1, reference: a.id },
            score: scoreQuickAccessItem({
              frequency: 1,
              recencyMs: Date.now() - a.createdAt.getTime(),
              upcoming: true,
              pinned: pinned.has(id),
              contextual: true,
            }),
            pinned: pinned.has(id),
            contextual: true,
          });
        } else if (!hidden.has(id) && /event|concert/i.test(blob)) {
          items.push({
            id: `qa_ctx_event_${a.id}`,
            kind: "contextual",
            label: "My Event Ticket",
            subtitle: a.title,
            actionId: "VIEW_TICKETS",
            score: scoreQuickAccessItem({
              frequency: 1,
              recencyMs: Date.now() - a.createdAt.getTime(),
              upcoming: true,
              pinned: pinned.has(id),
              contextual: true,
            }),
            pinned: pinned.has(id),
            contextual: true,
            navigateTo: "/app/services/Events",
          });
        }
      }
    }

    // Prefer PersonalContextService for contextual Quick Access
    try {
      const { personalContextService } = await import("../services/personal-context.js");
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const snap = await personalContextService.getSnapshot(userId, user.trustId);
        for (const item of [...snap.today, ...snap.upcoming].slice(0, 6)) {
          const id = `qa_pc_${item.id}`;
          if (hidden.has(id)) continue;
          const label =
            item.type === "STAY"
              ? "Hotel Stay"
              : item.type === "TICKET" || item.type === "EVENT"
                ? item.startAt && new Date(item.startAt).getHours() >= 17
                  ? "Tonight's Movie"
                  : "Ticket"
                : item.type === "APPOINTMENT"
                  ? "Spa Appointment"
                  : item.type === "CLASS"
                    ? "Gym Class"
                    : item.type === "PAYMENT"
                      ? "Pay Invoice"
                      : item.title;
          items.push({
            id,
            kind: "contextual",
            label: label.slice(0, 28),
            subtitle: item.subtitle ?? item.title,
            actionId: (item.action?.actionId as ActionId) || "VIEW_BOOKINGS",
            params: {
              offeringId: item.offeringId,
              experienceId: item.experienceId,
            },
            score: scoreQuickAccessItem({
              frequency: 3,
              recencyMs: 0,
              upcoming: true,
              pinned: pinned.has(id),
              contextual: true,
            }),
            pinned: pinned.has(id),
            contextual: true,
            navigateTo: item.action?.href || "/app/plans",
          });
        }
        for (const c of snap.continueItems.slice(0, 2)) {
          const id = `qa_cont_${c.id}`;
          if (hidden.has(id)) continue;
          items.push({
            id,
            kind: "contextual",
            label: c.title.slice(0, 28),
            subtitle: c.subtitle ?? "Continue",
            actionId: "OPEN_EXPERIENCE",
            params: { offeringId: c.offeringId, experienceId: c.experienceId },
            score: scoreQuickAccessItem({
              frequency: 2,
              recencyMs: 0,
              upcoming: true,
              pinned: pinned.has(id),
              contextual: true,
            }),
            pinned: pinned.has(id),
            contextual: true,
            navigateTo: c.href,
          });
        }
        for (const p of snap.wallet?.upcomingPayments.slice(0, 1) ?? []) {
          const id = `qa_pay_${p.id}`;
          if (hidden.has(id)) continue;
          items.push({
            id,
            kind: "contextual",
            label: "Pay Invoice",
            subtitle: p.title,
            actionId: "PAY_INVOICE",
            params: { merchant: p.title, amount: 1, reference: p.id },
            score: scoreQuickAccessItem({
              frequency: 2,
              recencyMs: 0,
              upcoming: true,
              pinned: pinned.has(id),
              contextual: true,
            }),
            pinned: pinned.has(id),
            contextual: true,
            navigateTo: p.href,
          });
        }
      }
    } catch {
      /* PersonalContext optional */
    }

    // Upcoming action records for Quick Access
    try {
      const upcoming = await prisma.actionRecord.findMany({
        where: {
          userId,
          status: "SUCCESS",
          scheduledAt: { gte: new Date() },
        },
        orderBy: { scheduledAt: "asc" },
        take: 4,
      });
      for (const r of upcoming) {
        const id = `qa_plan_${r.id}`;
        if (hidden.has(id)) continue;
        items.push({
          id,
          kind: "contextual",
          label: r.message.split("·")[0]?.trim() || "Upcoming",
          subtitle: r.scheduledAt
            ? new Date(r.scheduledAt).toLocaleString(undefined, {
                weekday: "short",
                hour: "numeric",
                minute: "2-digit",
              })
            : "Upcoming",
          actionId: "OPEN_EXPERIENCE",
          params: {
            offeringId: r.offeringId,
            experienceId: r.experienceId,
          },
          score: scoreQuickAccessItem({
            frequency: 2,
            recencyMs: 0,
            upcoming: true,
            pinned: pinned.has(id),
            contextual: true,
          }),
          pinned: pinned.has(id),
          contextual: true,
          navigateTo: r.offeringId
            ? `/app/discover?offering=${r.offeringId}`
            : "/app/plans",
        });
      }
    } catch {
      /* ActionRecord may be missing before migrate */
    }

    // Service verticals first — Rooms, Food, Wellness, … (not individual offerings)
    try {
      const CATEGORY_LABELS: Record<string, { label: string; icon: string; boost: number }> = {
        Stay: { label: "Hotel rooms", icon: "stay", boost: 12 },
        Eat: { label: "Food", icon: "eat", boost: 11 },
        Wellness: { label: "Wellness", icon: "explore", boost: 10 },
        Fitness: { label: "Fitness", icon: "explore", boost: 9 },
        Cinema: { label: "Cinema", icon: "ticket", boost: 8 },
        Events: { label: "Events", icon: "ticket", boost: 7 },
        Activities: { label: "Activities", icon: "explore", boost: 6 },
        Travel: { label: "Travel", icon: "explore", boost: 5 },
      };
      const categories = await getOfferingProvider().categories();
      for (const cat of categories) {
        if (cat === "More") continue;
        const meta = CATEGORY_LABELS[cat] ?? { label: cat, icon: "explore", boost: 4 };
        const id = `qa_cat_${cat.toLowerCase()}`;
        if (hidden.has(id)) continue;
        if (items.some((i) => i.id === id)) continue;
        items.push({
          id,
          kind: "action",
          label: meta.label,
          subtitle: "Services",
          icon: meta.icon,
          actionId: "DISCOVER_BUSINESSES",
          params: { category: cat },
          score: scoreQuickAccessItem({
            frequency: (freq.get(cat) ?? 0) + meta.boost,
            recencyMs: 86400000 * 2,
            upcoming: false,
            pinned: pinned.has(id),
            contextual: false,
          }),
          pinned: pinned.has(id),
          navigateTo: `/app/services/${encodeURIComponent(cat)}`,
        });
      }
    } catch {
      /* optional */
    }

    // Apply order preference — categories front and center
    // pinned → contextual life → service categories → wallet/utilities → experiences
    const tier = (item: QuickAccessItem) => {
      if (item.pinned) return 0;
      if (item.id.startsWith("qa_pc_") || item.id.startsWith("qa_cont_") || item.id.startsWith("qa_pay_") || item.id.startsWith("qa_plan_") || item.id.startsWith("qa_ctx_"))
        return 1;
      if (item.id.startsWith("qa_cat_")) return 2;
      if (item.kind === "wallet" || item.id.startsWith("qa_wallet") || item.id.startsWith("qa_tickets"))
        return 3;
      if (item.kind === "action") return 4;
      if (item.id.startsWith("qa_exp_")) return 5;
      return 6;
    };

    items.sort((a, b) => {
      const ai = prefs.order.indexOf(a.id);
      const bi = prefs.order.indexOf(b.id);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      const ta = tier(a);
      const tb = tier(b);
      if (ta !== tb) return ta - tb;
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.score - a.score;
    });

    return items.slice(0, 40);
  }

  async updatePrefs(
    userId: string,
    mutate: (qa: QuickAccessPreferences) => QuickAccessPreferences,
  ): Promise<QuickAccessPreferences> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const preferences = parsePrefs(user.preferences);
    const quickAccess = mutate({ ...preferences.quickAccess });
    const next = { ...preferences, quickAccess };
    await prisma.user.update({
      where: { id: userId },
      data: { preferences: JSON.stringify(next) },
    });
    return quickAccess;
  }

  pin(userId: string, itemId: string) {
    return this.updatePrefs(userId, (qa) => ({
      ...qa,
      pinned: [...new Set([...qa.pinned, itemId])],
      hidden: qa.hidden.filter((h) => h !== itemId),
    }));
  }

  unpin(userId: string, itemId: string) {
    return this.updatePrefs(userId, (qa) => ({
      ...qa,
      pinned: qa.pinned.filter((p) => p !== itemId),
    }));
  }

  hide(userId: string, itemId: string) {
    return this.updatePrefs(userId, (qa) => ({
      ...qa,
      hidden: [...new Set([...qa.hidden, itemId])],
      pinned: qa.pinned.filter((p) => p !== itemId),
      order: qa.order.filter((o) => o !== itemId),
    }));
  }

  restore(userId: string, itemId: string) {
    return this.updatePrefs(userId, (qa) => ({
      ...qa,
      hidden: qa.hidden.filter((h) => h !== itemId),
    }));
  }

  reorder(userId: string, order: string[]) {
    return this.updatePrefs(userId, (qa) => ({
      ...qa,
      order: order.slice(0, 32),
    }));
  }
}

export const quickAccessService = new QuickAccessService();
