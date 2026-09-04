/**
 * Universal Shell app registry — vertical IDs, TransportationOS presets, launcher helpers.
 */

export const LIFEOS_APP_IDS = [
  "hospitalityos",
  "ecommerceos",
  "logisticsos",
  "serviceos",
  "transportationos",
  "rentalos",
  "financeos",
  "other",
] as const;

export type LifeOSAppId = (typeof LIFEOS_APP_IDS)[number] | (string & {});

/** TransportationOS / RentalOS portal presets. */
export type TransportationOSPreset = "logistics" | "rentals" | "integrated";

/** ServiceOS portal presets — at-home professional verticals. */
export type ServiceOSPreset = "beauty" | "wellness" | "technical" | "culinary";

/** HospitalityOS portal presets — lodging / local food profiles. */
export type HospitalityOSPreset = "local_food" | "shared_homes";

export type ShellAppPreset = TransportationOSPreset | ServiceOSPreset | HospitalityOSPreset;

export const TRANSPORTATION_OS_PRESETS = [
  "logistics",
  "rentals",
  "integrated",
] as const satisfies readonly TransportationOSPreset[];

export type TransportationVerticalTag = "Dispatch" | "Rentals" | "Integrated";

export const TRANSPORTATION_PRESET_META: Record<
  TransportationOSPreset,
  { icon: string; tag: TransportationVerticalTag; embedTab: "dispatch" | "vehicles" }
> = {
  logistics: { icon: "🚚", tag: "Dispatch", embedTab: "dispatch" },
  rentals: { icon: "🚗", tag: "Rentals", embedTab: "vehicles" },
  integrated: { icon: "🚖", tag: "Integrated", embedTab: "dispatch" },
};

export function isLifeOSAppId(value: string): value is LifeOSAppId {
  return (LIFEOS_APP_IDS as readonly string[]).includes(value) || value.length > 0;
}

export function isTransportationOSPreset(value: unknown): value is TransportationOSPreset {
  return value === "logistics" || value === "rentals" || value === "integrated";
}

export function normalizeTransportationPreset(
  value: unknown,
  fallback: TransportationOSPreset = "logistics",
): TransportationOSPreset {
  return isTransportationOSPreset(value) ? value : fallback;
}

/** Launcher emoji for TransportationOS / RentalOS by preset. */
export function transportationPresetIcon(preset?: TransportationOSPreset | null): string {
  if (!preset) return TRANSPORTATION_PRESET_META.logistics.icon;
  return TRANSPORTATION_PRESET_META[preset].icon;
}

/** Footer status pill label. */
export function transportationVerticalTag(
  preset?: TransportationOSPreset | null,
): TransportationVerticalTag {
  if (!preset) return "Dispatch";
  return TRANSPORTATION_PRESET_META[preset].tag;
}

export function transportationEmbedPath(preset?: TransportationOSPreset | null): string {
  const tab = preset
    ? TRANSPORTATION_PRESET_META[preset].embedTab
    : TRANSPORTATION_PRESET_META.logistics.embedTab;
  return `/embed?tab=${tab}`;
}

export function isTransportationVertical(appId: string): boolean {
  return appId === "transportationos" || appId === "rentalos";
}

export const SERVICEOS_PRESETS = ["beauty", "wellness", "technical", "culinary"] as const satisfies readonly ServiceOSPreset[];

export type ServiceOSVerticalTag = "Beauty" | "Wellness" | "Technical" | "Culinary";

export const SERVICEOS_PRESET_META: Record<
  ServiceOSPreset,
  { icon: string; tag: ServiceOSVerticalTag; embedTab: "catalog" | "appointments" }
> = {
  beauty: { icon: "✂️", tag: "Beauty", embedTab: "catalog" },
  wellness: { icon: "💆", tag: "Wellness", embedTab: "catalog" },
  technical: { icon: "🛠️", tag: "Technical", embedTab: "catalog" },
  culinary: { icon: "👨‍🍳", tag: "Culinary", embedTab: "catalog" },
};

export function isServiceOSPreset(value: unknown): value is ServiceOSPreset {
  return value === "beauty" || value === "wellness" || value === "technical" || value === "culinary";
}

