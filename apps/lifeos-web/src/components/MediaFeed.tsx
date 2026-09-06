import { Link } from "react-router-dom";
import { hasPremium, setPremium, type MediaItem } from "../lib/personalCatalog";

export function MediaFeed({
  items,
  empty,
  gatePremium,
}: {
  items: MediaItem[];
  empty: string;
  /** When true, premium-required items show a subscribe CTA on Main kernel */
  gatePremium?: boolean;
}) {
  const premium = hasPremium();

  if (!items.length) {
    return <p className="muted">{empty}</p>;
  }

  return (
    <ul className="media-feed">
      {items.map((item) => {
        const locked = Boolean(gatePremium && item.premiumRequired && !premium);
        return (
          <li key={item.id} className={`media-feed__item${locked ? " is-locked" : ""}`}>
            <div className="media-feed__meta">
              <span className="media-feed__kind">{item.kind}</span>
              {item.free ? <span className="media-feed__badge">Free</span> : null}
              {item.premiumRequired ? <span className="media-feed__badge media-feed__badge--pro">Premium</span> : null}
            </div>
            <strong>{item.title}</strong>
            <span className="muted small">{item.detail}</span>
            {locked ? (
              <button
                type="button"
                className="los-btn los-btn--soft los-btn--sm"
                onClick={() => {
                  setPremium(true);
                  window.location.reload();
                }}
              >
                Subscribe to Premium to play
              </button>
            ) : (
              <button type="button" className="los-btn los-btn--ghost los-btn--sm">
                {item.kind === "picture" || item.kind === "post" ? "Open" : "Play"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function PremiumHint() {
  if (hasPremium()) return null;
  return (
    <p className="muted small personal-premium-hint">
      Main kernel streams (music, video, podcasts) need{" "}
      <Link to="/app/personal/plus">LifeOS Premium</Link>. Free creator content lives in Free kernel;
      purchases stay in Offline.
    </p>
  );
}
