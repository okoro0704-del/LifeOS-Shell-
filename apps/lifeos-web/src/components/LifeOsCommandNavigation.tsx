import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
  type SVGProps,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { InstalledAppManifest } from "@lifeos/shared";
import {
  IconBell,
  IconBook,
  IconBroadcast,
  IconExplore,
  IconHeadphones,
  IconHome,
  IconMessage,
  IconProfile,
  IconReceive,
  IconStay,
  IconTicket,
  IconTv,
} from "@lifeos/ui";
import { hasDeployedMyBrandOS } from "../lib/mybrandOS";
import { useAuth } from "../hooks/useAuth";
import { triggerWorkspaceHaptic } from "../lib/mobileBridge";
import { setLastSelectedKernel } from "../lib/kernelNavigation";
import { personalLandingPath } from "../lib/personalConnectivity";
import { useWorkspace, type WorkspaceMode } from "../context/WorkspaceContext";
import { useNavigationDock } from "../context/NavigationDockContext";
import {
  CMD_LABEL_HOLD_MS,
  createCmdTapRecognizer,
} from "../lib/cmdRailGesture";
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
 * Shared LifeOS command navigation.
 * Handle side follows space; rail opens from the opposite side.
 * Offline/Main/Free live only in the bottom kernel switcher.
 * Pointer: single tap reveals name · double tap launches.
 * Keyboard/SR: Enter/Space launches immediately.
 */
