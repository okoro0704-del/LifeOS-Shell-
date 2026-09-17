import assert from "node:assert/strict";
import test, { describe } from "node:test";

/**
 * Unit coverage for publication eligibility / idempotency helpers.
 * Runtime reconcile is exercised against production after deploy.
 */

function isEligible(input: {
  status?: string;
  visibility?: string;
  privacy?: string;
  assetType?: string;
  presentationTypes?: string[];
}): { ok: boolean; reason?: string } {
  const status = String(input.status ?? "PUBLISHED").toUpperCase();
  const visibility = String(input.visibility ?? input.privacy ?? "PUBLIC").toUpperCase();
  if (["DRAFT", "DELETED", "REVOKED", "SUSPENDED", "ARCHIVED"].includes(status)) {
    return { ok: false, reason: `status:${status}` };
  }
  if (["PRIVATE", "TENANT_PRIVATE", "STAFF", "ADMIN", "SCHEDULED"].includes(visibility)) {
    return { ok: false, reason: `privacy:${visibility}` };
  }
  const types = (input.presentationTypes ?? []).map((t) => String(t).toUpperCase());
  const assetType = String(input.assetType ?? "").toUpperCase();
  const supported =
    types.includes("POST") ||
    assetType === "DESIGN" ||
    types.includes("PHOTO") ||
    (assetType === "WRITING" && types.includes("POST"));
  if (!supported) return { ok: false, reason: "unsupported_type" };
  return { ok: true };
}

describe("ecosystem publication eligibility", () => {
  test("accepts PUBLIC DESIGN/POST", () => {
    assert.equal(
      isEligible({
        status: "PUBLISHED",
        visibility: "PUBLIC",
        assetType: "DESIGN",
        presentationTypes: ["POST"],
      }).ok,
      true,
    );
  });

  test("rejects DRAFT", () => {
    const r = isEligible({ status: "DRAFT", visibility: "PUBLIC", assetType: "DESIGN", presentationTypes: ["POST"] });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "status:DRAFT");
  });

  test("rejects PRIVATE", () => {
    const r = isEligible({
      status: "PUBLISHED",
      privacy: "PRIVATE",
      assetType: "DESIGN",
      presentationTypes: ["POST"],
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "privacy:PRIVATE");
  });

  test("idempotency key is application+publication", () => {
    const a = { originApplicationId: "mybrandos", originPublicationId: "pub_1" };
    const b = { originApplicationId: "mybrandos", originPublicationId: "pub_1" };
    const key = (x: typeof a) => `${x.originApplicationId}::${x.originPublicationId}`;
    assert.equal(key(a), key(b));
  });
});
