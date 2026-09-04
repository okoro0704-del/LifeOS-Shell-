import { describe, it, expect, beforeEach } from "vitest";
import {
  hospitalityPresetIcon,
  hospitalityVerticalTag,
  resolveLauncherBadge,
  resolveLauncherGlyph,
} from "@lifeos/shell-core";
import { portalBootstrapTenant, resetPortalRegistry } from "@lifeos/portal/api/registry.js";

describe("hospitalityos-projection (Local Food shell launcher)", () => {
  beforeEach(() => {
    resetPortalRegistry();
  });

  it("provisions local_food preset with 🍲 icon and Local Food tag", () => {
    const { app } = portalBootstrapTenant({
      appId: "hospitalityos",
      tenantId: "tenant_local_food",
      trustId: "TD-LOCAL-FOOD",
      displayName: "Lekki Home Kitchens",
      subdomain: "lekki-kitchens",
      experienceUrl: "https://lekki-kitchens.lifeos.app/",
      approvedOrigin: "https://lekki-kitchens.lifeos.app",
      osType: "hospitality",
      audience: "business",
      preset: "local_food",
      launchUrl: "https://lekki-kitchens.lifeos.app/staff",
    });

    expect(app.appId).toBe("hospitalityos");
    expect(app.preset).toBe("local_food");
    expect(hospitalityPresetIcon("local_food")).toBe("🍲");
    expect(hospitalityVerticalTag("local_food")).toBe("Local Food");
    expect(resolveLauncherGlyph(app)).toEqual({ kind: "emoji", value: "🍲" });
    expect(resolveLauncherBadge(app)).toBe("Local Food");
  });
});
