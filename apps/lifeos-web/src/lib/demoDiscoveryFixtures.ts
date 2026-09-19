/**
 * Isolated LifeOS discovery DEMO fixtures for experience testing.
 * Never written to production discovery DB.
 *
 * Activation (any one):
 * - VITE_LIFEOS_DEMO_DISCOVERY=true
 * - VITE_AUTH_BYPASS=true (current Netlify test env)
 * - import.meta.env.DEV
 *
 * Production without those flags → live API only.
 */
import type { DiscoverableBusiness, DiscoverableOffering } from "@lifeos/shared";

export const DEMO_FIXTURE_SOURCE = "lifeos-demo-fixture" as const;

export function isLifeOsDemoDiscoveryEnabled(): boolean {
  const demo = (import.meta.env.VITE_LIFEOS_DEMO_DISCOVERY ?? "").toLowerCase() === "true";
  const bypass = (import.meta.env.VITE_AUTH_BYPASS ?? "").toLowerCase() === "true";
  return demo || bypass || Boolean(import.meta.env.DEV);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function buildDemoBusinesses(count = 24): DiscoverableBusiness[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      id: `demo-biz-${pad(n)}`,
      businessId: `demo-biz-${pad(n)}`,
      businessName: `Business ${pad(n)}`,
      experienceId: DEMO_FIXTURE_SOURCE,
      description: "LifeOS demo fixture — not a production business",
      category: ["Retail", "Food", "Services", "Health", "Beauty"][i % 5]!,
      offeringCount: 2,
      source: DEMO_FIXTURE_SOURCE,
    };
  });
}

export function buildDemoServices(count = 24): DiscoverableOffering[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      id: `demo-svc-${pad(n)}`,
      type: "SERVICE" as const,
      name: `Service ${pad(n)}`,
      description: "LifeOS demo fixture",
      businessId: `demo-biz-${pad((i % 24) + 1)}`,
      businessName: `Business ${pad((i % 24) + 1)}`,
      category: "Activities" as const,
      experienceId: DEMO_FIXTURE_SOURCE,
      price: 1000 + i * 100,
      currency: "NGN",
      priceFormatted: `₦${(1000 + i * 100).toLocaleString()}`,
      bookingCapability: true,
      commerceCapability: false,
      capabilities: [],
      source: DEMO_FIXTURE_SOURCE,
      featured: false,
    };
  });
}

export function buildDemoProducts(count = 24): DiscoverableOffering[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      id: `demo-prd-${pad(n)}`,
      type: "PRODUCT" as const,
      name: `Product ${pad(n)}`,
      description: "LifeOS demo fixture",
      businessId: `demo-biz-${pad((i % 24) + 1)}`,
      businessName: `Business ${pad((i % 24) + 1)}`,
      category: "Activities" as const,
      experienceId: DEMO_FIXTURE_SOURCE,
      price: 500 + i * 50,
      currency: "NGN",
      priceFormatted: `₦${(500 + i * 50).toLocaleString()}`,
      bookingCapability: false,
      commerceCapability: true,
      capabilities: [],
      source: DEMO_FIXTURE_SOURCE,
      featured: false,
    };
  });
}
