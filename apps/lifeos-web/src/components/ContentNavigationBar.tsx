import { Link, useLocation, useNavigate } from "react-router-dom";
import type { InstalledAppManifest } from "@lifeos/shared";
import { hasDeployedMyBrandOS } from "../lib/mybrandOS";
import { useChromeVisibility } from "../context/ChromeVisibilityContext";
import {
  personalKernelFromPath,
  personalKernelPath,
  type PersonalKernel,
} from "./shell/nav";
import { setLastSelectedKernel } from "../lib/kernelNavigation";
import { useAuth } from "../hooks/useAuth";
import { triggerWorkspaceHaptic } from "../lib/mobileBridge";

/**
 * Content navigation: FREE | OFFLINE | LIVE | notifications | messages.
 * Shell mode: floats above primary bottom nav.
 * Content mode (immersive Post/Reels + chrome hidden): docks as the bottom bar.
 * LIVE opens the existing Live surface (connected experience) — not a new kernel.
 */
export function ContentNavigationBar({ apps = [] }: { apps?: InstalledAppManifest[] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chromeHidden } = useChromeVisibility();
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const kernel = personalKernelFromPath(path) ?? "main";
  const showMessaging = hasDeployedMyBrandOS(apps) && path !== "/app/elcom";

  const immersiveHome =
    /^\/app\/personal(\/(free|offline))?\/(post|reels)$/.test(path) ||
    path === "/app/personal" ||
    path === "/app/personal/free" ||
    path === "/app/personal/offline";
  const docked = chromeHidden && immersiveHome;

  function goKernel(next: PersonalKernel) {
    if (next === kernel) return;
    void triggerWorkspaceHaptic();
    setLastSelectedKernel(next, user?.trustId);
    navigate(personalKernelPath(next));
  }

  return (
    <nav
      className={`content-nav-bar${docked ? " is-docked" : ""}`}
      role="navigation"
      aria-label="Content navigation"
      data-content-nav={docked ? "docked" : "shell"}
    >
      <button
        type="button"
        className={`content-nav-bar__chip${kernel === "free" ? " is-active" : ""}`}
        aria-label="Free kernel"
        aria-pressed={kernel === "free"}
        onClick={() => goKernel("free")}
      >
        FREE
      </button>

      <button
        type="button"
        className={`content-nav-bar__chip${kernel === "offline" ? " is-active" : ""}`}
        aria-label="Offline kernel"
        aria-pressed={kernel === "offline"}
        onClick={() => goKernel("offline")}
      >
        OFFLINE
      </button>

      <Link
        to="/app/live"
        className="content-nav-bar__live"
        aria-label="Live streams"
        aria-current={path.startsWith("/app/live") ? "page" : undefined}
      >
        <span className="live-float__dot" aria-hidden />
        <span>LIVE</span>
      </Link>

      <Link
        to="/app/notifications"
        className="content-nav-bar__icon"
        aria-label="Notifications"
      >
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
        <Link to="/app/elcom" className="content-nav-bar__icon content-nav-bar__icon--msg" aria-label="Messages via ElfCom">
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
        <span className="content-nav-bar__icon content-nav-bar__icon--spacer" aria-hidden />
      )}
    </nav>
  );
}
