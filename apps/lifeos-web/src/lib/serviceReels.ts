/** Generic service concepts for Discover (+) — not tied to a city or business. */

export type ServiceConcept = {
  id: string;
  /** Label under the video, e.g. "Jollof Rice" */
  title: string;
  category: string;
  /** Match offerings / businesses by these terms */
  keywords: string[];
  videoUrl: string;
  posterUrl: string;
  span: "tall" | "wide" | "square";
  /** Soft cap for preview loop length (seconds) */
  clipSeconds: number;
};

/**
 * Service videos only — no place, price, or business on the tile.
 * Tapping opens every business that sells that service (available first).
 */
export const SERVICE_CONCEPTS: ServiceConcept[] = [
  {
    id: "svc_jollof",
    title: "Jollof Rice",
    category: "Eat",
    keywords: ["jollof", "rice", "meal", "buffet", "dining", "restaurant", "food"],
    videoUrl:
      "https://videos.pexels.com/video-files/4259084/4259084-uhd_2560_1440_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1604329760661-e7b527d8c293?auto=format&fit=crop&w=720&q=80",
    span: "tall",
    clipSeconds: 10,
  },
  {
    id: "svc_room",
    title: "Room",
    category: "Stay",
    keywords: ["room", "suite", "hotel", "stay", "night", "apartment", "studio"],
    videoUrl:
      "https://videos.pexels.com/video-files/3770037/3770037-hd_1080_1920_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=720&q=80",
    span: "square",
    clipSeconds: 10,
  },
  {
    id: "svc_ride",
    title: "Ride",
    category: "Travel",
    keywords: ["ride", "car", "transfer", "taxi", "travel", "airport", "driver"],
    videoUrl:
      "https://videos.pexels.com/video-files/2053100/2053100-uhd_2560_1440_30fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=720&q=80",
    span: "tall",
    clipSeconds: 10,
  },
  {
    id: "svc_massage",
    title: "Massage",
    category: "Wellness",
    keywords: ["massage", "spa", "treatment", "wellness", "tissue", "facial"],
    videoUrl:
      "https://videos.pexels.com/video-files/3997981/3997981-hd_1080_1920_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=720&q=80",
    span: "wide",
    clipSeconds: 10,
  },
  {
    id: "svc_apartment",
    title: "Apartment",
    category: "Stay",
    keywords: ["apartment", "studio", "short stay", "flat", "harbor"],
    videoUrl:
      "https://videos.pexels.com/video-files/4990241/4990241-uhd_1440_2560_30fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=720&q=80",
    span: "square",
    clipSeconds: 10,
  },
  {
    id: "svc_fitness",
    title: "Fitness Class",
    category: "Fitness",
    keywords: ["fitness", "class", "gym", "training", "hiit", "workout"],
    videoUrl:
      "https://videos.pexels.com/video-files/4754008/4754008-uhd_2560_1440_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=720&q=80",
    span: "tall",
    clipSeconds: 10,
  },
  {
    id: "svc_cinema",
    title: "Cinema",
    category: "Cinema",
    keywords: ["cinema", "movie", "ticket", "showtime", "imax", "film"],
    videoUrl:
      "https://videos.pexels.com/video-files/7989640/7989640-uhd_2560_1440_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=720&q=80",
    span: "square",
    clipSeconds: 10,
  },
  {
    id: "svc_dinner",
    title: "Dinner",
    category: "Eat",
    keywords: ["dinner", "dining", "restaurant", "meal", "chef", "table", "tasting"],
    videoUrl:
      "https://videos.pexels.com/video-files/2620043/2620043-uhd_2560_1440_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=720&q=80",
    span: "wide",
    clipSeconds: 10,
  },
  {
    id: "svc_pool",
    title: "Pool Day",
    category: "Activities",
    keywords: ["pool", "cabana", "swim", "day pass", "leisure"],
    videoUrl:
      "https://videos.pexels.com/video-files/2169880/2169880-uhd_2560_1440_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=720&q=80",
    span: "tall",
    clipSeconds: 10,
  },
  {
    id: "svc_event",
    title: "Event Ticket",
    category: "Events",
    keywords: ["event", "concert", "ticket", "night", "jazz", "arena"],
    videoUrl:
      "https://videos.pexels.com/video-files/3209822/3209822-uhd_2560_1440_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=720&q=80",
    span: "square",
    clipSeconds: 10,
  },
  {
    id: "svc_airport",
    title: "Airport Transfer",
    category: "Travel",
    keywords: ["airport", "transfer", "flight", "ride", "pickup"],
    videoUrl:
      "https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=720&q=80",
    span: "wide",
    clipSeconds: 10,
  },
  {
    id: "svc_spa",
    title: "Spa Facial",
    category: "Wellness",
    keywords: ["facial", "spa", "glow", "treatment", "wellness"],
    videoUrl:
      "https://videos.pexels.com/video-files/6663200/6663200-uhd_1440_2732_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=720&q=80",
    span: "tall",
    clipSeconds: 10,
  },
];

