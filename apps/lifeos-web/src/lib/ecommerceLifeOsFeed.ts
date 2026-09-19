import type { MediaItem } from "./personalCatalog";
import type { CatalogueItem } from "./mybrandPublicFeed";

/** Hosted EcommerceOS API (Digipedia / Desktop config). */
export const ECOMMERCEOS_API_DEFAULT =
  "https://ecommerceos-api-production.up.railway.app";

export type EcommerceFeedKind = "product" | "publication" | "all";

export type EcommerceFeedFailure = "timeout" | "unavailable" | "empty";

export type EcommerceLifeOsFeedItem = {
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

export type EcommerceFeedResult = {
  ok: boolean;
  items: EcommerceLifeOsFeedItem[];
  nextCursor: string | null;
  failure?: EcommerceFeedFailure;
};

export type DatedMediaItem = {
  item: MediaItem;
  publishedAt: string | null;
};

export function ecommerceApiBase(): string {
  const fromEnv = (import.meta.env.VITE_ECOMMERCEOS_API_URL ?? "").trim().replace(/\/$/, "");
  return fromEnv || ECOMMERCEOS_API_DEFAULT;
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<T> {
  if (timeoutMs <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error("timeout"), { name: "TimeoutError", code: "timeout" }));
    }, timeoutMs);

    const onAbort = () => {
      clearTimeout(timer);
      reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    };
    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    promise.then(
      (value) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

function classifyFetchFailure(err: unknown): EcommerceFeedFailure {
  if (!err || typeof err !== "object") return "unavailable";
  const name = String((err as { name?: string }).name || "");
  const code = String((err as { code?: string }).code || "");
  const message = String((err as { message?: string }).message || "").toLowerCase();
  if (name === "TimeoutError" || code === "timeout" || message.includes("timeout")) {
    return "timeout";
  }
  return "unavailable";
}

export async function fetchEcommerceLifeOsFeed(opts?: {
  kind?: EcommerceFeedKind;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<EcommerceFeedResult> {
  const kind = opts?.kind ?? "all";
  const limit = opts?.limit ?? 24;
  const timeoutMs = opts?.timeoutMs ?? 1500;
  const params = new URLSearchParams();
  params.set("kind", kind);
  params.set("limit", String(limit));
  if (opts?.cursor) params.set("cursor", opts.cursor);

  const url = `${ecommerceApiBase()}/v1/public/lifeos/feed?${params.toString()}`;

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
      items?: EcommerceLifeOsFeedItem[];
      nextCursor?: string | null;
      count?: number;
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
  item: EcommerceLifeOsFeedItem,
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

/**
 * Business publication → immersive MediaItem.
 * Prefer related product deep link when present; otherwise storefront publication URL.
 */
export function mapPublicationToMediaItem(item: EcommerceLifeOsFeedItem): MediaItem {
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
  const sourceLabel = relatedUrl ? "View Product" : sourceUrl ? "Visit Store" : undefined;

  const slug = item.tenant?.slug || item.provenance?.sourceTenantSlug || "store";

  return {
    id: `eco:ecommerceos:pub:${item.canonicalItemId}`,
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
    sourceApplicationId: item.provenance?.sourceApplicationId || item.applicationId || "ecommerceos",
    storeDisplayName: item.tenant?.displayName || undefined,
    publishedAt: item.publishedAt || undefined,
  };
}

export function mapProductToCatalogueItem(item: EcommerceLifeOsFeedItem): CatalogueItem {
  const slug = item.tenant?.slug || item.provenance?.sourceTenantSlug || "store";
  const display = item.tenant?.displayName || slug;
  const image = firstAsset(item, "image") || firstAsset(item, "any");
  const priceLabel =
    item.price?.amount && item.price?.currency
      ? `${item.price.currency} ${item.price.amount}`
      : undefined;

  return {
    id: `eco:ecommerceos:product:${item.canonicalItemId}`,
    title: item.title,
    itemType: String(item.itemType || "PRODUCT").toUpperCase(),
    ownerSlug: slug,
    ownerDisplayName: display,
    applicationId: item.applicationId || "ecommerceos",
    canonicalItemId: item.canonicalItemId,
    mediaUrl: image?.href,
    destinationUrl: item.canonicalSourceUrl,
    priceLabel,
  };
}

/** Newest publishedAt first; stable id tie-break. Missing dates sort last (as 0). */
export function assembleMediaFeed(batches: DatedMediaItem[][]): MediaItem[] {
  const seen = new Set<string>();
  return batches
    .flat()
    .sort((a, b) => {
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      if (tb !== ta) return tb - ta;
      return a.item.id.localeCompare(b.item.id);
    })
    .map((d) => d.item)
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
}

export function classifyEcommerceFeedOutcome(result: EcommerceFeedResult): EcommerceFeedFailure | "ok" {
  if (result.ok && result.items.length) return "ok";
  if (result.failure) return result.failure;
  if (result.ok && !result.items.length) return "empty";
  return "unavailable";
}
