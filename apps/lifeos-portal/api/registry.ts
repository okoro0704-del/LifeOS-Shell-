/**
 * In-memory Portal registry for shell-projection tests (no DB required).
 * Mirrors POST /v1/distributor/tenants/bootstrap → GET /v1/user/installed-apps.
 */
import type {
  InstalledAppManifest,
  TenantBootstrapInput,
  TenantInstalledEvent,
} from "@lifeos/shared";
import { buildDualProjectionRoutes, SHELL_EVENTS } from "@lifeos/shared";

const byTrustId = new Map<string, InstalledAppManifest[]>();
const events: TenantInstalledEvent[] = [];

export function resetPortalRegistry() {
  byTrustId.clear();
  events.length = 0;
}

export function portalBootstrapTenant(input: TenantBootstrapInput) {
  const routes = buildDualProjectionRoutes({
    appId: input.appId,
    tenantId: input.tenantId,
    subdomain: input.subdomain,
  });
  const audience = input.audience ?? "business";
  const launchUrl = (input.launchUrl ?? input.experienceUrl).trim();
  const app: InstalledAppManifest = {
    id: `inst_${input.appId}_${input.tenantId}`,
    appId: input.appId,
    tenantId: input.tenantId,
    trustId: input.trustId,
    displayName: input.displayName,
    icon: input.icon ?? null,
    osType: input.osType ?? "other",
    audience,
    experienceId: input.experienceId ?? null,
    experienceUrl: input.experienceUrl,
    approvedOrigin: input.approvedOrigin,
    subdomain: input.subdomain,
    launchUrl,
    preset: input.preset ?? null,
    badgeCount: input.badgeCount ?? 0,
    routes,
    installedAt: new Date().toISOString(),
    status: "active",
  };
  const list = byTrustId.get(input.trustId) ?? [];
  const next = [...list.filter((a) => !(a.appId === app.appId && a.tenantId === app.tenantId)), app];
  byTrustId.set(input.trustId, next);

  const event: TenantInstalledEvent = {
    type: SHELL_EVENTS.TENANT_INSTALLED,
    trustId: input.trustId,
    appId: input.appId,
    tenantId: input.tenantId,
    audience,
    routes,
    at: new Date().toISOString(),
  };
  events.push(event);
  return { app, event };
}

export function portalListInstalledApps(trustId: string) {
  return byTrustId.get(trustId) ?? [];
}

export function portalEvents() {
  return [...events];
}

/** Simulates shell launch without re-auth — inherits active Trust ID session. */
export function shellCanLaunchWithoutReauth(opts: {
  activeTrustId: string | null;
  app: InstalledAppManifest;
}) {
  if (!opts.activeTrustId) return false;
  return (
    opts.app.status === "active" &&
    opts.app.trustId === opts.activeTrustId &&
    opts.app.routes.shellDeepLink.startsWith("lifeos://apps/")
  );
}
