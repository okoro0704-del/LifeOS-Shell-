import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  applyStoredTrends,
  freeCatalog,
  markTrending,
  offlineCatalog,
  PERSONAL_CATALOG,
  trendingCatalog,
  type MediaItem,
} from "../../lib/personalCatalog";
import { personalKernelFromPath, personalNavBase } from "../../components/shell/nav";

function poolForPath(pathname: string): MediaItem[] {
  const kernel = personalKernelFromPath(pathname) ?? "main";
  if (kernel === "free") return freeCatalog();
  if (kernel === "offline") return offlineCatalog();
  return PERSONAL_CATALOG;
}

/**
 * Personal Plus — trending content. Creators can pay to Trend.
 */
export function PersonalPlusPage() {
  const location = useLocation();
  const kernel = personalKernelFromPath(location.pathname) ?? "main";
  const home = `${personalNavBase(kernel)}/post`;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    applyStoredTrends();
    setTick((n) => n + 1);
  }, [location.pathname]);

  const items = useMemo(() => {
    applyStoredTrends();
    return trendingCatalog(poolForPath(location.pathname)).slice(0, 16);
  }, [location.pathname, tick]);

  return (
    <div className="page personal-page plus-trending">
      <header className="page-header page-header--compact">
        <h1>Trending</h1>
        <p className="muted small">Hot music, videos, posts, and products. Pay to Trend yours.</p>
      </header>

      <ul className="media-feed">
        {items.map((item) => (
          <li key={item.id} className="media-feed__item">
            <div className="media-feed__meta">
              <span className="media-feed__kind">{item.kind}</span>
              {item.trending ? (
                <span className="media-feed__badge media-feed__badge--trend">Trending</span>
              ) : null}
            </div>
            <strong>{item.title}</strong>
            <span className="muted small">
              {item.author ? `@${item.author} · ` : ""}
              {item.detail}
              {item.trendScore ? ` · score ${item.trendScore}` : ""}
            </span>
            <div className="row-actions">
              <button type="button" className="los-btn los-btn--ghost los-btn--sm">
                Open
              </button>
              {!item.trending ? (
                <button
                  type="button"
                  className="los-btn los-btn--soft los-btn--sm"
                  onClick={() => {
                    markTrending(item.id);
                    setTick((n) => n + 1);
                  }}
                >
                  Pay to Trend
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <p>
        <Link to={home} className="text-link">
          Home
        </Link>
      </p>
    </div>
  );
}
