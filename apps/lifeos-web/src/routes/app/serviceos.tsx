import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppViewport, ServiceOSViewport } from "@lifeos/shell-ui";
import { normalizeServiceOSPreset } from "@lifeos/shell-core";
import { useAuth } from "../../hooks/useAuth";
import { getStoredSessionToken } from "../../lib/api";
import {
  createServiceOSShellManifest,
  serviceosApiBaseUrl,
  serviceosLiveTrackUrl,
} from "../../lib/serviceos";

/**
 * `/app/serviceos/catalog` — customer booking catalog inside the LifeOS shell.
 */
export function ServiceOSCatalogPage() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const apiBase = serviceosApiBaseUrl();
  const tenantId = params.get("tenantId") ?? "";
  const preset = normalizeServiceOSPreset(params.get("preset"));
  const trustIdToken = getStoredSessionToken() || user?.trustId || "";

  const app = useMemo(
    () =>
      createServiceOSShellManifest({
        tenantId,
        preset,
        apiBase,
        trustId: user?.trustId,
      }),
    [apiBase, preset, tenantId, user?.trustId],
  );

  return (
    <div className="page page--shell-viewport" data-testid="serviceos-catalog-page">
      <ServiceOSViewport
        app={app}
        tab="catalog"
        preset={preset}
        apiBaseUrl={apiBase}
        trustIdToken={trustIdToken}
        trustId={user?.trustId ?? null}
        onClose={() => navigate("/app")}
        onPaymentRequest={() => navigate("/app/wallet")}
      />
    </div>
  );
}

/**
 * `/app/serviceos/track/:bookingId` — live tracking iframe; shell header/nav stay mounted.
 */
export function ServiceOSTrackFrame(opts: {
  bookingId: string;
  tenantId?: string | null;
  trustIdToken: string;
  trustId?: string | null;
  apiBase?: string;
  onClose?: () => void;
}) {
  const apiBase = opts.apiBase ?? serviceosApiBaseUrl();
  const src = serviceosLiveTrackUrl({
    bookingId: opts.bookingId,
    tenantId: opts.tenantId,
    trustIdToken: opts.trustIdToken,
    apiBase,
  });

  return (
    <div className="page page--shell-viewport" data-testid="serviceos-track-page">
      <AppViewport
        src={src}
        approvedOrigin={apiBase}
        title="Live doorstep tracking"
        trustId={opts.trustId ?? null}
        audience="personal"
        iframeTestId="serviceos-track-embed"
        onClose={opts.onClose}
      />
    </div>
  );
}

export function ServiceOSTrackPage() {
  const { bookingId = "" } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const trustIdToken = getStoredSessionToken() || user?.trustId || "";

  return (
    <ServiceOSTrackFrame
      bookingId={bookingId}
      tenantId={params.get("tenantId")}
      trustIdToken={trustIdToken}
      trustId={user?.trustId ?? null}
      onClose={() => navigate("/app/serviceos/catalog")}
    />
  );
}
