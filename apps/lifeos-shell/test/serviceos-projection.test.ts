import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveLauncherBadge,
  resolveLauncherGlyph,
  serviceosEmbedLaunchUrl,
  serviceosPresetIcon,
  serviceosVerticalTag,
} from "@lifeos/shell-core";
import { portalBootstrapTenant, resetPortalRegistry } from "@lifeos/portal/api/registry.js";

const PRESETS = [
  { preset: "beauty", icon: "✂️", tag: "Beauty" },
  { preset: "wellness", icon: "💆", tag: "Wellness" },
  { preset: "technical", icon: "🛠️", tag: "Technical" },
  { preset: "culinary", icon: "👨‍🍳", tag: "Culinary" },
] as const;

describe("serviceos-projection (ServiceOS shell launcher)", () => {
  beforeEach(() => {
    resetPortalRegistry();
  });

  for (const row of PRESETS) {
    it(`provisions ${row.preset} preset with ${row.icon} icon`, () => {
      const { app } = portalBootstrapTenant({
        appId: "serviceos",
        tenantId: `tenant_${row.preset}`,
        trustId: "TD-SERVICE",
        displayName: row.tag,
        subdomain: `harbor-${row.preset}`,
        experienceUrl: `https://harbor-${row.preset}.lifeos.app/`,
        approvedOrigin: `https://harbor-${row.preset}.lifeos.app`,
        osType: "service",
        audience: "business",
        preset: row.preset,
        launchUrl: `https://harbor-${row.preset}.lifeos.app/`,
      });

      expect(app.appId).toBe("serviceos");
      expect(app.preset).toBe(row.preset);
      expect(serviceosPresetIcon(app.preset)).toBe(row.icon);
      expect(serviceosVerticalTag(app.preset)).toBe(row.tag);
      expect(resolveLauncherGlyph(app)).toEqual({ kind: "emoji", value: row.icon });
      expect(resolveLauncherBadge(app)).toBe(row.tag);

      const embed = serviceosEmbedLaunchUrl({
        experienceUrl: app.launchUrl,
        preset: row.preset,
        trustIdToken: "sess_trust",
      });
      expect(embed).toContain("/embed/catalog");
      expect(embed).toContain("trustId=sess_trust");
    });
  }
});
