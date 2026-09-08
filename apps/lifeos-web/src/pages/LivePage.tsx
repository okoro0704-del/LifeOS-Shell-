import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listLiveStreams, type LiveStream } from "../lib/liveStreams";

function tone(id: string): string {
  const tones = [
    "linear-gradient(160deg, #0f766e 0%, #134e4a 45%, #042f2e 100%)",
    "linear-gradient(160deg, #1d4ed8 0%, #1e3a8a 50%, #0f172a 100%)",
    "linear-gradient(160deg, #b45309 0%, #7c2d12 50%, #1c1917 100%)",
    "linear-gradient(160deg, #be123c 0%, #881337 50%, #1f0610 100%)",
    "linear-gradient(160deg, #15803d 0%, #14532d 45%, #052e16 100%)",
    "linear-gradient(160deg, #6d28d9 0%, #4c1d95 50%, #1e1b4b 100%)",
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % tones.length;
  return tones[h]!;
}

function LiveViewer({
  streams,
  startId,
  onClose,
}: {
  streams: LiveStream[];
  startId: string;
  onClose: () => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [activeId, setActiveId] = useState(startId);
  const [requested, setRequested] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const idx = Math.max(0, streams.findIndex((s) => s.id === startId));
    const slide = el.children[idx] as HTMLElement | undefined;
    slide?.scrollIntoView({ block: "start" });
  }, [startId, streams]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const mid = el.scrollTop + el.clientHeight / 2;
      let best = streams[0]?.id ?? startId;
      for (let i = 0; i < el.children.length; i++) {
        const child = el.children[i] as HTMLElement;
        if (child.offsetTop <= mid && child.offsetTop + child.offsetHeight > mid) {
          best = streams[i]?.id ?? best;
          break;
        }
      }
      setActiveId(best);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [streams, startId]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  }

  return (
    <div className="live-viewer" role="dialog" aria-modal="true" aria-label="Live">
      <button type="button" className="live-viewer__close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <ul ref={listRef} className="live-viewer__feed" aria-label="Live streams">
        {streams.map((s) => (
          <li key={s.id} className="live-viewer__slide" style={{ background: tone(s.id) }}>
            <div className="live-viewer__scrim" aria-hidden />
            <div className="live-viewer__badge">
              <span className="live-float__dot" aria-hidden />
              LIVE
            </div>
            <div className="live-viewer__meta">
              <strong>@{s.host}</strong>
            </div>
            <div className="live-viewer__actions">
              <button
                type="button"
                className="los-btn los-btn--soft los-btn--sm"
                onClick={() => flash(`Joined @${s.host}`)}
              >
                Join
              </button>
              <button
                type="button"
                className="los-btn los-btn--ghost los-btn--sm"
                disabled={Boolean(requested[s.id])}
                onClick={() => {
                  setRequested((prev) => ({ ...prev, [s.id]: true }));
                  flash("Request sent to come up");
                }}
              >
                {requested[s.id] ? "Requested" : "Request to come up"}
              </button>
            </div>
            {toast && activeId === s.id ? (
              <div className="live-viewer__toast" role="status">
                {toast}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Live lobby grid → fullscreen vertical live feed. */
export function LivePage() {
  const navigate = useNavigate();
  const streams = useMemo(() => listLiveStreams().filter((s) => s.category !== "You"), []);
  const [watchingId, setWatchingId] = useState<string | null>(null);

  if (watchingId) {
    return (
      <LiveViewer streams={streams} startId={watchingId} onClose={() => setWatchingId(null)} />
    );
  }

  return (
    <div className="page live-page live-page--grid">
      <header className="live-page__bar">
        <button type="button" className="segment-topbar__icon-btn" aria-label="Back" onClick={() => navigate(-1)}>
          ←
        </button>
        <strong>Live</strong>
        <span className="segment-topbar__spacer" aria-hidden />
      </header>

      <ul className="live-grid live-grid--tiles" aria-label="Live now">
        {streams.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="live-tile"
              style={{ background: tone(s.id) }}
              onClick={() => setWatchingId(s.id)}
              aria-label={`Watch @${s.host} live`}
            >
              <span className="live-tile__badge">
                <span className="live-float__dot" aria-hidden />
                LIVE
              </span>
              <strong>@{s.host}</strong>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
