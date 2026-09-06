import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ActivityItem } from "@lifeos/shared";
import { ActivityRow, Button, EmptyState, Skeleton } from "@lifeos/ui";
import { activityService } from "../lib/services";
import { StatusBanner } from "../components/StatusBanner";
import { useWorkspace } from "../context/WorkspaceContext";

function formatStamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const MY_PRODUCTS = [
  { id: "mp1", name: "Harbour Cafe menu kit", kind: "Service", status: "Live" },
  { id: "mp2", name: "City Fix Lab booking", kind: "Service", status: "Boosted" },
  { id: "mp3", name: "RouteMesh", kind: "Software", status: "Seeking investment" },
  { id: "mp4", name: "ShelfSense", kind: "Software", status: "For sale" },
  { id: "mp5", name: "Weekend meal plan", kind: "Product", status: "Live" },
];

export function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { mode } = useWorkspace();

  useEffect(() => {
    void activityService
      .list()
      .then((d) => setItems(d.activities))
      .catch(() => setError("We couldn't load activity. Try again."))
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return MY_PRODUCTS;
    return MY_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.kind.toLowerCase().includes(needle) ||
        p.status.toLowerCase().includes(needle),
    );
  }, [q]);

  const filteredActivity = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (a) => a.title.toLowerCase().includes(needle) || a.detail.toLowerCase().includes(needle),
    );
  }, [items, q]);

  return (
    <div className="page">
      <input
        className="surface-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search activity & products…"
        aria-label="Search activity"
      />

      {mode === "BUSINESS" ? (
        <section className="activity-products" aria-label="Your products">
          <div className="business-home__section-head">
            <h2>Your products</h2>
          </div>
          <ul className="media-feed">
            {filteredProducts.map((p) => (
              <li key={p.id} className="media-feed__item">
                <div className="media-feed__meta">
                  <span className="media-feed__kind">{p.kind}</span>
                  <span className="media-feed__badge">{p.status}</span>
                </div>
                <strong>{p.name}</strong>
                <button
                  type="button"
                  className="los-btn los-btn--ghost los-btn--sm"
                  onClick={() => navigate("/app/business")}
                >
                  Manage
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? <StatusBanner title={error} /> : null}
      {loading ? (
        <>
          <Skeleton height={56} />
          <Skeleton height={56} />
        </>
      ) : null}
      {!loading && filteredActivity.length === 0 ? (
        <EmptyState
          title="No activity yet"
          detail="Bookings and payments show here."
          action={
            <Button variant="soft" size="sm" onClick={() => navigate("/app/discover")}>
              Discover →
            </Button>
          }
        />
      ) : (
        <div className="surface-block">
          {filteredActivity.map((a) => (
            <ActivityRow
              key={a.id}
              kind={a.kind}
              title={a.title}
              detail={a.detail}
              time={formatStamp(a.createdAt)}
              amount={a.amount ?? undefined}
              onClick={a.deepLink ? () => navigate(a.deepLink!) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
