import type { MediaItem } from "./personalCatalog";
import { PERSONAL_CATALOG } from "./personalCatalog";

export type ContentTier = "free" | "premium" | "vip";

export type AdCreative = {
  id: string;
  title: string;
  advertiser: string;
  detail: string;
  cta: string;
  posterUrl?: string;
  mediaUrl?: string;
  /** Creator who earns from this Free-kernel ad slot */
  creatorShare?: string;
};

const CREDITS_KEY = "lifeos.credits.balance";
const SAVED_ADS_KEY = "lifeos.offline.saved_ads";
const USER_POSTS_KEY = "lifeos.user.posts";
const DEFAULT_CREDITS = 120;

export const FREE_KERNEL_ADS: AdCreative[] = [
  {
    id: "ad1",
    title: "Harbour Cafe weekend set",
    advertiser: "Harbour Cafe",
    detail: "Sponsored · Free kernel only",
    cta: "Visit",
    posterUrl: "https://picsum.photos/seed/ad-harbour/1080/1920",
    creatorShare: "Creators earn from this Free slot",
  },
  {
    id: "ad2",
    title: "Nova Salon — first cut",
    advertiser: "Nova Salon",
    detail: "Sponsored · Tap to save for Offline",
    cta: "Book later",
    posterUrl: "https://picsum.photos/seed/ad-nova/1080/1920",
    creatorShare: "Ad revenue shares with creators",
  },
  {
    id: "ad3",
    title: "Pulse Gym trial week",
    advertiser: "Pulse Gym",
    detail: "Sponsored · Interrupted Free watch",
    cta: "Claim trial",
    mediaUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    posterUrl: "https://picsum.photos/seed/ad-pulse/1080/1920",
    creatorShare: "Free-space ads fund creators",
  },
];

