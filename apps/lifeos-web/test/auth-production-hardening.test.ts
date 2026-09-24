import { describe, expect, it } from "vitest";
import { resolveTrustIdConfiguration } from "../src/lib/api";
import { isAuthBypassAllowed } from "../src/lib/personalConnectivity";

describe("production authentication hardening", () => {
  it("rejects requested and native auth bypass in production", () => {
    expect(isAuthBypassAllowed({ requested: true, production: true, native: false })).toBe(false);
    expect(isAuthBypassAllowed({ requested: false, production: true, native: true })).toBe(false);
  });

  it("permits bypass only when non-production explicitly requests it", () => {
    expect(isAuthBypassAllowed({ requested: true, production: false, native: false })).toBe(true);
    expect(isAuthBypassAllowed({ requested: false, production: false, native: false })).toBe(false);
  });

  it("fails closed when production TrustID configuration is absent", () => {
    expect(resolveTrustIdConfiguration({ production: true }).configured).toBe(false);
    expect(resolveTrustIdConfiguration({
      production: true,
      trustIdWeb: "https://trustedid.netlify.app",
      trustIdApi: "https://trustedid.netlify.app/api",
      clientId: "lifeos_mock_public",
      redirectUri: "https://lifeosapp.getlifeos.app/callback",
    }).configured).toBe(true);
  });
});
