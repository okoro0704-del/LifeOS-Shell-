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
 * On native launch / resume: pick up Netlify web updates and surface newer APK shells.
 * Web content updates via live origin (Capacitor server.url) + hard reload when buildId changes.
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
      await Preferences.set({ key: OTA_BUILD_KEY, value: manifest.buildId });
      if (opts?.forceReload !== false) {
        // Bust caches and load the newest shell assets.
        window.location.replace(`${manifest.webOrigin}/?ota=${encodeURIComponent(manifest.buildId)}`);
        return { webUpdated: true, nativeUpdateAvailable: false, manifest };
      }
    } else if (!prevId) {
      await Preferences.set({ key: OTA_BUILD_KEY, value: manifest.buildId });
    }
  }

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
      // Open APK URL — user confirms install (sideload / FileProvider flow).
      window.open(release.artifactUrl, "_system");
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
