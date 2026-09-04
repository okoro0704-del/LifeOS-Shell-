import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getUserInstalledApps,
  resolveLauncherBadge,
  resolveLauncherGlyph,
  transportationEmbedLaunchUrl,
  transportationPresetIcon,
  transportationVerticalTag,
} from "@lifeos/shell-core";
import {
  portalBootstrapTenant,
  portalListInstalledApps,
  resetPortalRegistry,
} from "@lifeos/portal/api/registry.js";

describe("transportation-projection (TransportationOS & RentalOS)", () => {
  beforeEach(() => {
    resetPortalRegistry();
  });

  it("provisions logistics preset with 🚚 icon and Dispatch vertical tag", () => {
    const { app } = portalBootstrapTenant({
      appId: "transportationos",
      tenantId: "tenant_courier",
      trustId: "TD-TRANSIT",
      displayName: "City Courier",
      subdomain: "citycourier",
      experienceUrl: "https://citycourier.lifeos.app/",
      approvedOrigin: "https://citycourier.lifeos.app",
      osType: "transport",
      audience: "business",
      preset: "logistics",
      launchUrl: "https://citycourier.lifeos.app/",
    });

    expect(app.appId).toBe("transportationos");
    expect(app.preset).toBe("logistics");
    expect(transportationPresetIcon(app.preset)).toBe("🚚");
    expect(transportationVerticalTag(app.preset)).toBe("Dispatch");
    expect(resolveLauncherGlyph(app)).toEqual({ kind: "emoji", value: "🚚" });
    expect(resolveLauncherBadge(app)).toBe("Dispatch");
  });

  it("provisions rentals preset with 🚗 icon and Rentals vertical tag", () => {
    const { app } = portalBootstrapTenant({
      appId: "transportationos",
      tenantId: "tenant_fleet",
      trustId: "TD-TRANSIT",
      displayName: "Fleet Rentals",
      subdomain: "fleetrent",
      experienceUrl: "https://fleetrent.lifeos.app/",
      approvedOrigin: "https://fleetrent.lifeos.app",
      osType: "transport",
      audience: "business",
      preset: "rentals",
      launchUrl: "https://fleetrent.lifeos.app/",
    });

    expect(app.preset).toBe("rentals");
    expect(transportationPresetIcon(app.preset)).toBe("🚗");
    expect(transportationVerticalTag(app.preset)).toBe("Rentals");
    expect(resolveLauncherGlyph(app)).toEqual({ kind: "emoji", value: "🚗" });
    expect(resolveLauncherBadge(app)).toBe("Rentals");
  });

  it("getUserInstalledApps returns launch URLs and Trust ID token for iframe embedding", async () => {
    const trustId = "TD-TRANSIT";
    const sessionToken = "sess_trust_active";

    portalBootstrapTenant({
      appId: "transportationos",
      tenantId: "tenant_hub",
      trustId,
      displayName: "Transit Hub",
      subdomain: "transithub",
      experienceUrl: "https://transithub.lifeos.app/",
      approvedOrigin: "https://transithub.lifeos.app",
      preset: "integrated",
      launchUrl: "https://transithub.lifeos.app/",
    });

    const local = portalListInstalledApps(trustId);
    expect(local).toHaveLength(1);
    expect(local[0]!.launchUrl).toBe("https://transithub.lifeos.app/");
    expect(local[0]!.trustId).toBe(trustId);

    const embed = transportationEmbedLaunchUrl({
      experienceUrl: local[0]!.launchUrl,
      preset: local[0]!.preset,
      trustIdToken: sessionToken,
    });
    expect(embed).toContain("/embed?tab=");
    expect(embed).toContain(`trustId=${encodeURIComponent(sessionToken)}`);
    expect(embed).toContain(`token=${encodeURIComponent(sessionToken)}`);

    const original = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toMatch(/\/v1\/user\/installed-apps$/);
      expect((init?.headers as Record<string, string>)["X-LifeOS-Session"]).toBe(sessionToken);
      return new Response(JSON.stringify({ apps: local }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const apps = await getUserInstalledApps("https://api.lifeos.test", sessionToken);
      expect(apps).toHaveLength(1);
      expect(apps[0]!.launchUrl).toBe("https://transithub.lifeos.app/");
      expect(apps[0]!.trustId).toBe(trustId);
      expect(resolveLauncherBadge(apps[0]!)).toBe("Integrated");
      expect(resolveLauncherGlyph(apps[0]!)).toEqual({ kind: "emoji", value: "🚖" });
    } finally {
      globalThis.fetch = original;
    }
  });
});
