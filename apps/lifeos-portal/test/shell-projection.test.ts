import assert from "node:assert/strict";
import test, { describe, beforeEach } from "node:test";
import { buildDualProjectionRoutes, parseShellDeepLink, SHELL_EVENTS } from "@lifeos/shared";
import { fetchInstalledApps, shellPathForApp } from "@lifeos/shell-core";
import {
  portalBootstrapTenant,
  portalEvents,
  portalListInstalledApps,
  resetPortalRegistry,
  shellCanLaunchWithoutReauth,
} from "../api/registry.js";

describe("shell-projection (Universal Shell Rendering Engine)", () => {
  beforeEach(() => resetPortalRegistry());

  test("dual-projection routes for HospitalityOS and ECommerceOS", () => {
    const hos = buildDualProjectionRoutes({
      appId: "hospitalityos",
      tenantId: "tenant_sunrise",
      subdomain: "sunrise",
    });
    assert.equal(hos.standalonePwaUrl, "https://sunrise.lifeos.app");
    assert.equal(hos.shellDeepLink, "lifeos://apps/hospitalityos?tenantId=tenant_sunrise");

    const ecom = buildDualProjectionRoutes({
      appId: "ecommerceos",
      tenantId: "tenant_shop",
      subdomain: "shop",
    });
    assert.equal(ecom.standalonePwaUrl, "https://shop.lifeos.app");
    assert.equal(ecom.shellDeepLink, "lifeos://apps/ecommerceos?tenantId=tenant_shop");

    const parsed = parseShellDeepLink(hos.shellDeepLink);
    assert.deepEqual(parsed, { appId: "hospitalityos", tenantId: "tenant_sunrise" });
  });

  test("Portal bootstrap emits TENANT_INSTALLED and lists apps in shell without re-auth", () => {
    const trustId = "TD-SHELL-USER";

    const hos = portalBootstrapTenant({
      appId: "hospitalityos",
      tenantId: "tenant_sunrise",
      trustId,
      displayName: "Sunrise Hotel",
      subdomain: "sunrise",
      experienceUrl: "https://sunrise.lifeos.app/hos",
      approvedOrigin: "https://sunrise.lifeos.app",
      osType: "hospitality",
      audience: "business",
      experienceId: "exp_sunrise_hotel",
    });

    const ecom = portalBootstrapTenant({
      appId: "ecommerceos",
      tenantId: "tenant_shop",
      trustId,
      displayName: "Shop Vertical",
      subdomain: "shop",
      experienceUrl: "https://shop.lifeos.app/",
      approvedOrigin: "https://shop.lifeos.app",
      osType: "shopping",
      audience: "business",
    });

    assert.equal(hos.event.type, SHELL_EVENTS.TENANT_INSTALLED);
    assert.equal(ecom.event.type, SHELL_EVENTS.TENANT_INSTALLED);
    assert.equal(portalEvents().length, 2);

    const installed = portalListInstalledApps(trustId);
    assert.equal(installed.length, 2);
    assert.ok(installed.some((a) => a.appId === "hospitalityos"));
    assert.ok(installed.some((a) => a.appId === "ecommerceos"));

    // Active Trust ID session → launchable in shell with zero re-authentication
    for (const app of installed) {
      assert.equal(
        shellCanLaunchWithoutReauth({ activeTrustId: trustId, app }),
        true,
      );
      assert.match(shellPathForApp(app), /^\/app\/shell\//);
    }

    // Different Trust ID cannot launch without SSO
    assert.equal(
      shellCanLaunchWithoutReauth({
        activeTrustId: "TD-OTHER",
        app: installed[0]!,
      }),
      false,
    );
  });

  test("fetchInstalledApps client targets GET /v1/user/installed-apps", async () => {
    const original = globalThis.fetch;
    let hit = "";
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      hit = String(input);
      return new Response(
        JSON.stringify({
          apps: [
            {
              id: "1",
              appId: "hospitalityos",
              tenantId: "t1",
              trustId: "TD-1",
              displayName: "Hotel",
              osType: "hospitality",
              audience: "business",
              experienceUrl: "https://sunrise.lifeos.app",
              approvedOrigin: "https://sunrise.lifeos.app",
              subdomain: "sunrise",
              launchUrl: "https://sunrise.lifeos.app",
              routes: {
                standalonePwaUrl: "https://sunrise.lifeos.app",
                shellDeepLink: "lifeos://apps/hospitalityos?tenantId=t1",
              },
              installedAt: new Date().toISOString(),
              status: "active",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    try {
      const apps = await fetchInstalledApps("https://api.lifeos.test", "sess_test");
      assert.equal(apps.length, 1);
      assert.match(hit, /\/v1\/user\/installed-apps$/);
    } finally {
      globalThis.fetch = original;
    }
  });
});
