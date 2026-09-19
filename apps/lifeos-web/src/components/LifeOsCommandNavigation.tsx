import { useEffect, useId, useRef, useState, type ComponentType, type SVGProps } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { InstalledAppManifest } from "@lifeos/shared";
import { IconBell, IconBook, IconExplore, IconHome, IconMessage } from "@lifeos/ui";
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
 * ONE shared LifeOS command navigation.
 * CLEAN by default. Double-tap summons transparent gold controls over content.
 * PERSONAL → enters from LEFT. BUSINESS → enters from RIGHT (activeSpace/mode).
 * Stack order is defined in the rendered JSX (top → bottom).
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

  /** Explore+ → Personal Plus discover, or Business services explore. */
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
    // CLOSE → SWITCH → CLEAN (do not slide an open dock across).
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
          Double tap anywhere to open LifeOS
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
          <CmdRow
            to="/app/notifications"
            label="Notification"
            Icon={IconBell}
            active={path.startsWith("/app/notifications")}
            onNavigate={dismiss}
            badge={unread}
          />
          <CmdRow
            to="/app/live"
            label="Live"
            Icon={LiveGlyph}
            active={path.startsWith("/app/live")}
            onNavigate={dismiss}
            tone="live"
          />
          <CmdRow
            to={messagesTo}
            label="Messaging"
            Icon={IconMessage}
            active={path === messagesTo || path.startsWith(`${messagesTo}/`)}
            onNavigate={dismiss}
          />

          <span className="lifeos-cmd-nav__gap" aria-hidden />

          <CmdButton
            label="Free"
            Icon={FreeGlyph}
            active={kernel === "free"}
            pressed={kernel === "free"}
            onClick={() => goKernel("free")}
          />
          <CmdButton
            label="Offline"
            Icon={OfflineGlyph}
            active={kernel === "offline"}
            pressed={kernel === "offline"}
            onClick={() => goKernel("offline")}
          />

          <span className="lifeos-cmd-nav__gap" aria-hidden />

          <CmdButton
            label="Streamify"
            Icon={IconExplore}
            active={path.includes("/streamify")}
            onClick={goStreamify}
          />
          <CmdButton
            label="LearnVerse"
            Icon={IconBook}
            active={path.includes("/learnverse")}
            onClick={goLearnVerse}
          />
          <CmdButton
            label="Explore+"
            Icon={ExplorePlusGlyph}
            active={exploreActive}
            onClick={goExplorePlus}
          />
          <CmdButton label="Home" Icon={IconHome} active={homeActive} onClick={goHome} />

          <span className="lifeos-cmd-nav__gap" aria-hidden />

          <div className="lifeos-cmd-nav__space">
            <button
              type="button"
              className={`lifeos-cmd-nav__pill lifeos-cmd-nav__pill--space${spaceOpen ? " is-active" : ""}`}
              aria-expanded={spaceOpen}
              aria-haspopup="listbox"
              onClick={() => setSpaceOpen((v) => !v)}
            >
              <span className="lifeos-cmd-nav__ico" aria-hidden>
                {mode === "PERSONAL" ? "◎" : "◈"}
              </span>
              <span>Space Switcher</span>
            </button>
            {spaceOpen ? (
              <ul className="lifeos-cmd-nav__space-list" role="listbox" aria-label="Spaces">
                <li role="option" aria-selected={mode === "PERSONAL"}>
                  <button
                    type="button"
                    className={`lifeos-cmd-nav__space-opt${mode === "PERSONAL" ? " is-active" : ""}`}
                    onClick={() => switchSpace("PERSONAL")}
                  >
                    Personal Space
                  </button>
                </li>
                <li role="option" aria-selected={mode === "BUSINESS"}>
                  <button
                    type="button"
                    className={`lifeos-cmd-nav__space-opt${mode === "BUSINESS" ? " is-active" : ""}`}
                    onClick={() => switchSpace("BUSINESS")}
                  >
                    Business Space
                  </button>
                </li>
              </ul>
            ) : null}
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className="lifeos-cmd-nav__close"
            aria-label="Close menu"
            onClick={() => dismiss()}
          >
            ×
          </button>
        </nav>
      </div>
    </>
  );
}

function CmdRow({
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
      className={`lifeos-cmd-nav__pill${active ? " is-active" : ""}${tone === "live" ? " lifeos-cmd-nav__pill--live" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      <span className="lifeos-cmd-nav__ico" aria-hidden>
        <Icon size={18} />
      </span>
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span className="lifeos-cmd-nav__count" aria-label={`${badge} unread`}>
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function CmdButton({
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
      className={`lifeos-cmd-nav__pill${active ? " is-active" : ""}`}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <span className="lifeos-cmd-nav__ico" aria-hidden>
        <Icon size={18} />
      </span>
      <span>{label}</span>
    </button>
  );
}

function LiveGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

function OfflineGlyph({ size = 18 }: { size?: number }) {
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

function FreeGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function ExplorePlusGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
