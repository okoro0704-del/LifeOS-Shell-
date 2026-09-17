import type { MediaItem } from "./personalCatalog";
import { api } from "./api";
import { MYBRANDOS_PRODUCTION_URL } from "./mybrandOS";

type PublicAssetCard = {
  id: string;
  title: string;
  description: string;
  assetType: string;
  publishedAt: string;
  coverAvailable: boolean;
  presentationTypes?: string[];
  presentation?: { body?: string };
};

type PublicExperience = {
  slug: string;
  identity?: { displayName?: string };
  publishedAssets?: PublicAssetCard[];
  feed?: Array<{ id: string; kind: string; title: string; summary?: string; assetId?: string; coverAvailable?: boolean }>;
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

function projectionToMediaItem(row: LifeOsPublication): MediaItem {
  return {
    id: `eco:${row.originApplicationId}:${row.originPublicationId}`,
    title: row.title,
    kind: "post",
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
    return (data.items ?? []).map(projectionToMediaItem);
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
    return assets
      .filter(
        (asset) =>
          (asset.presentationTypes ?? []).includes("POST") ||
          asset.assetType === "DESIGN" ||
          (asset.assetType === "WRITING" && (asset.presentationTypes ?? []).includes("POST")),
      )
      .map((asset) => {
        const caption =
          (typeof asset.presentation?.body === "string" && asset.presentation.body) ||
          asset.description ||
          "";
        const cover = asset.coverAvailable
          ? `${origin}/api/public/${encodeURIComponent(clean)}/assets/${encodeURIComponent(asset.id)}/cover`
          : undefined;
        return {
          id: `mybrand:${clean}:${asset.id}`,
          title: asset.title,
          kind: "post" as const,
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
