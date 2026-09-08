import { NavLink, useNavigate } from "react-router-dom";
import { IconSearch } from "@lifeos/ui";

export type GlassTab = {
  to: string;
  end?: boolean;
  label: string;
  id: string;
};

/**
 * Pill-clustered tabs (bottom-nav shape) with search outside on the right.
 * Optional back icon on the left when scrolled (not used on Home).
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

  return (
    <nav
      className={`segment-topbar segment-topbar--glass${scrolled ? " is-pinned is-chrome-hidden" : ""}`}
      aria-label={ariaLabel}
      aria-hidden={scrolled}
    >
      <span className="segment-topbar__edge segment-topbar__edge--left">
        {showBack && scrolled ? (
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

      <div className="segment-topbar__cluster" role="presentation">
        {tabs.map((t) => (
          <NavLink
            key={t.id}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `segment-topbar__tab${isActive || activeId === t.id ? " is-active" : ""}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>

      <span className="segment-topbar__edge segment-topbar__edge--right">
        <NavLink
          to={searchTo}
          className="segment-topbar__icon-btn segment-topbar__icon-btn--search"
          aria-label="Search"
        >
          <IconSearch size={20} />
        </NavLink>
      </span>
    </nav>
  );
}
