import { Link, useLocation } from "react-router-dom";
import type { InstalledAppManifest } from "@lifeos/shared";
import { hasDeployedMyBrandOS } from "../lib/mybrandOS";
import { useChromeVisibility } from "../context/ChromeVisibilityContext";

/**
 * Persistent Personal dock above bottom nav:
 * Notifications (left) · LIVE (center) · Messaging (right, mybrandOS / PWA owners only).
 * Messaging opens ElfCom consumer surface — LifeOS does not own the messaging backend.
 */
export function LiveFloat({ apps = [] }: { apps?: InstalledAppManifest[] }) {
  const location = useLocation();
  const { chromeHidden } = useChromeVisibility();
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const showMessaging = hasDeployedMyBrandOS(apps) && path !== "/app/elcom";

  return (
    <div
      className={`live-dock${chromeHidden ? " is-chrome-hidden" : ""}`}
      role="navigation"
      aria-label="Live and alerts"
    >
      <Link to="/app/notifications" className="live-dock__btn live-dock__btn--side" aria-label="Notifications">
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

      <Link to="/app/live" className="live-float" aria-label="Live streams">
        <span className="live-float__dot" aria-hidden />
        <span>LIVE</span>
      </Link>

      {showMessaging ? (
        <Link to="/app/elcom" className="live-dock__btn live-dock__btn--side live-dock__btn--msg" aria-label="Messages via ElfCom">
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
        <span className="live-dock__btn live-dock__btn--side live-dock__btn--spacer" aria-hidden />
      )}
    </div>
  );
}
