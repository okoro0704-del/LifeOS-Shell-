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
  const [loading, setLoading] = useState(true);
  const [unreachable, setUnreachable] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const validation = useMemo(
    () => validateExperienceOrigin(experience.experienceUrl, experience.approvedOrigin),
    [experience],
  );

  const launchUrl = useMemo(() => {
    if (!validation.ok) return null;
    return buildSecureLaunchUrl(session.launchUrl, {
      returnUrl: window.location.origin + "/app/discover",
    });
  }, [session.launchUrl, validation.ok]);

  useEffect(() => {
    if (!validation.ok || !launchUrl) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4000);
    fetch(experience.approvedOrigin, { mode: "no-cors", signal: controller.signal })
      .then(() => {
        if (!cancelled) {
          setUnreachable(false);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUnreachable(true);
          setLoading(false);
        }
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [experience.approvedOrigin, launchUrl, validation.ok]);

  useEffect(() => {
    if (!validation.ok) return;
    const bridge = createExperienceBridge({
      targetOrigin: experience.approvedOrigin,
      targetWindow: iframeRef.current?.contentWindow,
      onMessage(msg) {
        if (msg.type === "experience.request_permission") {
          onPermissionRequest?.(msg.permissions);
        }
        if (msg.type === "lifeos.close" || msg.type === "experience.error") {
          /* parent may handle */
        }
      },
    });
    bridge.post({ type: "lifeos.ready" });
    return () => bridge.destroy();
  }, [experience.approvedOrigin, onPermissionRequest, validation.ok, loading]);

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

  return (
    <div className="experience-overlay" role="dialog" aria-modal="true" aria-label={experience.displayName}>
      <div className="experience-chrome">
        <div>
          <div className="experience-title">{experience.displayName}</div>
          <div className="muted small">
            {(experience.metadata?.osLabel as string) ?? experience.osType} · signed handoff
          </div>
        </div>
        <div className="experience-actions">
          <a className="link-btn" href={launchUrl!} target="_blank" rel="noreferrer">
            Open separately
          </a>
          <Button variant="ghost" onClick={onClose}>
            Return to LifeOS
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="experience-fallback">
          <Skeleton height={24} />
          <p className="muted">Loading experience…</p>
        </div>
      ) : unreachable ? (
        <div className="experience-fallback">
          <h2>This experience is temporarily unavailable</h2>
          <p>
            LifeOS is still running. The independently deployed experience at{" "}
            <span className="mono">{experience.approvedOrigin}</span> could not be reached.
          </p>
          <Button onClick={onClose}>Return to LifeOS</Button>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          className="experience-frame"
          title={experience.displayName}
          src={launchUrl!}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
