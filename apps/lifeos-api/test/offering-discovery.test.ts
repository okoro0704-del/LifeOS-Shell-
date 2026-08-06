import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { getOfferingProvider, MockOfferingProvider } from "../src/services/offerings.js";
import { rankOfferings, scoreOffering } from "../src/services/offering-ranking.js";
import { classifyIntent } from "../src/command/intent.js";

describe("offering discovery", () => {
  test("lists offerings not only businesses", async () => {
    const list = await getOfferingProvider().list();
    assert.ok(list.length >= 10);
    assert.ok(list.every((o) => o.name && o.businessName && o.experienceId));
  });

  test("category Stay returns rooms", async () => {
    const stay = await getOfferingProvider().list({ category: "Stay" });
    assert.ok(stay.some((o) => o.type === "ROOM"));
    assert.ok(stay.every((o) => o.category === "Stay"));
  });

  test("massage search returns treatments before relying on spa business alone", async () => {
    const results = await getOfferingProvider().search("massage");
    assert.ok(results.length >= 1);
    assert.ok(results.some((o) => /massage/i.test(o.name)));
    assert.ok(results.every((o) => o.type === "TREATMENT" || /massage|spa|wellness/i.test(o.name + o.category)));
  });

  test("business search still works", async () => {
    const businesses = await getOfferingProvider().listBusinesses("Serenity");
    assert.equal(businesses.length, 1);
    assert.equal(businesses[0].businessName, "Serenity Spa");
  });

  test("offering → business → other offerings", async () => {
    const offering = await getOfferingProvider().getById("off_serenity_deep");
    assert.ok(offering);
    const business = await getOfferingProvider().getBusiness(offering!.businessId);
    assert.ok(business);
    const more = await getOfferingProvider().listByBusiness(offering!.businessId);
    assert.ok(more.length > 1);
    assert.ok(more.some((o) => o.id !== offering!.id));
  });

  test("price filter", async () => {
    const cheap = await getOfferingProvider().list({ maxPrice: 10000 });
    assert.ok(cheap.every((o) => o.price <= 10000));
  });

  test("ranking prefers featured + query match", () => {
    const provider = new MockOfferingProvider();
    void provider;
    const a = {
      id: "a",
      type: "TREATMENT" as const,
      name: "Deep Tissue Massage",
      description: "x",
      businessId: "b",
      businessName: "Spa",
      category: "Wellness" as const,
      experienceId: "e",
      price: 1,
      currency: "NGN",
      priceFormatted: "₦1",
      bookingCapability: true,
      commerceCapability: true,
      capabilities: ["VIEW", "BOOK", "SAVE"] as const,
      source: "test",
      featured: true,
    };
    const b = { ...a, id: "b", name: "Other", featured: false };
    const ranked = rankOfferings([b, a], { query: "massage" });
    assert.equal(ranked[0].id, "a");
    assert.ok(scoreOffering(a, { query: "massage" }) > scoreOffering(b, { query: "massage" }));
  });
});

describe("offering search intent", () => {
  test("find massage → DISCOVER", () => {
    const i = classifyIntent("Find me a massage tomorrow around 3pm");
    assert.equal(i.kind, "DISCOVER");
  });

  test("Sunrise Hotel → SEARCH (business entity)", () => {
    const i = classifyIntent("Sunrise Hotel");
    assert.equal(i.kind, "SEARCH");
  });
});
