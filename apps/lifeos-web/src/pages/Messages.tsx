import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, EmptyState, IconMessage, Skeleton } from "@lifeos/ui";
import { notificationService } from "../lib/services";
import { StatusBanner } from "../components/StatusBanner";

type Thread = {
  id: string;
  title: string;
  preview: string;
  when: string;
  unread?: boolean;
};

/** Messaging inbox — threads from notifications until a dedicated chat API exists. */
export function MessagesPage() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void notificationService
      .list()
      .then((d) => {
        const mapped: Thread[] = d.notifications.slice(0, 20).map((n) => ({
          id: n.id,
          title: n.title,
          preview: n.body ?? "Open to view",
          when: n.createdAt
            ? new Date(n.createdAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : "",
          unread: !n.read,
        }));
        if (mapped.length === 0) {
          setThreads([
            {
              id: "welcome",
              title: "LifeOS Concierge",
              preview: "Ask or tell LifeOS anything — bookings, rides, and more.",
              when: "Now",
            },
          ]);
        } else {
          setThreads(mapped);
        }
      })
      .catch(() => setError("Couldn't load messages."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-toolbar">
        <button type="button" className="text-link" onClick={() => navigate("/app/notifications")}>
          Alerts
        </button>
      </div>
      {error ? <StatusBanner title={error} /> : null}
      {loading ? <Skeleton height={120} label="Loading messages" /> : null}
      {!loading && threads.length === 0 ? (
        <EmptyState
          title="No messages yet"
          detail="When hotels and services message you, they’ll show up here."
          action={
            <Button variant="soft" size="sm" onClick={() => navigate("/app")}>
              Back home
            </Button>
          }
        />
      ) : (
        <div className="messages-list surface-block">
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`messages-row${t.unread ? " messages-row--unread" : ""}`}
              onClick={() => navigate(t.id === "welcome" ? "/app" : "/app/notifications")}
            >
              <span className="messages-row__icon" aria-hidden>
                <IconMessage size={20} />
              </span>
              <span className="messages-row__body">
                <strong>{t.title}</strong>
                <span className="muted small">{t.preview}</span>
              </span>
              <span className="messages-row__when muted small">{t.when}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
