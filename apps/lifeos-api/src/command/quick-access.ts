import {
  DEFAULT_PREFERENCES,
  DEFAULT_QUICK_ACCESS_PREFS,
  type LifeOsPreferences,
  type QuickAccessItem,
  type QuickAccessPreferences,
} from "@lifeos/shared";
import { prisma } from "../lib/prisma.js";
import { getExperienceProvider } from "../services/experience.js";
import { ACTION_REGISTRY } from "./action-registry.js";

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

    const baseActions: Array<{
      id: string;
      label: string;
      actionId: keyof typeof ACTION_REGISTRY;
      icon?: string;
      navigateTo?: string;
    }> = [
      { id: "qa_wallet", label: "Wallet", actionId: "OPEN_WALLET", icon: "wallet", navigateTo: "/app/wallet" },
      { id: "qa_book", label: "Book", actionId: "DISCOVER_BUSINESSES", icon: "book", navigateTo: "/app/discover" },
      { id: "qa_tickets", label: "Tickets", actionId: "VIEW_TICKETS", icon: "ticket", navigateTo: "/app/activity?filter=tickets" },
      { id: "qa_activity", label: "Activity", actionId: "VIEW_ACTIVITY", icon: "activity", navigateTo: "/app/activity" },
      { id: "qa_explore", label: "Explore", actionId: "DISCOVER_BUSINESSES", icon: "explore", navigateTo: "/app/discover" },
      { id: "qa_notifications", label: "Alerts", actionId: "VIEW_NOTIFICATIONS", icon: "bell", navigateTo: "/app/notifications" },
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

    // Contextual from activity
    for (const a of activities.slice(0, 5)) {
      if (/hotel|booking|check.?in/i.test(`${a.title} ${a.detail}`)) {
        const id = `qa_ctx_checkin_${a.id}`;
        if (hidden.has(id)) continue;
        items.push({
          id,
          kind: "contextual",
          label: "Check in",
          subtitle: a.title,
          actionId: "CHECK_IN",
          params: { experienceId: a.experienceId, bookingId: a.id },
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
      }
      if (/ticket|cinema/i.test(`${a.title} ${a.detail}`)) {
        const id = `qa_ctx_ticket_${a.id}`;
        if (hidden.has(id)) continue;
        items.push({
          id,
          kind: "contextual",
          label: "View ticket",
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
      if (/spa|appointment|massage/i.test(`${a.title} ${a.detail}`)) {
        const id = `qa_ctx_appt_${a.id}`;
        if (hidden.has(id)) continue;
        items.push({
          id,
          kind: "contextual",
          label: "View appointment",
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
        });
      }
      if (/invoice|unpaid|bill/i.test(`${a.title} ${a.detail}`)) {
        const id = `qa_ctx_pay_${a.id}`;
        if (hidden.has(id)) continue;
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
      }
    }

    // Apply order preference
    items.sort((a, b) => {
      const ai = prefs.order.indexOf(a.id);
      const bi = prefs.order.indexOf(b.id);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.score - a.score;
    });

    return items.slice(0, 16);
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
