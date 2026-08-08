import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { NotificationItem } from "@lifeos/shared";
import { Button, EmptyState, SectionHeader, Skeleton } from "@lifeos/ui";
import { commandService, notificationService } from "../lib/services";
import { userFacingMessage } from "../lib/api";
import { StatusBanner } from "../components/StatusBanner";
import { useCommandLayer } from "../hooks/useCommandLayer";
import { ActionPreview } from "../components/ActionPreview";

export function NotificationsPage() {
  const navigate = useNavigate();
  const { setPreview, preview } = useCommandLayer();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("All");
  const [confirmBusy, setConfirmBusy] = useState(false);

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

  async function launchAction(n: NotificationItem) {
    if (!n.actionId) {
      navigate("/app/notifications");
      return;
    }
    if (!n.read) await notificationService.markRead(n.id).then(load);
    const outcome = await commandService.executeAction(
      n.actionId,
      n.actionParams ?? {},
      false,
    );
    if (outcome.type === "navigate") navigate(outcome.path);
    if (outcome.type === "preview") setPreview(outcome.preview);
  }

  return (
    <div className="page">
      <SectionHeader
        title="Inbox"
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

      {preview ? (
        <ActionPreview
          preview={preview}
          busy={confirmBusy}
          onCancel={() => setPreview(null)}
          onConfirm={() => {
            void (async () => {
              setConfirmBusy(true);
              try {
                const outcome = await commandService.executeAction(
                  preview.actionId,
                  preview.params,
                  true,
                );
                setPreview(null);
                if (outcome.type === "navigate") navigate(outcome.path);
              } finally {
                setConfirmBusy(false);
              }
            })();
          }}
        />
      ) : null}

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
              <div className="row-actions">
                {n.actionId ? (
                  <Button size="sm" onClick={() => void launchAction(n)}>
                    Open
                  </Button>
                ) : null}
                {!n.read ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void notificationService.markRead(n.id).then(load)}
                  >
                    Mark read
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