export function normalizeServiceOSPreset(
  value: unknown,
  fallback: ServiceOSPreset = "beauty",
): ServiceOSPreset {
  return isServiceOSPreset(value) ? value : fallback;
}

export function isServiceOSVertical(appId: string): boolean {
  return appId === "serviceos";
}

export function serviceosPresetIcon(preset?: ServiceOSPreset | null): string {
  return SERVICEOS_PRESET_META[normalizeServiceOSPreset(preset)].icon;
}

export function serviceosVerticalTag(preset?: ServiceOSPreset | null): ServiceOSVerticalTag {
  return SERVICEOS_PRESET_META[normalizeServiceOSPreset(preset)].tag;
}

export function serviceosEmbedPath(
  preset?: ServiceOSPreset | null,
  tab?: "catalog" | "appointments",
): string {
  const resolved = tab ?? SERVICEOS_PRESET_META[normalizeServiceOSPreset(preset)].embedTab;
  return resolved === "appointments" ? "/embed/appointments" : "/embed/catalog";
}

export function serviceosEmbedLaunchUrl(opts: {
  experienceUrl: string;
  preset?: ServiceOSPreset | null;
  trustIdToken: string;
  tab?: "catalog" | "appointments";
  tenantId?: string | null;
}): string {
  const embed = serviceosEmbedPath(opts.preset, opts.tab);
  const preset = normalizeServiceOSPreset(opts.preset);
  try {
    const root = new URL(opts.experienceUrl);
    const embedUrl = new URL(embed, `${root.origin}/`);
    embedUrl.searchParams.set("trustId", opts.trustIdToken);
    embedUrl.searchParams.set("token", opts.trustIdToken);
    embedUrl.searchParams.set("preset", preset);
    if (opts.tenantId) embedUrl.searchParams.set("tenantId", opts.tenantId);
    return embedUrl.toString();
  } catch {
    const u = new URL(embed, opts.experienceUrl.endsWith("/") ? opts.experienceUrl : `${opts.experienceUrl}/`);
    u.searchParams.set("trustId", opts.trustIdToken);
    u.searchParams.set("token", opts.trustIdToken);
    u.searchParams.set("preset", preset);
    if (opts.tenantId) u.searchParams.set("tenantId", opts.tenantId);
    return u.toString();
  }
}

export function serviceosTrackPath(bookingId: string): string {
  return `/track/booking/${encodeURIComponent(bookingId)}`;
}

