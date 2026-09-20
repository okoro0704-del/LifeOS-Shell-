import { useLocation, useNavigate } from "react-router-dom";
import { IconSearch } from "@lifeos/ui";
import { useNavigationDock } from "../context/NavigationDockContext";

export type GlassTab = {
  to: string;
  end?: boolean;
  label: string;
  id: string;
};

/**
 * Home section rail: wide transparent tabs + search on the right.
 * Uses explicit navigate() so taps work above the shell dismiss hitlayer.
 * Successful section change → confirmSelection (~1s hold), not immediate hide.
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
  const location = useLocation();
  const { shellControlsVisible, confirmSelection, noteShellActivity } = useNavigationDock();
  const compact = !showBack;

  function goSection(to: string) {
    const cur = location.pathname.replace(/\/+$/, "") || "/";
    const next = to.replace(/\/+$/, "") || "/";
    navigate(to);
    if (shellControlsVisible && cur !== next) {
      confirmSelection();
    } else if (shellControlsVisible) {
      noteShellActivity();
    }
  }

  return (
    <nav
      className={`segment-topbar segment-topbar--glass${compact ? " segment-topbar--wide" : ""}${
        scrolled ? " is-pinned is-chrome-hidden" : ""
      }`}
      aria-label={ariaLabel}
      aria-hidden={scrolled || undefined}
      data-no-nav-dock
      onPointerDown={() => {
        if (shellControlsVisible) noteShellActivity();
      }}
    >
      {showBack ? (
        <span className="segment-topbar__edge segment-topbar__edge--left">
          <button
            type="button"
            className="segment-topbar__icon-btn segment-topbar__icon-btn--back"
            aria-label="Back"
            data-no-nav-dock
            onClick={(e) => {
              e.stopPropagation();
              goSection(backTo);
            }}
          >
            ←
          </button>
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
                goSection(t.to);
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
            goSection(searchTo);
          }}
        >
          <IconSearch size={20} />
        </button>
      </span>
    </nav>
  );
}
