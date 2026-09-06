import { NavLink } from "react-router-dom";

export type SegmentTab = {
  to: string;
  end?: boolean;
  label: string;
};

export function SegmentTopBar({ tabs, ariaLabel }: { tabs: SegmentTab[]; ariaLabel: string }) {
  return (
    <nav className="segment-topbar" aria-label={ariaLabel}>
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => `segment-topbar__tab${isActive ? " is-active" : ""}`}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
