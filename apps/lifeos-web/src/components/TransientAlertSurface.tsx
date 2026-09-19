import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { notificationService } from "../lib/services";
import type { NotificationItem } from "@lifeos/shared";

type AlertKind = "notification" | "message" | "live";

type TransientAlert = {
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  to: string;
};

const SHOW_MS = 4200;

/**
 * Right-originating transient alerts for real notification / message / live events.
 * No fake demo events — only surfaces increases from the notifications API.
 */
export function TransientAlertSurface() {
  const [alert, setAlert] = useState<TransientAlert | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await notificationService.list();
        if (cancelled) return;
        const list = data.notifications ?? [];
        if (!primed.current) {
          for (const n of list) seenIds.current.add(n.id);
          primed.current = true;
          return;
        }
        const fresh = list.find((n) => !seenIds.current.has(n.id));
        if (!fresh) return;
        seenIds.current.add(fresh.id);
        pushAlert(mapNotification(fresh));
      } catch {
        /* ignore offline / API errors */
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), 45000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  function pushAlert(next: TransientAlert) {
    setAlert(next);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setAlert(null), SHOW_MS);
  }

  if (!alert) return null;

  return (
    <div className="lifeos-transient-alerts" aria-live="polite">
      <Link
        to={alert.to}
        className={`lifeos-transient-alert lifeos-transient-alert--${alert.kind}`}
        onClick={() => setAlert(null)}
      >
        <span className="lifeos-transient-alert__mark" aria-hidden>
          {alert.kind === "live" ? "●" : alert.kind === "message" ? "💬" : "🔔"}
        </span>
        <span className="lifeos-transient-alert__copy">
          <strong>{alert.title}</strong>
          <span>{alert.body}</span>
        </span>
        <span className="lifeos-transient-alert__when">now</span>
      </Link>
    </div>
  );
}

function mapNotification(n: NotificationItem): TransientAlert {
  const title = (n.title || "Notification").trim();
  const body = (n.body || "").trim() || "Tap to open";
  const lower = `${title} ${body} ${n.category} ${n.source}`.toLowerCase();
  let kind: AlertKind = "notification";
  let to = "/app/notifications";
  if (lower.includes("live") || lower.includes("is live")) {
    kind = "live";
    to = "/app/live";
  } else if (lower.includes("message") || lower.includes("dm") || n.source.toLowerCase().includes("message")) {
    kind = "message";
    to = "/app/messages";
  }
  return { id: n.id, kind, title, body, to };
}
