import type { InstalledAppManifest } from "@lifeos/shared";

const MYBRAND_FLAG = "lifeos.mybrand.deployed";

/** True when the signed-in user owns a deployed personal (mybrandOS) white-label app. */
export function hasDeployedMyBrandOS(apps: InstalledAppManifest[] = []): boolean {
  try {
    if (localStorage.getItem(MYBRAND_FLAG) === "1") return true;
  } catch {
    /* */
  }
  return apps.some(
    (a) => a.audience === "personal" && a.status === "active" && Boolean(a.subdomain || a.routes?.standalonePwaUrl),
  );
}

/** Prefer LifeOS subdomain; fall back to shell creator surface. */
export function creatorAppHref(authorOrSlug: string): string {
  const slug = authorOrSlug.replace(/^@/, "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  if (!slug) return "/app/personal/post";
  const host =
    typeof window !== "undefined" && window.location.hostname.endsWith("lifeos.app")
      ? "lifeos.app"
      : "lifeos.app";
  return `https://${slug}.${host}`;
}

export function openCreatorApp(authorOrSlug: string) {
  const external = creatorAppHref(authorOrSlug);
  try {
    window.location.assign(external);
  } catch {
    window.location.assign(`/app/personal/creator/${encodeURIComponent(authorOrSlug.replace(/^@/, ""))}`);
  }
}
