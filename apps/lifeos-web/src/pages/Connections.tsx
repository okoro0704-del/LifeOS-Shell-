import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ExperienceConnectionPublic } from "@lifeos/shared";
import { PERMISSION_LABELS } from "@lifeos/shared";
import { Button, EmptyState, SectionHeader, Skeleton } from "@lifeos/ui";
import { userFacingMessage } from "../lib/api";
import { connectionService } from "../lib/services";
import { StatusBanner } from "../components/StatusBanner";

export function ConnectionsPage() {
  const [items, setItems] = useState<ExperienceConnectionPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ExperienceConnectionPublic | null>(null);
  const navigate = useNavigate();

  async function load() {
    const data = await connectionService.list();
    setItems(data.connections);
  }

  useEffect(() => {
    void load()
      .catch((e) => setError(userFacingMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  async function disconnect(id: string) {
    await connectionService.disconnect(id);
    setSelected(null);
    await load();
  }

  const connected = items.filter((c) => c.status === "connected");
  const disconnected = items.filter((c) => c.status !== "connected");

  return (
    <div className="page">
      <SectionHeader
        title="Connected experiences"
        subtitle="Businesses with access to LifeOS information you granted"
      />
      {error ? <StatusBanner title={error} /> : null}
      {loading ? <Skeleton height={120} /> : null}

      {!loading && connected.length === 0 ? (
        <EmptyState
          title="No connected experiences"
          detail="Open a business from Discover and allow permissions to connect."
        />
      ) : (
        <ul className="list">
          {connected.map((c) => (
            <li key={c.id} className="list-row clickable" onClick={() => setSelected(c)}>
              <div>
                <strong>{c.displayName}</strong>
                <div className="muted small">{c.osLabel}</div>
                <div className="status-pill" style={{ marginTop: "0.35rem" }}>
                  <span className="status-dot" />
                  Connected
                </div>
              </div>
              <Button
                size="sm"
                variant="soft"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/app/discover?open=${c.experienceId}`);
                }}
              >
                Open
              </Button>
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
                <div>
                  <strong>{c.displayName}</strong>
                  <div className="muted small">{c.osLabel} · Disconnected</div>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <Link to="/app/discover" className="text-link block-link">
        Find more experiences
      </Link>

      {selected ? (
        <div className="experience-overlay">
          <div className="experience-panel">
            <h2>{selected.displayName}</h2>
            <p className="muted">
              {selected.osLabel} · connected{" "}
              {new Date(selected.connectedAt).toLocaleString()}
            </p>
            <div className="label">Permissions</div>
            <ul className="perm-list">
              {selected.grantedPermissions.map((p) => (
                <li key={p}>✓ {PERMISSION_LABELS[p] ?? p}</li>
              ))}
            </ul>
            <div className="row-actions">
              <Button
                onClick={() => navigate(`/app/discover?open=${selected.experienceId}`)}
              >
                Open
              </Button>
              <Button variant="danger" onClick={() => void disconnect(selected.id)}>
                Disconnect
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
