import { NavLink, useNavigate } from "react-router-dom";

export type GlassTab = {
  to: string;
  end?: boolean;
  label: string;
  id: string;
};

/**
 * Four clustered tabs with icon search on the right.
 * Optional back icon on the left (not used on Home).
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
      className={`segment-topbar segment-topbar--glass${scrolled ? " is-pinned" : ""}`}
      aria-label={ariaLabel}
    >
      <span className="segment-topbar__edge segment-topbar__edge--left">
        {showBack && scrolled ? (
          <button
            type="button"
            className="segment-topbar__icon-btn"
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
        <NavLink to={searchTo} className="segment-topbar__icon-btn" aria-label="Search">
          ⌕
        </NavLink>
      </span>
    </nav>
  );
}