export const SERVICE_FILTERS = [
  "All",
  "Eat",
  "Stay",
  "Travel",
  "Wellness",
  "Fitness",
  "Cinema",
  "Events",
  "Activities",
] as const;

/** Extra mock sellers so concepts like Jollof always have businesses to show. */
export type ServiceSeller = {
  businessId: string;
  businessName: string;
  offeringName: string;
  category: string;
  available: boolean;
  priceHint: string;
  locationLabel?: string;
};

export const MOCK_SERVICE_SELLERS: Record<string, ServiceSeller[]> = {
  svc_jollof: [
    {
      businessId: "biz_grand_rest",
      businessName: "Grand Restaurant",
      offeringName: "Party Jollof platter",
      category: "Eat",
      available: true,
      priceHint: "From ₦8,500",
      locationLabel: "Available now",
    },
    {
      businessId: "biz_sunrise",
      businessName: "Sunrise Hotel",
      offeringName: "Jollof lunch buffet",
      category: "Eat",
      available: true,
      priceHint: "From ₦12,000",
      locationLabel: "Available today",
    },
    {
      businessId: "biz_harbor_apt",
      businessName: "Harbor Apartments",
      offeringName: "In-room jollof delivery",
      category: "Eat",
      available: false,
      priceHint: "From ₦9,200",
      locationLabel: "Opens 5:00 PM",
    },
    {
      businessId: "biz_palm_court",
      businessName: "Palm Court Hotel",
      offeringName: "Smoky party jollof",
      category: "Eat",
      available: true,
      priceHint: "From ₦7,800",
      locationLabel: "Kitchen open",
    },
  ],
  svc_room: [
    {
      businessId: "biz_sunrise",
      businessName: "Sunrise Hotel",
      offeringName: "Harbor King Suite",
      category: "Stay",
      available: true,
      priceHint: "From ₦185k / night",
      locationLabel: "Rooms open",
    },
    {
      businessId: "biz_palm_court",
      businessName: "Palm Court Hotel",
      offeringName: "Palm Deluxe Room",
      category: "Stay",
      available: true,
      priceHint: "From ₦120k / night",
      locationLabel: "Available tonight",
    },
    {
      businessId: "biz_azure_lekki",
      businessName: "Azure Lekki",
      offeringName: "Lagoon View Room",
      category: "Stay",
      available: false,
      priceHint: "From ₦150k / night",
      locationLabel: "Fully booked tonight",
    },
    {
      businessId: "biz_eko_crest",
      businessName: "Eko Crest",
      offeringName: "Skyline Room",
      category: "Stay",
      available: true,
      priceHint: "From ₦140k / night",
      locationLabel: "Check-in from 3 PM",
    },
  ],
  svc_ride: [
    {
      businessId: "biz_city_cinema",
      businessName: "City Ride Co.",
      offeringName: "City black car",
      category: "Travel",
      available: true,
      priceHint: "From ₦3,200",
      locationLabel: "Drivers nearby",
    },
    {
      businessId: "biz_sunrise",
      businessName: "Sunrise Hotel",
      offeringName: "Hotel transfer van",
      category: "Travel",
      available: true,
      priceHint: "From ₦8,000",
      locationLabel: "Available now",
    },
    {
      businessId: "biz_eko_crest",
      businessName: "Eko Crest",
      offeringName: "Executive sedan",
      category: "Travel",
      available: false,
      priceHint: "From ₦6,500",
      locationLabel: "Busy — try later",
    },
  ],
  svc_massage: [
    {
      businessId: "biz_serenity_spa",
      businessName: "Serenity Spa",
      offeringName: "Deep tissue massage",
      category: "Wellness",
      available: true,
      priceHint: "From ₦28,000",
      locationLabel: "Next slot open",
    },
    {
      businessId: "biz_sunrise",
      businessName: "Sunrise Hotel",
      offeringName: "In-room massage",
      category: "Wellness",
      available: true,
      priceHint: "From ₦35,000",
      locationLabel: "Available today",
    },
    {
      businessId: "biz_azure_lekki",
      businessName: "Azure Lekki",
      offeringName: "Spa recovery massage",
      category: "Wellness",
      available: false,
      priceHint: "From ₦30,000",
      locationLabel: "Booked until evening",
    },
  ],
};
