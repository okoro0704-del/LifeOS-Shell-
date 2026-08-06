import type { SearchResult } from "@lifeos/shared";
import { personalContextService } from "../../services/personal-context.js";
import type { SearchContext, SearchProvider } from "./types.js";
import { scoreMatch } from "./types.js";

/**
 * Personal context search — "my hotel", "my tickets", "what am I doing tonight?"
 */
export class PersonalContextSearchProvider implements SearchProvider {
  readonly id = "personal-context";

  async search(ctx: SearchContext): Promise<SearchResult[]> {
    const q = ctx.query.toLowerCase();
    const personalQuery =
      /\bmy\b/.test(q) ||
      /what am i doing/.test(q) ||
      /tonight|today|upcoming|appointment|ticket|hotel|saved/.test(q);
    if (!personalQuery) return [];

    const snap = await personalContextService.getSnapshot(ctx.userId, ctx.trustId);
    const results: SearchResult[] = [];

    const pool = [...snap.today, ...snap.upcoming, ...snap.completed.slice(0, 10)];
    for (const item of pool) {
      const blob = `${item.type} ${item.title} ${item.subtitle ?? ""} my ${item.type.toLowerCase()}`;
      let score = scoreMatch(blob, ctx.query);
      if (/hotel/.test(q) && item.type === "STAY") score = Math.max(score, 0.92);
      if (/ticket/.test(q) && (item.type === "TICKET" || item.type === "EVENT")) score = Math.max(score, 0.92);
      if (/appointment/.test(q) && item.type === "APPOINTMENT") score = Math.max(score, 0.92);
      if (/tonight/.test(q) && item.startAt && new Date(item.startAt).getHours() >= 17) {
        score = Math.max(score, 0.9);
      }
      if (/saved|massage|spa/.test(q) && /spa|massage|wellness/i.test(blob)) score = Math.max(score, 0.85);
      if (score < 0.5) continue;
      results.push({
        id: `pc_${item.id}`,
        type: item.type === "TICKET" ? "TICKET" : item.type === "STAY" || item.type === "BOOKING" ? "BOOKING" : "PERSONAL",
        title: item.title,
        subtitle: [item.subtitle, item.startAt && new Date(item.startAt).toLocaleString()].filter(Boolean).join(" · "),
        actions: [
          {
            id: `open_${item.id}`,
            label: item.action?.label ?? "Open",
            actionId: item.action?.actionId ?? "VIEW_BOOKINGS",
            params: { offeringId: item.offeringId, experienceId: item.experienceId },
          },
        ],
        source: this.id,
        score,
        metadata: { navigateTo: item.action?.href, planItemId: item.id },
      });
    }

    // Saved offerings for "my saved…"
    if (/saved/.test(q) && snap.savedCount > 0) {
      results.push({
        id: "pc_saved",
        type: "PERSONAL",
        title: "Saved offerings",
        subtitle: `${snap.savedCount} saved`,
        actions: [{ id: "open_saved", label: "Open", actionId: "DISCOVER_BUSINESSES" }],
        source: this.id,
        score: 0.88,
        metadata: { navigateTo: "/app/saved" },
      });
    }

    return results;
  }
}
