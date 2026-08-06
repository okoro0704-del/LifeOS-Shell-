import type { SearchResult } from "@lifeos/shared";
import { prisma } from "../../lib/prisma.js";
import type { SearchContext, SearchProvider } from "./types.js";
import { scoreMatch } from "./types.js";

export class ActivitySearchProvider implements SearchProvider {
  readonly id = "activity";

  async search(ctx: SearchContext): Promise<SearchResult[]> {
    const rows = await prisma.activity.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    const out: SearchResult[] = [];
    for (const r of rows) {
      if (r.experienceId && !ctx.connectedExperienceIds.has(r.experienceId)) continue;
      const score = Math.max(
        scoreMatch(r.title, ctx.query),
        scoreMatch(r.detail, ctx.query),
        scoreMatch(r.kind, ctx.query),
        scoreMatch("activity", ctx.query),
      );
      if (score < 0.5) continue;
      const isTicket = /ticket/i.test(r.title) || /ticket/i.test(r.detail);
      out.push({
        id: `act_${r.id}`,
        type: isTicket ? "TICKET" : "ACTIVITY",
        title: r.title,
        subtitle: r.detail,
        description: r.source,
        actions: [
          {
            id: `view_act_${r.id}`,
            label: isTicket ? "View ticket" : "View",
            actionId: isTicket ? "VIEW_TICKETS" : "VIEW_ACTIVITY",
          },
        ],
        source: this.id,
        score,
        metadata: { activityId: r.id, kind: r.kind },
      });
    }
    return out;
  }
}

export class NotificationSearchProvider implements SearchProvider {
  readonly id = "notification";

  async search(ctx: SearchContext): Promise<SearchResult[]> {
    const rows = await prisma.notification.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const out: SearchResult[] = [];
    for (const r of rows) {
      const score = Math.max(
        scoreMatch(r.title, ctx.query),
        scoreMatch(r.body, ctx.query),
        scoreMatch(r.category, ctx.query),
        scoreMatch("notification", ctx.query),
      );
      if (score < 0.5) continue;
      let params: Record<string, unknown> = {};
      try {
        params = JSON.parse(r.actionParams || "{}") as Record<string, unknown>;
      } catch {
        params = {};
      }
      out.push({
        id: `notif_${r.id}`,
        type: "NOTIFICATION",
        title: r.title,
        subtitle: r.category,
        description: r.body,
        actions: [
          {
            id: `open_notif_${r.id}`,
            label: r.actionId ? "Open" : "View",
            actionId: r.actionId || "VIEW_NOTIFICATIONS",
            params,
          },
        ],
        source: this.id,
        score,
        metadata: { notificationId: r.id, actionId: r.actionId },
      });
    }
    return out;
  }
}
