import type { ReactNode } from "react";
import { IconExplore } from "@lifeos/ui";

export type DiscoveryQuadItem = {
  id: string;
};

type Props<T extends DiscoveryQuadItem> = {
  title: string;
  items: T[];
  loading?: boolean;
  emptyLabel: string;
  expandAriaLabel: string;
  expanded: boolean;
  onExpand: () => void;
  onCollapse?: () => void;
  renderItem: (item: T, mode: "quad" | "grid") => ReactNode;
  /** Optional footnote under the title (e.g. discovery semantics). */
  subtitle?: string;
};

const PREVIEW = 4;

/**
 * Shared Business Space discovery layout:
 * compact 2×2 preview with center expand, then 2-column scrollable grid.
 */
export function DiscoveryQuadGrid<T extends DiscoveryQuadItem>({
  title,
  items,
  loading,
  emptyLabel,
  expandAriaLabel,
  expanded,
  onExpand,
  onCollapse,
  renderItem,
  subtitle,
}: Props<T>) {
  const preview = items.slice(0, PREVIEW);

  return (
    <section className="discovery-quad" aria-label={title}>
      <div className="discovery-quad__head">
        <h2>{title}</h2>
        {subtitle ? <span className="muted small">{subtitle}</span> : null}
      </div>

      {loading ? (
        <div className="discovery-quad__skeleton" aria-busy="true" aria-label={`Loading ${title}`}>
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : items.length === 0 ? (
        <p className="muted discovery-quad__empty">{emptyLabel}</p>
      ) : expanded ? (
        <div className="discovery-quad__expanded">
          {onCollapse ? (
            <button type="button" className="discovery-quad__collapse" onClick={onCollapse}>
              Show preview
            </button>
          ) : null}
          <ul className="discovery-quad__grid" aria-label={`All ${title}`}>
            {items.map((item) => (
              <li key={item.id} className="discovery-quad__grid-cell">
                {renderItem(item, "grid")}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="discovery-quad__box">
          <div className="discovery-quad__tiles" role="list">
            {preview.map((item) => (
              <div key={item.id} className="discovery-quad__tile" role="listitem">
                {renderItem(item, "quad")}
              </div>
            ))}
          </div>
          {items.length > 0 ? (
            <button
              type="button"
              className="discovery-quad__expand"
              aria-label={expandAriaLabel}
              title={expandAriaLabel}
              onClick={onExpand}
            >
              <IconExplore size={18} />
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
