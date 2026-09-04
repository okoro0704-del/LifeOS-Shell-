import { useMemo, useState } from "react";
import type { InstalledAppManifest } from "@lifeos/shared";
import {
  buildTrustedLaunchUrl,
  isTransportationVertical,
  normalizeTransportationPreset,
  transportationEmbedLaunchUrl,
  transportationPresetIcon,
  transportationVerticalTag,
  type TransportationOSPreset,
} from "@lifeos/shell-core";
import { AppViewport } from "./AppViewport.js";

export type TransportationOSViewportProps = {
  app: InstalledAppManifest;
  /** Active Trust ID session token (passed into iframe query). */
  trustIdToken: string;
  trustId?: string | null;
  onClose?: () => void;
  onPaymentRequest?: (payload: Record<string, unknown>) => void;
};

type EmbedMode = "dispatch" | "vehicles";

function defaultMode(preset: TransportationOSPreset): EmbedMode {
  return preset === "rentals" ? "vehicles" : "dispatch";
}

/**
 * TransportationOS / RentalOS micro-frontend viewport.
 * Loads /embed?tab=dispatch|vehicles and exposes Rider PWA + Fleet Calendar actions.
 */
export function TransportationOSViewport({
  app,
  trustIdToken,
  trustId = null,
  onClose,
  onPaymentRequest,
}: TransportationOSViewportProps) {
  const preset = normalizeTransportationPreset(
    app.preset ?? (app.appId === "rentalos" ? "rentals" : "logistics"),
    "logistics",
  );
  const [mode, setMode] = useState<EmbedMode>(() => defaultMode(preset));

  const embedSrc = useMemo(() => {
    const path = mode === "vehicles" ? "/embed?tab=vehicles" : "/embed?tab=dispatch";
    try {
      const root = new URL(app.launchUrl || app.experienceUrl);
      const u = new URL(path, `${root.origin}/`);
      u.searchParams.set("trustId", trustIdToken);
      u.searchParams.set("token", trustIdToken);
      return u.toString();
    } catch {
      return transportationEmbedLaunchUrl({
        experienceUrl: app.launchUrl || app.experienceUrl,
        preset,
        trustIdToken,
      });
    }
  }, [app.experienceUrl, app.launchUrl, mode, preset, trustIdToken]);

  const riderUrl = useMemo(() => {
    try {
      return buildTrustedLaunchUrl({
        baseUrl: new URL(app.launchUrl || app.experienceUrl).origin,
        path: "/rider",
        trustIdToken,
      });
    } catch {
      return null;
    }
  }, [app.experienceUrl, app.launchUrl, trustIdToken]);

  const calendarUrl = useMemo(() => {
    try {
      return buildTrustedLaunchUrl({
        baseUrl: new URL(app.launchUrl || app.experienceUrl).origin,
        path: "/rentals/calendar",
        trustIdToken,
      });
    } catch {
      return null;
    }
  }, [app.experienceUrl, app.launchUrl, trustIdToken]);

  const showRider = preset === "logistics" || preset === "integrated";
  const showCalendar = preset === "rentals" || preset === "integrated";

  if (!isTransportationVertical(app.appId)) {
    return (
      <div className="los-app-viewport los-app-viewport--error" role="alert">
        TransportationOS viewport requires a transportationos or rentalos app.
      </div>
    );
  }

  const headerActions = (
    <>
      <span className="los-tos__preset" title={preset}>
        {transportationPresetIcon(preset)} {transportationVerticalTag(preset)}
      </span>
      <div className="los-tos__tabs" role="tablist" aria-label="Transportation embed tabs">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "dispatch"}
          className={mode === "dispatch" ? "is-active" : undefined}
          onClick={() => setMode("dispatch")}
        >
          Dispatch
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "vehicles"}
          className={mode === "vehicles" ? "is-active" : undefined}
          onClick={() => setMode("vehicles")}
        >
          Vehicles
        </button>
      </div>
      {showRider && riderUrl ? (
        <a className="los-tos__action" href={riderUrl} target="_blank" rel="noreferrer">
          Launch Rider PWA
        </a>
      ) : null}
      {showCalendar && calendarUrl ? (
        <a className="los-tos__action" href={calendarUrl} target="_blank" rel="noreferrer">
          Fleet Calendar
        </a>
      ) : null}
    </>
  );

  return (
    <div className="los-tos-viewport">
      <AppViewport
        src={embedSrc}
        approvedOrigin={app.approvedOrigin}
        title={app.displayName}
        trustId={trustId ?? app.trustId}
        audience={app.audience}
        onClose={onClose}
        onPaymentRequest={onPaymentRequest}
        headerActions={headerActions}
      />
    </div>
  );
}