export function serviceosTrackEmbedUrl(opts: {
  experienceUrl: string;
  bookingId: string;
  trustIdToken: string;
  tenantId?: string | null;
}): string {
  try {
    const root = new URL(opts.experienceUrl);
    const u = new URL(serviceosTrackPath(opts.bookingId), `${root.origin}/`);
    u.searchParams.set("trustId", opts.trustIdToken);
    u.searchParams.set("token", opts.trustIdToken);
    if (opts.tenantId) u.searchParams.set("tenantId", opts.tenantId);
    return u.toString();
  } catch {
    const base = opts.experienceUrl.endsWith("/") ? opts.experienceUrl : `${opts.experienceUrl}/`;
    const u = new URL(serviceosTrackPath(opts.bookingId).replace(/^\//, ""), base);
    u.searchParams.set("trustId", opts.trustIdToken);
    u.searchParams.set("token", opts.trustIdToken);
    if (opts.tenantId) u.searchParams.set("tenantId", opts.tenantId);
    return u.toString();
  }
}

export const HOSPITALITY_OS_PRESETS = [
  "local_food",
  "shared_homes",
] as const satisfies readonly HospitalityOSPreset[];

export type HospitalityOSVerticalTag = "Local Food" | "Shared Homes";

export const HOSPITALITY_PRESET_META: Record<
  HospitalityOSPreset,
  { icon: string; tag: HospitalityOSVerticalTag }
> = {
  local_food: { icon: "🍲", tag: "Local Food" },
  shared_homes: { icon: "🏠", tag: "Shared Homes" },
};

export function isHospitalityOSPreset(value: unknown): value is HospitalityOSPreset {
  return value === "local_food" || value === "shared_homes";
}

export function normalizeHospitalityOSPreset(
  value: unknown,
  fallback: HospitalityOSPreset = "local_food",
): HospitalityOSPreset {
  return isHospitalityOSPreset(value) ? value : fallback;
}

export function isHospitalityOSVertical(appId: string): boolean {
  return appId === "hospitalityos";
}

export function hospitalityPresetIcon(preset?: HospitalityOSPreset | null): string {
  return HOSPITALITY_PRESET_META[normalizeHospitalityOSPreset(preset)].icon;
}

export function hospitalityVerticalTag(preset?: HospitalityOSPreset | null): HospitalityOSVerticalTag {
  return HOSPITALITY_PRESET_META[normalizeHospitalityOSPreset(preset)].tag;
}

/**
 * Resolve launcher glyph: TransportationOS / ServiceOS / HospitalityOS preset emoji,
 * else custom icon URL, else initial.
 */
export function resolveLauncherGlyph(app: {
  appId: string;
  preset?: ShellAppPreset | string | null;
  icon?: string | null;
  displayName: string;
}): { kind: "emoji" | "image" | "initial"; value: string } {
  if (isTransportationVertical(app.appId)) {
    const preset =
      app.appId === "rentalos" && !app.preset
        ? "rentals"
        : normalizeTransportationPreset(app.preset, "logistics");
    return { kind: "emoji", value: transportationPresetIcon(preset) };
  }
  if (isServiceOSVertical(app.appId)) {
    return { kind: "emoji", value: serviceosPresetIcon(normalizeServiceOSPreset(app.preset)) };
  }
  if (isHospitalityOSVertical(app.appId) && isHospitalityOSPreset(app.preset)) {
    return { kind: "emoji", value: hospitalityPresetIcon(app.preset) };
  }
  if (app.icon) return { kind: "image", value: app.icon };
  return { kind: "initial", value: app.displayName.slice(0, 1).toUpperCase() };
}

export function resolveLauncherBadge(app: {
  appId: string;
  preset?: ShellAppPreset | string | null;
}): TransportationVerticalTag | ServiceOSVerticalTag | HospitalityOSVerticalTag | null {
  if (isTransportationVertical(app.appId)) {
    const preset =
      app.appId === "rentalos" && !app.preset
        ? "rentals"
        : normalizeTransportationPreset(app.preset, "logistics");
    return transportationVerticalTag(preset);
  }
  if (isServiceOSVertical(app.appId)) {
    return serviceosVerticalTag(normalizeServiceOSPreset(app.preset));
  }
  if (isHospitalityOSVertical(app.appId) && isHospitalityOSPreset(app.preset)) {
    return hospitalityVerticalTag(app.preset);
  }
  return null;
}

/** Build iframe launch URL with Trust ID session token for micro-frontend embedding. */
export function buildTrustedLaunchUrl(opts: {
  baseUrl: string;
  trustIdToken: string;
  path?: string;
}): string {
  const base = opts.baseUrl.replace(/\/$/, "");
  const path = opts.path?.startsWith("/") ? opts.path : opts.path ? `/${opts.path}` : "";
  const u = new URL(`${base}${path || ""}`);
  u.searchParams.set("trustId", opts.trustIdToken);
  u.searchParams.set("token", opts.trustIdToken);
  return u.toString();
}

export function transportationEmbedLaunchUrl(opts: {
  experienceUrl: string;
  preset?: TransportationOSPreset | null;
  trustIdToken: string;
}): string {
  const origin = opts.experienceUrl.replace(/\/$/, "");
  const embed = transportationEmbedPath(opts.preset);
  const u = new URL(embed, origin.endsWith("/") ? origin : `${origin}/`);
  // When experienceUrl already has a path, prefer origin + embed path from host root.
  try {
    const root = new URL(opts.experienceUrl);
    const embedUrl = new URL(embed, `${root.origin}/`);
    embedUrl.searchParams.set("trustId", opts.trustIdToken);
    embedUrl.searchParams.set("token", opts.trustIdToken);
    return embedUrl.toString();
  } catch {
    u.searchParams.set("trustId", opts.trustIdToken);
    u.searchParams.set("token", opts.trustIdToken);
    return u.toString();
  }
}
