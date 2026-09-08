import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { StatusBanner } from "../components/StatusBanner";
import { EmptyState, Skeleton } from "@lifeos/ui";
import { useWorkspace } from "../context/WorkspaceContext";
import { workspaceHomePath } from "../components/shell/nav";
import { hasDeployedMyBrandOS } from "../lib/mybrandOS";
import { installedAppsService } from "../lib/services";
import type { InstalledAppManifest } from "@lifeos/shared";

type Thread = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  unreadCount: number;
};

/**
 * Creator-only messaging (mybrandOS owners). Connect lives in mybrandOS, not the consumer shell.
 */
export function ElComPage() {
  const navigate = useNavigate();
  const { mode } = useWorkspace();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [q, setQ] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void installedAppsService
      .list()
      .then((r) => setAllowed(hasDeployedMyBrandOS(r.apps ?? [])))
      .catch(() => setAllowed(hasDeployedMyBrandOS([] as InstalledAppManifest[])));
  }, []);

  useEffect(() => {
    if (allowed !== true) return;
    void (async () => {
      try {
        const st = await api<{ bound: boolean; message?: string }>("/messaging/status");
        if (!st.bound) {
          setError(st.message || "ElfCom unbound — messaging is provided by ElfCom.");
          setThreads([]);
          return;
        }
        const data = await api<{ threads: Thread[] }>("/messaging/threads");
        setThreads(data.threads ?? []);
      } catch {
        setError("Couldn't reach ElfCom messaging.");
        setThreads([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [allowed]);

  const filteredThreads = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter(
      (t) => t.title.toLowerCase().includes(needle) || t.preview.toLowerCase().includes(needle),
    );
  }, [threads, q]);

  if (allowed === false) {
    return <Navigate to={workspaceHomePath(mode)} replace />;
  }

  if (allowed === null) {
    return null;
  }

  const ui = (
    <div className="elcom-full" role="dialog" aria-modal="true" aria-label="Messages">
      <header className="elcom-full__head">
        <button
          type="button"
          className="segment-topbar__icon-btn"
          aria-label="Back"
          onClick={() => navigate(workspaceHomePath(mode))}
        >
          ←
        </button>
        <strong>Messages</strong>
        <span className="segment-topbar__spacer" aria-hidden />
      </header>

      <input
        className="surface-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search messages…"
        aria-label="Search messages"
      />

      {error ? <StatusBanner title={error} /> : null}

      <div className="elcom-full__body">
        {loading ? (
          <>
            <Skeleton height={56} />
            <Skeleton height={56} />
          </>
        ) : filteredThreads.length === 0 ? (
          <EmptyState
            title={error ? "ElfCom messaging" : "No messages"}
            detail={
              error
                ? "LifeOS consumes ElfCom for creator messaging — connect the ElfCom node to see threads."
                : "Threads from ElfCom appear here when fans message your mybrandOS."
            }
          />
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
    </div>
  );

  if (typeof document === "undefined") return ui;
  return createPortal(ui, document.body);
}
