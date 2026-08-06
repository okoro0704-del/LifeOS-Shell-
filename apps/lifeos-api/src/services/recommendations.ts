import type { DiscoverableOffering, PersonalContextSignals, RecommendationItem } from "@lifeos/shared";
import { getOfferingProvider } from "./offerings.js";
import { rankOfferings } from "./offering-ranking.js";

/**
 * Deterministic RecommendationProvider — signals only, no ML, no sensitive inferences.
 */
export class RecommendationProvider {
  async recommend(input: {
    signals: PersonalContextSignals;
    excludeOfferingIds?: string[];
    limit?: number;
  }): Promise<RecommendationItem[]> {
    const offerings = await getOfferingProvider().list({});
    const exclude = new Set(input.excludeOfferingIds ?? []);
    const ranked = rankOfferings(offerings, {
      preferredCategories: input.signals.preferredCategories,
      preferredBusinessIds: input.signals.preferredBusinessIds,
      query: input.signals.recentSearchTerms[0],
    });

    const hourBoostCat =
      input.signals.timeOfDay === "morning"
        ? ["Fitness", "Wellness"]
        : input.signals.timeOfDay === "evening"
          ? ["Eat", "Entertainment", "Wellness"]
          : ["Wellness", "Eat", "Hotels"];

    const scored: RecommendationItem[] = [];
    for (const o of ranked) {
      if (exclude.has(o.id)) continue;
      const reason = reasonFor(o, input.signals, hourBoostCat);
      let score = 0.5;
      if (input.signals.preferredCategories.includes(o.category)) score += 0.3;
      if (hourBoostCat.includes(o.category)) score += 0.15;
      if (o.featured) score += 0.1;
      if (o.availability && /available|tonight|tomorrow/i.test(o.availability)) score += 0.1;
      scored.push({
        id: `rec_${o.id}`,
        offeringId: o.id,
        name: o.name,
        businessName: o.businessName,
        category: o.category,
        priceFormatted: o.priceFormatted,
        reason,
        experienceId: o.experienceId,
        score,
      });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, input.limit ?? 6);
  }
}

function reasonFor(
  o: DiscoverableOffering,
  signals: PersonalContextSignals,
  hourCats: string[],
): string {
  if (signals.preferredCategories.includes(o.category)) {
    return "Based on your activity";
  }
  if (hourCats.includes(o.category)) {
    return `Good for ${signals.timeOfDay}`;
  }
  if (o.featured) return "Popular nearby";
  if (o.availability && /available/i.test(o.availability)) return "Available soon";
  return "You might like this";
}

export const recommendationProvider = new RecommendationProvider();
