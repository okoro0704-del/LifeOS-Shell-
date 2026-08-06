import type { CommandIntent, SearchResult } from "@lifeos/shared";

/**
 * Deterministic search ranking — no ML.
 * Priority: personal context → exact offering → available → saved → business → experience → general
 */
export function rankSearchResults(
  results: SearchResult[],
  intent: CommandIntent,
  opts?: { savedOfferingIds?: Set<string>; query?: string },
): SearchResult[] {
  const q = (opts?.query ?? intent.rawQuery).toLowerCase();
  const personalQuery = /\bmy\b|tonight|today|what am i|what do i/i.test(q);

  const scored = results.map((r) => {
    let score = r.score;
    const meta = r.metadata ?? {};
    const price = typeof meta.price === "number" ? meta.price : null;

    // Priority tiers
    if (r.type === "PERSONAL" || r.type === "BOOKING" || r.type === "TICKET") {
      score += personalQuery ? 1.2 : 0.15;
    }
    if (r.type === "OFFERING") {
      score += personalQuery ? 0.2 : 0.55;
      if (meta.availability && /available|tonight|tomorrow|open/i.test(String(meta.availability))) {
        score += 0.25;
      }
    }
    if (r.type === "BUSINESS") score += 0.1;
    if (r.type === "EXPERIENCE") score += 0.05;

    if (opts?.savedOfferingIds && meta.offeringId && opts.savedOfferingIds.has(String(meta.offeringId))) {
      score += 0.35;
    }

    if (intent.category && String(meta.category ?? "").toLowerCase() === intent.category.toLowerCase()) {
      score += 0.3;
    }
    if (intent.maxPrice != null && price != null) {
      if (price <= intent.maxPrice) score += 0.2;
      else score -= 0.8;
    }
    if (intent.minPrice != null && price != null && price < intent.minPrice) score -= 0.5;

    if (intent.sortBy === "price_asc" && price != null) score += Math.max(0, 0.4 - price / 500_000);
    if (intent.sortBy === "availability" && meta.availability) score += 0.2;

    // Exact title match
    if (r.title.toLowerCase() === q) score += 0.5;

    return { r: { ...r, score }, price };
  });

  scored.sort((a, b) => {
    if (intent.sortBy === "price_asc") {
      if (a.price != null && b.price != null) return a.price - b.price;
    }
    if (intent.sortBy === "price_desc") {
      if (a.price != null && b.price != null) return b.price - a.price;
    }
    return b.r.score - a.r.score;
  });

  return scored.map((x) => x.r);
}

export function filterByIntent(results: SearchResult[], intent: CommandIntent): SearchResult[] {
  return results.filter((r) => {
    const meta = r.metadata ?? {};
    const price = typeof meta.price === "number" ? meta.price : null;
    if (intent.maxPrice != null && price != null && price > intent.maxPrice) return false;
    if (intent.minPrice != null && price != null && price < intent.minPrice) return false;
    if (intent.category && r.type === "OFFERING") {
      const cat = String(meta.category ?? "");
      if (cat && cat !== intent.category && intent.offeringType === "MASSAGE") {
        // allow Wellness for massage
        if (intent.category === "Wellness" && cat !== "Wellness") return false;
      }
    }
    return true;
  });
}

export function compareResults(
  results: SearchResult[],
  metric: "price" | "distance" | "availability" | "cancellation",
): { summary: string; winnerId?: string; supported: boolean; results: SearchResult[] } {
  if (results.length === 0) {
    return { summary: "Nothing to compare.", supported: false, results };
  }

  if (metric === "price") {
    const priced = results
      .map((r) => ({ r, price: typeof r.metadata?.price === "number" ? (r.metadata.price as number) : null }))
      .filter((x) => x.price != null) as Array<{ r: SearchResult; price: number }>;
    if (priced.length === 0) {
      return {
        summary: "Price isn’t available for these options.",
        supported: false,
        results,
      };
    }
    priced.sort((a, b) => a.price - b.price);
    const w = priced[0];
    return {
      summary: `The ₦${w.price.toLocaleString()} option (${w.r.title}) is the cheapest among available prices.`,
      winnerId: w.r.id,
      supported: true,
      results: priced.map((p) => p.r),
    };
  }

  if (metric === "distance") {
    const withDist = results.filter((r) => r.metadata?.distanceKm != null);
    if (withDist.length === 0) {
      return {
        summary: "Distance isn’t provided for these options.",
        supported: false,
        results,
      };
    }
    withDist.sort(
      (a, b) => Number(a.metadata!.distanceKm) - Number(b.metadata!.distanceKm),
    );
    return {
      summary: `${withDist[0].title} is the closest among options with distance data.`,
      winnerId: withDist[0].id,
      supported: true,
      results: withDist,
    };
  }

  if (metric === "availability") {
    const avail = results.filter((r) => r.metadata?.availability);
    if (avail.length === 0) {
      return { summary: "Availability isn’t provided.", supported: false, results };
    }
    return {
      summary: `${avail.length} option(s) include availability information.`,
      winnerId: avail[0].id,
      supported: true,
      results: avail,
    };
  }

  const withPolicy = results.filter((r) => r.metadata?.cancellationPolicy);
  if (withPolicy.length === 0) {
    return {
      summary: "Cancellation policy isn’t provided for these options.",
      supported: false,
      results,
    };
  }
  return {
    summary: `${withPolicy[0].title} includes a published cancellation policy.`,
    winnerId: withPolicy[0].id,
    supported: true,
    results: withPolicy,
  };
}
