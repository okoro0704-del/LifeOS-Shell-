import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ExperienceConnectionPublic } from "@lifeos/shared";
import { PERMISSION_LABELS } from "@lifeos/shared";
import { Badge, Button, EmptyState, SectionHeader, Sheet, Skeleton, StatusBadge } from "@lifeos/ui";
import { connectionService } from "../lib/services";
import { StatusBanner } from "../components/StatusBanner";

function relativeActivity(iso: string) {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ConnectionsPage() {
  const [items, setItems] = useState<ExperienceConnectionPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ExperienceConnectionPublic | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function load() {
    const data = await connectionService.list();
    setItems(data.connections);
  }

  useEffect(() => {
    void load()
      .catch(() => setError("We couldn't load your connections."))
      .finally(() => setLoading(false));
  }, []);

  async function disconnect(id: string) {
    setBusy(true);
    try {
      await connectionService.disconnect(id);
      setSelected(null);
      await load();
    } catch {
      setError("Couldn't disconnect. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const connected = items.filter((c) => c.status === "connected");
  const disconnected = items.filter((c) => c.status !== "connected");

  return (
    <div className="page">
      {error ? <StatusBanner title={error} /> : null}
      {loading ? (
        <>
          <Skeleton height={72} />
          <Skeleton height={72} />
        </>
      ) : null}

      {!loading && connected.length === 0 ? (
        <EmptyState
          title="No connected experiences"
          detail="Open a business from Discover and allow access to connect."
          action={
            <Button variant="soft" size="sm" onClick={() => navigate("/app/discover")}>
              Browse Discover →
            </Button>
          }
        />
      ) : (
        <ul className="list connection-list">
          {connected.map((c) => (
            <li key={c.id}>
              <button type="button" className="connection-card" onClick={() => setSelected(c)}>
                <div className="biz-logo" aria-hidden>
                  {c.displayName.slice(0, 1)}
                </div>
                <div className="connection-body">
                  <div className="connection-title-row">
                    <strong>{c.displayName}</strong>
                    <StatusBadge label="Connected" tone="ok" />
                  </div>
                  <div className="muted small">{c.osLabel}</div>
                  <div className="perm-preview">
                    {c.grantedPermissions.slice(0, 3).map((p) => (
                      <Badge key={p} variant="accent">
                        {PERMISSION_LABELS[p] ?? p}
                      </Badge>
                    ))}
                    {c.grantedPermissions.length > 3 ? (
                      <Badge>+{c.grantedPermissions.length - 3}</Badge>
                    ) : null}
                  </div>
                  <div className="muted small">Last activity · {relativeActivity(c.connectedAt)}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {disconnected.length > 0 ? (
        <>
          <SectionHeader title="Disconnected" />
          <ul className="list">
            {disconnected.map((c) => (
              <li key={c.id} className="list-row">
                <div className="biz-row">
                  <div className="biz-logo biz-logo--muted" aria-hidden>
                    {c.displayName.slice(0, 1)}
                  </div>
                  <div>
                    <strong>{c.displayName}</strong>
                    <div className="muted small">{c.osLabel}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {selected ? (
        <Sheet title={selected.displayName} onClose={() => setSelected(null)}>
          <div className="connection-detail">
            <StatusBadge label="Connected" tone="ok" />
            <p className="muted small">
              {selected.osLabel} · since {new Date(selected.connectedAt).toLocaleString()}
            </p>
            <div className="label">Granted permissions</div>
            <ul className="perm-list">
              {selected.grantedPermissions.map((p) => (
                <li key={p}>
                  <span aria-hidden>✓</span> {PERMISSION_LABELS[p] ?? p}
                </li>
              ))}
            </ul>
            <div className="row-actions">
              <Button onClick={() => navigate(`/app/discover?open=${selected.experienceId}`)}>
                View
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => void disconnect(selected.id)}>
                Disconnect
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
