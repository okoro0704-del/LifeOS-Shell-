import { useEffect, useMemo, useState } from "react";
import type { InstalledAppManifest } from "@lifeos/shared";
import {
  buildTrustedLaunchUrl,
  isServiceOSVertical,
  normalizeServiceOSPreset,
  SERVICEOS_PRESETS,
  serviceosEmbedLaunchUrl,
  serviceosPresetIcon,
  serviceosVerticalTag,
  type ServiceOSPreset,
} from "@lifeos/shell-core";
import { AppViewport } from "./AppViewport.js";

export type ServiceOSViewportProps = {
  app: InstalledAppManifest;
  trustIdToken: string;
  trustId?: string | null;
  onClose?: () => void;
  onPaymentRequest?: (payload: Record<string, unknown>) => void;
  providerConsoleUrl?: string;
  /** Override catalog/appointments tab (route-driven). */
  tab?: "catalog" | "appointments";
  /** ServiceOS API origin, e.g. http://localhost:8920 */
  apiBaseUrl?: string;
  /** Override portal preset (route query). */
  preset?: ServiceOSPreset;
};

type EmbedMode = "catalog" | "appointments";

function embedOrigin(app: InstalledAppManifest, apiBaseUrl?: string): string {
  const raw = apiBaseUrl || app.launchUrl || app.experienceUrl || "http://localhost:8920";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:8920";
  }
}

/**
 * ServiceOS micro-frontend viewport.
 * Loads /embed/catalog (customer) or /embed/appointments (merchant).
 */
export function ServiceOSViewport({
  app,
  trustIdToken,
  trustId = null,
  onClose,
  onPaymentRequest,
  providerConsoleUrl,
  tab = "catalog",
  apiBaseUrl,
  preset: presetProp,
}: ServiceOSViewportProps) {
  const requestedPreset = normalizeServiceOSPreset(presetProp ?? app.preset, "beauty");
  const [localPreset, setLocalPreset] = useState<ServiceOSPreset | null>(null);
  const preset = localPreset ?? requestedPreset;
  const [mode, setMode] = useState<EmbedMode>(tab);
  const [showDispatches, setShowDispatches] = useState(false);
  const [dispatches, setDispatches] = useState<
    Array<{ jobId: string; status: string; etaMinutes: number | null; provider: { displayName: string } | null }>
  >([]);

  useEffect(() => {
    setMode(tab);
  }, [tab]);

  useEffect(() => {
    setLocalPreset(null);
  }, [requestedPreset, app.tenantId]);

  const apiOrigin = embedOrigin(app, apiBaseUrl);

  const embedSrc = useMemo(() => {
    return serviceosEmbedLaunchUrl({
      experienceUrl: `${apiOrigin}/`,
      preset,
      trustIdToken,
      tab: mode,
      tenantId: app.tenantId,
    });
  }, [apiOrigin, app.tenantId, mode, preset, trustIdToken]);

  const providerUrl = useMemo(() => {
    if (providerConsoleUrl) {
      return buildTrustedLaunchUrl({ baseUrl: providerConsoleUrl, trustIdToken });
    }
    try {
      const origin = new URL(apiOrigin);
      origin.port = "5194";
      origin.pathname = "/";
      origin.search = "";
      return buildTrustedLaunchUrl({ baseUrl: origin.origin, trustIdToken });
    } catch {
      return "http://localhost:5194";
    }
  }, [apiOrigin, providerConsoleUrl, trustIdToken]);

  useEffect(() => {
    if (!showDispatches) return;
    let cancelled = false;
    async function load() {
      try {
        const u = new URL("/v1/dispatches/active", `${apiOrigin}/`);
        if (app.tenantId) u.searchParams.set("tenantId", app.tenantId);
        const res = await fetch(u.toString());
        if (!res.ok) return;
        const data = (await res.json()) as { jobs?: typeof dispatches };
        if (!cancelled) setDispatches(data.jobs ?? []);
      } catch {
        /* ignore live panel errors */
      }
    }
    void load();
    const t = setInterval(() => void load(), 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [apiOrigin, app.tenantId, showDispatches]);

  if (!isServiceOSVertical(app.appId)) {
    return (
      <div className="los-app-viewport los-app-viewport--error" role="alert">
        ServiceOS viewport requires a serviceos app.
      </div>
    );
  }

  const headerActions = (
    <>
      <span className="los-tos__preset" data-testid="serviceos-active-preset" title={preset}>
        {serviceosPresetIcon(preset)} {serviceosVerticalTag(preset)}
      </span>
      <div className="los-tos__tabs" role="tablist" aria-label="ServiceOS presets">
        {SERVICEOS_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            data-testid={`serviceos-preset-${p}`}
            aria-selected={preset === p}
            aria-label={`${serviceosPresetIcon(p)} ${serviceosVerticalTag(p)}`}
            className={preset === p ? "is-active" : undefined}
            onClick={() => setLocalPreset(p)}
          >
            {serviceosPresetIcon(p)}
          </button>
        ))}
      </div>
      <div className="los-tos__tabs" role="tablist" aria-label="ServiceOS embed tabs">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "catalog"}
          className={mode === "catalog" ? "is-active" : undefined}
          onClick={() => setMode("catalog")}
        >
          Catalog
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "appointments"}
          className={mode === "appointments" ? "is-active" : undefined}
          onClick={() => setMode("appointments")}
        >
          Appointments
        </button>
      </div>
      <a className="los-tos__action" href={providerUrl} target="_blank" rel="noreferrer">
        Launch Provider Console
      </a>
      <button type="button" className="los-tos__action" onClick={() => setShowDispatches((v) => !v)}>
        Active Doorstep Dispatches
      </button>
    </>
  );

  return (
    <div
      className="los-tos-viewport los-sos-viewport"
      data-testid="serviceos-viewport"
      data-preset={preset}
      data-embed-src={embedSrc}
    >
      <AppViewport
        src={embedSrc}
        approvedOrigin={apiOrigin}
        title={app.displayName}
        trustId={trustId ?? app.trustId}
        audience={app.audience}
        onClose={onClose}
        onPaymentRequest={onPaymentRequest}
        headerActions={headerActions}
        iframeTestId="serviceos-embed"
      />
      {showDispatches ? (
        <div className="los-sos-modal" role="dialog" aria-label="Active doorstep dispatches">
          <header>
            <strong>Live doorstep jobs</strong>
            <button type="button" onClick={() => setShowDispatches(false)}>
              Close
            </button>
          </header>
          {dispatches.length === 0 ? (
            <p>No active dispatches.</p>
          ) : (
            <ul>
              {dispatches.map((job) => (
                <li key={job.jobId}>
                  {job.status} · ETA {job.etaMinutes ?? "—"} min · {job.provider?.displayName ?? "matching"}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export type { ServiceOSPreset };
