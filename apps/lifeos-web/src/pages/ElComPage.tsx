import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { StatusBanner } from "../components/StatusBanner";
import { EmptyState, Skeleton } from "@lifeos/ui";
import { useWorkspace } from "../context/WorkspaceContext";
import { workspaceHomePath } from "../components/shell/nav";

type Thread = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  unreadCount: number;
};

const MUTUAL = [
  { id: "c1", name: "Amaka Nwosu", detail: "Mutual · Lagos" },
  { id: "c2", name: "Tunde Beats", detail: "Mutual · Music" },
  { id: "c3", name: "LearnVerse Hub", detail: "Mutual · Education" },
  { id: "c4", name: "Maya Films", detail: "Mutual · Film" },
];

const DIRECTORY = [
  ...MUTUAL,
  { id: "d1", name: "Kofi Radio", detail: "Creator" },
  { id: "d2", name: "Harbour Cafe", detail: "Business" },
  { id: "d3", name: "Ada Creates", detail: "Creator" },
  { id: "d4", name: "Night Drive", detail: "Creator" },
];

/**
 * Full-page ElCom — Messages first, then Connect (mutuals + people search).
 * Portaled to body so page-enter transforms cannot blank the fixed overlay.
 */
export function ElComPage() {
  const navigate = useNavigate();
  const { mode } = useWorkspace();
  const [tab, setTab] = useState<"messages" | "connect">("messages");
  const [q, setQ] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const st = await api<{ bound: boolean }>("/messaging/status");
        if (!st.bound) {
          setThreads([
            {
              id: "demo-1",
              title: "Ada Creates",
              preview: "New free drop tomorrow",
              updatedAt: new Date().toISOString(),
              unreadCount: 1,
            },
            {
              id: "demo-2",
              title: "Tunde Beats",
              preview: "Collab?",
              updatedAt: new Date().toISOString(),
              unreadCount: 0,
            },
          ]);
          return;
        }
        const data = await api<{ threads: Thread[] }>("/messaging/threads");
        setThreads(data.threads ?? []);
      } catch {
        setError("Couldn't load messages.");
        setThreads([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredThreads = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter(
      (t) => t.title.toLowerCase().includes(needle) || t.preview.toLowerCase().includes(needle),
    );
  }, [threads, q]);

  const mutuals = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return MUTUAL;
    return MUTUAL.filter((p) => p.name.toLowerCase().includes(needle));
  }, [q]);

  const finds = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return DIRECTORY;
    return DIRECTORY.filter((p) => p.name.toLowerCase().includes(needle));
  }, [q]);

  const ui = (
    <div className="elcom-full" role="dialog" aria-modal="true" aria-label="ElCom">
      <header className="elcom-full__head">
        <button
          type="button"
          className="segment-topbar__icon-btn"
          aria-label="Back"
          onClick={() => navigate(workspaceHomePath(mode))}
        >
          ←
        </button>
        <strong>ElCom</strong>
        <span className="segment-topbar__spacer" aria-hidden />
      </header>

      <div className="elcom-full__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "messages"}
          className={`elcom-full__tab${tab === "messages" ? " is-active" : ""}`}
          onClick={() => {
            setTab("messages");
            setQ("");
          }}
        >
          Messages
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "connect"}
          className={`elcom-full__tab${tab === "connect" ? " is-active" : ""}`}
          onClick={() => {
            setTab("connect");
            setQ("");
          }}
        >
          Connect
        </button>
      </div>

      <input
        className="surface-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={tab === "messages" ? "Search messages…" : "Search people…"}
        aria-label={tab === "messages" ? "Search messages" : "Search people"}
      />

      {error ? <StatusBanner title={error} /> : null}

      {tab === "messages" ? (
        <div className="elcom-full__body">
          {loading ? (
            <>
              <Skeleton height={56} />
              <Skeleton height={56} />
            </>
          ) : filteredThreads.length === 0 ? (
            <EmptyState title="No messages" detail="Start a chat from Connect." />
          ) : (
            <ul className="media-feed">
              {filteredThreads.map((t) => (
                <li key={t.id} className="media-feed__item">
                  <strong>{t.title}</strong>
                  <span className="muted small">{t.preview}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="elcom-full__body">
          <h2 className="elcom-full__section">Mutual</h2>
          <ul className="media-feed">
            {mutuals.map((p) => (
              <li key={p.id} className="media-feed__item">
                <strong>{p.name}</strong>
                <span className="muted small">{p.detail}</span>
              </li>
            ))}
          </ul>
          <h2 className="elcom-full__section">Find</h2>
          <ul className="media-feed">
            {finds.map((p) => (
              <li key={p.id} className="media-feed__item">
                <strong>{p.name}</strong>
                <span className="muted small">{p.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  if (typeof document === "undefined") return ui;
  return createPortal(ui, document.body);
}
