import type { SearchResult } from "@lifeos/shared";
import { listSaved } from "../../services/saved-offerings.js";
import { personalContextService } from "../../services/personal-context.js";
import type { SearchContext, SearchProvider } from "./types.js";
import { scoreMatch } from "./types.js";

export class PlanSearchProvider implements SearchProvider {
  readonly id = "plans";

  async search(ctx: SearchContext): Promise<SearchResult[]> {
    if (!/\b(plan|today|upcoming|tomorrow|schedule|appointment|booking)\b/i.test(ctx.query) && !/\bmy\b/i.test(ctx.query)) {
      return [];
    }
    const snap = await personalContextService.getSnapshot(ctx.userId, ctx.trustId);
    const items = [...snap.today, ...snap.upcoming].slice(0, 10);
    return items.map((item) => ({
      id: `plan_${item.id}`,
      type: item.type === "TICKET" ? ("TICKET" as const) : ("BOOKING" as const),
      title: item.title,
      subtitle: [item.subtitle, item.startAt && new Date(item.startAt).toLocaleString()].filter(Boolean).join(" · "),
      description: item.status,
      metadata: {
        sourceId: item.sourceId,
        offeringId: item.offeringId,
        experienceId: item.experienceId,
        navigateTo: item.action?.href ?? "/app/plans",
        availableActions: [item.action?.label ?? "Open"],
      },
      actions: [
        {
          id: `open_plan_${item.id}`,
          label: item.action?.label ?? "Open",
          actionId: item.action?.actionId ?? "VIEW_BOOKINGS",
          params: { offeringId: item.offeringId, experienceId: item.experienceId },
        },
      ],
      source: this.id,
      score: Math.max(0.6, scoreMatch(`${item.title} ${item.subtitle ?? ""} plan`, ctx.query)),
    }));
  }
}

export class SavedOfferingSearchProvider implements SearchProvider {
  readonly id = "saved";

  async search(ctx: SearchContext): Promise<SearchResult[]> {
    if (!/\bsaved\b|\bfavourite|\bfavorite|\bbook again\b/i.test(ctx.query) && scoreMatch("saved", ctx.query) < 0.5) {
      // still allow weak matches on offering names in saved list
    }
    const saved = await listSaved(ctx.userId);
    if (!saved.length) return [];

    const bookAgain = /\bbook again\b/i.test(ctx.query);
    return saved
      .map((s) => {
        const score = Math.max(
          scoreMatch(s.name, ctx.query),
          scoreMatch(s.businessName, ctx.query),
          scoreMatch("saved", ctx.query),
          bookAgain ? 0.85 : 0,
        );
        if (score < 0.45 && !bookAgain && !/\bsaved\b/i.test(ctx.query)) return null;
        return {
          id: `saved_${s.offeringId}`,
          type: "OFFERING" as const,
          title: s.name,
          subtitle: `${s.businessName} · Saved`,
          description: s.priceFormatted,
          metadata: {
            offeringId: s.offeringId,
            experienceId: s.experienceId,
            saved: true,
            price: undefined,
            navigateTo: `/app/discover?offering=${s.offeringId}`,
            availableActions: ["View", "Book again"],
          },
          actions: [
            {
              id: `view_saved_${s.offeringId}`,
              label: "View",
              actionId: "OPEN_EXPERIENCE",
              params: { offeringId: s.offeringId, experienceId: s.experienceId },
            },
            {
              id: `book_saved_${s.offeringId}`,
              label: "Book again",
              actionId: "BOOK_SERVICE",
              params: {
                offeringId: s.offeringId,
                experienceId: s.experienceId,
                service: s.name,
                amount: s.priceFormatted,
                bookAgain: true,
              },
              requiresConfirmation: true,
            },
          ],
          source: this.id,
          score: bookAgain ? Math.max(score, 0.9) : score,
        } satisfies SearchResult;
      })
      .filter(Boolean) as SearchResult[];
  }
}

export class BusinessSearchProvider implements SearchProvider {
  readonly id = "business";

  async search(ctx: SearchContext): Promise<SearchResult[]> {
    const { getOfferingProvider } = await import("../../services/offerings.js");
    const businesses = await getOfferingProvider().listBusinesses(ctx.query);
    return businesses.slice(0, 10).map((b) => ({
      id: `biz_${b.businessId}`,
      type: "BUSINESS" as const,
      title: b.businessName,
      subtitle: [b.category, b.location].filter(Boolean).join(" · "),
      description: b.hours ?? b.description?.slice(0, 120),
      icon: b.logo ?? undefined,
      metadata: {
        businessId: b.businessId,
        experienceId: b.experienceId,
        category: b.category,
        navigateTo: `/app/discover?business=${b.businessId}`,
        availableActions: ["View"],
      },
      actions: [
        {
          id: `view_biz_${b.businessId}`,
          label: "View",
          actionId: "OPEN_EXPERIENCE",
          params: { businessId: b.businessId, experienceId: b.experienceId },
        },
      ],
      source: this.id,
      score: Math.max(0.5, scoreMatch(b.businessName, ctx.query)),
    }));
  }
}
