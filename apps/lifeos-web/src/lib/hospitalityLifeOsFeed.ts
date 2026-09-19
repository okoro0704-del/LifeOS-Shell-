import type { MediaItem } from "./personalCatalog";
import type { CatalogueItem } from "./mybrandPublicFeed";
import {
  assembleMediaFeed,
  type DatedMediaItem,
  withTimeout,
} from "./ecommerceLifeOsFeed";

/** Hosted HospitalityOS API (Digipedia / Desktop config). */
export const HOSPITALITYOS_API_DEFAULT =
  "https://hospitalityos-api-production.up.railway.app";

export type HospitalityFeedKind = "offering" | "publication" | "all";

export type HospitalityFeedFailure = "timeout" | "unavailable" | "empty";

export type HospitalityLifeOsFeedItem = {
  family?: "catalogue" | "publication" | string;
  applicationId?: string;
  itemType?: string;
  canonicalItemId: string;
  title: string;
  summary?: string | null;
  assetReferences?: Array<{
    assetId?: string;
    href: string;
    kind?: "image" | "video" | "file" | string;
    alt?: string | null;
  }>;
  canonicalSourceUrl: string;
  tenant?: {
    slug?: string;
    displayName?: string;
  };
  price?: { amount: string; currency: string } | null;
  provenance?: {
    sourceApplicationId?: string;
    sourceTenantSlug?: string;
    sourceItemId?: string;
  };
  relatedItem?: { kind?: string; id?: string; canonicalSourceUrl?: string } | null;
  publishedAt?: string | null;
};

export type HospitalityFeedResult = {
  ok: boolean;
  items: HospitalityLifeOsFeedItem[];
  nextCursor: string | null;
  failure?: HospitalityFeedFailure;
};

export function hospitalityApiBase(): string {
  const fromEnv = (import.meta.env.VITE_HOSPITALITYOS_API_URL ?? "").trim().replace(/\/$/, "");
  return fromEnv || HOSPITALITYOS_API_DEFAULT;
}

function classifyFetchFailure(err: unknown): HospitalityFeedFailure {
  if (!err || typeof err !== "object") return "unavailable";
  const name = String((err as { name?: string }).name || "");
  const code = String((err as { code?: string }).code || "");
  const message = String((err as { message?: string }).message || "").toLowerCase();
  if (name === "TimeoutError" || code === "timeout" || message.includes("timeout")) {
    return "timeout";
  }
  return "unavailable";
}

export async function fetchHospitalityLifeOsFeed(opts?: {
  kind?: HospitalityFeedKind;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<HospitalityFeedResult> {
  const kind = opts?.kind ?? "all";
  const limit = opts?.limit ?? 24;
  const timeoutMs = opts?.timeoutMs ?? 1500;
  const params = new URLSearchParams();
  params.set("kind", kind);
  params.set("limit", String(limit));
  if (opts?.cursor) params.set("cursor", opts.cursor);

  const url = `${hospitalityApiBase()}/v1/public/lifeos/feed?${params.toString()}`;

  try {
    const res = await withTimeout(
      fetch(url, {
        headers: { Accept: "application/json" },
        credentials: "omit",
        signal: opts?.signal,
      }),
      timeoutMs,
      opts?.signal,
    );
    if (!res.ok) {
      return { ok: false, items: [], nextCursor: null, failure: "unavailable" };
    }
    const data = (await res.json()) as {
      items?: HospitalityLifeOsFeedItem[];
      nextCursor?: string | null;
    };
    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) {
      return { ok: true, items: [], nextCursor: null, failure: "empty" };
    }
    return {
      ok: true,
      items,
      nextCursor: data.nextCursor ?? null,
    };
  } catch (err) {
    return {
      ok: false,
      items: [],
      nextCursor: null,
      failure: classifyFetchFailure(err),
    };
  }
}

function firstAsset(
  item: HospitalityLifeOsFeedItem,
  prefer: "image" | "video" | "any" = "any",
): { href: string; kind: string } | null {
  const refs = item.assetReferences ?? [];
  if (!refs.length) return null;
  if (prefer !== "any") {
    const hit = refs.find((r) => r.kind === prefer && r.href);
    return hit ? { href: hit.href, kind: String(hit.kind || prefer) } : null;
  }
  const any = refs.find((r) => r.href);
  return any ? { href: any.href, kind: String(any.kind || "image") } : null;
}

export function mapHospitalityPublicationToMediaItem(item: HospitalityLifeOsFeedItem): MediaItem {
  const type = String(item.itemType || "").toUpperCase();
  const videoAsset = firstAsset(item, "video");
  const imageAsset = firstAsset(item, "image");
  const anyAsset = firstAsset(item, "any");
  const kind: MediaItem["kind"] =
    type === "VIDEO" || videoAsset
      ? "video"
      : type === "PHOTO" || imageAsset
        ? "picture"
        : "post";

  const mediaUrl = (videoAsset || anyAsset)?.href;
  const posterUrl = (imageAsset || (kind !== "video" ? anyAsset : null))?.href || mediaUrl;

  const relatedUrl = item.relatedItem?.canonicalSourceUrl?.trim();
  const sourceUrl = relatedUrl || item.canonicalSourceUrl || undefined;
  const sourceLabel = relatedUrl ? "View Offering" : sourceUrl ? "Visit Venue" : undefined;

  const slug = item.tenant?.slug || item.provenance?.sourceTenantSlug || "venue";

  return {
    id: `hos:hospitalityos:pub:${item.canonicalItemId}`,
    title: item.title || "Update",
    kind,
    detail: item.summary || "",
    free: true,
    ownedOrConsumed: true,
    premiumRequired: false,
    tier: "free",
    author: slug,
    likes: "0",
    mediaUrl,
    posterUrl,
    sourceUrl,
    sourceLabel,
    sourceApplicationId: item.provenance?.sourceApplicationId || item.applicationId || "hospitalityos",
    storeDisplayName: item.tenant?.displayName || undefined,
    publishedAt: item.publishedAt || undefined,
  };
}

export function mapOfferingToCatalogueItem(item: HospitalityLifeOsFeedItem): CatalogueItem {
  const slug = item.tenant?.slug || item.provenance?.sourceTenantSlug || "venue";
  const display = item.tenant?.displayName || slug;
  const image = firstAsset(item, "image") || firstAsset(item, "any");
  const priceLabel =
    item.price?.amount && item.price?.currency
      ? `${item.price.currency} ${item.price.amount}`
      : undefined;

  return {
    id: `hos:hospitalityos:offering:${item.canonicalItemId}`,
    title: item.title,
    itemType: String(item.itemType || "OFFERING").toUpperCase(),
    ownerSlug: slug,
    ownerDisplayName: display,
    applicationId: item.applicationId || "hospitalityos",
    canonicalItemId: item.canonicalItemId,
    mediaUrl: image?.href,
    destinationUrl: item.canonicalSourceUrl,
    priceLabel,
  };
}

export { assembleMediaFeed };
export type { DatedMediaItem };
