import { describe, expect, it, vi, afterEach } from "vitest";
import {
  fetchHospitalityLifeOsFeed,
  mapHospitalityPublicationToMediaItem,
  mapOfferingToCatalogueItem,
  HOSPITALITYOS_API_DEFAULT,
} from "../src/lib/hospitalityLifeOsFeed";

describe("hospitalityLifeOsFeed", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("maps offering to catalogue item with deep link", () => {
    const item = mapOfferingToCatalogueItem({
      canonicalItemId: "hos:offering:abc",
      title: "Spa Day",
      summary: "Relax",
      itemType: "offering",
      applicationId: "hospitalityos",
      canonicalSourceUrl: "https://harbor.getlifeos.app/catalog/abc",
      tenant: { slug: "harbor", displayName: "Harbor Hotel" },
      price: { amount: "120.00", currency: "USD" },
      assetReferences: [{ href: "https://cdn.example/spa.jpg", kind: "image" }],
      provenance: {
        sourceApplicationId: "hospitalityos",
        sourceTenantSlug: "harbor",
        sourceItemId: "abc",
      },
    });
    expect(item.applicationId).toBe("hospitalityos");
    expect(item.destinationUrl).toContain("/catalog/abc");
    expect(item.priceLabel).toBe("USD 120.00");
  });

  it("maps publication preferring related offering deep link", () => {
    const media = mapHospitalityPublicationToMediaItem({
      canonicalItemId: "hos:publication:p1",
      title: "Lobby",
      summary: "Sunset",
      itemType: "photo",
      canonicalSourceUrl: "https://harbor.getlifeos.app/p/p1",
      tenant: { slug: "harbor", displayName: "Harbor" },
      assetReferences: [{ href: "https://cdn.example/lobby.jpg", kind: "image" }],
      relatedItem: {
        kind: "offering",
        id: "abc",
        canonicalSourceUrl: "https://harbor.getlifeos.app/catalog/abc",
      },
      provenance: { sourceApplicationId: "hospitalityos", sourceTenantSlug: "harbor", sourceItemId: "p1" },
    });
    expect(media.sourceUrl).toContain("/catalog/abc");
    expect(media.sourceLabel).toBe("View Offering");
    expect(media.sourceApplicationId).toBe("hospitalityos");
  });

  it("fetch treats timeout as isolated failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );
    const result = await fetchHospitalityLifeOsFeed({ timeoutMs: 20, limit: 5 });
    expect(result.ok).toBe(false);
    expect(result.failure).toBe("timeout");
    expect(result.items).toEqual([]);
    expect(HOSPITALITYOS_API_DEFAULT).toContain("railway.app");
  });
});