export function LifeOsCommandNavigation({ apps = [], unread = 0 }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode, setMode } = useWorkspace();
  const { expanded, handleSide, railSide, close, toggle } = useNavigationDock();
  const panelId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const kernel = personalKernelFromPath(path) ?? "main";
  const personalBase = personalNavBase(kernel);
  const showMessaging = hasDeployedMyBrandOS(apps) && path !== "/app/elcom";
  const messagesTo = showMessaging ? "/app/elcom" : "/app/messages";

  useEffect(() => {
    if (!expanded) {
      setRevealedId(null);
      if (labelTimer.current) clearTimeout(labelTimer.current);
      return;
    }
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
    setRevealedId(null);
    close();
  }

  function revealLabel(id: string) {
    setRevealedId(id);
    if (labelTimer.current) clearTimeout(labelTimer.current);
    labelTimer.current = setTimeout(() => setRevealedId(null), CMD_LABEL_HOLD_MS);
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

  function goLive() {
    dismiss();
    navigate("/app/live");
  }

  function goComments() {
    dismiss();
    navigate(messagesTo);
  }

  function goNotifications() {
    dismiss();
    navigate("/app/notifications");
  }

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

      <button
        type="button"
        className={`lifeos-cmd-nav__edge lifeos-cmd-nav__edge--${handleSide}${expanded ? " is-open" : ""}`}
        aria-label={edgeLabel}
        aria-expanded={expanded}
        aria-controls={panelId}
        title={edgeLabel}
        data-no-nav-dock
        onClick={() => toggle()}
      >
        <span className="lifeos-cmd-nav__edge-hit" aria-hidden>
          <EdgeChevron handleSide={handleSide} open={expanded} />
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
        className={`lifeos-cmd-nav lifeos-cmd-nav--${railSide}${expanded ? " is-open" : ""}`}
        data-nav-dock={expanded ? "expanded" : "clean"}
        data-nav-side={handleSide}
        data-rail-side={railSide}
        data-no-nav-dock
        aria-hidden={!expanded}
      >
        <nav
          id={panelId}
          className={`lifeos-cmd-nav__stack lifeos-cmd-nav__stack--${railSide}`}
          aria-label="LifeOS command navigation"
          hidden={!expanded}
        >
          <CmdIcon
            id="notifications"
            label="Notifications"
            Icon={IconBell}
            active={path.startsWith("/app/notifications")}
            badge={unread}
            revealed={revealedId === "notifications"}
            railSide={railSide}
            onReveal={() => revealLabel("notifications")}
            onLaunch={goNotifications}
          />
          <CmdIcon
            id="live"
            label="Live"
            Icon={IconBroadcast}
            active={path.startsWith("/app/live")}
            revealed={revealedId === "live"}
            railSide={railSide}
            onReveal={() => revealLabel("live")}
            onLaunch={goLive}
          />
          <CmdIcon
            id="comments"
            label="Comments"
            Icon={IconMessage}
            active={path === messagesTo || path.startsWith(`${messagesTo}/`)}
            revealed={revealedId === "comments"}
            railSide={railSide}
            onReveal={() => revealLabel("comments")}
            onLaunch={goComments}
          />

          <span className="lifeos-cmd-nav__gap" aria-hidden />

          <CmdIcon
            id="streamify"
            label="Streamify"
            Icon={StreamifyIcon}
            active={path.includes("/streamify")}
            revealed={revealedId === "streamify"}
            railSide={railSide}
            onReveal={() => revealLabel("streamify")}
            onLaunch={goStreamify}
          />
          <CmdIcon
            id="learnverse"
            label="Learnverse"
            Icon={IconBook}
            active={path.includes("/learnverse")}
            revealed={revealedId === "learnverse"}
            railSide={railSide}
            onReveal={() => revealLabel("learnverse")}
            onLaunch={goLearnVerse}
          />
          <CmdIcon
            id="explore"
            label="Explore+"
            Icon={IconExplore}
            active={exploreActive}
            revealed={revealedId === "explore"}
            railSide={railSide}
            onReveal={() => revealLabel("explore")}
            onLaunch={goExplorePlus}
          />
          <CmdIcon
            id="home"
            label="Home"
            Icon={IconHome}
            active={homeActive}
            revealed={revealedId === "home"}
            railSide={railSide}
            onReveal={() => revealLabel("home")}
            onLaunch={goHome}
          />

          <span className="lifeos-cmd-nav__gap" aria-hidden />

          <div className="lifeos-cmd-nav__spaces" role="group" aria-label="Spaces">
            <CmdIcon
              id="space-personal"
              label="Personal Space"
              Icon={IconProfile}
              active={mode === "PERSONAL"}
              revealed={revealedId === "space-personal"}
              railSide={railSide}
              onReveal={() => revealLabel("space-personal")}
              onLaunch={() => switchSpace("PERSONAL")}
            />
            <CmdIcon
              id="space-business"
              label="Business Space"
              Icon={IconStay}
              active={mode === "BUSINESS"}
              revealed={revealedId === "space-business"}
              railSide={railSide}
              onReveal={() => revealLabel("space-business")}
              onLaunch={() => switchSpace("BUSINESS")}
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

function CmdIcon({
  id,
  label,
  Icon,
  active,
  badge,
  revealed,
  railSide,
  onReveal,
  onLaunch,
}: {
  id: string;
  label: string;
  Icon: IconComp;
  active?: boolean;
  badge?: number;
  revealed: boolean;
  railSide: "left" | "right";
  onReveal: () => void;
  onLaunch: () => void;
}) {
  const onRevealRef = useRef(onReveal);
  const onLaunchRef = useRef(onLaunch);
  onRevealRef.current = onReveal;
  onLaunchRef.current = onLaunch;
  const recognizer = useRef(
    createCmdTapRecognizer({
      onReveal: () => onRevealRef.current(),
      onLaunch: () => onLaunchRef.current(),
    }),
  );

  useEffect(() => () => recognizer.current.cancel(), []);

  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    recognizer.current.onPointerUp(id, e.nativeEvent);
  }

  return (
    <span className={`lifeos-cmd-nav__cmd lifeos-cmd-nav__cmd--${railSide}${revealed ? " is-labeled" : ""}`}>
      <button
        type="button"
        className={`lifeos-cmd-nav__icon${active ? " is-active" : ""}`}
        aria-label={badge && badge > 0 ? `${label}, ${badge} unread` : label}
        aria-pressed={active || undefined}
        title={label}
        data-no-nav-dock
        onPointerUp={onPointerUp}
        onClick={(e) => {
          // Keyboard / SR activation (no prior pointer) launches immediately.
          if (e.detail === 0) onLaunch();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onLaunch();
          }
        }}
      >
        <Icon size={20} />
        {badge && badge > 0 ? <span className="lifeos-cmd-nav__badge" aria-hidden /> : null}
      </button>
      <span className="lifeos-cmd-nav__cmd-label" aria-hidden={!revealed}>
        {label}
      </span>
    </span>
  );
}

function StreamifyIcon({ size = 20 }: { size?: number }) {
  const [mode, setMode] = useState<"tv" | "headphones">("tv");
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setMode("tv");
      return;
    }
    const id = window.setInterval(() => {
      setMode((m) => (m === "tv" ? "headphones" : "tv"));
    }, 4200);
    return () => window.clearInterval(id);
  }, []);
  return mode === "tv" ? <IconTv size={size} /> : <IconHeadphones size={size} />;
}

/** Chevron points toward the rail that will emerge (opposite of handle). */
function EdgeChevron({ handleSide, open }: { handleSide: "left" | "right"; open: boolean }) {
  // Closed: point inward toward content (toward where rail will appear).
  // Open: invert to suggest collapse.
  const pointLeft = handleSide === "right" ? !open : open;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      {pointLeft ? (
        <path d="M14.5 6 9 12l5.5 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9.5 6 15 12l-5.5 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
