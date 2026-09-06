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
  kind: "video" | "picture" | "reel" | "music" | "podcast" | "book" | "course" | "edu" | "school" | "post" | "info";
  detail: string;
  /** Creator marked free for Free kernel / free tier */
  free: boolean;
  /** User purchased or previously consumed — Offline kernel */
  ownedOrConsumed: boolean;
  /** Requires Main-kernel Premium to play */
  premiumRequired: boolean;
  /** Posting tier: free (ads in Free), premium (Main, no ads), vip (credits) */
  tier?: "free" | "premium" | "vip";
  /** LifeOS credits spent per tick while VIP content plays */
  vipCreditRate?: number;
  author?: string;
  likes?: string;
  mediaUrl?: string;
  posterUrl?: string;
  /** Paid to appear in Plus trending */
  trending?: boolean;
  trendScore?: number;
};

const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
];

function poster(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1080/1920`;
}

function videoAt(i: number) {
  return SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length]!;
}

/** Demo catalog for Personal surfaces until Digiconomy feeds wire in. */
export const PERSONAL_CATALOG: MediaItem[] = [
  {
    id: "p1",
    title: "Sunset on the lagoon",
    kind: "picture",
    detail: "Golden hour over Lagos waters",
    free: true,
    ownedOrConsumed: true,
    premiumRequired: false,
    author: "amaka.lens",
    likes: "12.4k",
    posterUrl: poster("lagoon-sunset"),
    trending: true,
    trendScore: 96,
    tier: "free",
  },
  {
    id: "p2",
    title: "Street food walk",
    kind: "video",
    detail: "Free video post · 2:14",
    free: true,
    ownedOrConsumed: false,
    premiumRequired: false,
    author: "kofi.eats",
    likes: "8.1k",
    mediaUrl: videoAt(0),
    posterUrl: poster("street-food"),
    trending: true,
    trendScore: 88,
    tier: "free",
  },
  {
    id: "p3",
    title: "Studio session stills",
    kind: "picture",
    detail: "Behind the beat",
    free: false,
    ownedOrConsumed: true,
    premiumRequired: false,
    author: "tunde.beats",
    likes: "3.2k",
    posterUrl: poster("studio-stills"),
  },
  {
    id: "p4",
    title: "Market morning",
    kind: "post",
    detail: "Colour, noise, and fresh produce",
    free: true,
    ownedOrConsumed: true,
    premiumRequired: false,
    author: "city.diary",
    likes: "5.6k",
    posterUrl: poster("market-morning"),
  },
  {
    id: "p5",
    title: "Rain on glass",
    kind: "video",
    detail: "Short city mood · Premium",
    free: false,
    ownedOrConsumed: false,
    premiumRequired: true,
    author: "maya.films",
    likes: "21k",
    mediaUrl: videoAt(1),
    posterUrl: poster("rain-glass"),
  },
  {
    id: "p6",
    title: "Night bridge lights",
    kind: "picture",
    detail: "Long exposure · Free drop",
    free: true,
    ownedOrConsumed: false,
    premiumRequired: false,
    author: "night.drive",
    likes: "9.9k",
    posterUrl: poster("bridge-lights"),
  },
  {
    id: "p7",
    title: "Workshop hands",
    kind: "video",
    detail: "Craft in motion",
    free: true,
    ownedOrConsumed: true,
    premiumRequired: false,
    author: "makers.ng",
    likes: "4.4k",
    mediaUrl: videoAt(2),
    posterUrl: poster("workshop-hands"),
  },
  {
    id: "p8",
    title: "Rooftop gathering",
    kind: "picture",
    detail: "Friends · Friday",
    free: false,
    ownedOrConsumed: true,
    premiumRequired: false,
    author: "lagos.creators",
    likes: "15k",
    posterUrl: poster("rooftop"),
  },
  {
    id: "r1",
    title: "Morning stretch reel",
    kind: "reel",
    detail: "Start the day slow",
    free: false,
    ownedOrConsumed: false,
    premiumRequired: true,
    author: "move.daily",
    likes: "44k",
    mediaUrl: videoAt(3),
    posterUrl: poster("stretch-reel"),
    trending: true,
    trendScore: 99,
  },
  {
    id: "r2",
    title: "Creator tip of the day",
    kind: "reel",
    detail: "Free reel · lighting hack",
    free: true,
    ownedOrConsumed: true,
    premiumRequired: false,
    author: "ada.creates",
    likes: "18k",
    mediaUrl: videoAt(4),
    posterUrl: poster("creator-tip"),
  },
  {
    id: "r3",
    title: "Kitchen 60s",
    kind: "reel",
    detail: "Pepper soup in a minute",
    free: true,
    ownedOrConsumed: false,
    premiumRequired: false,
    author: "kofi.eats",
    likes: "27k",
    mediaUrl: videoAt(0),
    posterUrl: poster("kitchen-60"),
  },
  {
    id: "r4",
    title: "Dance break",
    kind: "reel",
    detail: "Afrobeats freestyle",
    free: false,
    ownedOrConsumed: true,
    premiumRequired: true,
    author: "tunde.beats",
    likes: "62k",
    mediaUrl: videoAt(1),
    posterUrl: poster("dance-break"),
    trending: true,
    trendScore: 94,
  },
  {
    id: "r5",
    title: "Offline saved clip",
    kind: "reel",
    detail: "Downloaded for Offline",
    free: false,
    ownedOrConsumed: true,
    premiumRequired: false,
    author: "maya.films",
    likes: "7.1k",
    mediaUrl: videoAt(2),
    posterUrl: poster("offline-clip"),
  },
  {
    id: "r6",
    title: "Open mic teaser",
    kind: "reel",
    detail: "Free Friday drop",
    free: true,
    ownedOrConsumed: true,
    premiumRequired: false,
    author: "open.mic",
    likes: "11k",
    mediaUrl: videoAt(3),
    posterUrl: poster("open-mic"),
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
    author: "maya.films",
    likes: "33k",
    mediaUrl: videoAt(4),
    posterUrl: poster("night-drive"),
    trending: true,
    trendScore: 91,
  },
  {
    id: "v2",
    title: "Indie short — Bus Stop",
    kind: "video",
    detail: "Creator free video",
    free: true,
    ownedOrConsumed: false,
    premiumRequired: false,
    author: "indie.house",
    likes: "6.8k",
    mediaUrl: videoAt(0),
    posterUrl: poster("bus-stop"),
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
    detail: "12 lessons · general learning",
    free: true,
    ownedOrConsumed: false,
    premiumRequired: false,
  },
  {
    id: "e1",
    title: "WAEC Sciences Prep",
    kind: "edu",
    detail: "Secondary · exam track",
    free: false,
    ownedOrConsumed: true,
    premiumRequired: true,
  },
  {
    id: "e2",
    title: "First-year Engineering Maths",
    kind: "edu",
    detail: "Higher education · semester 1",
    free: true,
    ownedOrConsumed: false,
    premiumRequired: false,
  },
  {
    id: "e3",
    title: "A-Level Literature seminar",
    kind: "edu",
    detail: "Secondary · specialized",
    free: false,
    ownedOrConsumed: false,
    premiumRequired: true,
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

/** Plus — paid trending first, then by score. */
export function trendingCatalog(pool: MediaItem[] = PERSONAL_CATALOG): MediaItem[] {
  return [...pool].sort((a, b) => {
    const at = a.trending ? 1 : 0;
    const bt = b.trending ? 1 : 0;
    if (at !== bt) return bt - at;
    return (b.trendScore ?? 0) - (a.trendScore ?? 0);
  });
}

const TREND_KEY = "lifeos.trend.ids";

export function markTrending(id: string) {
  try {
    const raw = localStorage.getItem(TREND_KEY);
    const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(TREND_KEY, JSON.stringify(ids));
    }
    const item = PERSONAL_CATALOG.find((i) => i.id === id);
    if (item) {
      item.trending = true;
      item.trendScore = Math.max(item.trendScore ?? 0, 85);
    }
  } catch {
    /* */
  }
}

export function applyStoredTrends() {
  try {
    const raw = localStorage.getItem(TREND_KEY);
    if (!raw) return;
    const ids = JSON.parse(raw) as string[];
    for (const id of ids) {
      const item = PERSONAL_CATALOG.find((i) => i.id === id);
      if (item) {
        item.trending = true;
        item.trendScore = Math.max(item.trendScore ?? 0, 80);
      }
    }
  } catch {
    /* */
  }
}

export function freeCatalog(): MediaItem[] {
  return PERSONAL_CATALOG.filter((i) => i.free || i.tier === "free" || (!i.tier && !i.premiumRequired));
}

export function offlineCatalog(): MediaItem[] {
  return PERSONAL_CATALOG.filter((i) => i.ownedOrConsumed);
}

export function randomCatalogItem(): MediaItem {
  const pool = PERSONAL_CATALOG;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/** Normalize demo tiers once at module load. */
function seedContentTiers() {
  for (const item of PERSONAL_CATALOG) {
    if (item.tier) continue;
    if (item.kind === "book" || item.kind === "course") {
      item.tier = "vip";
      item.vipCreditRate = item.kind === "book" ? 2 : 5;
      continue;
    }
    if (item.id === "v1") {
      item.tier = "vip";
      item.vipCreditRate = 6;
      item.detail = "VIP movie · credits drain while watching";
      continue;
    }
    if (item.premiumRequired) {
      item.tier = "premium";
      continue;
    }
    item.tier = "free";
  }
}

seedContentTiers();
