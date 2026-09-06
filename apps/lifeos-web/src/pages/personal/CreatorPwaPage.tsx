import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { PERSONAL_CATALOG, type MediaItem } from "../../lib/personalCatalog";
import { creatorEarnings, listUserPosts } from "../../lib/personalMonetization";

function byCreator(slug: string): MediaItem[] {
  const key = slug.toLowerCase();
  return [...listUserPosts(), ...PERSONAL_CATALOG].filter((i) =>
    (i.author || "").replace(/^@/, "").toLowerCase() === key,
  );
}

/**
 * Creator branded PWA surface — content, videos, music, products from one creator.
 */
export function CreatorPwaPage() {
  const { creatorId = "creator" } = useParams();
  const slug = decodeURIComponent(creatorId);
  const items = useMemo(() => byCreator(slug), [slug]);
  const earned = creatorEarnings(slug);

  return (
    <div className="page creator-pwa">
      <header className="creator-pwa__hero">
        <div className="creator-pwa__mark" aria-hidden>
          {slug.slice(0, 1).toUpperCase()}
        </div>
        <h1>@{slug}</h1>
        <p className="muted small">Creator app · {earned} cr earned</p>
        <Link to="/app/personal/post" className="text-link">
          Back
        </Link>
      </header>

      <section aria-label="Creator content">
        <ul className="media-feed">
          {items.length === 0 ? (
            <li className="media-feed__item">
              <strong>No public drops yet</strong>
            </li>
          ) : (
            items.map((item) => (
              <li key={item.id} className="media-feed__item">
                <span className="media-feed__kind">{item.kind}</span>
                <strong>{item.title}</strong>
                <span className="muted small">{item.detail}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
