import { useEffect, useId, useRef, type ComponentType, type SVGProps } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { InstalledAppManifest } from "@lifeos/shared";
import {
  Avatar,
  IconActivity,
  IconBell,
  IconBook,
  IconExplore,
  IconHome,
  IconMessage,
  IconProfile,
  IconReceive,
  IconTicket,
} from "@lifeos/ui";
import { hasDeployedMyBrandOS } from "../lib/mybrandOS";
import { useAuth } from "../hooks/useAuth";
import { triggerWorkspaceHaptic } from "../lib/mobileBridge";
import { setLastSelectedKernel } from "../lib/kernelNavigation";
import { personalLandingPath } from "../lib/personalConnectivity";
import { useWorkspace, type WorkspaceMode } from "../context/WorkspaceContext";
import { useNavigationDock } from "../context/NavigationDockContext";
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
 * Offline/Main/Free kernel bar is Personal-only.
 */
export function LifeOsCommandNavigation({ apps = [], unread = 0 }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode, setMode, activeBusinessId } = useWorkspace();
  const { expanded, side, close, toggle } = useNavigationDock();
  const panelId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const kernel = personalKernelFromPath(path) ?? "main";
  const personalBase = personalNavBase(kernel);
  const showMessaging = hasDeployedMyBrandOS(apps) && path !== "/app/elcom";
  const messagesTo = showMessaging ? "/app/elcom" : "/app/messages";

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

  function dismiss() {
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

  /** Offline | Main | Free — Personal kernels only; close shell; skip remount when current. */
  function selectKernel(next: PersonalKernel) {
    if (next === kernel && mode === "PERSONAL") {
      dismiss();
      return;
    }
    void triggerWorkspaceHaptic();
    setMode("PERSONAL");
    setLastSelectedKernel(next, user?.trustId);
    dismiss();
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

  function openWho() {
    dismiss();
    if (mode === "BUSINESS") {
      navigate(activeBusinessId ? `/app/business/${activeBusinessId}` : workspaceHomePath("BUSINESS"));
      return;
    }
    navigate("/app/profile");
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

  const edgeLabel = expanded ? "Close LifeOS controls" : "Open LifeOS controls";
  const whoTitle = mode === "BUSINESS" ? "Business Space" : user?.displayName || "You";
  const whoSub =
    mode === "BUSINESS"
      ? activeBusinessId
        ? `Business ${activeBusinessId}`
        : "Discover & manage"
      : user?.trustId || "Personal identity";

  return (
    <>
      <button
        type="button"
        className="lifeos-cmd-nav__a11y-open"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => toggle()}
      >
        {edgeLabel}
      </button>

      {/* Edge reveal — discoverable without forcing a menu on first visit */}
      <button
        type="button"
        className={`lifeos-cmd-nav__edge lifeos-cmd-nav__edge--${side}${expanded ? " is-open" : ""}`}
        aria-label={edgeLabel}
        aria-expanded={expanded}
        aria-controls={panelId}
        title={edgeLabel}
        data-no-nav-dock
        onClick={() => toggle()}
      >
        <span className="lifeos-cmd-nav__edge-hit" aria-hidden>
          <EdgeChevron side={side} open={expanded} />
        </span>
      </button>

      {expanded ? (
        <button
          type="button"
          className="lifeos-cmd-nav__hitlayer"
          aria-label="Close LifeOS controls"
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
          {/* Adaptive WHO panel — Personal identity vs Business context */}
          <button
            type="button"
            className={`lifeos-cmd-nav__who lifeos-cmd-nav__who--${mode.toLowerCase()}`}
            aria-label={mode === "BUSINESS" ? "Business identity" : "Personal identity"}
            title={whoTitle}
            onClick={openWho}
          >
            {mode === "PERSONAL" && user ? (
              <Avatar name={user.displayName} size="sm" />
            ) : (
              <span className="lifeos-cmd-nav__who-glyph" aria-hidden>
                <IconProfile size={18} />
              </span>
            )}
            <span className="lifeos-cmd-nav__who-text">
              <span className="lifeos-cmd-nav__who-title">{whoTitle}</span>
              <span className="lifeos-cmd-nav__who-sub">{whoSub}</span>
            </span>
          </button>

          <span className="lifeos-cmd-nav__gap" aria-hidden />

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

          {mode === "PERSONAL" ? (
            <>
              <IconBtn label="Streamify" Icon={StreamGlyph} active={path.includes("/streamify")} onClick={goStreamify} />
              <IconBtn label="LearnVerse" Icon={IconBook} active={path.includes("/learnverse")} onClick={goLearnVerse} />
              <IconBtn label="Explore+" Icon={IconExplore} active={exploreActive} onClick={goExplorePlus} />
            </>
          ) : (
            <IconBtn label="Explore+" Icon={IconExplore} active={exploreActive} onClick={goExplorePlus} />
          )}
          <IconBtn label="Home" Icon={IconHome} active={homeActive} onClick={goHome} />

          <span className="lifeos-cmd-nav__gap" aria-hidden />

          {/* Direct space switching — no nested submenu */}
          <div className="lifeos-cmd-nav__spaces" role="group" aria-label="Spaces">
            <IconBtn
              label="Personal Space"
              Icon={IconHome}
              active={mode === "PERSONAL"}
              onClick={() => switchSpace("PERSONAL")}
            />
            <IconBtn
              label="Business Space"
              Icon={IconExplore}
              active={mode === "BUSINESS"}
              onClick={() => switchSpace("BUSINESS")}
            />
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

      {/* Personal kernels only — Business space has no Offline/Main/Free bar */}
      {mode === "PERSONAL" ? (
        <nav
          className={`lifeos-kernel-bar${expanded ? " is-open" : ""}`}
          aria-label="Kernel switcher"
          aria-hidden={!expanded}
          data-no-nav-dock
          hidden={!expanded}
        >
          <button
            type="button"
            className={`lifeos-kernel-bar__btn${kernel === "offline" ? " is-active" : ""}`}
            aria-label="Offline"
            aria-pressed={kernel === "offline"}
            title="Offline"
            onClick={() => selectKernel("offline")}
          >
            <IconReceive size={22} />
          </button>
          <button
            type="button"
            className={`lifeos-kernel-bar__btn${kernel === "main" ? " is-active" : ""}`}
            aria-label="Main"
            aria-pressed={kernel === "main"}
            title="Main"
            onClick={() => selectKernel("main")}
          >
            <IconHome size={22} />
          </button>
          <button
            type="button"
            className={`lifeos-kernel-bar__btn${kernel === "free" ? " is-active" : ""}`}
            aria-label="Free"
            aria-pressed={kernel === "free"}
            title="Free"
            onClick={() => selectKernel("free")}
          >
            <IconTicket size={22} />
          </button>
        </nav>
      ) : null}
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

/** PERSONAL right: chevron points left (◀). BUSINESS left: points right (▶). Flips when open. */
function EdgeChevron({ side, open }: { side: "left" | "right"; open: boolean }) {
  const pointLeft = side === "right" ? !open : open;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      {pointLeft ? (
        <path d="M14.5 6 9 12l5.5 6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9.5 6 15 12l-5.5 6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
