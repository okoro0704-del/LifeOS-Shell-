import type { MediaItem } from "./personalCatalog";
import { api } from "./api";
import { MYBRANDOS_PRODUCTION_URL } from "./mybrandOS";
import { installedAppsService } from "./services";
import type { InstalledAppManifest } from "@lifeos/shared";

type PublicAssetCard = {
  id: string;
  title: string;
  description: string;
  assetType: string;
  publishedAt: string;
  coverAvailable: boolean;
  presentationTypes?: string[];
  presentation?: {
    body?: string;
    storeAvailable?: boolean;
    downloadAvailable?: boolean;
  };
};

type PublicExperience = {
  slug: string;
  identity?: { displayName?: string };
  publishedAssets?: PublicAssetCard[];
  feed?: Array<{
    id: string;
    kind: string;
    title: string;
    summary?: string;
    assetId?: string;
    coverAvailable?: boolean;
  }>;
};

type LifeOsPublication = {
  id: string;
  originApplicationId: string;
  originTenantId: string;
  originPublicationId: string;
  originAssetIds: string[];
  publicationType: string;
  title: string;
  caption: string;
  authorDisplayName: string;
  authorSlug: string;
  publicDestinationUrl: string;
  mediaUrl: string | null;
  mediaStatus: string;
  publishedAt: string;
};

export type CatalogueItem = {
  id: string;
  title: string;
  itemType: string;
  ownerSlug: string;
  ownerDisplayName: string;
  applicationId: string;
  canonicalItemId: string;
  mediaUrl?: string;
  destinationUrl: string;
  priceLabel?: string;
};

const RESERVED_SLUGS = new Set(["mybrandos", "hospitalityos", "serviceos", "ecommerceos"]);

