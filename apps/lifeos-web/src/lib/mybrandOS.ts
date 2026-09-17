import type { InstalledAppManifest } from "@lifeos/shared";

const MYBRAND_FLAG = "lifeos.mybrand.deployed";
/** Production mybrandOS workstation (Railway). PersonalOS installs / opens this URL. */
export const MYBRANDOS_PRODUCTION_URL = "https://mybrandos-production.up.railway.app";

/** True when the signed-in user owns a deployed personal (mybrandOS) white-label app. */
export function hasDeployedMyBrandOS(apps: InstalledAppManifest[] = []): boolean {
  try {
    if (localStorage.getItem(MYBRAND_FLAG) === "1") return true;
  } catch {
    /* */
  }
  return apps.some(
    (a) =>
      a.audience === "personal" &&
      a.status === "active" &&
      (a.appId === "mybrandos" || Boolean(a.subdomain || a.routes?.standalonePwaUrl)),
  );
}

/** Prefer catalog launch URL; fall back to production mybrandOS, then public getlifeos subdomain. */
export function creatorAppHref(authorOrSlug: string): string {
  const slug = authorOrSlug.replace(/^@/, "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  if (!slug || slug === "mybrandos") return MYBRANDOS_PRODUCTION_URL;
  const root =
    (import.meta.env.VITE_LIFEOS_PUBLIC_ROOT_DOMAIN as string | undefined)?.replace(/^\./, "").trim() ||
    "getlifeos.app";
  return `https://${slug}.${root}/`;
}

export function openCreatorApp(authorOrSlug: string) {
  const external = creatorAppHref(authorOrSlug);
  try {
    window.location.assign(external);
  } catch {
    window.location.assign(`/app/personal/creator/${encodeURIComponent(authorOrSlug.replace(/^@/, ""))}`);
  }
}

/** Open / install mybrandOS from PersonalOS (catalog sync or direct production URL). */
export function openMyBrandOS(apps: InstalledAppManifest[] = []) {
  const installed = apps.find((a) => a.appId === "mybrandos" && a.status === "active");
  const href = (installed?.launchUrl || installed?.routes?.standalonePwaUrl || MYBRANDOS_PRODUCTION_URL).trim();
  window.location.assign(href);
}
