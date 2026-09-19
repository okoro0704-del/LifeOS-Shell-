import { describe, expect, test, vi, afterEach } from "vitest";
import {
  assembleMediaFeed,
  classifyEcommerceFeedOutcome,
  ecommerceApiBase,
  ECOMMERCEOS_API_DEFAULT,
  mapProductToCatalogueItem,
  mapPublicationToMediaItem,
  withTimeout,
  type EcommerceLifeOsFeedItem,
} from "../src/lib/ecommerceLifeOsFeed";
import type { MediaItem } from "../src/lib/personalCatalog";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function samplePublication(overrides: Partial<EcommerceLifeOsFeedItem> = {}): EcommerceLifeOsFeedItem {
  return {
    family: "publication",
    applicationId: "ecommerceos",
    itemType: "PHOTO",
    canonicalItemId: "pub_1",
    title: "New drop",
    summary: "Fresh from the store",
    assetReferences: [
      {
        assetId: "a1",
        href: "https://cdn.example/photo.jpg",
        kind: "image",
        alt: "drop",
      },
    ],
    canonicalSourceUrl: "https://shop.example/p/pub_1",
    tenant: { slug: "acme", displayName: "Acme Store" },
    provenance: {
      sourceApplicationId: "ecommerceos",
      sourceTenantSlug: "acme",
      sourceItemId: "pub_1",
    },
    publishedAt: "2026-09-18T12:00:00.000Z",
    ...overrides,
  };
}

describe("ecommerceLifeOsFeed mapping", () => {
  test("mapPublicationToMediaItem uses eco:ecommerceos:pub id and picture kind", () => {
    const item = mapPublicationToMediaItem(samplePublication());
    expect(item.id).toBe("eco:ecommerceos:pub:pub_1");
    expect(item.kind).toBe("picture");
    expect(item.author).toBe("acme");
    expect(item.mediaUrl).toBe("https://cdn.example/photo.jpg");
    expect(item.posterUrl).toBe("https://cdn.example/photo.jpg");
    expect(item.sourceUrl).toBe("https://shop.example/p/pub_1");
    expect(item.sourceLabel).toBe("Visit Store");
    expect(item.storeDisplayName).toBe("Acme Store");
    expect(item.sourceApplicationId).toBe("ecommerceos");
  });

  test("mapPublicationToMediaItem prefers related product deep link", () => {
    const item = mapPublicationToMediaItem(
      samplePublication({
        relatedItem: {
          kind: "product",
          id: "prod_9",
          canonicalSourceUrl: "https://shop.example/product/prod_9",
        },
      }),
    );
    expect(item.sourceUrl).toBe("https://shop.example/product/prod_9");
    expect(item.sourceLabel).toBe("View Product");
  });

  test("mapPublicationToMediaItem maps VIDEO assets", () => {
    const item = mapPublicationToMediaItem(
      samplePublication({
        itemType: "VIDEO",
        assetReferences: [
          { href: "https://cdn.example/clip.mp4", kind: "video" },
          { href: "https://cdn.example/poster.jpg", kind: "image" },
        ],
      }),
    );
    expect(item.kind).toBe("video");
    expect(item.mediaUrl).toBe("https://cdn.example/clip.mp4");
    expect(item.posterUrl).toBe("https://cdn.example/poster.jpg");
  });

  test("mapProductToCatalogueItem sets destinationUrl to canonicalSourceUrl", () => {
    const cat = mapProductToCatalogueItem({
      family: "catalogue",
      itemType: "PRODUCT",
      canonicalItemId: "prod_1",
      title: "Sneaker",
      summary: "Blue",
      assetReferences: [{ href: "https://cdn.example/sneaker.jpg", kind: "image" }],
      canonicalSourceUrl: "https://shop.example/product/prod_1",
      tenant: { slug: "acme", displayName: "Acme" },
      price: { amount: "49.99", currency: "NGN" },
      applicationId: "ecommerceos",
    });
    expect(cat.id).toBe("eco:ecommerceos:product:prod_1");
    expect(cat.destinationUrl).toBe("https://shop.example/product/prod_1");
    expect(cat.ownerSlug).toBe("acme");
    expect(cat.priceLabel).toBe("NGN 49.99");
    expect(cat.mediaUrl).toBe("https://cdn.example/sneaker.jpg");
  });
});

describe("ecommerceLifeOsFeed helpers", () => {
  test("ecommerceApiBase defaults to hosted Railway API", () => {
    expect(ecommerceApiBase()).toBe(ECOMMERCEOS_API_DEFAULT);
    expect(ECOMMERCEOS_API_DEFAULT).toContain("railway.app");
  });

  test("withTimeout rejects on timeout", async () => {
    vi.useFakeTimers();
    const slow = new Promise<string>((resolve) => {
      setTimeout(() => resolve("late"), 5000);
    });
    const pending = withTimeout(slow, 100);
    const assertion = expect(pending).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });

  test("withTimeout resolves when promise wins", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 500)).resolves.toBe("ok");
  });

  test("classifyEcommerceFeedOutcome distinguishes empty / timeout / unavailable", () => {
    expect(classifyEcommerceFeedOutcome({ ok: true, items: [{ canonicalItemId: "1", title: "t", canonicalSourceUrl: "https://x" }], nextCursor: null })).toBe("ok");
    expect(classifyEcommerceFeedOutcome({ ok: true, items: [], nextCursor: null, failure: "empty" })).toBe("empty");
    expect(classifyEcommerceFeedOutcome({ ok: false, items: [], nextCursor: null, failure: "timeout" })).toBe("timeout");
    expect(classifyEcommerceFeedOutcome({ ok: false, items: [], nextCursor: null, failure: "unavailable" })).toBe("unavailable");
  });

  test("assembleMediaFeed sorts newest publishedAt first with id tie-break", () => {
    const a: MediaItem = {
      id: "a",
      title: "A",
      kind: "post",
      detail: "",
      free: true,
      ownedOrConsumed: true,
      premiumRequired: false,
    };
    const b: MediaItem = {
      id: "b",
      title: "B",
      kind: "post",
      detail: "",
      free: true,
      ownedOrConsumed: true,
      premiumRequired: false,
    };
    const c: MediaItem = {
      id: "c",
      title: "C",
      kind: "post",
      detail: "",
      free: true,
      ownedOrConsumed: true,
      premiumRequired: false,
    };
    const merged = assembleMediaFeed([
      [
        { item: a, publishedAt: "2026-01-01T00:00:00.000Z" },
        { item: b, publishedAt: "2026-09-01T00:00:00.000Z" },
      ],
      [{ item: c, publishedAt: "2026-09-01T00:00:00.000Z" }],
    ]);
    expect(merged.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });
});
