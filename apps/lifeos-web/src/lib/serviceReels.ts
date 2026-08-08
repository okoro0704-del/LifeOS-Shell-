/** Instagram-style service reels shown from the center + button. */

export type ServiceReel = {
  id: string;
  title: string;
  category: string;
  blurb: string;
  place: string;
  priceHint: string;
  href: string;
  /** Autoplay muted preview */
  videoUrl: string;
  posterUrl: string;
  /** Masonry span in the explore grid */
  span: "tall" | "wide" | "square";
};

/**
 * Curated mock clips across hospitality, transport, wellness, dining, etc.
 * Videos are free stock (Pexels); posters are Unsplash stills for instant paint.
 */
export const SERVICE_REELS: ServiceReel[] = [
  {
    id: "reel_suite_lagos",
    title: "Harbor Suite",
    category: "Stay",
    blurb: "Waterfront king suite with skyline views",
    place: "Victoria Island",
    priceHint: "From ₦185k / night",
    href: "/app/services/Stay/feed",
    videoUrl:
      "https://videos.pexels.com/video-files/3770037/3770037-hd_1080_1920_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=720&q=80",
    span: "tall",
  },
  {
    id: "reel_ride_city",
    title: "City Ride",
    category: "Travel",
    blurb: "Black car to anywhere in the metro",
    place: "Lagos · On demand",
    priceHint: "From ₦3,200",
    href: "/app/services/Travel",
    videoUrl:
      "https://videos.pexels.com/video-files/2053100/2053100-uhd_2560_1440_30fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=720&q=80",
    span: "square",
  },
  {
    id: "reel_spa_massage",
    title: "Deep Tissue",
    category: "Wellness",
    blurb: "60-minute recovery massage",
    place: "Sunrise Spa",
    priceHint: "₦28,000",
    href: "/app/services/Wellness",
    videoUrl:
      "https://videos.pexels.com/video-files/3997981/3997981-hd_1080_1920_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=720&q=80",
    span: "tall",
  },
  {
    id: "reel_dining_tasting",
    title: "Chef’s Table",
    category: "Eat",
    blurb: "Five-course tasting by the marina",
    place: "Grand Restaurant",
    priceHint: "₦45,000 pp",
    href: "/app/services/Eat",
    videoUrl:
      "https://videos.pexels.com/video-files/4259084/4259084-uhd_2560_1440_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=720&q=80",
    span: "wide",
  },
  {
    id: "reel_apartment",
    title: "Harbor Studio",
    category: "Stay",
    blurb: "Light-filled short stay for two",
    place: "Lekki Phase 1",
    priceHint: "From ₦95k / night",
    href: "/app/services/Stay/feed?focus=off_harbor_studio",
    videoUrl:
      "https://videos.pexels.com/video-files/4990241/4990241-uhd_1440_2560_30fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=720&q=80",
    span: "square",
  },
  {
    id: "reel_fitness",
    title: "Sunrise HIIT",
    category: "Fitness",
    blurb: "45-minute outdoor class",
    place: "Eko Atlantic",
    priceHint: "₦8,500",
    href: "/app/services/Fitness",
    videoUrl:
      "https://videos.pexels.com/video-files/4754008/4754008-uhd_2560_1440_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=720&q=80",
    span: "tall",
  },
  {
    id: "reel_airport",
    title: "Airport Transfer",
    category: "Travel",
    blurb: "Meet & greet · flight tracked",
    place: "LOS ↔ Island",
    priceHint: "From ₦18,000",
    href: "/app/services/Travel",
    videoUrl:
      "https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=720&q=80",
    span: "wide",
  },
  {
    id: "reel_cinema",
    title: "IMAX Night",
    category: "Cinema",
    blurb: "Premium seats · tonight’s showtimes",
    place: "Filmhouse Lekki",
    priceHint: "From ₦6,500",
    href: "/app/services/Cinema",
    videoUrl:
      "https://videos.pexels.com/video-files/7989640/7989640-uhd_2560_1440_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=720&q=80",
    span: "square",
  },
  {
    id: "reel_rooftop",
    title: "Rooftop Jazz",
    category: "Events",
    blurb: "Live set under the city lights",
    place: "Ikoyi",
    priceHint: "₦22,000",
    href: "/app/services/Events",
    videoUrl:
      "https://videos.pexels.com/video-files/3209822/3209822-uhd_2560_1440_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=720&q=80",
    span: "tall",
  },
  {
    id: "reel_pool",
    title: "Pool Day Pass",
    category: "Activities",
    blurb: "Cabana, towel service, light bites",
    place: "Sunrise Hotel",
    priceHint: "₦15,000",
    href: "/app/services/Activities",
    videoUrl:
      "https://videos.pexels.com/video-files/2169880/2169880-uhd_2560_1440_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=720&q=80",
    span: "wide",
  },
  {
    id: "reel_breakfast",
    title: "Ocean Breakfast",
    category: "Eat",
    blurb: "Buffet with a view until 11",
    place: "Sunrise Hotel",
    priceHint: "₦18,500",
    href: "/app/services/Eat",
    videoUrl:
      "https://videos.pexels.com/video-files/2620043/2620043-uhd_2560_1440_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=720&q=80",
    span: "square",
  },
  {
    id: "reel_yacht",
    title: "Sunset Cruise",
    category: "Activities",
    blurb: "Private charter for six",
    place: "Lagos Lagoon",
    priceHint: "From ₦350k",
    href: "/app/services/Activities",
    videoUrl:
      "https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_30fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=720&q=80",
    span: "tall",
  },
  {
    id: "reel_deluxe_room",
    title: "Palm Deluxe",
    category: "Stay",
    blurb: "Quiet garden-facing king room",
    place: "Ikoyi",
    priceHint: "From ₦120k / night",
    href: "/app/services/Stay/feed",
    videoUrl:
      "https://videos.pexels.com/video-files/3773486/3773486-hd_1080_1920_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=720&q=80",
    span: "square",
  },
  {
    id: "reel_scooter",
    title: "Quick Hop",
    category: "Travel",
    blurb: "Scooter for short island trips",
    place: "VI · Lekki",
    priceHint: "From ₦1,800",
    href: "/app/services/Travel",
    videoUrl:
      "https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_30fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=720&q=80",
    span: "wide",
  },
  {
    id: "reel_facial",
    title: "Glow Facial",
    category: "Wellness",
    blurb: "Hydrating facial · 45 minutes",
    place: "Aura Wellness",
    priceHint: "₦22,000",
    href: "/app/services/Wellness",
    videoUrl:
      "https://videos.pexels.com/video-files/6663200/6663200-uhd_1440_2732_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=720&q=80",
    span: "tall",
  },
  {
    id: "reel_concert",
    title: "Arena Night",
    category: "Events",
    blurb: "Floor tickets · doors at 8",
    place: "Eko Convention",
    priceHint: "From ₦35,000",
    href: "/app/services/Events",
    videoUrl:
      "https://videos.pexels.com/video-files/2022395/2022395-uhd_2560_1440_30fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1459749411177-042180ce673c?auto=format&fit=crop&w=720&q=80",
    span: "wide",
  },
];

export const REEL_FILTERS = [
  "All",
  "Stay",
  "Travel",
  "Wellness",
  "Eat",
  "Fitness",
  "Cinema",
  "Events",
  "Activities",
] as const;
