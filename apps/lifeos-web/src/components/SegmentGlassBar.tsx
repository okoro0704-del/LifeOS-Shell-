import { useNavigate } from "react-router-dom";
import { IconSearch } from "@lifeos/ui";

export type GlassTab = {
  to: string;
  end?: boolean;
  label: string;
  id: string;
};

/**
 * Home section rail: wide transparent tabs + search on the right.
 * Uses explicit navigate() so taps work above the shell dismiss hitlayer.
 */
export function SegmentGlassBar({
  tabs,
  activeId,
  scrolled,
  showBack,
  searchTo,
  ariaLabel,
  backTo,
}: {
  tabs: GlassTab[];
  activeId: string;
  scrolled: boolean;
  showBack: boolean;
  searchTo: string;
  ariaLabel: string;
  backTo: string;
}) {
  const navigate = useNavigate();
  const compact = !showBack;

  function go(to: string) {
    navigate(to);
  }

  return (
    <nav
      className={`segment-topbar segment-topbar--glass${compact ? " segment-topbar--wide" : ""}${
        scrolled ? " is-pinned is-chrome-hidden" : ""
      }`}
      aria-label={ariaLabel}
      aria-hidden={scrolled || undefined}
      data-no-nav-dock
    >
      {showBack ? (
        <span className="segment-topbar__edge segment-topbar__edge--left">
          {scrolled ? (
            <button
              type="button"
              className="segment-topbar__icon-btn segment-topbar__icon-btn--back"
              aria-label="Back"
              data-no-nav-dock
              onClick={(e) => {
                e.stopPropagation();
                go(backTo);
              }}
            >
              ←
            </button>
          ) : (
            <button
              type="button"
              className="segment-topbar__icon-btn segment-topbar__icon-btn--back"
              aria-label="Back"
              data-no-nav-dock
              onClick={(e) => {
                e.stopPropagation();
                go(backTo);
              }}
            >
              ←
            </button>
          )}
        </span>
      ) : null}

      <div className="segment-topbar__cluster" role="tablist" data-no-nav-dock>
        {tabs.map((t) => {
          const active = activeId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-no-nav-dock
              className={`segment-topbar__tab${active ? " is-active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                go(t.to);
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <span className="segment-topbar__edge segment-topbar__edge--right">
        <button
          type="button"
          data-no-nav-dock
          className={`segment-topbar__icon-btn segment-topbar__icon-btn--search${
            activeId === "search" ? " is-active" : ""
          }`}
          aria-label="Search"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            go(searchTo);
          }}
        >
          <IconSearch size={20} />
        </button>
      </span>
    </nav>
  );
}
