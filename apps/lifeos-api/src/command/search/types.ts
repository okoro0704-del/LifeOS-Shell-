import type { SearchResult } from "@lifeos/shared";

export type SearchContext = {
  userId: string;
  trustId: string;
  query: string;
  /** Experience IDs the user is connected to (permission boundary). */
  connectedExperienceIds: Set<string>;
};

export interface SearchProvider {
  readonly id: string;
  search(ctx: SearchContext): Promise<SearchResult[]>;
}

export function scoreMatch(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase().trim();
  if (!n) return 0;
  if (h === n) return 1;
  if (h.startsWith(n)) return 0.9;
  if (h.includes(n)) return 0.7;
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length && parts.every((p) => h.includes(p))) return 0.55;
  return 0;
}
