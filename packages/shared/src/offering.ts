import type { OfferingCapability } from "./actions.js";

/** Offering-first discovery — LifeOS read models (not commerce source of truth). */

export const OFFERING_TYPES = [
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
] as const;

export type OfferingType = (typeof OFFERING_TYPES)[number];

export const DISCOVER_OFFERING_CATEGORIES = [
  "Stay",
  "Eat",
  "Wellness",
  "Fitness",
  "Events",
  "Cinema",
  "Activities",
  "Travel",
  "More",
] as const;

export type DiscoverOfferingCategory = (typeof DISCOVER_OFFERING_CATEGORIES)[number];

/** Normalized discovery projection — HospitalityOS (or future OS) remains catalog SoT. */
export type DiscoverableOffering = {
  id: string;
  type: OfferingType;
  name: string;
  description: string;
  businessId: string;
  businessName: string;
  businessLogo?: string | null;
  category: DiscoverOfferingCategory;
  /** Registry experience used to launch / book. */
  experienceId: string;
  image?: string | null;
  price: number;
  currency: string;
  priceFormatted: string;
  priceUnit?: string | null;
  duration?: string | null;
  location?: string | null;
  rating?: number | null;
  availability?: string | null;
  badge?: string | null;
  distanceKm?: number | null;
  bookingCapability: boolean;
  commerceCapability: boolean;
  capabilities: OfferingCapability[];
  cancellationPolicy?: string | null;
  source: string;
  featured?: boolean;
  metadata?: Record<string, unknown>;
};

export type DiscoverableBusiness = {
  id: string;
  businessId: string;
  businessName: string;
  experienceId: string;
  description: string;
  location?: string | null;
  category: string;
  rating?: number | null;
  hours?: string | null;
  contact?: string | null;
  logo?: string | null;
  offeringCount: number;
  source: string;
};

export type OfferingFilters = {
  q?: string;
  category?: string;
  type?: OfferingType | string;
  businessId?: string;
  experienceId?: string;
  minPrice?: number;
  maxPrice?: number;
  availableOnly?: boolean;
  sort?: "relevance" | "price_asc" | "price_desc" | "rating" | "distance";
  /** Soft personalization from PersonalContext — never hard filters. */
  preferredCategories?: string[];
  preferredBusinessIds?: string[];
};
