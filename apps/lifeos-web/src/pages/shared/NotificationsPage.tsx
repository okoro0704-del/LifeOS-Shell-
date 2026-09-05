import { useCallback, useEffect, useState } from "react";
import { sharedService } from "../../lib/services";
import { StatusBanner } from "../../components/StatusBanner";

type Prefs = Awaited<ReturnType<typeof sharedService.notificationPrefs>>;

export function SharedNotificationsPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setPrefs(await sharedService.notificationPrefs());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load preferences");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (body: Record<string, boolean>) => {
    setSaving(true);
    try {
      const next = (await sharedService.updateNotificationPrefs(body)) as Prefs;
      setPrefs(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page personal-page">
      <header className="page-header">
        <h1>ElfCom &amp; notifications</h1>
        <p className="muted">
          Channel preferences for desktop tray, mobile push, and in-app alerts — independent of
          workspace mode.
        </p>
      </header>

      {error ? <StatusBanner title="Preferences unavailable" detail={error} /> : null}

      {!prefs ? (
        <p className="muted">Loading channels…</p>
      ) : (
        <>
          <section className="shared-card">
            <h2>Channels</h2>
            <label className="shared-toggle">
              <input
                type="checkbox"
                checked={prefs.channels.desktop}
                disabled={saving}
                onChange={(e) => void patch({ desktop: e.target.checked })}
              />
              <span>Desktop / system tray (Tauri)</span>
            </label>
            <label className="shared-toggle">
              <input
                type="checkbox"
                checked={prefs.channels.mobilePush}
                disabled={saving}
                onChange={(e) => void patch({ mobilePush: e.target.checked })}
              />
              <span>Mobile push (Capacitor)</span>
            </label>
            <label className="shared-toggle">
              <input
                type="checkbox"
                checked={prefs.channels.inApp}
                disabled={saving}
                onChange={(e) => void patch({ inApp: e.target.checked })}
              />
              <span>In-app notification center</span>
            </label>
          </section>

          <section className="shared-card">
            <h2>Workspace filters</h2>
            <label className="shared-toggle">
              <input
                type="checkbox"
                checked={prefs.filters.businessWhilePersonal}
                disabled={saving}
                onChange={(e) => void patch({ businessWhilePersonal: e.target.checked })}
              />
              <span>Alert Business updates while in Personal mode</span>
            </label>
            <label className="shared-toggle">
              <input
                type="checkbox"
                checked={prefs.filters.marketingTips}
                disabled={saving}
                onChange={(e) => void patch({ marketingTips: e.target.checked })}
              />
              <span>Product tips</span>
            </label>
          </section>
        </>
      )}
    </div>
  );
}
