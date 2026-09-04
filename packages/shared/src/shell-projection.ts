/**
 * Universal Shell — installed vertical / tenant app projection.
 */

export type ShellAudience = "personal" | "business";

/** Portal presets for TransportationOS / RentalOS. */
export type TransportationOSPreset = "logistics" | "rentals" | "integrated";

/** ServiceOS at-home professional presets. */
export type ServiceOSPreset = "beauty" | "wellness" | "technical" | "culinary";

/** HospitalityOS marketplace presets. */
export type HospitalityOSPreset = "local_food" | "shared_homes";

export type ShellAppPreset = TransportationOSPreset | ServiceOSPreset | HospitalityOSPreset;

export type TenantBootstrapInput = {
  /** Vertical OS id, e.g. hospitalityos, ecommerceos, transportationos */
  appId: string;
  tenantId: string;
  trustId: string;
  displayName: string;
  /** Standalone white-label subdomain, e.g. sunrise → https://sunrise.lifeos.app */
  subdomain: string;
  experienceUrl: string;
  approvedOrigin: string;
  icon?: string | null;
  osType?: string;
  audience?: ShellAudience;
  /** Optional link to an existing Experience row */
  experienceId?: string | null;
  /** TransportationOS / ServiceOS / HospitalityOS portal preset */
  preset?: ShellAppPreset | string | null;
  badgeCount?: number;
  /** Explicit micro-frontend launch URL (defaults to experienceUrl) */
  launchUrl?: string | null;
};

export type DualProjectionRoutes = {
  /** Isolated tenant branding PWA */
  standalonePwaUrl: string;
  /** Embedded view inside LifeOS shell */
  shellDeepLink: string;
};

export type InstalledAppManifest = {
  id: string;
  appId: string;
  tenantId: string;
  trustId: string;
  displayName: string;
  icon?: string | null;
  osType: string;
  audience: ShellAudience;
  experienceId?: string | null;
  experienceUrl: string;
  approvedOrigin: string;
  /** White-label subdomain used for dual projection */
  subdomain: string;
  /** Primary URL opened inside the shell viewport */
  launchUrl: string;
  /** TransportationOS / ServiceOS / HospitalityOS portal preset */
  preset?: ShellAppPreset | string | null;
  badgeCount?: number;
  routes: DualProjectionRoutes;
  installedAt: string;
  status: "active" | "revoked";
};

export const SHELL_EVENTS = {
  TENANT_INSTALLED: "lifeos.tenant.installed",
  TENANT_REVOKED: "lifeos.tenant.revoked",
  APP_LAUNCHED: "lifeos.shell.app_launched",
} as const;

export type TenantInstalledEvent = {
  type: typeof SHELL_EVENTS.TENANT_INSTALLED;
  trustId: string;
  appId: string;
  tenantId: string;
  audience: ShellAudience;
  routes: DualProjectionRoutes;
  at: string;
};

/**
 * Dual-projection routes for every provisioned tenant.
 * Standalone: https://{subdomain}.lifeos.app
 * Shell: lifeos://apps/{appId}?tenantId={tenantId}
 */
export function buildDualProjectionRoutes(input: {
  appId: string;
  tenantId: string;
  subdomain: string;
  rootDomain?: string;
}): DualProjectionRoutes {
  const root = (input.rootDomain ?? "lifeos.app").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const sub = input.subdomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split(".")[0]!
    .replace(/[^a-z0-9-]/g, "-");
  return {
    standalonePwaUrl: `https://${sub}.${root}`,
    shellDeepLink: `lifeos://apps/${encodeURIComponent(input.appId)}?tenantId=${encodeURIComponent(input.tenantId)}`,
  };
}

export function parseShellDeepLink(href: string): {
  appId: string;
  tenantId: string | null;
} | null {
  try {
    if (!href.startsWith("lifeos://")) return null;
    const u = new URL(href.replace("lifeos://", "https://lifeos.local/"));
    const parts = u.pathname.replace(/^\//, "").split("/");
    if (parts[0] !== "apps" || !parts[1]) return null;
    return {
      appId: decodeURIComponent(parts[1]),
      tenantId: u.searchParams.get("tenantId"),
    };
  } catch {
    return null;
  }
}
