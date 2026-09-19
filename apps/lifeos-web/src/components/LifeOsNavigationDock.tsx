import { useEffect, useId, useRef, type ComponentType, type SVGProps } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import type { InstalledAppManifest } from "@lifeos/shared";
import { IconBell, IconMessage } from "@lifeos/ui";
import { hasDeployedMyBrandOS } from "../lib/mybrandOS";
import { useAuth } from "../hooks/useAuth";
import { triggerWorkspaceHaptic } from "../lib/mobileBridge";
import { setLastSelectedKernel } from "../lib/kernelNavigation";
import { useWorkspace, type WorkspaceMode } from "../context/WorkspaceContext";
import { useNavigationDock, hasSeenNavDockHint } from "../context/NavigationDockContext";
import { useChromeVisibility } from "../context/ChromeVisibilityContext";
import {
  personalKernelFromPath,
  personalKernelPath,
  personalNavBase,
  workspaceHomePath,
  type PersonalKernel,
  type ShellNavItem,
} from "./shell/nav";

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

type Props = {
  apps?: InstalledAppManifest[];
  tabs: ShellNavItem[];
  onExplore: boolean;
  personalKernel: PersonalKernel;
  onModeChange?: (mode: WorkspaceMode) => void;
  unread?: number;
};

function LiveIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

function OfflineIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12h4l2-6 4 12 2-6h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FreeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

/**
 * ONE Personal navigation controller: clean → compact rail → expanded right dock.
 * Double-tap (eligible surface) expands; selection / backdrop / × / Escape closes.
 */
