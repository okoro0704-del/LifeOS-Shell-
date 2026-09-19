import { useEffect, useId, useRef, useState, type ComponentType, type SVGProps } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { InstalledAppManifest } from "@lifeos/shared";
import {
  IconActivity,
  IconBell,
  IconBook,
  IconExplore,
  IconHome,
  IconLink,
  IconMessage,
  IconReceive,
  IconTicket,
} from "@lifeos/ui";
import { hasDeployedMyBrandOS } from "../lib/mybrandOS";
import { useAuth } from "../hooks/useAuth";
import { triggerWorkspaceHaptic } from "../lib/mobileBridge";
import { setLastSelectedKernel } from "../lib/kernelNavigation";
import { personalLandingPath } from "../lib/personalConnectivity";
import { useWorkspace, type WorkspaceMode } from "../context/WorkspaceContext";
import { useNavigationDock, hasSeenNavDockHint } from "../context/NavigationDockContext";
import {
  personalKernelFromPath,
  personalKernelPath,
  personalNavBase,
  workspaceHomePath,
  type PersonalKernel,
} from "./shell/nav";

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

type Props = {
  apps?: InstalledAppManifest[];
  unread?: number;
};

/**
 * Shared LifeOS command navigation — icons only, transparent green glass.
 * PERSONAL → RIGHT · BUSINESS → LEFT (from activeSpace/mode).
 */
