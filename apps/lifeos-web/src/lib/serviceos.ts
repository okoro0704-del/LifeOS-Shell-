import { buildDualProjectionRoutes, type InstalledAppManifest } from "@lifeos/shared";
import {
  normalizeServiceOSPreset,
  serviceosPresetIcon,
  serviceosTrackEmbedUrl,
  serviceosVerticalTag,
  type ServiceOSPreset,
} from "@lifeos/shell-core";

const PRESET_DISPLAY: Record<ServiceOSPreset, string> = {
  beauty: "Mobile Salon & Grooming OS",
  wellness: "Home Wellness & Spa OS",
  technical: "On-Demand Field Technician OS",
  culinary: "Private Chef & Culinary OS",
};

/** Vite exposes VITE_*; set VITE_SERVICEOS_API_URL or SERVICEOS_API_URL (copied in vite config). */
export function serviceosApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_SERVICEOS_API_URL || "http://localhost:8920";
  return String(fromEnv).replace(/\/$/, "");
}

export function createServiceOSShellManifest(opts: {
  tenantId: string;
  preset?: string | null;
  apiBase?: string;
  trustId?: string | null;
}): InstalledAppManifest {
  const preset = normalizeServiceOSPreset(opts.preset, "beauty");
  const origin = serviceosApiBaseUrlFrom(opts.apiBase);
  const tenantId = opts.tenantId || "local";
  return {
    id: `inst_serviceos_${tenantId}`,
    appId: "serviceos",
    tenantId,
    trustId: opts.trustId || "TD-GUEST",
    displayName: PRESET_DISPLAY[preset],
    icon: serviceosPresetIcon(preset),
    osType: "services",
    audience: "business",
    experienceUrl: `${origin}/`,
    approvedOrigin: origin,
    subdomain: "serviceos",
    launchUrl: `${origin}/`,
    preset,
    badgeCount: 0,
    routes: buildDualProjectionRoutes({
      appId: "serviceos",
      tenantId,
      subdomain: "serviceos",
    }),
    installedAt: new Date().toISOString(),
    status: "active",
  };
}

export function serviceosCatalogEmbedHint(preset: ServiceOSPreset): string {
  return `${serviceosPresetIcon(preset)} ${serviceosVerticalTag(preset)}`;
}

export function serviceosLiveTrackUrl(opts: {
  bookingId: string;
  tenantId?: string | null;
  trustIdToken: string;
  apiBase?: string;
}): string {
  return serviceosTrackEmbedUrl({
    experienceUrl: `${serviceosApiBaseUrlFrom(opts.apiBase)}/`,
    bookingId: opts.bookingId,
    trustIdToken: opts.trustIdToken,
    tenantId: opts.tenantId,
  });
}

function serviceosApiBaseUrlFrom(override?: string): string {
  if (override?.trim()) return override.replace(/\/$/, "");
  return serviceosApiBaseUrl();
}
