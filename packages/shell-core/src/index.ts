import type { InstalledAppManifest } from "@lifeos/shared";
import {
  buildDualProjectionRoutes,
  parseShellDeepLink,
  SHELL_EVENTS,
} from "@lifeos/shared";

export {
  buildDualProjectionRoutes,
  parseShellDeepLink,
  SHELL_EVENTS,
};

export * from "./types/appRegistry.js";

export type LifeOSBridgePrimitives = {
  trustId: { getActiveTrustId: () => string | null };
  elfcom: { openNotifications: () => void };
  sovereignDrive: { openMedia: (key?: string) => void };
  wallet: { openCheckout: (ref: { amount?: number; currency?: string; title?: string }) => void };
};

export type LifeOSBridge = {
  version: string;
  /** Inherited Trust ID — no second login inside shell viewport. */
  trustId: string | null;
  audience: "personal" | "business";
  primitives: LifeOSBridgePrimitives;
  postToApp: (msg: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    LifeOSBridge?: LifeOSBridge;
  }
}

export function createLifeOSBridge(opts: {
  trustId: string | null;
  audience: "personal" | "business";
  postToApp?: (msg: Record<string, unknown>) => void;
  onOpenNotifications?: () => void;
  onOpenMedia?: (key?: string) => void;
  onOpenCheckout?: (ref: { amount?: number; currency?: string; title?: string }) => void;
}): LifeOSBridge {
  return {
    version: "1.0.0",
    trustId: opts.trustId,
    audience: opts.audience,
    primitives: {
      trustId: {
        getActiveTrustId: () => opts.trustId,
      },
      elfcom: {
        openNotifications: () => opts.onOpenNotifications?.(),
      },
      sovereignDrive: {
        openMedia: (key?: string) => opts.onOpenMedia?.(key),
      },
      wallet: {
        openCheckout: (ref) => opts.onOpenCheckout?.(ref),
      },
    },
    postToApp: opts.postToApp ?? (() => undefined),
  };
}

/** Install bridge on window for iframe/micro-frontend consumers. */
export function installWindowLifeOSBridge(bridge: LifeOSBridge) {
  if (typeof window === "undefined") return;
  window.LifeOSBridge = bridge;
}

export function uninstallWindowLifeOSBridge() {
  if (typeof window === "undefined") return;
  delete window.LifeOSBridge;
}

export type InstalledAppsResponse = {
  apps: InstalledAppManifest[];
};

export async function fetchInstalledApps(
  apiBase: string,
  sessionToken: string,
): Promise<InstalledAppManifest[]> {
  const res = await fetch(`${apiBase.replace(/\/$/, "")}/v1/user/installed-apps`, {
    headers: {
      Accept: "application/json",
      "X-LifeOS-Session": sessionToken,
    },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`installed-apps ${res.status}`);
  }
  const data = (await res.json()) as InstalledAppsResponse;
  return data.apps ?? [];
}

/** Alias used by shell verification suites. */
export const getUserInstalledApps = fetchInstalledApps;

export function shellPathForApp(app: InstalledAppManifest): string {
  if (app.appId === "serviceos") {
    const preset = new URLSearchParams({
      tenantId: app.tenantId,
      ...(app.preset ? { preset: String(app.preset) } : {}),
    });
    return `/app/serviceos/catalog?${preset.toString()}`;
  }
  return `/app/shell/${encodeURIComponent(app.appId)}?tenantId=${encodeURIComponent(app.tenantId)}`;
}
