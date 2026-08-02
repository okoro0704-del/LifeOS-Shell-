import type { ActivityItem, ActivityKind } from "@lifeos/shared";

/**
 * Activity is an aggregation/presentation layer.
 * Each OS can later provide its own ActivitySource implementation.
 */
export interface ActivitySource {
  readonly id: string;
  list(userId: string): Promise<ActivityItem[]>;
}

export class CompositeActivitySource implements ActivitySource {
  readonly id = "composite";

  constructor(private readonly sources: ActivitySource[]) {}

  async list(userId: string): Promise<ActivityItem[]> {
    const batches = await Promise.all(
      this.sources.map(async (source) => {
        try {
          return await source.list(userId);
        } catch {
          return [] as ActivityItem[];
        }
      }),
    );
    return batches
      .flat()
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
}

/** LifeOS-local activity index (not source of truth for external OS events). */
export function createLifeOsIndexSource(
  fetchRows: (userId: string) => Promise<
    {
      id: string;
      kind: string;
      title: string;
      detail: string;
      source: string;
      amount: string | null;
      createdAt: Date;
    }[]
  >,
): ActivitySource {
  return {
    id: "lifeos-index",
    async list(userId: string) {
      const rows = await fetchRows(userId);
      return rows.map(
        (r): ActivityItem => ({
          id: r.id,
          kind: r.kind as ActivityKind,
          title: r.title,
          detail: r.detail,
          source: r.source,
          amount: r.amount,
          createdAt: r.createdAt.toISOString(),
        }),
      );
    },
  };
}
