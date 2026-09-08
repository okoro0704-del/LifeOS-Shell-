import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, EmptyState, Skeleton } from "@lifeos/ui";
import { api } from "../lib/api";
import { StatusBanner } from "../components/StatusBanner";
import {
  listLocalMessages,
  listLocalThreads,
  markThreadRead,
  sendLocalMessage,
  type LocalMessage,
  type LocalThread,
} from "../lib/localMessaging";

type MessagingStatus = {
  module: string;
  bound: boolean;
  status: string;
  message: string;
};

/** Business + shared messaging — local threads when ElfCom is unbound. */
export function MessagesPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<MessagingStatus | null>(null);
  const [threads, setThreads] = useState<LocalThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const st = await api<MessagingStatus>("/messaging/status");
        setStatus(st);
        if (st.bound) {
          const data = await api<{ threads: LocalThread[] }>("/messaging/threads");
          const remote = data.threads ?? [];
          setThreads(remote.length ? remote : listLocalThreads());
        } else {
          setThreads(listLocalThreads());
        }
      } catch {
        setError(null);
        setStatus({
          module: "elfcom",
          bound: false,
          status: "local",
          message: "Local messages",
        });
        setThreads(listLocalThreads());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    markThreadRead(activeId);
    setMessages(listLocalMessages(activeId));
    setThreads(listLocalThreads());
  }, [activeId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter(
      (t) => t.title.toLowerCase().includes(needle) || t.preview.toLowerCase().includes(needle),
    );
  }, [threads, q]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  function onSend(e: FormEvent) {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    const next = sendLocalMessage(activeId, draft);
    setMessages(next);
    setDraft("");
    setThreads(listLocalThreads());
  }

  if (active && activeId) {
    return (
      <div className="page messages-page messages-page--thread">
        <header className="messages-thread__head">
          <button type="button" className="segment-topbar__icon-btn" aria-label="Back" onClick={() => setActiveId(null)}>
            ←
          </button>
          <strong>{active.title}</strong>
          <span className="segment-topbar__spacer" aria-hidden />
        </header>

        <ul className="messages-thread__list" aria-label="Conversation">
          {messages.map((m) => (
            <li key={m.id} className={`messages-bubble messages-bubble--${m.sender}`}>
              <p>{m.body}</p>
              <time className="muted small">{new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
            </li>
          ))}
        </ul>

        <form className="messages-thread__composer" onSubmit={onSend}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message…"
            aria-label="Message"
          />
          <button type="submit" className="los-btn los-btn--soft los-btn--sm" disabled={!draft.trim()}>
            Send
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="page messages-page">
      <div className="page-toolbar">
        <button type="button" className="text-link" onClick={() => navigate("/app/notifications")}>
          Alerts
        </button>
      </div>

      <input
        className="surface-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search messages…"
        aria-label="Search messages"
      />

      {error ? <StatusBanner title={error} /> : null}
      {loading ? <Skeleton height={120} label="Loading messages" /> : null}

      {!loading && filtered.length === 0 ? (
        <EmptyState
          title="No messages yet"
          detail="Businesses you contact will appear here."
          action={
            <Button variant="soft" size="sm" onClick={() => navigate("/app/business")}>
              Browse businesses
            </Button>
          }
        />
      ) : null}

      {!loading && filtered.length > 0 ? (
        <ul className="messages-list" aria-label="Inbox">
          {filtered.map((t) => (
            <li key={t.id}>
              <button type="button" className="messages-row" onClick={() => setActiveId(t.id)}>
                <span className="messages-row__main">
                  <strong>{t.title}</strong>
                  <span className="muted small">{t.preview}</span>
                </span>
                {t.unreadCount > 0 ? (
                  <span className="messages-row__badge" aria-label={`${t.unreadCount} unread`}>
                    {t.unreadCount}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {status && !status.bound ? (
        <p className="muted small messages-page__note">Messages sync locally until ElfCom is bound.</p>
      ) : null}
    </div>
  );
}
