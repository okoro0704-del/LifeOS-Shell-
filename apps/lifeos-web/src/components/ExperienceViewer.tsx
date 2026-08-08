import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildSecureLaunchUrl,
  createExperienceBridge,
  validateExperienceOrigin,
} from "@lifeos/experience-sdk";
import type { ExperienceRecord, ExperienceSessionPublic } from "@lifeos/shared";
import { Button, Skeleton } from "@lifeos/ui";

type Props = {
  experience: ExperienceRecord;
  session: ExperienceSessionPublic;
  onClose: () => void;
  onPermissionRequest?: (permissions: string[]) => void;
};

/**
 * Loads an independently deployed business experience via secure handoff URL.
 * Never passes TrustID tokens or LifeOS cookies into the iframe.
 */
export function ExperienceViewer({ experience, session, onClose, onPermissionRequest }: Props) {
  const [frameReady, setFrameReady] = useState(false);
  const [frameError, setFrameError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const validation = useMemo(
    () => validateExperienceOrigin(experience.experienceUrl, experience.approvedOrigin),
    [experience.experienceUrl, experience.approvedOrigin],
  );

  const launchUrl = useMemo(() => {
    if (!validation.ok || !session.launchUrl) return null;
    try {
      return buildSecureLaunchUrl(session.launchUrl, {
        returnUrl: window.location.href.split("?")[0],
      });
    } catch {
      return null;
    }
  }, [session.launchUrl, validation.ok]);

  // Remount iframe cleanly whenever a new handoff session is issued (e.g. after Allow).
  useEffect(() => {
    setFrameReady(false);
    setFrameError(null);
  }, [session.sessionId, session.launchUrl]);

  useEffect(() => {
    if (!validation.ok || !launchUrl || !frameReady) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const bridge = createExperienceBridge({
      targetOrigin: experience.approvedOrigin,
      targetWindow: win,
      onMessage(msg) {
        if (msg.type === "experience.request_permission") {
          onPermissionRequest?.(msg.permissions);
        }
      },
    });
    bridge.post({ type: "lifeos.ready" });
    return () => bridge.destroy();
  }, [
    experience.approvedOrigin,
    onPermissionRequest,
    validation.ok,
    launchUrl,
    frameReady,
    session.sessionId,
  ]);

  if (!validation.ok) {
    return (
      <div className="experience-overlay">
        <div className="experience-panel">
          <h2>Cannot open experience</h2>
          <p>{validation.reason}</p>
          <Button onClick={onClose}>Return to LifeOS</Button>
        </div>
      </div>
    );
  }

  if (!launchUrl) {
    return (
      <div className="experience-overlay">
        <div className="experience-panel">
          <h2>Experience session missing</h2>
          <p>Allow permissions again to open this business PWA.</p>
          <Button onClick={onClose}>Return to LifeOS</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="experience-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={experience.displayName}
    >
      <div className="experience-chrome">
        <div>
          <div className="experience-title">{experience.displayName}</div>
          <div className="muted small">
            {(experience.metadata?.osLabel as string) ?? experience.osType} · signed handoff
          </div>
        </div>
        <div className="experience-actions">
          <a className="link-btn" href={launchUrl} target="_blank" rel="noreferrer">
            Open separately
          </a>
          <Button variant="ghost" onClick={onClose}>
            Return to LifeOS
          </Button>
        </div>
      </div>

      {!frameReady && !frameError ? (
        <div className="experience-fallback experience-fallback--over">
          <Skeleton height={24} />
          <p className="muted">Loading business experience…</p>
        </div>
      ) : null}

      {frameError ? (
        <div className="experience-fallback">
          <h2>Couldn&apos;t load this experience</h2>
          <p>{frameError}</p>
          <div className="row-actions">
            <Button
              onClick={() => {
                setFrameError(null);
                setFrameReady(false);
                if (iframeRef.current) iframeRef.current.src = launchUrl;
              }}
            >
              Retry
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Return to LifeOS
            </Button>
          </div>
        </div>
      ) : (
        <iframe
          key={session.sessionId}
          ref={iframeRef}
          className="experience-frame"
          title={experience.displayName}
          src={launchUrl}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          onLoad={() => setFrameReady(true)}
          onError={() => setFrameError("The business app failed to load in LifeOS.")}
        />
      )}
    </div>
  );
}
