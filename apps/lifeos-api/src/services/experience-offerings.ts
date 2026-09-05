/**
 * Live offering discovery — projects Prisma Experience rows into DiscoverableOffering.
 * Replaces the hard-coded mock CATALOG so Discover streams real registry apps.
 */
import type {
  DiscoverableBusiness,
  DiscoverableOffering,
  DiscoverOfferingCategory,
  OfferingCapability,
  OfferingFilters,
  OfferingType,
} from "@lifeos/shared";
import { prisma } from "../lib/prisma.js";
import { rankOfferings } from "./offering-ranking.js";
import type { OfferingProvider } from "./offerings.js";

function categoryForOs(osType: string, category: string): DiscoverOfferingCategory {
  const c = (category || "").toLowerCase();
  if (c.includes("hotel") || c.includes("stay") || c.includes("apartment")) return "Stay";
  if (c.includes("restaurant") || c.includes("food") || c.includes("eat")) return "Eat";
  if (c.includes("spa") || c.includes("wellness")) return "Wellness";
  if (c.includes("fitness") || c.includes("gym")) return "Fitness";
  if (c.includes("cinema") || c.includes("movie")) return "Cinema";
  if (c.includes("event")) return "Events";
  if (c.includes("transport") || c.includes("travel") || c.includes("ride")) return "Travel";
  if (osType === "hospitality") return "Stay";
  if (osType === "transport") return "Travel";
  if (osType === "service") return "More";
  return "More";
}

function typeForCategory(cat: DiscoverOfferingCategory): OfferingType {
  if (cat === "Stay") return "ROOM";
  if (cat === "Eat") return "MEAL";
  if (cat === "Wellness") return "TREATMENT";
  if (cat === "Fitness") return "CLASS";
  if (cat === "Cinema" || cat === "Events") return "TICKET";
  if (cat === "Travel") return "SERVICE";
  return "SERVICE";
}

function caps(type: OfferingType): OfferingCapability[] {
  const base: OfferingCapability[] = ["VIEW", "SAVE", "OPEN_EXPERIENCE"];
  if (type === "ROOM" || type === "MEAL" || type === "TREATMENT" || type === "CLASS") {
    return [...base, "BOOK"];
  }
  if (type === "TICKET") return [...base, "PURCHASE_TICKET", "BUY"];
  return base;
}

async function loadFromExperiences(): Promise<{
  offerings: DiscoverableOffering[];
  businesses: DiscoverableBusiness[];
}> {
  const experiences = await prisma.experience.findMany({
    where: { status: "active" },
    orderBy: [{ featured: "desc" }, { displayName: "asc" }],
  });

  const offerings: DiscoverableOffering[] = experiences.map((exp) => {
    const category = categoryForOs(exp.osType, exp.category);
    const type = typeForCategory(category);
    let meta: { availability?: string } = {};
    try {
      meta = JSON.parse(exp.metadata || "{}") as { availability?: string };
    } catch {
      /* ignore */
    }
    return {
      id: `off_${exp.id}`,
      businessId: exp.businessId,
      businessName: exp.businessName,
      name: exp.displayName,
      description: exp.description || exp.displayName,
      type,
      category,
      price: 0,
      priceFormatted: "See app",
      currency: "NGN",
      location: exp.location || undefined,
      availability: meta.availability || "Open",
      experienceId: exp.id,
      bookingCapability: true,
      commerceCapability: false,
      capabilities: caps(type),
      source: "lifeos-experience-registry",
      featured: exp.featured,
    };
  });

  const byBiz = new Map<string, DiscoverableBusiness>();
  for (const exp of experiences) {
    const category = categoryForOs(exp.osType, exp.category);
    const existing = byBiz.get(exp.businessId);
    if (existing) {
      existing.offeringCount = (existing.offeringCount ?? 0) + 1;
      continue;
    }
    byBiz.set(exp.businessId, {
      id: exp.businessId,
      businessId: exp.businessId,
      businessName: exp.businessName,
      description: exp.description || exp.businessName,
      category,
      location: exp.location || undefined,
      experienceId: exp.id,
      offeringCount: 1,
      source: "lifeos-experience-registry",
    });
  }

  return { offerings, businesses: [...byBiz.values()] };
}

function applyFilters(
  offerings: DiscoverableOffering[],
  filters: OfferingFilters = {},
): DiscoverableOffering[] {
  let out = offerings;
  if (filters.q?.trim()) {
    const n = filters.q.toLowerCase();
    out = out.filter(
      (o) =>
        o.name.toLowerCase().includes(n) ||
        o.description.toLowerCase().includes(n) ||
        o.businessName.toLowerCase().includes(n) ||
        o.category.toLowerCase().includes(n),
    );
  }
  if (filters.category) out = out.filter((o) => o.category === filters.category);
  if (filters.businessId) out = out.filter((o) => o.businessId === filters.businessId);
  if (filters.type) out = out.filter((o) => o.type === filters.type);
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

export class ExperienceOfferingProvider implements OfferingProvider {
  async list(filters: OfferingFilters = {}) {
    const { offerings } = await loadFromExperiences();
    return applyFilters(offerings, filters);
  }

  async getById(id: string) {
    const { offerings } = await loadFromExperiences();
    return offerings.find((o) => o.id === id) ?? null;
  }

  async search(q: string, filters: OfferingFilters = {}) {
    const { offerings } = await loadFromExperiences();
    return applyFilters(offerings, { ...filters, q });
  }

  async categories() {
    return ["Stay", "Eat", "Wellness", "Fitness", "Events", "Cinema", "Activities", "Travel", "More"] as DiscoverOfferingCategory[];
  }

  async listByBusiness(businessId: string) {
    const { offerings } = await loadFromExperiences();
    return applyFilters(offerings, { businessId });
  }

  async getBusiness(businessId: string) {
    const { businesses } = await loadFromExperiences();
    return businesses.find((b) => b.businessId === businessId || b.id === businessId) ?? null;
  }

  async listBusinesses(q?: string) {
    let { businesses } = await loadFromExperiences();
    if (q?.trim()) {
      const n = q.toLowerCase();
      businesses = businesses.filter(
        (b) =>
          b.businessName.toLowerCase().includes(n) ||
          b.description.toLowerCase().includes(n) ||
          b.category.toLowerCase().includes(n),
      );
    }
    return businesses;
  }
}
