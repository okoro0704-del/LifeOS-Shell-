import { describe, expect, it } from "vitest";
import { activeVipRelationships, resolveOnlineAccess, type CreatorVipRelationship } from "../src/lib/onlineKernel";

const active: CreatorVipRelationship = { subjectId: "person", creatorId: "creator-a", productId: "product-a", spaceId: "space-a", relationshipId: "rel-a", status: "ACTIVE", capabilities: ["creator.vip.consume", "creator.vip.tv"], startedAt: "2026-01-01T00:00:00.000Z", source: "creator-product" };
describe("Online Kernel access resolution", () => {
  it("keeps free public and premium entitlement access distinct", () => {
    expect(resolveOnlineAccess({ accessClass: "FREE" })).toBe("ALLOW");
    expect(resolveOnlineAccess({ accessClass: "PREMIUM" })).toBe("IDENTITY_REQUIRED");
    expect(resolveOnlineAccess({ accessClass: "PREMIUM", subjectId: "person" })).toBe("SUBSCRIPTION_REQUIRED");
    expect(resolveOnlineAccess({ accessClass: "PREMIUM", subjectId: "person", hasPremium: true })).toBe("ALLOW");
  });
  it("projects only active creator relationships and never grants Studio", () => {
    const other = { ...active, creatorId: "creator-b", status: "EXPIRED" as const };
    expect(activeVipRelationships("person", [active, other])).toEqual([active]);
    expect(resolveOnlineAccess({ accessClass: "VIP", subjectId: "person", creatorId: "creator-a", capability: "creator.vip.consume", relationships: [active] })).toBe("ALLOW");
    expect(resolveOnlineAccess({ accessClass: "VIP", subjectId: "person", creatorId: "creator-a", capability: "creator.studio.manage", relationships: [active] })).toBe("VIP_RELATIONSHIP_REQUIRED");
    expect(resolveOnlineAccess({ accessClass: "VIP", subjectId: "person", creatorId: "creator-b", relationships: [active] })).toBe("VIP_RELATIONSHIP_REQUIRED");
  });
  it("reports expiry, cancellation, and suspension truthfully", () => {
    for (const status of ["EXPIRED", "CANCELLED"] as const) expect(resolveOnlineAccess({ accessClass: "VIP", subjectId: "person", creatorId: "creator-a", relationships: [{ ...active, status }] })).toBe("EXPIRED");
    expect(resolveOnlineAccess({ accessClass: "VIP", subjectId: "person", creatorId: "creator-a", relationships: [{ ...active, status: "SUSPENDED" }] })).toBe("SUSPENDED");
  });
});
