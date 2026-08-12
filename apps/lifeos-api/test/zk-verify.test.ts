import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
  __resetEphemeralIdentityForTests,
  getEphemeralPresentation,
  putEphemeralPresentation,
} from "../src/lib/ephemeral-identity.js";
import { verifyZkClaim } from "../src/lib/zk-verify.js";
import type { ZkClaimBundle } from "@lifeos/shared";

function sampleClaim(overrides?: Partial<ZkClaimBundle>): ZkClaimBundle {
  return {
    claimType: "compliance_tier",
    protocol: "groth16",
    audience: "lifeos_mock_public",
    issuedAt: new Date().toISOString(),
    publicSignals: ["2", "1"],
    proof: {
      pi_a: ["1", "2", "1"],
      pi_b: [
        ["1", "2"],
        ["3", "4"],
        ["1", "0"],
      ],
      pi_c: ["5", "6", "1"],
      protocol: "groth16",
      curve: "bn128",
    },
    disclosed: { trustTier: 2, verified: true },
    ...overrides,
  };
}

describe("ephemeral identity cache", () => {
  test("stores presentation in RAM and never requires disk", () => {
    __resetEphemeralIdentityForTests();
    putEphemeralPresentation("sess_1", {
      email: "a@example.com",
      firstName: "Ada",
    });
    const got = getEphemeralPresentation("sess_1");
    assert.equal(got?.email, "a@example.com");
    assert.equal(got?.firstName, "Ada");
  });
});

describe("zk claim verification", () => {
  test("rejects malformed proofs", async () => {
    const result = await verifyZkClaim(
      sampleClaim({
        proof: { pi_a: ["1"], pi_b: [], pi_c: [] },
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "zk_invalid");
  });

  test("rejects audience mismatch", async () => {
    const result = await verifyZkClaim(sampleClaim({ audience: "other_app" }), {
      audience: "lifeos_mock_public",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "zk_audience_mismatch");
  });

  test("accepts structurally valid claims in relaxed/hybrid mode", async () => {
    // Dev default zkDevRelaxed=true — TrustID circuits may be unpublished.
    const result = await verifyZkClaim(sampleClaim());
    assert.equal(result.ok, true);
  });
});
