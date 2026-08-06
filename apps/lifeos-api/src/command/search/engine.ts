import type { SearchResult, SearchResultType } from "@lifeos/shared";
import { prisma } from "../../lib/prisma.js";
import { getExperienceProvider } from "../../services/experience.js";
import { ActivitySearchProvider, NotificationSearchProvider } from "./activity-provider.js";
import { BookingSearchProvider, ExperienceSearchProvider } from "./experience-provider.js";
import { LifeOSSearchProvider } from "./lifeos-provider.js";
import type { SearchContext, SearchProvider } from "./types.js";
import { WalletSearchProvider } from "./wallet-provider.js";

const DEFAULT_LIMIT = 24;

export class UniversalSearchEngine {
  constructor(private readonly providers: SearchProvider[]) {}

  async search(input: {
    userId: string;
    trustId: string;
    query: string;
    limit?: number;
    types?: SearchResultType[];
  }): Promise<{ results: SearchResult[]; groups: Record<string, SearchResult[]> }> {
    const q = input.query.trim().slice(0, 200);
    if (!q) return { results: [], groups: {} };

    const connections = await getExperienceProvider().listConnections(input.userId);
    const connectedExperienceIds = new Set(
      connections.filter((c) => c.status === "connected").map((c) => c.experienceId),
    );

    const ctx: SearchContext = {
      userId: input.userId,
      trustId: input.trustId,
      query: q,
      connectedExperienceIds,
    };

    const batches = await Promise.all(
      this.providers.map(async (p) => {
        try {
          return await p.search(ctx);
        } catch {
          return [] as SearchResult[];
        }
      }),
    );

    let results = batches.flat().sort((a, b) => b.score - a.score);
    if (input.types?.length) {
      const allow = new Set(input.types);
      results = results.filter((r) => allow.has(r.type));
    }

    // Dedupe by id
    const seen = new Set<string>();
    results = results.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    const limit = input.limit ?? DEFAULT_LIMIT;
    results = results.slice(0, limit);

    const groups: Record<string, SearchResult[]> = {};
    for (const r of results) {
      (groups[r.type] ??= []).push(r);
    }

    // Privacy-conscious metric — no raw query
    const topType = results[0]?.type ?? "none";
    void prisma.searchMetric
      .create({
        data: {
          category: topType,
          hasResults: results.length > 0,
          intent: null,
        },
      })
      .catch(() => undefined);

    return { results, groups };
  }
}

let engine: UniversalSearchEngine | null = null;

export function getUniversalSearch(): UniversalSearchEngine {
  if (!engine) {
    engine = new UniversalSearchEngine([
      new LifeOSSearchProvider(),
      new ExperienceSearchProvider(),
      new BookingSearchProvider(),
      new WalletSearchProvider(),
      new ActivitySearchProvider(),
      new NotificationSearchProvider(),
    ]);
  }
  return engine;
}
