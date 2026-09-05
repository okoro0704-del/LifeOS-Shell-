import { useCallback, useEffect, useState } from "react";
import {
  DigiconomyApiError,
  personalApi,
  type PersonalDiscoveryItem,
} from "../../lib/digiconomyClient";
import { StatusBanner } from "../../components/StatusBanner";

/** Free kernel — open discovery feed. */
export function DiscoveryPage() {
  const [items, setItems] = useState<PersonalDiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await personalApi.discovery.list();
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof DigiconomyApiError ? err.message : "Could not load discovery");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page personal-page">
      <header className="page-header">
        <p className="personal-kernel-badge muted small">Personal · Free</p>
        <h1>Free</h1>
        <p className="muted">
          Open feed and federated discovery. Double-tap the left half of the screen twice for
          Offline.
        </p>
      </header>

      {error ? (
        <StatusBanner
          title="Discovery unavailable"
          detail={error}
          action={
            <button type="button" className="los-btn los-btn--soft los-btn--sm" onClick={() => void load()}>
              Retry
            </button>
          }
        />
      ) : null}

      {loading ? (
        <p className="muted">Syncing feed…</p>
      ) : (
        <ul className="personal-feed">
          {items.map((item) => (
            <li key={item.id} className="personal-feed__card">
              {item.previewUrl ? (
                <img src={item.previewUrl} alt="" className="personal-feed__thumb" />
              ) : (
                <div className="personal-feed__thumb personal-feed__thumb--empty" aria-hidden />
              )}
              <div className="personal-feed__body">
                <span className="personal-feed__kind">{item.kind}</span>
                <h2>{item.title}</h2>
                {item.summary ? <p className="muted">{item.summary}</p> : null}
                <p className="muted small">
                  {item.source ? `${item.source} · ` : ""}
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
