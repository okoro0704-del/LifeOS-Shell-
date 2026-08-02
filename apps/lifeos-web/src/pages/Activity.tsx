import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ActivityItem } from "@lifeos/shared";
import { EmptyState, SectionHeader, Skeleton } from "@lifeos/ui";
import { activityService } from "../lib/services";
import { userFacingMessage } from "../lib/api";
import { StatusBanner } from "../components/StatusBanner";

export function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    void activityService
      .list()
      .then((d) => setItems(d.activities))
      .catch((e) => setError(userFacingMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <SectionHeader
        title="Activity"
        subtitle="Ecosystem feed — LifeOS aggregates; source systems remain authoritative"
      />
      {error ? <StatusBanner title={error} /> : null}
      {loading ? <Skeleton height={140} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState title="No activity yet." detail="Events from LifeOS and connected OSs will appear here." />
      ) : (
        <ul className="list">
          {items.map((a) => (
            <li
              key={a.id}
              className={`list-row${a.deepLink ? " clickable" : ""}`}
              onClick={() => {
                if (a.deepLink) navigate(a.deepLink);
              }}
            >
              <div>
                <div className="muted small">{a.source}</div>
                <strong>{a.title}</strong>
                <div className="muted small">{a.detail}</div>
                <div className="muted small">
                  {new Date(a.createdAt).toLocaleString()}
                  {a.status ? ` · ${a.status}` : ""}
                </div>
              </div>
              {a.amount ? <span className="mono">{a.amount}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
