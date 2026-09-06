import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { hasPremium, randomCatalogItem, setPremium, type MediaItem } from "../../lib/personalCatalog";

/**
 * Plus FAB — launches random content and information.
 */
export function PersonalPlusPage() {
  const [item, setItem] = useState<MediaItem>(() => randomCatalogItem());
  const premium = hasPremium();

  const next = () => setItem(randomCatalogItem());

  const locked = item.premiumRequired && !premium && !item.free;

  const hint = useMemo(() => {
    if (item.free) return "Creator marked this free — also available in Free kernel.";
    if (item.ownedOrConsumed) return "In your Offline library (bought or already consumed).";
    if (item.premiumRequired) return "Main kernel Premium stream.";
    return "Discover something new.";
  }, [item]);

  return (
    <div className="page personal-page">
      <header className="page-header">
        <p className="personal-kernel-badge muted small">Discover</p>
        <h1>Plus</h1>
        <p className="muted">Random content and information from across LifeOS.</p>
      </header>

      <article className="plus-card">
        <span className="media-feed__kind">{item.kind}</span>
        <h2>{item.title}</h2>
        <p className="muted">{item.detail}</p>
        <p className="muted small">{hint}</p>
        {locked ? (
          <button
            type="button"
            className="los-btn los-btn--primary"
            onClick={() => {
              setPremium(true);
              setItem({ ...item });
            }}
          >
            Subscribe to Premium
          </button>
        ) : (
          <button type="button" className="los-btn los-btn--soft">
            Open
          </button>
        )}
        <button type="button" className="los-btn los-btn--ghost" onClick={next}>
          Surprise me again
        </button>
      </article>

      <p className="muted small">
        <Link to="/app/personal/post">Back to Home · Post</Link>
      </p>
    </div>
  );
}
