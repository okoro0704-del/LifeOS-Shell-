import { useEffect, type ReactNode } from "react";
import { IconExplore } from "@lifeos/ui";

export type DiscoveryKind = "business" | "service" | "product";

export type DiscoveryQuadItem = {
  id: string;
};

type QuadProps<T extends DiscoveryQuadItem> = {
  title: string;
  items: T[];
  loading?: boolean;
  emptyLabel: string;
  expandAriaLabel: string;
  onExpand: () => void;
  renderItem: (item: T, mode: "quad" | "grid") => ReactNode;
  subtitle?: string;
};

const PREVIEW = 4;

/** Collapsed edge-to-edge 2×2 with center diamond expand control. */
export function DiscoveryQuad<T extends DiscoveryQuadItem>({
  title,
  items,
  loading,
  emptyLabel,
  expandAriaLabel,
  onExpand,
  renderItem,
  subtitle,
}: QuadProps<T>) {
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
      ) : (
        <div className="discovery-quad__box">
          <div className="discovery-quad__tiles" role="list">
            {preview.map((item) => (
              <div key={item.id} className="discovery-quad__tile" role="listitem">
                {renderItem(item, "quad")}
              </div>
            ))}
          </div>
          <DiamondControl ariaLabel={expandAriaLabel} onActivate={onExpand} attention />
        </div>
      )}
    </section>
  );
}

type ExpandedProps<T extends DiscoveryQuadItem> = {
  title: string;
  items: T[];
  contractAriaLabel: string;
  onContract: () => void;
  renderItem: (item: T, mode: "quad" | "grid") => ReactNode;
};

/**
 * Full-viewport discovery mode — 2 columns, floating viewport-centered diamond contracts.
 */
export function ExpandedDiscoveryGrid<T extends DiscoveryQuadItem>({
  title,
  items,
  contractAriaLabel,
  onContract,
  renderItem,
}: ExpandedProps<T>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onContract();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onContract]);

  return (
    <div className="discovery-expanded" role="dialog" aria-modal="true" aria-label={title}>
      <ul className="discovery-expanded__grid" aria-label={title}>
        {items.map((item) => (
          <li key={item.id} className="discovery-expanded__cell">
            {renderItem(item, "grid")}
          </li>
        ))}
      </ul>
      <DiamondControl
        ariaLabel={contractAriaLabel}
        onActivate={onContract}
        floating
        attention
      />
    </div>
  );
}

/** Standing square / diamond — same visual identity collapsed & expanded. */
export function DiamondControl({
  ariaLabel,
  onActivate,
  floating = false,
  attention = false,
}: {
  ariaLabel: string;
  onActivate: () => void;
  floating?: boolean;
  attention?: boolean;
}) {
  return (
    <button
      type="button"
      className={`discovery-diamond${floating ? " discovery-diamond--float" : ""}${
        attention ? " discovery-diamond--attention" : ""
      }`}
      aria-label={ariaLabel}
      title={ariaLabel}
      data-no-nav-dock
      data-discovery-diamond={floating ? "float" : "inline"}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="discovery-diamond__face" aria-hidden>
        <span className="discovery-diamond__icon">
          <IconExplore size={16} />
        </span>
      </span>
    </button>
  );
}

/** @deprecated Prefer DiscoveryQuad + ExpandedDiscoveryGrid */
export function DiscoveryQuadGrid<T extends DiscoveryQuadItem>(
  props: QuadProps<T> & {
    expanded?: boolean;
    onCollapse?: () => void;
  },
) {
  if (props.expanded) {
    return (
      <ExpandedDiscoveryGrid
        title={props.title}
        items={props.items}
        contractAriaLabel="Return to Business Space Home"
        onContract={props.onCollapse ?? (() => undefined)}
        renderItem={props.renderItem}
      />
    );
  }
  return <DiscoveryQuad {...props} />;
}