export function getLifeOsCredits(): number {
  try {
    const raw = localStorage.getItem(CREDITS_KEY);
    if (raw == null) {
      localStorage.setItem(CREDITS_KEY, String(DEFAULT_CREDITS));
      return DEFAULT_CREDITS;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : DEFAULT_CREDITS;
  } catch {
    return DEFAULT_CREDITS;
  }
}

export function setLifeOsCredits(n: number) {
  try {
    localStorage.setItem(CREDITS_KEY, String(Math.max(0, Math.floor(n))));
  } catch {
    /* */
  }
}

export function spendLifeOsCredits(amount: number): number {
  const next = Math.max(0, getLifeOsCredits() - Math.max(0, amount));
  setLifeOsCredits(next);
  return next;
}

export function topUpLifeOsCredits(amount: number): number {
  const next = getLifeOsCredits() + Math.max(0, amount);
  setLifeOsCredits(next);
  return next;
}

export function listSavedAds(): AdCreative[] {
  try {
    const raw = localStorage.getItem(SAVED_ADS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AdCreative[];
  } catch {
    return [];
  }
}

export function saveAdToOffline(ad: AdCreative): boolean {
  try {
    const list = listSavedAds();
    if (list.some((a) => a.id === ad.id)) return false;
    list.unshift(ad);
    localStorage.setItem(SAVED_ADS_KEY, JSON.stringify(list.slice(0, 40)));
    return true;
  } catch {
    return false;
  }
}

export function isAdSaved(id: string): boolean {
  return listSavedAds().some((a) => a.id === id);
}

export type UserPostDraft = {
  id: string;
  title: string;
  kind: MediaItem["kind"];
  detail: string;
  tier: ContentTier;
  vipCreditRate?: number;
  createdAt: string;
};

export function listUserPosts(): MediaItem[] {
  try {
    const raw = localStorage.getItem(USER_POSTS_KEY);
    if (!raw) return [];
    const drafts = JSON.parse(raw) as UserPostDraft[];
    return drafts.map(draftToMedia);
  } catch {
    return [];
  }
}

function draftToMedia(d: UserPostDraft): MediaItem {
  return {
    id: d.id,
    title: d.title,
    kind: d.kind,
    detail: d.detail,
    free: d.tier === "free",
    ownedOrConsumed: true,
    premiumRequired: d.tier === "premium",
    tier: d.tier,
    vipCreditRate: d.tier === "vip" ? d.vipCreditRate ?? 4 : undefined,
    author: "you",
    likes: "0",
    posterUrl: `https://picsum.photos/seed/${encodeURIComponent(d.id)}/1080/1920`,
  };
}

export function publishUserPost(input: {
  title: string;
  kind: MediaItem["kind"];
  detail: string;
  tier: ContentTier;
  vipCreditRate?: number;
}): MediaItem {
  const draft: UserPostDraft = {
    id: `up-${Date.now()}`,
    title: input.title.trim() || "Untitled",
    kind: input.kind,
    detail: input.detail.trim() || tierDetail(input.tier),
    tier: input.tier,
    vipCreditRate: input.tier === "vip" ? input.vipCreditRate ?? 4 : undefined,
    createdAt: new Date().toISOString(),
  };
  try {
    const raw = localStorage.getItem(USER_POSTS_KEY);
    const list: UserPostDraft[] = raw ? (JSON.parse(raw) as UserPostDraft[]) : [];
    list.unshift(draft);
    localStorage.setItem(USER_POSTS_KEY, JSON.stringify(list.slice(0, 60)));
  } catch {
    /* */
  }
  return draftToMedia(draft);
}

function tierDetail(tier: ContentTier): string {
  if (tier === "premium") return "Premium post · no ads on Main";
  if (tier === "vip") return "VIP · spends LifeOS credits while you watch";
  return "Free · runs with ads in Free kernel";
}

/** Resolve tier for catalog rows that predate explicit tiers. */
export function resolveTier(item: MediaItem): ContentTier {
  if (item.tier) return item.tier;
  if (item.kind === "book" || item.kind === "course" || (item.kind === "video" && item.premiumRequired && item.ownedOrConsumed)) {
    return "vip";
  }
  if (item.premiumRequired) return "premium";
  return "free";
}

export function vipRateFor(item: MediaItem): number {
  if (item.vipCreditRate && item.vipCreditRate > 0) return item.vipCreditRate;
  if (resolveTier(item) === "vip") {
    if (item.kind === "book") return 2;
    if (item.kind === "course" || item.kind === "edu") return 5;
    return 4;
  }
  return 0;
}

/** Interleave Free-kernel ads every `every` content items. Main never uses this. */
export function withFreeKernelAds(items: MediaItem[], every = 2): Array<
  | { type: "content"; item: MediaItem }
  | { type: "ad"; ad: AdCreative }
> {
  const out: Array<{ type: "content"; item: MediaItem } | { type: "ad"; ad: AdCreative }> = [];
  let adIdx = 0;
  items.forEach((item, i) => {
    out.push({ type: "content", item });
    if ((i + 1) % every === 0) {
      out.push({ type: "ad", ad: FREE_KERNEL_ADS[adIdx % FREE_KERNEL_ADS.length]! });
      adIdx += 1;
    }
  });
  return out;
}

export function creatorEarnHint(tier: ContentTier): string {
  if (tier === "free") return "Earn from Free-kernel ads";
  if (tier === "premium") return "Earn from Premium subscriptions";
  return "Earn from VIP credit spend";
}

/** Ensure demo VIP products exist with credit rates. */
export function ensureVipDemoFlags() {
  for (const item of PERSONAL_CATALOG) {
    if (item.kind === "book" || item.kind === "course") {
      item.tier = "vip";
      item.vipCreditRate = item.kind === "book" ? 2 : 5;
      item.premiumRequired = false;
    }
    if (item.id === "v1") {
      item.tier = "vip";
      item.vipCreditRate = 6;
      item.detail = "VIP movie · credits drain while watching";
    }
  }
}
