import { useCallback, useEffect, useState } from "react";
import { isDesktopApp } from "../../lib/tauriBridge";
import { getMobilePlatform, isMobileApp } from "../../lib/mobileBridge";
import { sharedService } from "../../lib/services";
import { StatusBanner } from "../../components/StatusBanner";

export function SecurityPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof sharedService.security>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await sharedService.security());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load security");
    }
  }, []);

  useEffect(() => {
    void load();
    const platform = isDesktopApp()
      ? "tauri"
      : isMobileApp()
        ? getMobilePlatform() === "ios"
          ? "capacitor-ios"
          : "capacitor-android"
        : "web";
    void sharedService
      .registerDevice({
        platform,
        deviceLabel: `${platform} · ${navigator.platform || "device"}`,
      })
      .then(() => load())
      .catch(() => undefined);
  }, [load]);

  const toggleBiometric = async () => {
    if (!data) return;
    setBusy(true);
    try {
      await sharedService.setBiometric(!data.biometricLockEnabled);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page personal-page">
      <header className="page-header">
        <h1>Security &amp; devices</h1>
        <p className="muted">
          Manage Tauri / Capacitor device sessions and vault biometric lock. Revoking ends remote
          tokens without wiping TrustID.
        </p>
      </header>

      {error ? <StatusBanner title="Security unavailable" detail={error} /> : null}

      {!data ? (
        <p className="muted">Loading devices…</p>
      ) : (
        <>
          <section className="shared-card">
            <h2>Biometric lock</h2>
            <p className="muted small">
              When enabled, Personal Vault and FinanceOS require Face ID / Touch ID / PIN on native
              clients before opening.
            </p>
            <button
              type="button"
              className="los-btn los-btn--soft los-btn--sm"
              disabled={busy}
              onClick={() => void toggleBiometric()}
            >
              {data.biometricLockEnabled ? "Disable biometric lock" : "Enable biometric lock"}
            </button>
          </section>

          <section className="shared-card">
            <h2>Registered devices</h2>
            {data.devices.length === 0 ? (
              <p className="muted">No desktop/mobile device registrations yet.</p>
            ) : (
              <ul className="personal-list">
                {data.devices.map((d) => (
                  <li key={d.id} className="personal-list__static">
                    <span className="personal-list__kind">{d.platform}</span>
                    <span className="personal-list__title">{d.deviceLabel}</span>
                    <button
                      type="button"
                      className="los-btn los-btn--ghost los-btn--sm"
                      onClick={() =>
                        void sharedService.revokeDevice(d.id).then(() => load())
                      }
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="shared-card">
            <h2>Active sessions</h2>
            <ul className="personal-list">
              {data.sessions.map((s) => (
                <li key={s.id} className="personal-list__static">
                  <span className="personal-list__kind">{s.platform}</span>
                  <span className="personal-list__title">{s.deviceLabel}</span>
                  <button
                    type="button"
                    className="los-btn los-btn--ghost los-btn--sm"
                    onClick={() =>
                      void sharedService
                        .revokeSession(s.id)
                        .then(() => load())
                        .catch((err) =>
                          setError(err instanceof Error ? err.message : "Revoke failed"),
                        )
                    }
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
