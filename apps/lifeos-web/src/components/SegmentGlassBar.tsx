import { NavLink, useNavigate } from "react-router-dom";
import { IconSearch } from "@lifeos/ui";

export type GlassTab = {
  to: string;
  end?: boolean;
  label: string;
  id: string;
};

/**
 * Home section rail: wide transparent tabs + search on the right.
 * Selected tab keeps its accent wash; no full-header pill/plate.
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

  return (
    <nav
      className={`segment-topbar segment-topbar--glass${compact ? " segment-topbar--wide" : ""}${
        scrolled ? " is-pinned is-chrome-hidden" : ""
      }`}
      aria-label={ariaLabel}
      aria-hidden={scrolled}
    >
      {showBack ? (
        <span className="segment-topbar__edge segment-topbar__edge--left">
          {scrolled ? (
            <button
              type="button"
              className="segment-topbar__icon-btn segment-topbar__icon-btn--back"
              aria-label="Back"
              onClick={() => navigate(backTo)}
            >
              ←
            </button>
          ) : (
            <span className="segment-topbar__spacer" aria-hidden />
          )}
        </span>
      ) : null}

      <div className="segment-topbar__cluster" role="presentation" data-no-nav-dock>
        {tabs.map((t) => (
          <NavLink
            key={t.id}
            to={t.to}
            end={t.end}
            data-no-nav-dock
            className={({ isActive }) =>
              `segment-topbar__tab${isActive || activeId === t.id ? " is-active" : ""}`
            }
            onClick={(e) => {
              // Keep shell chrome usable — do not let the transparent hitlayer steal the tap.
              e.stopPropagation();
            }}
          >
            {t.label}
          </NavLink>
        ))}
      </div>

      <span className="segment-topbar__edge segment-topbar__edge--right">
        <NavLink
          to={searchTo}
          data-no-nav-dock
          className="segment-topbar__icon-btn segment-topbar__icon-btn--search"
          aria-label="Search"
          onClick={(e) => e.stopPropagation()}
        >
          <IconSearch size={20} />
        </NavLink>
      </span>
    </nav>
  );
}
