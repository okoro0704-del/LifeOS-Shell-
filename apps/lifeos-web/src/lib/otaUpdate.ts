import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const OTA_BUILD_KEY = "lifeos.ota.webBuildId";
const OTA_NATIVE_KEY = "lifeos.ota.nativeVersionCode";
const DEFAULT_WEB_ORIGIN = "https://lifeosapp.getlifeos.app";
const DEFAULT_API = "https://lifeos-shell-production.up.railway.app";

export type OtaManifest = {
  buildId: string;
  version: string;
  builtAt: string;
  webOrigin: string;
};

export type NativeReleaseInfo = {
  version: string;
  versionCode?: number;
  artifactUrl?: string | null;
  filename?: string;
};

function webOrigin(): string {
  const fromEnv = (import.meta.env.VITE_LIFEOS_WEB ?? "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
    const host = window.location.hostname;
    if (host && host !== "localhost" && !host.endsWith(".local")) {
      return window.location.origin;
    }
  }
  return DEFAULT_WEB_ORIGIN;
}

function apiBase(): string {
  const fromEnv = (import.meta.env.VITE_LIFEOS_API ?? "").trim().replace(/\/$/, "");
  if (fromEnv && !fromEnv.startsWith("/")) return fromEnv;
  return DEFAULT_API;
}

function showUpdatingOverlay() {
  if (typeof document === "undefined") return;
  if (document.getElementById("lifeos-ota-updating")) return;
  const el = document.createElement("div");
  el.id = "lifeos-ota-updating";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.textContent = "Updating LifeOS…";
  Object.assign(el.style, {
    position: "fixed",
    inset: "0",
    zIndex: "99999",
    display: "grid",
    placeItems: "center",
    background: "rgba(11, 18, 32, 0.92)",
    color: "#f8fafc",
    fontFamily: "system-ui, sans-serif",
    fontSize: "1.05rem",
    fontWeight: "600",
  });
  document.documentElement.appendChild(el);
}

async function clearWebCaches() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* */
  }
}

async function fetchOtaManifest(): Promise<OtaManifest | null> {
  try {
    const res = await fetch(`${webOrigin()}/ota.json?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<OtaManifest>;
    if (!json.buildId || !json.version) return null;
    return {
      buildId: String(json.buildId),
      version: String(json.version),
      builtAt: String(json.builtAt ?? ""),
      webOrigin: String(json.webOrigin ?? webOrigin()),
    };
  } catch {
    return null;
  }
}

async function fetchLatestAndroidRelease(): Promise<NativeReleaseInfo | null> {
  try {
    const res = await fetch(
      `${apiBase()}/v1/releases/latest?appId=lifeos-web&platform=android&t=${Date.now()}`,
      { cache: "no-store", headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      release?: NativeReleaseInfo | null;
    };
    return json.release ?? null;
  } catch {
    return null;
  }
}

/**
 * On native launch / resume: apply Netlify web updates automatically.
 * Production APKs load CAPACITOR_SERVER_URL — no WhatsApp/file reinstall needed for UI.
 */
export async function checkForOtaUpdates(opts?: { forceReload?: boolean }): Promise<{
  webUpdated: boolean;
  nativeUpdateAvailable: boolean;
  manifest: OtaManifest | null;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { webUpdated: false, nativeUpdateAvailable: false, manifest: null };
  }

  const manifest = await fetchOtaManifest();
  let webUpdated = false;

  if (manifest) {
    const prior = await Preferences.get({ key: OTA_BUILD_KEY });
    const prevId = prior.value ?? "";
    if (prevId && prevId !== manifest.buildId) {
      webUpdated = true;
      showUpdatingOverlay();
      await Preferences.set({ key: OTA_BUILD_KEY, value: manifest.buildId });
      await clearWebCaches();
      if (opts?.forceReload !== false) {
        const target = `${manifest.webOrigin}/?ota=${encodeURIComponent(manifest.buildId)}&t=${Date.now()}`;
        window.location.replace(target);
        return { webUpdated: true, nativeUpdateAvailable: false, manifest };
      }
    } else if (!prevId) {
      await Preferences.set({ key: OTA_BUILD_KEY, value: manifest.buildId });
    }
  }

  // Track newer native shells for ops; do not open browser/WhatsApp downloads.
  let nativeUpdateAvailable = false;
  try {
    const info = await App.getInfo();
    const release = await fetchLatestAndroidRelease();
    const remoteCode = Number(release?.versionCode ?? 0);
    const localCode = Number.parseInt(String(info.build || "0"), 10) || 0;
    if (release?.artifactUrl && remoteCode > localCode) {
      nativeUpdateAvailable = true;
      await Preferences.set({
        key: OTA_NATIVE_KEY,
        value: String(remoteCode),
      });
    }
  } catch {
    /* App.getInfo unavailable in some webviews */
  }

  return { webUpdated, nativeUpdateAvailable, manifest };
}

/** Call once at startup; also re-check when app returns to foreground. */
export function startOtaUpdateListener(): () => void {
  if (!Capacitor.isNativePlatform()) return () => undefined;

  void checkForOtaUpdates({ forceReload: true });

  const sub = App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) void checkForOtaUpdates({ forceReload: true });
  });

  return () => {
    void sub.then((h) => h.remove());
  };
}
