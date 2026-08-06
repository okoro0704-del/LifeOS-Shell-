import type { CommandIntent, SearchResult, SearchResultType } from "@lifeos/shared";
import { prisma } from "../../lib/prisma.js";
import { getExperienceProvider } from "../../services/experience.js";
import { listSaved } from "../../services/saved-offerings.js";
import { planQuery } from "../query-planner.js";
import { filterByIntent, rankSearchResults } from "../search-ranking.js";
import { ActivitySearchProvider, NotificationSearchProvider } from "./activity-provider.js";
import {
  BookingSearchProvider,
  ExperienceSearchProvider,
  OfferingSearchProvider,
} from "./experience-provider.js";
import {
  BusinessSearchProvider,
  PlanSearchProvider,
  SavedOfferingSearchProvider,
} from "./extra-providers.js";
import { LifeOSSearchProvider } from "./lifeos-provider.js";
import { PersonalContextSearchProvider } from "./personal-context-provider.js";
import type { SearchContext, SearchProvider } from "./types.js";
import { WalletSearchProvider } from "./wallet-provider.js";

const DEFAULT_LIMIT = 24;
const PROVIDER_TIMEOUT_MS = 2200;

async function withTimeout<T>(fn: () => Promise<T>): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), PROVIDER_TIMEOUT_MS)),
  ]);
}

export class UniversalSearchEngine {
  constructor(private readonly providers: SearchProvider[]) {}

  async search(input: {
    userId: string;
    trustId: string;
    query: string;
    limit?: number;
    types?: SearchResultType[];
    intent?: CommandIntent;
  }): Promise<{
    results: SearchResult[];
    groups: Record<string, SearchResult[]>;
    providerErrors: string[];
    intent: CommandIntent;
  }> {
    const q = input.query.trim().slice(0, 200);
    const planned = input.intent ? { intent: input.intent, searchQuery: q } : planQuery(q);
    if (!q) {
      return { results: [], groups: {}, providerErrors: [], intent: planned.intent };
    }

    const connections = await getExperienceProvider().listConnections(input.userId);
    const connectedExperienceIds = new Set(
      connections.filter((c) => c.status === "connected").map((c) => c.experienceId),
    );

    const ctx: SearchContext = {
      userId: input.userId,
      trustId: input.trustId,
      query: planned.searchQuery || q,
      connectedExperienceIds,
    };

    const providerErrors: string[] = [];
    const batches = await Promise.all(
      this.providers.map(async (p) => {
        try {
          return await withTimeout(() => p.search(ctx));
        } catch {
          providerErrors.push(p.id);
          return [] as SearchResult[];
        }
      }),
    );

    let results = batches.flat();

    // Enrich offering metadata for ranking/compare when missing
    results = results.map((r) => {
      if (r.type !== "OFFERING" || r.metadata?.price != null) return r;
      return r;
    });

    results = filterByIntent(results, planned.intent);

    let savedIds = new Set<string>();
    try {
      savedIds = new Set((await listSaved(input.userId)).map((s) => s.offeringId));
    } catch {
      /* optional */
    }

    results = rankSearchResults(results, planned.intent, {
      savedOfferingIds: savedIds,
      query: q,
    });

    if (isActionOrientedQuery(q) || planned.intent.actionCapability === "BOOK") {
      results = results.map((r) =>
        r.type === "OFFERING" ? { ...r, score: r.score + 0.2 } : r,
      );
      results.sort((a, b) => b.score - a.score);
    }

    if (input.types?.length) {
      const allow = new Set(input.types);
      results = results.filter((r) => allow.has(r.type));
    }

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

    const topType = results[0]?.type ?? "none";
    void prisma.searchMetric
      .create({
        data: {
          category: topType,
          hasResults: results.length > 0,
          intent: planned.intent.type,
        },
      })
      .catch(() => undefined);

    return { results, groups, providerErrors, intent: planned.intent };
  }
}

function isActionOrientedQuery(q: string): boolean {
  return /\b(massage|spa|pizza|jollof|room|suite|gym|class|movie|ticket|dinner|breakfast|pass|training|facial|concert|event)\b/i.test(
    q,
  );
}

let engine: UniversalSearchEngine | null = null;

export function getUniversalSearch(): UniversalSearchEngine {
  if (!engine) {
    engine = new UniversalSearchEngine([
      new PersonalContextSearchProvider(),
      new PlanSearchProvider(),
      new SavedOfferingSearchProvider(),
      new OfferingSearchProvider(),
      new BusinessSearchProvider(),
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

/** Test helper */
export function resetUniversalSearch() {
  engine = null;
}
