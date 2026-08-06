import type {
  DiscoverableBusiness,
  DiscoverableOffering,
  DiscoverOfferingCategory,
  OfferingCapability,
  OfferingFilters,
  OfferingType,
} from "@lifeos/shared";
import { rankOfferings } from "./offering-ranking.js";

/**
 * Offering discovery provider — LifeOS consumes normalized offerings.
 * HospitalityOS (and peers) remain catalog / commerce source of truth.
 * This mock is a discovery projection until a live catalog HTTP feed exists.
 */
export interface OfferingProvider {
  list(filters?: OfferingFilters): Promise<DiscoverableOffering[]>;
  getById(id: string): Promise<DiscoverableOffering | null>;
  search(q: string, filters?: OfferingFilters): Promise<DiscoverableOffering[]>;
  categories(): Promise<DiscoverOfferingCategory[]>;
  listByBusiness(businessId: string): Promise<DiscoverableOffering[]>;
  getBusiness(businessId: string): Promise<DiscoverableBusiness | null>;
  listBusinesses(q?: string): Promise<DiscoverableBusiness[]>;
}

function ngn(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function caps(...extra: OfferingCapability[]): OfferingCapability[] {
  return ["VIEW", "SAVE", "OPEN_EXPERIENCE", ...extra];
}

function defaultCapabilities(type: OfferingType, booking: boolean, commerce: boolean): OfferingCapability[] {
  const base = caps();
  if (type === "ROOM") return [...base, "BOOK", "RESERVE", ...(commerce ? (["PAY"] as OfferingCapability[]) : [])];
  if (type === "TICKET" || type === "SHOWTIME" || type === "EVENT")
    return [...base, "PURCHASE_TICKET", "BUY", ...(commerce ? (["PAY"] as OfferingCapability[]) : [])];
  if (type === "CLASS" || type === "MEMBERSHIP")
    return [...base, "JOIN", "BOOK", ...(commerce ? (["PAY"] as OfferingCapability[]) : [])];
  if (type === "MEAL") return [...base, "RESERVE", "BOOK", ...(commerce ? (["PAY"] as OfferingCapability[]) : [])];
  if (booking) base.push("BOOK");
  if (commerce) base.push("PAY");
  if (type === "TREATMENT" || type === "PACKAGE" || type === "SERVICE") base.push("BOOK");
  return [...new Set(base)];
}

function offer(
  partial: Omit<
    DiscoverableOffering,
    "priceFormatted" | "source" | "bookingCapability" | "commerceCapability" | "capabilities"
  > &
    Partial<
      Pick<
        DiscoverableOffering,
        "source" | "bookingCapability" | "commerceCapability" | "capabilities" | "cancellationPolicy"
      >
    >,
): DiscoverableOffering {
  const booking = partial.bookingCapability ?? true;
  const commerce = partial.commerceCapability ?? true;
  const capabilities = partial.capabilities ?? defaultCapabilities(partial.type, booking, commerce);
  return {
    bookingCapability: booking,
    commerceCapability: commerce,
    source: "hospitalityos-catalog-projection",
    cancellationPolicy: partial.cancellationPolicy ?? "Free cancellation up to 24 hours before.",
    ...partial,
    capabilities,
    priceFormatted: ngn(partial.price),
  };
}

/**
 * Discovery projection seeded from known HospitalityOS shapes (rooms, dining)
 * plus ecosystem offerings linked to registry experiences.
 * NOT a second commerce ledger.
 */
const CATALOG: DiscoverableOffering[] = [
  // Sunrise Hotel — mirrors mock-hospitalityos rooms
  offer({
    id: "off_sunrise_deluxe",
    type: "ROOM",
    name: "Deluxe King",
    description: "Waterfront views, rainfall shower, workspace.",
    businessId: "biz_sunrise",
    businessName: "Sunrise Hotel",
    experienceId: "exp_sunrise_hotel",
    category: "Stay",
    price: 85_000,
    currency: "NGN",
    priceUnit: "night",
    duration: "1 night",
    location: "Lagos",
    rating: 4.7,
    availability: "Available tonight",
    badge: "Popular",
    featured: true,
    distanceKm: 2.1,
    metadata: { hospitalityRoomId: "deluxe" },
  }),
  offer({
    id: "off_sunrise_twin",
    type: "ROOM",
    name: "Twin Garden",
    description: "Quiet courtyard rooms with morning light.",
    businessId: "biz_sunrise",
    businessName: "Sunrise Hotel",
    experienceId: "exp_sunrise_hotel",
    category: "Stay",
    price: 65_000,
    currency: "NGN",
    priceUnit: "night",
    location: "Lagos",
    rating: 4.5,
    availability: "2 left",
    distanceKm: 2.1,
    metadata: { hospitalityRoomId: "twin" },
  }),
  offer({
    id: "off_sunrise_suite",
    type: "ROOM",
    name: "Harbor Suite",
    description: "Separate lounge, soaking tub, welcome amenity.",
    businessId: "biz_sunrise",
    businessName: "Sunrise Hotel",
    experienceId: "exp_sunrise_hotel",
    category: "Stay",
    price: 140_000,
    currency: "NGN",
    priceUnit: "night",
    location: "Lagos",
    rating: 4.9,
    availability: "Available this weekend",
    badge: "Suite",
    featured: true,
    distanceKm: 2.1,
    metadata: { hospitalityRoomId: "suite" },
  }),
  offer({
    id: "off_sunrise_breakfast",
    type: "MEAL",
    name: "Breakfast Buffet",
    description: "Full breakfast buffet for hotel guests and walk-ins.",
    businessId: "biz_sunrise",
    businessName: "Sunrise Hotel",
    experienceId: "exp_sunrise_hotel",
    category: "Eat",
    price: 12_000,
    currency: "NGN",
    priceUnit: "person",
    location: "Lagos",
    rating: 4.4,
    availability: "Daily 6:30–10:30",
  }),
  offer({
    id: "off_sunrise_spa_pkg",
    type: "PACKAGE",
    name: "Spa Package",
    description: "In-hotel spa package: massage + steam.",
    businessId: "biz_sunrise",
    businessName: "Sunrise Hotel",
    experienceId: "exp_sunrise_hotel",
    category: "Wellness",
    price: 55_000,
    currency: "NGN",
    duration: "90 min",
    location: "Lagos",
    rating: 4.6,
    availability: "Book tomorrow",
  }),

  // Grand Restaurant
  offer({
    id: "off_grand_jollof",
    type: "MEAL",
    name: "Jollof Rice & Chicken",
    description: "Smoky party jollof with grilled chicken.",
    businessId: "biz_grand_rest",
    businessName: "Grand Restaurant",
    experienceId: "exp_grand_restaurant",
    category: "Eat",
    price: 12_000,
    currency: "NGN",
    location: "Lagos",
    rating: 4.8,
    availability: "Available now",
    badge: "Chef pick",
    featured: true,
    distanceKm: 1.4,
  }),
  offer({
    id: "off_grand_seafood",
    type: "MEAL",
    name: "Seafood Dinner",
    description: "Grilled catch with seasonal sides.",
    businessId: "biz_grand_rest",
    businessName: "Grand Restaurant",
    experienceId: "exp_grand_restaurant",
    category: "Eat",
    price: 28_000,
    currency: "NGN",
    location: "Lagos",
    rating: 4.7,
    availability: "Dinner service",
    featured: true,
  }),
  offer({
    id: "off_grand_family",
    type: "MEAL",
    name: "Family Meal",
    description: "Shared platter for four.",
    businessId: "biz_grand_rest",
    businessName: "Grand Restaurant",
    experienceId: "exp_grand_restaurant",
    category: "Eat",
    price: 45_000,
    currency: "NGN",
    priceUnit: "table",
    location: "Lagos",
    rating: 4.5,
    availability: "Reserve tonight",
  }),
  offer({
    id: "off_grand_breakfast",
    type: "MEAL",
    name: "Breakfast Buffet",
    description: "Continental and local breakfast buffet.",
    businessId: "biz_grand_rest",
    businessName: "Grand Restaurant",
    experienceId: "exp_grand_restaurant",
    category: "Eat",
    price: 9_500,
    currency: "NGN",
    location: "Lagos",
    rating: 4.3,
    availability: "Until 11:00",
  }),

  // Harbor Apartments
  offer({
    id: "off_harbor_studio",
    type: "ROOM",
    name: "Harbor Studio",
    description: "Bright studio with kitchenette.",
    businessId: "biz_harbor_apt",
    businessName: "Harbor Apartments",
    experienceId: "exp_harbor_apt",
    category: "Stay",
    price: 95_000,
    currency: "NGN",
    priceUnit: "night",
    location: "Victoria Island",
    rating: 4.4,
    availability: "Available tonight",
    distanceKm: 3.2,
    featured: true,
  }),
  offer({
    id: "off_harbor_1br",
    type: "ROOM",
    name: "Marina One-Bedroom",
    description: "Separate bedroom, balcony over the marina.",
    businessId: "biz_harbor_apt",
    businessName: "Harbor Apartments",
    experienceId: "exp_harbor_apt",
    category: "Stay",
    price: 125_000,
    currency: "NGN",
    priceUnit: "night",
    location: "Victoria Island",
    rating: 4.6,
    availability: "3 left",
    distanceKm: 3.2,
    badge: "Marina view",
  }),
  offer({
    id: "off_harbor_penthouse",
    type: "ROOM",
    name: "Harbor Penthouse",
    description: "Two-level penthouse with private terrace.",
    businessId: "biz_harbor_apt",
    businessName: "Harbor Apartments",
    experienceId: "exp_harbor_apt",
    category: "Stay",
    price: 220_000,
    currency: "NGN",
    priceUnit: "night",
    location: "Victoria Island",
    rating: 4.8,
    availability: "Available this weekend",
    distanceKm: 3.1,
    badge: "Penthouse",
    featured: true,
  }),

  // Palm Court Hotel
  offer({
    id: "off_palm_standard",
    type: "ROOM",
    name: "Palm Standard",
    description: "Calm city-facing room with desk and rainfall shower.",
    businessId: "biz_palm_court",
    businessName: "Palm Court Hotel",
    experienceId: "exp_sunrise_hotel",
    category: "Stay",
    price: 58_000,
    currency: "NGN",
    priceUnit: "night",
    location: "Ikeja",
    rating: 4.3,
    availability: "Available tonight",
    distanceKm: 8.4,
  }),
  offer({
    id: "off_palm_executive",
    type: "ROOM",
    name: "Executive Palm",
    description: "Corner executive room with lounge access.",
    businessId: "biz_palm_court",
    businessName: "Palm Court Hotel",
    experienceId: "exp_sunrise_hotel",
    category: "Stay",
    price: 98_000,
    currency: "NGN",
    priceUnit: "night",
    location: "Ikeja",
    rating: 4.5,
    availability: "4 left",
    distanceKm: 8.4,
    badge: "Lounge access",
    featured: true,
  }),
  offer({
    id: "off_palm_family",
    type: "ROOM",
    name: "Family Connecting",
    description: "Two connecting rooms for families.",
    businessId: "biz_palm_court",
    businessName: "Palm Court Hotel",
    experienceId: "exp_sunrise_hotel",
    category: "Stay",
    price: 135_000,
    currency: "NGN",
    priceUnit: "night",
    location: "Ikeja",
    rating: 4.4,
    availability: "Available Friday",
    distanceKm: 8.5,
  }),

  // Azure Lekki
  offer({
    id: "off_azure_lagoon",
    type: "ROOM",
    name: "Lagoon Queen",
    description: "Lagoon-facing queen with morning light.",
    businessId: "biz_azure_lekki",
    businessName: "Azure Lekki",
    experienceId: "exp_sunrise_hotel",
    category: "Stay",
    price: 110_000,
    currency: "NGN",
    priceUnit: "night",
    location: "Lekki",
    rating: 4.7,
    availability: "Available tonight",
    distanceKm: 12.1,
    featured: true,
  }),
  offer({
    id: "off_azure_pool",
    type: "ROOM",
    name: "Poolside Cabana",
    description: "Ground-floor room steps from the pool.",
    businessId: "biz_azure_lekki",
    businessName: "Azure Lekki",
    experienceId: "exp_sunrise_hotel",
    category: "Stay",
    price: 105_000,
    currency: "NGN",
    priceUnit: "night",
    location: "Lekki",
    rating: 4.6,
    availability: "2 left",
    distanceKm: 12.0,
    badge: "Poolside",
  }),
  offer({
    id: "off_azure_villa",
    type: "ROOM",
    name: "Garden Villa",
    description: "Private villa with outdoor shower.",
    businessId: "biz_azure_lekki",
    businessName: "Azure Lekki",
    experienceId: "exp_sunrise_hotel",
    category: "Stay",
    price: 185_000,
    currency: "NGN",
    priceUnit: "night",
    location: "Lekki",
    rating: 4.9,
    availability: "Available this weekend",
    distanceKm: 12.2,
    badge: "Villa",
    featured: true,
  }),

  // Eko Crest
  offer({
    id: "off_eko_city",
    type: "ROOM",
    name: "City View King",
    description: "High-floor king overlooking the skyline.",
    businessId: "biz_eko_crest",
    businessName: "Eko Crest",
    experienceId: "exp_sunrise_hotel",
    category: "Stay",
    price: 78_000,
    currency: "NGN",
    priceUnit: "night",
    location: "Lagos Island",
    rating: 4.5,
    availability: "Available tonight",
    distanceKm: 4.6,
  }),
  offer({
    id: "off_eko_club",
    type: "ROOM",
    name: "Club Floor Room",
    description: "Club privileges, late checkout, city skyline.",
    businessId: "biz_eko_crest",
    businessName: "Eko Crest",
    experienceId: "exp_sunrise_hotel",
    category: "Stay",
    price: 118_000,
    currency: "NGN",
    priceUnit: "night",
    location: "Lagos Island",
    rating: 4.7,
    availability: "5 left",
    distanceKm: 4.6,
    badge: "Club floor",
  }),

  // Serenity Spa
  offer({
    id: "off_serenity_deep",
    type: "TREATMENT",
    name: "Deep Tissue Massage",
    description: "Focused pressure for tension relief.",
    businessId: "biz_serenity_spa",
    businessName: "Serenity Spa",
    experienceId: "exp_serenity_spa",
    category: "Wellness",
    price: 35_000,
    currency: "NGN",
    duration: "60 min",
    location: "Victoria Island",
    rating: 4.9,
    availability: "Tomorrow from 2:00 PM",
    badge: "Top rated",
    featured: true,
    distanceKm: 3.5,
  }),
  offer({
    id: "off_serenity_swedish",
    type: "TREATMENT",
    name: "Swedish Massage",
    description: "Classic full-body relaxation massage.",
    businessId: "biz_serenity_spa",
    businessName: "Serenity Spa",
    experienceId: "exp_serenity_spa",
    category: "Wellness",
    price: 30_000,
    currency: "NGN",
    duration: "60 min",
    location: "Victoria Island",
    rating: 4.7,
    availability: "Today 5:00 PM",
  }),
  offer({
    id: "off_serenity_facial",
    type: "TREATMENT",
    name: "Signature Facial",
    description: "Hydrating facial with botanical extracts.",
    businessId: "biz_serenity_spa",
    businessName: "Serenity Spa",
    experienceId: "exp_serenity_spa",
    category: "Wellness",
    price: 28_000,
    currency: "NGN",
    duration: "50 min",
    location: "Victoria Island",
    rating: 4.6,
    availability: "Open slots this week",
  }),
  offer({
    id: "off_serenity_body",
    type: "TREATMENT",
    name: "Body Treatment",
    description: "Scrub and wrap for skin renewal.",
    businessId: "biz_serenity_spa",
    businessName: "Serenity Spa",
    experienceId: "exp_serenity_spa",
    category: "Wellness",
    price: 42_000,
    currency: "NGN",
    duration: "75 min",
    location: "Victoria Island",
    rating: 4.8,
    availability: "Book ahead",
  }),
  offer({
    id: "off_serenity_wellness",
    type: "PACKAGE",
    name: "Wellness Package",
    description: "Massage + facial + steam circuit.",
    businessId: "biz_serenity_spa",
    businessName: "Serenity Spa",
    experienceId: "exp_serenity_spa",
    category: "Wellness",
    price: 85_000,
    currency: "NGN",
    duration: "2.5 hrs",
    location: "Victoria Island",
    rating: 4.9,
    availability: "Weekend packages",
    badge: "Save 15%",
    featured: true,
  }),

  // Peak Fitness
  offer({
    id: "off_peak_day",
    type: "MEMBERSHIP",
    name: "Day Pass",
    description: "Full gym access for one day.",
    businessId: "biz_peak_fitness",
    businessName: "Peak Fitness",
    experienceId: "exp_peak_fitness",
    category: "Fitness",
    price: 8_000,
    currency: "NGN",
    priceUnit: "day",
    location: "Lagos",
    rating: 4.5,
    availability: "Walk-in welcome",
    featured: true,
  }),
  offer({
    id: "off_peak_pt",
    type: "SERVICE",
    name: "Personal Training",
    description: "One-on-one coaching session.",
    businessId: "biz_peak_fitness",
    businessName: "Peak Fitness",
    experienceId: "exp_peak_fitness",
    category: "Fitness",
    price: 25_000,
    currency: "NGN",
    duration: "55 min",
    location: "Lagos",
    rating: 4.8,
    availability: "Coaches available",
  }),
  offer({
    id: "off_peak_spin",
    type: "CLASS",
    name: "Spin Class",
    description: "High-energy indoor cycling class.",
    businessId: "biz_peak_fitness",
    businessName: "Peak Fitness",
    experienceId: "exp_peak_fitness",
    category: "Fitness",
    price: 6_500,
    currency: "NGN",
    duration: "45 min",
    location: "Lagos",
    rating: 4.6,
    availability: "Tonight 7:00 PM",
    badge: "Tonight",
  }),
  offer({
    id: "off_peak_member",
    type: "MEMBERSHIP",
    name: "Monthly Membership",
    description: "Unlimited classes and gym floor.",
    businessId: "biz_peak_fitness",
    businessName: "Peak Fitness",
    experienceId: "exp_peak_fitness",
    category: "Fitness",
    price: 45_000,
    currency: "NGN",
    priceUnit: "month",
    location: "Lagos",
    rating: 4.7,
    availability: "Join anytime",
  }),

  // City Cinema
  offer({
    id: "off_cinema_std",
    type: "TICKET",
    name: "Cinema Ticket",
    description: "Standard seat for tonight’s showings.",
    businessId: "biz_city_cinema",
    businessName: "City Cinema",
    experienceId: "exp_city_cinema",
    category: "Cinema",
    price: 5_000,
    currency: "NGN",
    location: "Lagos",
    rating: 4.3,
    availability: "Showtimes from 4:00 PM",
  }),
  offer({
    id: "off_cinema_vip",
    type: "TICKET",
    name: "Cinema VIP Ticket",
    description: "Recliner seat with complimentary snack.",
    businessId: "biz_city_cinema",
    businessName: "City Cinema",
    experienceId: "exp_city_cinema",
    category: "Cinema",
    price: 8_000,
    currency: "NGN",
    location: "Lagos",
    rating: 4.6,
    availability: "VIP rows open",
    badge: "VIP",
    featured: true,
  }),
  offer({
    id: "off_cinema_show",
    type: "SHOWTIME",
    name: "Evening Premiere",
    description: "Feature premiere with reserved seating.",
    businessId: "biz_city_cinema",
    businessName: "City Cinema",
    experienceId: "exp_city_cinema",
    category: "Cinema",
    price: 7_500,
    currency: "NGN",
    duration: "2 hrs",
    location: "Lagos",
    rating: 4.5,
    availability: "Tonight 8:15 PM",
  }),

  // Events / activities
  offer({
    id: "off_harbor_concert",
    type: "EVENT",
    name: "Waterfront Concert",
    description: "Live set at Harbor Lawn.",
    businessId: "biz_harbor_apt",
    businessName: "Harbor Apartments",
    experienceId: "exp_harbor_apt",
    category: "Events",
    price: 15_000,
    currency: "NGN",
    location: "Victoria Island",
    rating: 4.4,
    availability: "Saturday 7:00 PM",
    badge: "This weekend",
    featured: true,
  }),
];

const BUSINESSES: DiscoverableBusiness[] = [
  {
    id: "biz_sunrise",
    businessId: "biz_sunrise",
    businessName: "Sunrise Hotel",
    experienceId: "exp_sunrise_hotel",
    description: "Boutique waterfront stay with guest booking experience.",
    location: "Lagos",
    category: "Stay",
    rating: 4.7,
    hours: "Front desk 24 hrs",
    contact: "stay@sunrise.example",
    offeringCount: 0,
    source: "hospitalityos-catalog-projection",
  },
  {
    id: "biz_grand_rest",
    businessId: "biz_grand_rest",
    businessName: "Grand Restaurant",
    experienceId: "exp_grand_restaurant",
    description: "Table booking and dining — HospitalityOS guest experience.",
    location: "Lagos",
    category: "Eat",
    rating: 4.6,
    hours: "11:00 – 23:00",
    contact: "hello@grand.example",
    offeringCount: 0,
    source: "hospitalityos-catalog-projection",
  },
  {
    id: "biz_harbor_apt",
    businessId: "biz_harbor_apt",
    businessName: "Harbor Apartments",
    experienceId: "exp_harbor_apt",
    description: "Short-stay apartments and waterfront events.",
    location: "Victoria Island",
    category: "Stay",
    rating: 4.4,
    hours: "Check-in from 14:00",
    offeringCount: 0,
    source: "hospitalityos-catalog-projection",
  },
  {
    id: "biz_palm_court",
    businessId: "biz_palm_court",
    businessName: "Palm Court Hotel",
    experienceId: "exp_sunrise_hotel",
    description: "Airport-adjacent hotel with lounge and family rooms.",
    location: "Ikeja",
    category: "Stay",
    rating: 4.4,
    hours: "Front desk 24 hrs",
    offeringCount: 0,
    source: "hospitalityos-catalog-projection",
  },
  {
    id: "biz_azure_lekki",
    businessId: "biz_azure_lekki",
    businessName: "Azure Lekki",
    experienceId: "exp_sunrise_hotel",
    description: "Lagoon and poolside stays in Lekki.",
    location: "Lekki",
    category: "Stay",
    rating: 4.7,
    hours: "Check-in from 15:00",
    offeringCount: 0,
    source: "hospitalityos-catalog-projection",
  },
  {
    id: "biz_eko_crest",
    businessId: "biz_eko_crest",
    businessName: "Eko Crest",
    experienceId: "exp_sunrise_hotel",
    description: "Skyline hotel on Lagos Island.",
    location: "Lagos Island",
    category: "Stay",
    rating: 4.6,
    hours: "Front desk 24 hrs",
    offeringCount: 0,
    source: "hospitalityos-catalog-projection",
  },
  {
    id: "biz_serenity_spa",
    businessId: "biz_serenity_spa",
    businessName: "Serenity Spa",
    experienceId: "exp_serenity_spa",
    description: "Treatments, packages, and wellness memberships.",
    location: "Victoria Island",
    category: "Wellness",
    rating: 4.9,
    hours: "09:00 – 21:00",
    contact: "book@serenity.example",
    offeringCount: 0,
    source: "hospitalityos-catalog-projection",
  },
  {
    id: "biz_peak_fitness",
    businessId: "biz_peak_fitness",
    businessName: "Peak Fitness",
    experienceId: "exp_peak_fitness",
    description: "Classes, personal training, and memberships.",
    location: "Lagos",
    category: "Fitness",
    rating: 4.6,
    hours: "05:30 – 22:00",
    offeringCount: 0,
    source: "hospitalityos-catalog-projection",
  },
  {
    id: "biz_city_cinema",
    businessId: "biz_city_cinema",
    businessName: "City Cinema",
    experienceId: "exp_city_cinema",
    description: "Movies, showtimes, and VIP experiences.",
    location: "Lagos",
    category: "Cinema",
    rating: 4.4,
    hours: "12:00 – 00:00",
    offeringCount: 0,
    source: "hospitalityos-catalog-projection",
  },
];

function matchesQuery(o: DiscoverableOffering, q: string): boolean {
  const n = q.toLowerCase();
  return (
    o.name.toLowerCase().includes(n) ||
    o.description.toLowerCase().includes(n) ||
    o.businessName.toLowerCase().includes(n) ||
    o.category.toLowerCase().includes(n) ||
    o.type.toLowerCase().includes(n) ||
    (o.location ?? "").toLowerCase().includes(n)
  );
}

function applyFilters(list: DiscoverableOffering[], filters: OfferingFilters = {}): DiscoverableOffering[] {
  let out = list;
  if (filters.q?.trim()) out = out.filter((o) => matchesQuery(o, filters.q!.trim()));
  if (filters.category && filters.category !== "All" && filters.category !== "More") {
    out = out.filter((o) => o.category === filters.category);
  }
  if (filters.type) out = out.filter((o) => o.type === filters.type);
  if (filters.businessId) out = out.filter((o) => o.businessId === filters.businessId);
  if (filters.experienceId) out = out.filter((o) => o.experienceId === filters.experienceId);
  if (filters.minPrice != null) out = out.filter((o) => o.price >= filters.minPrice!);
  if (filters.maxPrice != null) out = out.filter((o) => o.price <= filters.maxPrice!);
  if (filters.availableOnly) {
    out = out.filter((o) => o.availability && !/coming soon|unavailable/i.test(o.availability));
  }
  return rankOfferings(out, {
    query: filters.q,
    sort: filters.sort,
    preferredCategories: filters.preferredCategories,
    preferredBusinessIds: filters.preferredBusinessIds,
  });
}

export class MockOfferingProvider implements OfferingProvider {
  async list(filters: OfferingFilters = {}) {
    return applyFilters(CATALOG, filters);
  }

  async getById(id: string) {
    return CATALOG.find((o) => o.id === id) ?? null;
  }

  async search(q: string, filters: OfferingFilters = {}) {
    return applyFilters(CATALOG, { ...filters, q });
  }

  async categories() {
    return ["Stay", "Eat", "Wellness", "Fitness", "Events", "Cinema", "Activities", "Travel", "More"] as DiscoverOfferingCategory[];
  }

  async listByBusiness(businessId: string) {
    return applyFilters(CATALOG, { businessId });
  }

  async getBusiness(businessId: string) {
    const b = BUSINESSES.find((x) => x.businessId === businessId || x.id === businessId);
    if (!b) return null;
    const offerings = CATALOG.filter((o) => o.businessId === b.businessId);
    return { ...b, offeringCount: offerings.length };
  }

  async listBusinesses(q?: string) {
    let list = BUSINESSES.map((b) => ({
      ...b,
      offeringCount: CATALOG.filter((o) => o.businessId === b.businessId).length,
    }));
    if (q?.trim()) {
      const n = q.toLowerCase();
      list = list.filter(
        (b) =>
          b.businessName.toLowerCase().includes(n) ||
          b.description.toLowerCase().includes(n) ||
          b.category.toLowerCase().includes(n),
      );
    }
    return list;
  }
}

let provider: OfferingProvider | null = null;

export function getOfferingProvider(): OfferingProvider {
  if (!provider) provider = new MockOfferingProvider();
  return provider;
}

export function setOfferingProvider(next: OfferingProvider | null) {
  provider = next;
}

export function isOfferingType(v: string): v is OfferingType {
  return (
    [
      "SERVICE",
      "PRODUCT",
      "ROOM",
      "MEAL",
      "CLASS",
      "TREATMENT",
      "MEMBERSHIP",
      "PACKAGE",
      "EVENT",
      "TICKET",
      "SHOWTIME",
      "EXPERIENCE",
    ] as string[]
  ).includes(v);
}
