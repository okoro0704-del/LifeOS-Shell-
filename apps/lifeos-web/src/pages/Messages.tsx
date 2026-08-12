import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, EmptyState, Skeleton } from "@lifeos/ui";
import { api } from "../lib/api";
import { StatusBanner } from "../components/StatusBanner";

type MessagingStatus = {
  module: string;
  bound: boolean;
  status: string;
  message: string;
};

type Thread = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  unreadCount: number;
};

/** ElfCom inbox — empty shell until the messaging sovereign node is bound. */
export function MessagesPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<MessagingStatus | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const st = await api<MessagingStatus>("/messaging/status");
        setStatus(st);
        if (!st.bound) {
          setThreads([]);
          return;
        }
        const data = await api<{ threads: Thread[] }>("/messaging/threads");
        setThreads(data.threads ?? []);
      } catch {
        setError("Couldn't reach ElfCom messaging.");
        setStatus({
          module: "elfcom",
          bound: false,
          status: "unbound",
          message: "Module Unbound / Awaiting Sovereign Node: elfcom",
        });
      } finally {
        setLoading(false);
      }
    })();
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
      {!loading && (!status?.bound || threads.length === 0) ? (
        <EmptyState
          title={status?.bound ? "No messages yet" : "Messaging unbound"}
          detail={
            status?.bound
              ? "When services message you through ElfCom, they’ll show up here."
              : status?.message ?? "Module Unbound / Awaiting Sovereign Node: elfcom"
          }
          action={
            <Button variant="soft" size="sm" onClick={() => navigate("/app")}>
              Back home
            </Button>
          }
        />
      ) : null}
      {!loading && status?.bound && threads.length > 0 ? (
        <div className="messages-list surface-block">
          {threads.map((t) => (
            <div key={t.id} className="messages-row">
              <strong>{t.title}</strong>
              <span className="muted small">{t.preview}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