export function LifeOsCommandNavigation({ apps = [], unread = 0 }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode, setMode } = useWorkspace();
  const { expanded, side, open, close } = useNavigationDock();
  const panelId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [spaceOpen, setSpaceOpen] = useState(false);
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const kernel = personalKernelFromPath(path) ?? "main";
  const personalBase = personalNavBase(kernel);
  const showMessaging = hasDeployedMyBrandOS(apps) && path !== "/app/elcom";
  const messagesTo = showMessaging ? "/app/elcom" : "/app/messages";

  useEffect(() => {
    if (!expanded) setSpaceOpen(false);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (spaceOpen) setSpaceOpen(false);
        else close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, close, spaceOpen]);

  function dismiss() {
    setSpaceOpen(false);
    close();
  }

  function goHome() {
    dismiss();
    navigate(mode === "BUSINESS" ? workspaceHomePath("BUSINESS") : `${personalBase}/post`);
  }

  function goExplorePlus() {
    dismiss();
    if (mode === "BUSINESS") {
      navigate("/app/services/explore");
      return;
    }
    navigate(`${personalBase}/plus`);
  }

  function goLearnVerse() {
    dismiss();
    if (mode === "BUSINESS") setMode("PERSONAL");
    navigate(`${personalNavBase(mode === "BUSINESS" ? "main" : kernel)}/learnverse`);
  }

  function goStreamify() {
    dismiss();
    if (mode === "BUSINESS") setMode("PERSONAL");
    navigate(`${personalNavBase(mode === "BUSINESS" ? "main" : kernel)}/streamify`);
  }

  function goKernel(next: PersonalKernel) {
    dismiss();
    void triggerWorkspaceHaptic();
    setMode("PERSONAL");
    setLastSelectedKernel(next, user?.trustId);
    navigate(personalKernelPath(next));
  }

  function switchSpace(next: WorkspaceMode) {
    if (next === mode) {
      dismiss();
      return;
    }
    dismiss();
    void triggerWorkspaceHaptic();
    setMode(next);
    navigate(next === "PERSONAL" ? personalLandingPath(user?.trustId) : workspaceHomePath("BUSINESS"));
  }

  const exploreActive =
    path.endsWith("/plus") || path === "/app/services/explore" || path.startsWith("/app/services/explore/");
  const homeActive =
    mode === "BUSINESS"
      ? path === "/app/business" || path === "/app/business/"
      : /^\/app\/personal(\/(free|offline))?\/(post|reels|products|communities|search)?$/.test(path) ||
        path === "/app/personal" ||
        path === "/app/personal/free" ||
        path === "/app/personal/offline";

  const showHint = !expanded && !hasSeenNavDockHint();

  return (
    <>
      <button
        type="button"
        className="lifeos-cmd-nav__a11y-open"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => open()}
      >
        Open LifeOS navigation
      </button>

      {showHint ? (
        <div className="lifeos-cmd-nav__hint" role="status">
          Double tap to open LifeOS
        </div>
      ) : null}

      {expanded ? (
        <button
          type="button"
          className="lifeos-cmd-nav__hitlayer"
          aria-label="Close navigation"
          data-no-nav-dock
          onClick={() => dismiss()}
        />
      ) : null}

      <div
        className={`lifeos-cmd-nav lifeos-cmd-nav--${side}${expanded ? " is-open" : ""}`}
        data-nav-dock={expanded ? "expanded" : "clean"}
        data-nav-side={side}
        data-no-nav-dock
        aria-hidden={!expanded}
      >
        <nav
          id={panelId}
          className="lifeos-cmd-nav__stack"
          aria-label="LifeOS command navigation"
          hidden={!expanded}
        >
          <IconLinkBtn
            to="/app/notifications"
            label="Notifications"
            Icon={IconBell}
            active={path.startsWith("/app/notifications")}
            onNavigate={dismiss}
            badge={unread}
          />
          <IconLinkBtn
            to="/app/live"
            label="Live"
            Icon={IconActivity}
            active={path.startsWith("/app/live")}
            onNavigate={dismiss}
            tone="live"
          />
          <IconLinkBtn
            to={messagesTo}
            label="Messaging"
            Icon={IconMessage}
            active={path === messagesTo || path.startsWith(`${messagesTo}/`)}
            onNavigate={dismiss}
          />

          <span className="lifeos-cmd-nav__gap" aria-hidden />

          <IconBtn
            label="Free"
            Icon={IconTicket}
            active={kernel === "free"}
            pressed={kernel === "free"}
            onClick={() => goKernel("free")}
          />
          <IconBtn
            label="Offline"
            Icon={IconReceive}
            active={kernel === "offline"}
            pressed={kernel === "offline"}
            onClick={() => goKernel("offline")}
          />

          <span className="lifeos-cmd-nav__gap" aria-hidden />

          <IconBtn label="Streamify" Icon={StreamGlyph} active={path.includes("/streamify")} onClick={goStreamify} />
          <IconBtn label="LearnVerse" Icon={IconBook} active={path.includes("/learnverse")} onClick={goLearnVerse} />
          <IconBtn label="Explore+" Icon={IconExplore} active={exploreActive} onClick={goExplorePlus} />
          <IconBtn label="Home" Icon={IconHome} active={homeActive} onClick={goHome} />

          <span className="lifeos-cmd-nav__gap" aria-hidden />

          <div className="lifeos-cmd-nav__space">
            <IconBtn
              label="Space Switcher"
              Icon={IconLink}
              active={spaceOpen}
              pressed={spaceOpen}
              onClick={() => setSpaceOpen((v) => !v)}
            />
            {spaceOpen ? (
              <ul className="lifeos-cmd-nav__space-list" role="listbox" aria-label="Spaces">
                <li role="option" aria-selected={mode === "PERSONAL"}>
                  <IconBtn
                    label="Personal Space"
                    Icon={IconHome}
                    active={mode === "PERSONAL"}
                    onClick={() => switchSpace("PERSONAL")}
                  />
                </li>
                <li role="option" aria-selected={mode === "BUSINESS"}>
                  <IconBtn
                    label="Business Space"
                    Icon={IconExplore}
                    active={mode === "BUSINESS"}
                    onClick={() => switchSpace("BUSINESS")}
                  />
                </li>
              </ul>
            ) : null}
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className="lifeos-cmd-nav__close"
            aria-label="Close menu"
            title="Close"
            onClick={() => dismiss()}
          >
            ×
          </button>
        </nav>
      </div>
    </>
  );
}

function IconLinkBtn({
  to,
  label,
  Icon,
  active,
  onNavigate,
  badge,
  tone,
}: {
  to: string;
  label: string;
  Icon: IconComp;
  active?: boolean;
  onNavigate: () => void;
  badge?: number;
  tone?: "live";
}) {
  return (
    <Link
      to={to}
      className={`lifeos-cmd-nav__icon${active ? " is-active" : ""}${tone === "live" ? " lifeos-cmd-nav__icon--live" : ""}`}
      aria-label={badge && badge > 0 ? `${label}, ${badge} unread` : label}
      aria-current={active ? "page" : undefined}
      title={label}
      onClick={onNavigate}
    >
      <Icon size={20} />
      {badge && badge > 0 ? <span className="lifeos-cmd-nav__badge" aria-hidden /> : null}
    </Link>
  );
}

function IconBtn({
  label,
  Icon,
  active,
  pressed,
  onClick,
}: {
  label: string;
  Icon: IconComp;
  active?: boolean;
  pressed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`lifeos-cmd-nav__icon${active ? " is-active" : ""}`}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
    >
      <Icon size={20} />
    </button>
  );
}

function StreamGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 6.5v11l9-5.5-9-5.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M4 8.5c2-1 4-1 6 0M4 15.5c2 1 4 1 6 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
