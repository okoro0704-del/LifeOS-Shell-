import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  freeCatalog,
  hasPremium,
  offlineCatalog,
  PERSONAL_CATALOG,
  randomCatalogItem,
  setPremium,
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
 * Plus FAB — random content scoped to the active kernel.
 */
export function PersonalPlusPage() {
  const location = useLocation();
  const kernel = personalKernelFromPath(location.pathname) ?? "main";
  const home = `${personalNavBase(kernel)}/post`;
  const pool = poolForPath(location.pathname);
  const pick = () => pool[Math.floor(Math.random() * Math.max(pool.length, 1))] ?? randomCatalogItem();
  const [item, setItem] = useState<MediaItem>(() => pick());
  const premium = hasPremium();

  useEffect(() => {
    setItem(pick());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const locked = kernel === "main" && item.premiumRequired && !premium && !item.free;

  return (
    <div className="page personal-page">
      <article className="plus-card">
        <span className="media-feed__kind">{item.kind}</span>
        <h2>{item.title}</h2>
        <p className="muted">{item.detail}</p>
        {locked ? (
          <button
            type="button"
            className="los-btn los-btn--primary"
            onClick={() => {
              setPremium(true);
              setItem({ ...item });
            }}
          >
            Go Premium
          </button>
        ) : (
          <button type="button" className="los-btn los-btn--soft">
            Open
          </button>
        )}
        <button type="button" className="los-btn los-btn--ghost" onClick={() => setItem(pick())}>
          Again
        </button>
      </article>
      <p>
        <Link to={home} className="text-link">
          Home
        </Link>
      </p>
    </div>
  );
}