function publicApiBase(slug: string): string {
  const clean = slug.replace(/^@/, "").trim().toLowerCase();
  const fromEnv = (import.meta.env.VITE_MYBRANDOS_API_URL ?? "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv.endsWith("/api") ? fromEnv : `${fromEnv}/api`;
  if (typeof window !== "undefined" && window.location.hostname.endsWith("getlifeos.app")) {
    return `https://${clean}.getlifeos.app/api`;
  }
  return `${MYBRANDOS_PRODUCTION_URL}/api`;
}

function publicOrigin(slug: string): string {
  const clean = slug.replace(/^@/, "").trim().toLowerCase();
  const fromEnv = (import.meta.env.VITE_MYBRANDOS_API_URL ?? "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv.replace(/\/api$/, "");
  if (typeof window !== "undefined" && window.location.hostname.endsWith("getlifeos.app")) {
    return `https://${clean}.getlifeos.app`;
  }
  return MYBRANDOS_PRODUCTION_URL;
}

function isPostLikeAsset(asset: PublicAssetCard): boolean {
  const types = (asset.presentationTypes ?? []).map((t) => String(t).toUpperCase());
  const assetType = String(asset.assetType ?? "").toUpperCase();
  if (types.includes("POST") || types.includes("PHOTO")) return true;
  if (assetType === "DESIGN" || assetType === "PHOTO") return true;
  if (assetType === "WRITING" && types.includes("POST")) return true;
  return false;
}

function isCatalogueAsset(asset: PublicAssetCard): boolean {
  const types = (asset.presentationTypes ?? []).map((t) => String(t).toUpperCase());
  const assetType = String(asset.assetType ?? "").toUpperCase();
  if (types.includes("PRODUCT") || types.includes("STORE") || types.includes("OFFER")) return true;
  if (assetType === "PRODUCT" || assetType === "STORE") return true;
  if (asset.presentation?.storeAvailable === true) return true;
  return false;
}

function projectionToMediaItem(row: LifeOsPublication): MediaItem {
  const kind =
    row.publicationType === "PHOTO"
      ? "picture"
      : row.publicationType === "VIDEO" || row.publicationType === "REEL"
        ? row.publicationType === "REEL"
          ? "reel"
          : "video"
        : "post";
  return {
    id: `eco:${row.originApplicationId}:${row.originPublicationId}`,
    title: row.title,
    kind,
    detail: row.caption,
    free: true,
    ownedOrConsumed: true,
    premiumRequired: false,
    tier: "free",
    author: row.authorSlug,
    likes: "0",
    posterUrl: row.mediaUrl || undefined,
    mediaUrl: row.mediaUrl || undefined,
  };
}

/** Preferred path: LifeOS server projections (ingestion + reconciliation). */
export async function fetchLifeOsPublicationFeed(): Promise<MediaItem[]> {
  try {
    const data = await api<{ items: LifeOsPublication[]; count: number }>("/v1/publications/feed");
    return (data.items ?? [])
      .filter((row) => row.mediaStatus !== "broken")
      .map(projectionToMediaItem);
  } catch {
    return [];
  }
}

/** Digiconomy consume path: LifeOS reads the same public mybrandOS Assets (publish once). */
export async function fetchMybrandPublicPosts(slug: string): Promise<MediaItem[]> {
  const clean = slug.replace(/^@/, "").trim().toLowerCase();
  if (!clean) return [];
  try {
    const res = await fetch(`${publicApiBase(clean)}/public/${encodeURIComponent(clean)}`, {
      headers: { Accept: "application/json" },
      credentials: "omit",
    });
    if (!res.ok) return [];
    const experience = (await res.json()) as PublicExperience;
    const origin = publicOrigin(clean);
    const assets = experience.publishedAssets ?? [];
    return assets.filter(isPostLikeAsset).map((asset) => {
      const caption =
        (typeof asset.presentation?.body === "string" && asset.presentation.body) ||
        asset.description ||
        "";
      const cover = asset.coverAvailable
        ? `${origin}/api/public/${encodeURIComponent(clean)}/assets/${encodeURIComponent(asset.id)}/cover`
        : undefined;
      const types = (asset.presentationTypes ?? []).map((t) => String(t).toUpperCase());
      const kind =
        types.includes("PHOTO") || String(asset.assetType).toUpperCase() === "PHOTO"
          ? ("picture" as const)
          : ("post" as const);
      return {
        id: `mybrand:${clean}:${asset.id}`,
        title: asset.title,
        kind,
        detail: caption,
        free: true,
        ownedOrConsumed: true,
        premiumRequired: false,
        tier: "free" as const,
        author: clean,
        likes: "0",
        posterUrl: cover,
        mediaUrl: cover,
      } satisfies MediaItem;
    });
  } catch {
    return [];
  }
}

async function brandSlugsFromInstalledApps(): Promise<string[]> {
  try {
    const data = await installedAppsService.list();
    const apps = (data.apps ?? []) as InstalledAppManifest[];
    return [
      ...new Set(
        apps
          .map((a) => String(a.subdomain || "").trim().toLowerCase())
          .filter((slug) => slug && !RESERVED_SLUGS.has(slug)),
      ),
    ];
  } catch {
    return [];
  }
}

/**
 * Catalogue discovery from branded Digital Spaces via public contract.
 * Does not invent LifeOS-owned commerce records.
 */
export async function fetchBrandedCatalogueItems(): Promise<CatalogueItem[]> {
  const fromFeed: CatalogueItem[] = [];
  try {
    const data = await api<{ items: LifeOsPublication[]; count: number }>("/v1/publications/feed");
    for (const row of data.items ?? []) {
      const type = String(row.publicationType || "").toUpperCase();
      if (type !== "PRODUCT" && type !== "STORE" && type !== "OFFER") continue;
      fromFeed.push({
        id: `eco-cat:${row.originApplicationId}:${row.originPublicationId}`,
        title: row.title,
        itemType: type,
        ownerSlug: row.authorSlug,
        ownerDisplayName: row.authorDisplayName || row.authorSlug,
        applicationId: row.originApplicationId,
        canonicalItemId: row.originPublicationId,
        mediaUrl: row.mediaUrl || undefined,
        destinationUrl: row.publicDestinationUrl,
      });
    }
  } catch {
    /* projections optional */
  }

  const slugs = await brandSlugsFromInstalledApps();
  // Always include known live creator when installed list is empty (public consume).
  const probe = slugs.length ? slugs : [];
  const batches = await Promise.all(
    probe.map(async (slug) => {
      try {
        const res = await fetch(`${publicApiBase(slug)}/public/${encodeURIComponent(slug)}`, {
          headers: { Accept: "application/json" },
          credentials: "omit",
        });
        if (!res.ok) return [] as CatalogueItem[];
        const experience = (await res.json()) as PublicExperience;
        const origin = publicOrigin(slug);
        const display = experience.identity?.displayName || slug;
        return (experience.publishedAssets ?? []).filter(isCatalogueAsset).map((asset) => {
          const cover = asset.coverAvailable
            ? `${origin}/api/public/${encodeURIComponent(slug)}/assets/${encodeURIComponent(asset.id)}/cover`
            : undefined;
          return {
            id: `mybrand-cat:${slug}:${asset.id}`,
            title: asset.title,
            itemType: "STORE",
            ownerSlug: slug,
            ownerDisplayName: display,
            applicationId: "mybrandos",
            canonicalItemId: asset.id,
            mediaUrl: cover,
            destinationUrl: `https://${slug}.getlifeos.app/`,
          } satisfies CatalogueItem;
        });
      } catch {
        return [] as CatalogueItem[];
      }
    }),
  );

  const merged = [...fromFeed, ...batches.flat()];
  const seen = new Set<string>();
  return merged.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
