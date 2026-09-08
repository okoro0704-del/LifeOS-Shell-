import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { endLive, goLive, listLiveStreams } from "../lib/liveStreams";
import { useAuth } from "../hooks/useAuth";

/** Live lobby — everyone currently streaming. */
export function LivePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const host = user?.displayName?.split(" ")[0]?.toLowerCase() || "you";
  const [tick, setTick] = useState(0);
  const streams = useMemo(() => listLiveStreams(), [tick]);
  const mine = streams.find((s) => s.category === "You");

  return (
    <div className="page live-page">
      <header className="page-header page-header--compact">
        <button type="button" className="segment-topbar__icon-btn" aria-label="Back" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1>Live</h1>
        <p className="muted small">Creators streaming now across LifeOS.</p>
      </header>

      <div className="live-page__actions">
        {mine ? (
          <button
            type="button"
            className="los-btn los-btn--ghost"
            onClick={() => {
              endLive();
              setTick((n) => n + 1);
            }}
          >
            End my Live
          </button>
        ) : (
          <button
            type="button"
            className="los-btn los-btn--primary"
            onClick={() => {
              goLive({ host, title: `${host} went Live` });
              setTick((n) => n + 1);
            }}
          >
            Go Live
          </button>
        )}
        <Link to="/app/notifications" className="text-link">
          Notifications
        </Link>
      </div>

      <ul className="live-grid" aria-label="Live now">
        {streams.map((s) => (
          <li key={s.id} className="live-card">
            <div className="live-card__badge">
              <span className="live-float__dot" aria-hidden />
              LIVE
            </div>
            <strong>@{s.host}</strong>
            <span className="live-card__title">{s.title}</span>
            <span className="muted small">
              {s.viewers.toLocaleString()} watching · {s.category}
            </span>
            <button type="button" className="los-btn los-btn--soft los-btn--sm">
              Join
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
