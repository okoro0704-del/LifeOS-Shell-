import type { DiscoverableOffering } from "@lifeos/shared";

export type RankingContext = {
  query?: string;
  /** Preferred categories from activity (soft personalization). */
  preferredCategories?: string[];
  preferredBusinessIds?: string[];
  sort?: "relevance" | "price_asc" | "price_desc" | "rating" | "distance";
};

/**
 * Deterministic offering ranking — not hard-coded into UI.
 * Replaceable later with ML / live HospitalityOS signals.
 */
export function scoreOffering(o: DiscoverableOffering, ctx: RankingContext = {}): number {
  let score = 0;
  if (o.featured) score += 0.35;
  if (o.badge) score += 0.1;
  if (o.rating != null) score += (o.rating / 5) * 0.25;
  if (o.availability && /available|tonight|tomorrow|open|now/i.test(o.availability)) score += 0.2;
  if (o.distanceKm != null) score += Math.max(0, 0.2 - o.distanceKm * 0.02);
  if (ctx.preferredCategories?.includes(o.category)) score += 0.25;
  if (ctx.preferredBusinessIds?.includes(o.businessId)) score += 0.2;

  const q = ctx.query?.trim().toLowerCase();
  if (q) {
    if (o.name.toLowerCase() === q) score += 1;
    else if (o.name.toLowerCase().includes(q)) score += 0.6;
    else if (o.businessName.toLowerCase().includes(q)) score += 0.25;
    else if (o.description.toLowerCase().includes(q)) score += 0.15;
    else if (o.type.toLowerCase().includes(q) || o.category.toLowerCase().includes(q)) score += 0.2;
  }

  if (o.price > 0 && o.price < 20_000) score += 0.05;
  return score;
}

export function rankOfferings(
  offerings: DiscoverableOffering[],
  ctx: RankingContext = {},
): DiscoverableOffering[] {
  const sort = ctx.sort ?? "relevance";
  const scored = offerings.map((o) => ({ o, s: scoreOffering(o, ctx) }));

  scored.sort((a, b) => {
    if (sort === "price_asc") return a.o.price - b.o.price;
    if (sort === "price_desc") return b.o.price - a.o.price;
    if (sort === "rating") return (b.o.rating ?? 0) - (a.o.rating ?? 0);
    if (sort === "distance") return (a.o.distanceKm ?? 999) - (b.o.distanceKm ?? 999);
    return b.s - a.s;
  });

  return scored.map((x) => x.o);
}

export const OfferingRankingService = { scoreOffering, rankOfferings };
