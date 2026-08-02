import { useEffect, useState } from "react";
import type { NotificationItem } from "@lifeos/shared";
import { Button, EmptyState, SectionHeader, Skeleton } from "@lifeos/ui";
import { notificationService } from "../lib/services";
import { userFacingMessage } from "../lib/api";
import { StatusBanner } from "../components/StatusBanner";

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("All");

  async function load() {
    const data = await notificationService.list();
    setItems(data.notifications);
    setUnread(data.unreadCount);
  }

  useEffect(() => {
    void load()
      .catch((e) => setError(userFacingMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    category === "All" ? items : items.filter((n) => n.category === category);

  return (
    <div className="page">
      <SectionHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread` : "All caught up"}
        action={
          unread ? (
            <button
              type="button"
              className="text-link"
              onClick={() => void notificationService.markAllRead().then(load)}
            >
              Mark all read
            </button>
          ) : null
        }
      />
      {error ? <StatusBanner title={error} /> : null}

      <div className="chip-row">
        {["All", "Security", "Wallet", "Business", "System"].map((c) => (
          <button
            key={c}
            type="button"
            className={`chip${category === c ? " active" : ""}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? <Skeleton height={120} /> : null}
      {!loading && filtered.length === 0 ? (
        <EmptyState title="No notifications." />
      ) : (
        <ul className="list">
          {filtered.map((n) => (
            <li key={n.id} className={`list-row${n.read ? "" : " unread"}`}>
              <div>
                <div className="muted small">{n.category}</div>
                <strong>{n.title}</strong>
                <div className="muted small">{n.body}</div>
                <div className="muted small">
                  {n.source} · {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
              {!n.read ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void notificationService.markRead(n.id).then(load)}
                >
                  Mark read
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
