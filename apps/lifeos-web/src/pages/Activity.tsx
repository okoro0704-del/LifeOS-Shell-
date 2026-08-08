import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ActivityItem } from "@lifeos/shared";
import { ActivityRow, Button, EmptyState, Skeleton } from "@lifeos/ui";
import { activityService } from "../lib/services";
import { StatusBanner } from "../components/StatusBanner";

function formatStamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    void activityService
      .list()
      .then((d) => setItems(d.activities))
      .catch(() => setError("We couldn't load activity. Try again."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      {error ? <StatusBanner title={error} /> : null}
      {loading ? (
        <>
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </>
      ) : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          title="No activity yet"
          detail="Bookings, payments, and experience events will show up here."
          action={
            <Button variant="soft" size="sm" onClick={() => navigate("/app/discover")}>
              Discover something →
            </Button>
          }
        />
      ) : (
        <div className="surface-block">
          {items.map((a) => (
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