export function LifeOsNavigationDock({
  apps = [],
  tabs,
  onExplore,
  personalKernel,
  onModeChange,
  unread = 0,
}: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode, setMode } = useWorkspace();
  const { visual, expanded, open, close, preferCompact, setPreferCompact } = useNavigationDock();
  const { chromeHidden } = useChromeVisibility();
  const panelId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const kernel = personalKernelFromPath(path) ?? personalKernel;
  const personalBase = personalNavBase(kernel);
  const showMessaging = hasDeployedMyBrandOS(apps) && path !== "/app/elcom";
  const messagesTo = showMessaging ? "/app/elcom" : "/app/messages";

  // While browsing immersive content, prefer compact rail for discoverability.
  useEffect(() => {
    if (chromeHidden && !preferCompact) setPreferCompact(true);
  }, [chromeHidden, preferCompact, setPreferCompact]);

  useEffect(() => {
    if (!expanded) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, close]);

  function goKernel(next: PersonalKernel) {
    close();
    if (next === kernel) return;
    void triggerWorkspaceHaptic();
    setLastSelectedKernel(next, user?.trustId);
    navigate(personalKernelPath(next));
  }

  function goCreate() {
    close();
    if (onExplore) navigate(`${personalBase}/post`);
    else navigate(`${personalBase}/plus`);
  }

  function goSpace() {
    close();
    void triggerWorkspaceHaptic();
    const next: WorkspaceMode = mode === "PERSONAL" ? "BUSINESS" : "PERSONAL";
    setMode(next);
    onModeChange?.(next);
    navigate(next === "PERSONAL" ? personalKernelPath(kernel) : workspaceHomePath(next));
  }

  function afterNav() {
    close();
  }

  function isTabActive(t: ShellNavItem) {
    const prefixHit = t.matchPrefixes?.some((p) => path === p || path.startsWith(`${p}/`));
    if (t.end) return path === t.to || prefixHit;
    return path === t.to || path.startsWith(`${t.to}/`) || Boolean(prefixHit);
  }

  const showHint = visual === "clean" && !hasSeenNavDockHint();
  const showRail = visual === "compact" || visual === "expanded";

  return (
    <>
      {/* Accessible open control — no permanent visual clutter */}
      <button
        type="button"
        className="lifeos-nav-dock__a11y-open"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => open()}
      >
        Open navigation menu
      </button>

      {showHint ? (
        <div className="lifeos-nav-dock__hint" role="status">
          Double tap anywhere to open menu
        </div>
      ) : null}

      {expanded ? (
        <button
          type="button"
          className="lifeos-nav-dock__backdrop"
          aria-label="Close navigation"
          data-no-nav-dock
          onClick={() => close()}
        />
      ) : null}

      <div
        className={`lifeos-nav-dock lifeos-nav-dock--${visual}`}
        data-nav-dock={visual}
        data-no-nav-dock
      >
        {/* Compact rail — same controller, icon-only */}
        {showRail && !expanded ? (
          <nav className="lifeos-nav-dock__rail" aria-label="Quick navigation">
            {tabs.slice(0, 2).map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={() => `lifeos-nav-dock__rail-btn${isTabActive(t) ? " is-active" : ""}`}
                aria-label={t.label}
                onClick={() => afterNav()}
              >
                <t.Icon size={18} />
              </NavLink>
            ))}
            <button
              type="button"
              className={`lifeos-nav-dock__rail-btn lifeos-nav-dock__rail-btn--create${onExplore ? " is-active" : ""}`}
              aria-label="Create"
              onClick={goCreate}
            >
              <span aria-hidden>+</span>
            </button>
            {tabs.slice(2, 3).map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={() => `lifeos-nav-dock__rail-btn${isTabActive(t) ? " is-active" : ""}`}
                aria-label={t.label}
                onClick={() => afterNav()}
              >
                <t.Icon size={18} />
              </NavLink>
            ))}
            <button
              type="button"
              className="lifeos-nav-dock__rail-btn"
              aria-label="Space"
              onClick={goSpace}
            >
              <span aria-hidden>{mode === "PERSONAL" ? "◎" : "◈"}</span>
            </button>
            <span className="lifeos-nav-dock__rail-sep" aria-hidden />
            <Link to="/app/notifications" className="lifeos-nav-dock__rail-btn" aria-label="Notifications" onClick={afterNav}>
              <IconBell size={18} />
              {unread > 0 ? <span className="lifeos-nav-dock__badge" /> : null}
            </Link>
            <Link to={messagesTo} className="lifeos-nav-dock__rail-btn" aria-label="Messages" onClick={afterNav}>
              <IconMessage size={18} />
            </Link>
            <Link
              to="/app/live"
              className="lifeos-nav-dock__rail-btn lifeos-nav-dock__rail-btn--live"
              aria-label="Live"
              onClick={afterNav}
            >
              <LiveIcon size={16} />
            </Link>
            <button
              type="button"
              className={`lifeos-nav-dock__rail-btn${kernel === "offline" ? " is-active" : ""}`}
              aria-label="Offline kernel"
              aria-pressed={kernel === "offline"}
              onClick={() => goKernel("offline")}
            >
              <OfflineIcon size={16} />
            </button>
            <button
              type="button"
              className={`lifeos-nav-dock__rail-btn${kernel === "free" ? " is-active" : ""}`}
              aria-label="Free kernel"
              aria-pressed={kernel === "free"}
              onClick={() => goKernel("free")}
            >
              <FreeIcon size={16} />
            </button>
            <button
              type="button"
              className="lifeos-nav-dock__rail-btn lifeos-nav-dock__rail-btn--expand"
              aria-label="Expand navigation menu"
              onClick={() => open()}
            >
              ☰
            </button>
          </nav>
        ) : null}

        {/* Expanded labeled dock */}
        <nav
          id={panelId}
          className="lifeos-nav-dock__panel"
          aria-label="LifeOS navigation"
          aria-hidden={!expanded}
          hidden={!expanded}
        >
          <div className="lifeos-nav-dock__group" role="group" aria-label="Primary">
            {tabs.slice(0, 2).map((t) => (
              <DockRow
                key={t.to}
                to={t.to}
                end={t.end}
                label={t.label}
                Icon={t.Icon}
                active={isTabActive(t)}
                onNavigate={afterNav}
              />
            ))}
            <button
              type="button"
              className={`lifeos-nav-dock__row lifeos-nav-dock__row--create${onExplore ? " is-active" : ""}`}
              onClick={goCreate}
            >
              <span className="lifeos-nav-dock__ico" aria-hidden>
                +
              </span>
              <span>Create</span>
            </button>
            {tabs.slice(2, 3).map((t) => (
              <DockRow
                key={t.to}
                to={t.to}
                end={t.end}
                label={t.label}
                Icon={t.Icon}
                active={isTabActive(t)}
                onNavigate={afterNav}
              />
            ))}
            <button type="button" className="lifeos-nav-dock__row" onClick={goSpace}>
              <span className="lifeos-nav-dock__ico" aria-hidden>
                {mode === "PERSONAL" ? "◎" : "◈"}
              </span>
              <span>Space</span>
            </button>
          </div>

          <div className="lifeos-nav-dock__divider" role="separator" />

          <div className="lifeos-nav-dock__group" role="group" aria-label="Experience">
            <DockRow
              to="/app/notifications"
              label="Notifications"
              Icon={IconBell}
              active={path.startsWith("/app/notifications")}
              onNavigate={afterNav}
              badge={unread}
            />
            <DockRow
              to={messagesTo}
              label="Messages"
              Icon={IconMessage}
              active={path === messagesTo || path.startsWith(`${messagesTo}/`)}
              onNavigate={afterNav}
            />
            <Link
              to="/app/live"
              className={`lifeos-nav-dock__row lifeos-nav-dock__row--live${
                path.startsWith("/app/live") ? " is-active" : ""
              }`}
              onClick={afterNav}
            >
              <span className="lifeos-nav-dock__ico" aria-hidden>
                <span className="live-float__dot" />
              </span>
              <span>Live</span>
            </Link>
            <button
              type="button"
              className={`lifeos-nav-dock__row${kernel === "offline" ? " is-active" : ""}`}
              aria-pressed={kernel === "offline"}
              onClick={() => goKernel("offline")}
            >
              <span className="lifeos-nav-dock__ico" aria-hidden>
                <OfflineIcon />
              </span>
              <span>Offline</span>
            </button>
            <button
              type="button"
              className={`lifeos-nav-dock__row${kernel === "free" ? " is-active" : ""}`}
              aria-pressed={kernel === "free"}
              onClick={() => goKernel("free")}
            >
              <span className="lifeos-nav-dock__ico" aria-hidden>
                <FreeIcon />
              </span>
              <span>Free</span>
            </button>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className="lifeos-nav-dock__close"
            aria-label="Close menu"
            onClick={() => close()}
          >
            ×
          </button>
        </nav>
      </div>
    </>
  );
}

function DockRow({
  to,
  end,
  label,
  Icon,
  active,
  onNavigate,
  badge,
}: {
  to: string;
  end?: boolean;
  label: string;
  Icon: IconComp;
  active?: boolean;
  onNavigate: () => void;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={() => `lifeos-nav-dock__row${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      <span className="lifeos-nav-dock__ico" aria-hidden>
        <Icon size={20} />
      </span>
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span className="lifeos-nav-dock__count" aria-label={`${badge} unread`}>
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </NavLink>
  );
}
