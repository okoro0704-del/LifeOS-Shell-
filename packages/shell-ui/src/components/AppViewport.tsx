import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createLifeOSBridge, installWindowLifeOSBridge, uninstallWindowLifeOSBridge } from "@lifeos/shell-core";

export type AppViewportProps = {
  src: string;
  approvedOrigin: string;
  title?: string;
  trustId?: string | null;
  audience?: "personal" | "business";
  onClose?: () => void;
  onPaymentRequest?: (payload: Record<string, unknown>) => void;
  onNavigate?: (path: string) => void;
  children?: ReactNode;
  headerActions?: ReactNode;
  iframeTestId?: string;
};

/**
 * Micro-frontend / iframe container with two-way postMessage + LifeOSBridge injection.
 * Identity cookies are never copied into the frame — Trust ID is inherited via bridge + handoff.
 */
export function AppViewport({
  src,
  approvedOrigin,
  title,
  trustId = null,
  audience = "business",
  onClose,
  onPaymentRequest,
  onNavigate,
  headerActions,
  iframeTestId,
}: AppViewportProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const originOk = useMemo(() => {
    try {
      return (
        new URL(src).origin === new URL(approvedOrigin).origin ||
        new URL(src).origin === approvedOrigin
      );
    } catch {
      return false;
    }
  }, [src, approvedOrigin]);

  useEffect(() => {
    const bridge = createLifeOSBridge({
      trustId,
      audience,
      postToApp: (msg) => {
        const win = iframeRef.current?.contentWindow;
        if (!win) return;
        try {
          win.postMessage({ channel: "lifeos.bridge", ...msg }, approvedOrigin);
        } catch {
          /* ignore */
        }
      },
      onOpenCheckout: (ref) => onPaymentRequest?.(ref as Record<string, unknown>),
    });
    installWindowLifeOSBridge(bridge);
    return () => uninstallWindowLifeOSBridge();
  }, [trustId, audience, approvedOrigin, onPaymentRequest]);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.origin !== approvedOrigin && !String(approvedOrigin).includes(ev.origin)) {
        try {
          if (new URL(approvedOrigin).origin !== ev.origin) return;
        } catch {
          return;
        }
      }
      const data = ev.data as Record<string, unknown> | null;
      if (!data || typeof data !== "object") return;
      const type = String(data.type ?? "");
      if (type === "lifeos.ready" || type === "experience.ready") setReady(true);
      if (type === "experience.request_payment" || type === "lifeos.wallet.checkout") {
        onPaymentRequest?.(data);
      }
      if (type === "lifeos.navigate" && typeof data.path === "string") {
        onNavigate?.(data.path);
      }
      if (type === "lifeos.close") onClose?.();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [approvedOrigin, onClose, onNavigate, onPaymentRequest]);

  if (!originOk) {
    return (
      <div className="los-app-viewport los-app-viewport--error" role="alert">
        App origin is not allowlisted for shell projection.
      </div>
    );
  }

  return (
    <div className="los-app-viewport">
      <header className="los-app-viewport__chrome">
        <strong>{title ?? "App"}</strong>
        {headerActions ? <div className="los-app-viewport__actions">{headerActions}</div> : null}
        <span className="los-app-viewport__sso">Trust ID SSO</span>
        {onClose ? (
          <button type="button" className="los-app-viewport__close" onClick={onClose}>
            Close
          </button>
        ) : null}
      </header>
      {!ready && !error ? <p className="los-app-viewport__loading">Loading module…</p> : null}
      {error ? <p className="los-app-viewport__error">{error}</p> : null}
      <iframe
        ref={iframeRef}
        className="los-app-viewport__frame"
        title={title ?? "LifeOS app"}
        data-testid={iframeTestId}
        src={src}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerPolicy="no-referrer"
        onLoad={() => setReady(true)}
        onError={() => setError("Failed to load app module")}
      />
    </div>
  );
}
