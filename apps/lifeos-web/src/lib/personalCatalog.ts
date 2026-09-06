const PREMIUM_KEY = "lifeos.premium.active";

export function hasPremium(): boolean {
  try {
    return localStorage.getItem(PREMIUM_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPremium(active: boolean) {
  try {
    if (active) localStorage.setItem(PREMIUM_KEY, "1");
    else localStorage.removeItem(PREMIUM_KEY);
  } catch {
    /* */
  }
}

export type MediaItem = {
  id: string;
  title: string;
  kind: "video" | "picture" | "reel" | "music" | "podcast" | "book" | "course" | "school" | "post" | "info";
  detail: string;
  /** Creator marked free for Free kernel / free tier */
  free: boolean;
  /** User purchased or previously consumed — Offline kernel */
  ownedOrConsumed: boolean;
  /** Requires Main-kernel Premium to play */
  premiumRequired: boolean;
};

/** Demo catalog for Personal surfaces until Digiconomy feeds wire in. */
export const PERSONAL_CATALOG: MediaItem[] = [
  {
    id: "p1",
    title: "Sunset on the lagoon",
    kind: "picture",
    detail: "Photo post · Lagos",
    free: true,
    ownedOrConsumed: true,
    premiumRequired: false,
  },
  {
    id: "p2",
    title: "Street food walk",
    kind: "video",
    detail: "Free video post · 2:14",
    free: true,
    ownedOrConsumed: false,
    premiumRequired: false,
  },
  {
    id: "r1",
    title: "Morning stretch reel",
    kind: "reel",
    detail: "Short · Premium stream",
    free: false,
    ownedOrConsumed: false,
    premiumRequired: true,
  },
  {
    id: "r2",
    title: "Creator tip of the day",
    kind: "reel",
    detail: "Free reel",
    free: true,
    ownedOrConsumed: true,
    premiumRequired: false,
  },
  {
    id: "m1",
    title: "Afrobeats After Dark",
    kind: "music",
    detail: "Album · Premium listen",
    free: false,
    ownedOrConsumed: true,
    premiumRequired: true,
  },
  {
    id: "m2",
    title: "Open Mic Friday",
    kind: "music",
    detail: "Free single",
    free: true,
    ownedOrConsumed: false,
    premiumRequired: false,
  },
  {
    id: "pod1",
    title: "Builders in Public",
    kind: "podcast",
    detail: "Episode 12 · Premium",
    free: false,
    ownedOrConsumed: true,
    premiumRequired: true,
  },
  {
    id: "pod2",
    title: "Community radio hour",
    kind: "podcast",
    detail: "Free episode",
    free: true,
    ownedOrConsumed: true,
    premiumRequired: false,
  },
  {
    id: "v1",
    title: "Cinema cut — Night Drive",
    kind: "video",
    detail: "Feature · Premium",
    free: false,
    ownedOrConsumed: true,
    premiumRequired: true,
  },
  {
    id: "v2",
    title: "Indie short — Bus Stop",
    kind: "video",
    detail: "Creator free video",
    free: true,
    ownedOrConsumed: false,
    premiumRequired: false,
  },
  {
    id: "b1",
    title: "Design systems handbook",
    kind: "book",
    detail: "LearnVerse book",
    free: false,
    ownedOrConsumed: true,
    premiumRequired: true,
  },
  {
    id: "c1",
    title: "Product craft 101",
    kind: "course",
    detail: "12 lessons",
    free: true,
    ownedOrConsumed: false,
    premiumRequired: false,
  },
  {
    id: "s1",
    title: "TrustID Academy",
    kind: "school",
    detail: "Partner school",
    free: false,
    ownedOrConsumed: false,
    premiumRequired: true,
  },
  {
    id: "i1",
    title: "How LifeOS kernels work",
    kind: "info",
    detail: "Guide",
    free: true,
    ownedOrConsumed: true,
    premiumRequired: false,
  },
  {
    id: "i2",
    title: "Weekend events near you",
    kind: "info",
    detail: "Local picks",
    free: true,
    ownedOrConsumed: false,
    premiumRequired: false,
  },
];

export function catalogByKinds(kinds: MediaItem["kind"][]): MediaItem[] {
  return PERSONAL_CATALOG.filter((i) => kinds.includes(i.kind));
}

export function freeCatalog(): MediaItem[] {
  return PERSONAL_CATALOG.filter((i) => i.free);
}

export function offlineCatalog(): MediaItem[] {
  return PERSONAL_CATALOG.filter((i) => i.ownedOrConsumed);
}

export function randomCatalogItem(): MediaItem {
  const pool = PERSONAL_CATALOG;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
