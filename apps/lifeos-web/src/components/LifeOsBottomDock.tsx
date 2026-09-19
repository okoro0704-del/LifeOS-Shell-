import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import type { InstalledAppManifest } from "@lifeos/shared";
import { hasDeployedMyBrandOS } from "../lib/mybrandOS";
import { useChromeVisibility } from "../context/ChromeVisibilityContext";
import {
  personalKernelFromPath,
  personalKernelPath,
  personalNavBase,
  workspaceHomePath,
  type PersonalKernel,
  type ShellNavItem,
} from "./shell/nav";
import { setLastSelectedKernel } from "../lib/kernelNavigation";
import { useAuth } from "../hooks/useAuth";
import { triggerWorkspaceHaptic } from "../lib/mobileBridge";
import { WorkspaceToggle } from "./shell/WorkspaceToggle";
import { useWorkspace, type WorkspaceMode } from "../context/WorkspaceContext";

type Props = {
  apps?: InstalledAppManifest[];
  tabs: ShellNavItem[];
  onExplore: boolean;
  personalKernel: PersonalKernel;
  onModeChange?: (mode: WorkspaceMode) => void;
};

/**
 * ONE Personal bottom-navigation controller.
 * Shell: primary Home/LearnVerse/+/Streamify/Space + side dock (notif / LIVE / messages).
 * Content: FREE / OFFLINE / LIVE / notif / messages docks as the bottom bar; primary yields.
 * Prototype URL was ChatGPT-gated (401); behavior follows LifeOS ASCII + side-dock intent.
 */
export function LifeOsBottomDock({
  apps = [],
  tabs,
  onExplore,
  personalKernel,
  onModeChange,
}: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode } = useWorkspace();
  const { chromeHidden } = useChromeVisibility();
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const kernel = personalKernelFromPath(path) ?? personalKernel;
  const personalBase = personalNavBase(kernel);
  const showMessaging = hasDeployedMyBrandOS(apps) && path !== "/app/elcom";

  const immersiveHome =
    /^\/app\/personal(\/(free|offline))?\/(post|reels)$/.test(path) ||
    path === "/app/personal" ||
    path === "/app/personal/free" ||
    path === "/app/personal/offline";
  const contentMode = chromeHidden && immersiveHome;

  function goKernel(next: PersonalKernel) {
    if (next === kernel) return;
    void triggerWorkspaceHaptic();
    setLastSelectedKernel(next, user?.trustId);
    navigate(personalKernelPath(next));
  }

  function tabClass(t: ShellNavItem, isActive: boolean) {
    const prefixHit = t.matchPrefixes?.some((p) => path === p || path.startsWith(`${p}/`));
    return `bottom-item${isActive || prefixHit ? " active" : ""}`;
  }

  return (
    <div
      className={`lifeos-dock${contentMode ? " is-content" : " is-shell"}`}
      data-bottom-nav="lifeos-dock"
      data-mode={contentMode ? "content" : "shell"}
      style={{ ["--lifeos-dock-reserve" as string]: "var(--nav-h)" }}
    >
      <nav className="lifeos-dock__content" aria-label="Content navigation">
        <button
          type="button"
          className={`lifeos-dock__chip${kernel === "free" ? " is-active" : ""}`}
          aria-label="Free kernel"
          aria-pressed={kernel === "free"}
          tabIndex={contentMode ? 0 : -1}
          onClick={() => goKernel("free")}
        >
          FREE
        </button>
        <button
          type="button"
          className={`lifeos-dock__chip${kernel === "offline" ? " is-active" : ""}`}
          aria-label="Offline kernel"
          aria-pressed={kernel === "offline"}
          tabIndex={contentMode ? 0 : -1}
          onClick={() => goKernel("offline")}
        >
          OFFLINE
        </button>
        <Link
          to="/app/live"
          className="lifeos-dock__live"
          aria-label="Live streams"
          aria-current={path.startsWith("/app/live") ? "page" : undefined}
        >
          <span className="live-float__dot" aria-hidden />
          <span>LIVE</span>
        </Link>
        <Link to="/app/notifications" className="lifeos-dock__icon" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 9.5a6 6 0 0 1 12 0v3.2l1.4 2.1H4.6L6 12.7V9.5z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
            <path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </Link>
        {showMessaging ? (
          <Link to="/app/elcom" className="lifeos-dock__icon lifeos-dock__icon--msg" aria-label="Messages via ElfCom">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 3.5V6.5z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        ) : (
          <span className="lifeos-dock__icon lifeos-dock__icon--spacer" aria-hidden />
        )}
      </nav>

      <nav
        className={`lifeos-dock__shell bottom-nav bottom-nav--fab bottom-nav--float${
          personalKernel !== "main" ? ` bottom-nav--kernel-${personalKernel}` : ""
        }`}
        aria-label="Primary"
        aria-hidden={contentMode}
      >
        {tabs.slice(0, 2).map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            tabIndex={contentMode ? -1 : 0}
            className={({ isActive }) => tabClass(t, isActive)}
          >
            <span className="bottom-icon" aria-hidden>
              <t.Icon size={22} />
            </span>
            <span>{t.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`bottom-fab${onExplore ? " active" : ""}`}
          aria-label={onExplore ? "Close Plus discover" : "Open Plus — random content"}
          aria-pressed={onExplore}
          tabIndex={contentMode ? -1 : 0}
          onClick={() => {
            if (mode === "PERSONAL") {
              if (onExplore) navigate(`${personalBase}/post`);
              else navigate(`${personalBase}/plus`);
              return;
            }
            if (onExplore) navigate(workspaceHomePath(mode));
            else navigate("/app/services/explore");
          }}
        >
          <span aria-hidden>{onExplore ? "×" : "+"}</span>
        </button>
        {tabs.slice(2, 3).map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            tabIndex={contentMode ? -1 : 0}
            className={({ isActive }) => tabClass(t, isActive)}
          >
            <span className="bottom-icon" aria-hidden>
              <t.Icon size={22} />
            </span>
            <span>{t.label}</span>
          </NavLink>
        ))}
        <WorkspaceToggle variant="space" onModeChange={onModeChange} />
      </nav>
    </div>
  );
}
