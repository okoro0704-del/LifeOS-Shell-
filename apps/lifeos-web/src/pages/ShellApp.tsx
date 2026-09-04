import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { InstalledAppManifest } from "@lifeos/shared";
import { isServiceOSVertical, isTransportationVertical } from "@lifeos/shell-core";
import { AppViewport, ServiceOSViewport, TransportationOSViewport } from "@lifeos/shell-ui";
import { useAuth } from "../hooks/useAuth";
import { installedAppsService } from "../lib/services";
import { getStoredSessionToken } from "../lib/api";
import { serviceosApiBaseUrl } from "../lib/serviceos";
import { StatusBanner } from "../components/StatusBanner";
import { Button } from "@lifeos/ui";

/**
 * Universal Shell deep-link target: /app/shell/:appId?tenantId=
 * Renders provisioned verticals with Trust ID SSO (no second login).
 */
export function ShellAppPage() {
  const { appId = "" } = useParams();
  const [params] = useSearchParams();
  const tenantId = params.get("tenantId");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<InstalledAppManifest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void installedAppsService
      .list()
      .then((d) => setApps(d.apps ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load apps"))
      .finally(() => setLoading(false));
  }, []);

  const app = useMemo(
    () =>
      apps.find(
        (a) =>
          a.appId === appId &&
          (!tenantId || a.tenantId === tenantId) &&
          a.status === "active",
      ) ?? null,
    [apps, appId, tenantId],
  );

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Opening shell module…</p>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="page">
        <StatusBanner
          title="App not installed"
          detail={error ?? "Provision this vertical from the LifeOS Portal first."}
          action={
            <Button variant="soft" onClick={() => navigate("/app/discover")}>
              Explore
            </Button>
          }
        />
      </div>
    );
  }

  const trustToken = getStoredSessionToken() || user?.trustId || "";

  if (isServiceOSVertical(app.appId)) {
    return (
      <div className="page page--shell-viewport">
        <ServiceOSViewport
          app={app}
          apiBaseUrl={serviceosApiBaseUrl()}
          trustIdToken={trustToken}
          trustId={user?.trustId ?? null}
          onClose={() => navigate("/app")}
          onPaymentRequest={() => navigate("/app/wallet")}
        />
        <p className="muted small padded-inline" style={{ marginTop: "0.75rem" }}>
          Standalone: {app.routes.standalonePwaUrl} · Deep link: {app.routes.shellDeepLink}
        </p>
      </div>
    );
  }

  if (isTransportationVertical(app.appId)) {
    return (
      <div className="page page--shell-viewport">
        <TransportationOSViewport
          app={app}
          trustIdToken={trustToken}
          trustId={user?.trustId ?? null}
          onClose={() => navigate("/app")}
          onPaymentRequest={() => navigate("/app/wallet")}
        />
        <p className="muted small padded-inline" style={{ marginTop: "0.75rem" }}>
          Standalone: {app.routes.standalonePwaUrl} · Deep link: {app.routes.shellDeepLink}
        </p>
      </div>
    );
  }

  const src = app.launchUrl || app.experienceUrl;

  return (
    <div className="page page--shell-viewport">
      <AppViewport
        src={src}
        approvedOrigin={app.approvedOrigin}
        title={app.displayName}
        trustId={user?.trustId ?? null}
        audience={app.audience}
        onClose={() => navigate("/app")}
        onPaymentRequest={() => navigate("/app/wallet")}
      />
      <p className="muted small padded-inline" style={{ marginTop: "0.75rem" }}>
        Standalone: {app.routes.standalonePwaUrl} · Deep link: {app.routes.shellDeepLink}
      </p>
    </div>
  );
}
