import type { SearchResult } from "@lifeos/shared";
import { listActions } from "../action-registry.js";
import type { SearchContext, SearchProvider } from "./types.js";
import { scoreMatch } from "./types.js";

export class LifeOSSearchProvider implements SearchProvider {
  readonly id = "lifeos";

  async search(ctx: SearchContext): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    for (const action of listActions()) {
      const score = Math.max(
        scoreMatch(action.name, ctx.query),
        scoreMatch(action.description, ctx.query),
        scoreMatch(action.id.replace(/_/g, " "), ctx.query),
      );
      if (score < 0.55) continue;
      results.push({
        id: `action_${action.id}`,
        type: "ACTION",
        title: action.name,
        subtitle: "Action",
        description: action.description,
        icon: "action",
        actions: [
          {
            id: `run_${action.id}`,
            label: action.requiresConfirmation ? "Prepare" : "Open",
            actionId: action.id,
            requiresConfirmation: action.requiresConfirmation,
          },
        ],
        source: this.id,
        score,
        metadata: { actionId: action.id },
      });
    }

    // Personal shortcuts
    const personal: Array<{ title: string; subtitle: string; actionId: string; path: string }> = [
      { title: "My profile", subtitle: "Personal", actionId: "VIEW_PROFILE", path: "/app/profile" },
      { title: "My wallet", subtitle: "Cash & Tokens", actionId: "OPEN_WALLET", path: "/app/wallet" },
      { title: "My activity", subtitle: "Personal", actionId: "VIEW_ACTIVITY", path: "/app/activity" },
      { title: "Today & Plans", subtitle: "Personal", actionId: "VIEW_BOOKINGS", path: "/app/plans" },
      { title: "Saved offerings", subtitle: "Personal", actionId: "DISCOVER_BUSINESSES", path: "/app/saved" },
    ];
    for (const p of personal) {
      const score = scoreMatch(`${p.title} ${p.subtitle}`, ctx.query);
      if (score < 0.55) continue;
      results.push({
        id: `personal_${p.actionId}`,
        type: "PERSONAL",
        title: p.title,
        subtitle: p.subtitle,
        actions: [{ id: `go_${p.actionId}`, label: "Open", actionId: p.actionId }],
        source: this.id,
        score,
        metadata: { navigateTo: p.path },
      });
    }
    return results;
  }
}
