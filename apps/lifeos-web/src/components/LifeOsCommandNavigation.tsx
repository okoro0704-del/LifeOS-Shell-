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
  IconActivity,
  IconBell,
  IconBook,
  IconBroadcast,
  IconExplore,
  IconGraduationCap,
  IconHeadphones,
  IconHome,
  IconKernel,
  IconLink,
  IconMessage,
  IconReceive,
  IconTicket,
  IconTv,
  IconWallet,
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
  type CmdTapMode,
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
 * LifeOS command navigation — registry resolved by activeSpace (WorkspaceMode).
 * PERSONAL: existing Personal command set + Offline/Main/Free kernel bar.
 * BUSINESS: Space / Home / Explore / Activities / Finance / Messaging / Notification.
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
  const tapMode: CmdTapMode = mode === "BUSINESS" ? "arm" : "immediate";

  useEffect(() => {
    if (!expanded) {
      setRevealedId(null);
      if (labelTimer.current) clearTimeout(labelTimer.current);
      return;
    }
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

  function goPersonalHome() {
    dismiss();
    navigate(`${personalBase}/post`);
  }

  function goBusinessHome() {
    dismiss();
    const state = window.history.state as { lifeosBizDiscovery?: string } | null;
    if (state?.lifeosBizDiscovery) {
      window.history.back();
      return;
    }
    navigate(workspaceHomePath("BUSINESS"));
  }

  function goExplorePlus() {
    dismiss();
    navigate(`${personalBase}/plus`);
  }

  /** Business Explore → Business Space discovery home (one discovery system). */
  function goBusinessExplore() {
    dismiss();
    const state = window.history.state as { lifeosBizDiscovery?: string } | null;
    if (state?.lifeosBizDiscovery) {
      window.history.back();
      return;
    }
    navigate(workspaceHomePath("BUSINESS"));
  }

  function goLearnVerse() {
    dismiss();
    navigate(`${personalNavBase(kernel)}/learnverse`);
  }

  function goStreamify() {
    dismiss();
    navigate(`${personalNavBase(kernel)}/streamify`);
  }

  function goLive() {
    dismiss();
    navigate("/app/live");
  }

  function goComments() {
    dismiss();
    navigate(messagesTo);
  }

  function goMessaging() {
    dismiss();
    navigate(messagesTo);
  }

  function goNotifications() {
    dismiss();
    navigate("/app/notifications");
  }

  function goActivities() {
    dismiss();
    navigate("/app/activity");
  }

  function goFinance() {
    dismiss();
    navigate("/app/wallet");
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

  function flipSpace() {
    switchSpace(mode === "PERSONAL" ? "BUSINESS" : "PERSONAL");
  }

  const exploreActive =
    path.endsWith("/plus") || path === "/app/services/explore" || path.startsWith("/app/services/explore/");
  const personalHomeActive =
    /^\/app\/personal(\/(free|offline))?\/(post|reels|products|communities|search)?$/.test(path) ||
    path === "/app/personal" ||
    path === "/app/personal/free" ||
    path === "/app/personal/offline";
  const businessHomeActive = path === "/app/business" || path === "/app/business/";

  const edgeLabel = expanded ? "Hide LifeOS controls" : "Show LifeOS controls";

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
        data-space={mode}
        data-no-nav-dock
        aria-hidden={!expanded}
      >
        <nav
          id={panelId}
          className={`lifeos-cmd-nav__stack lifeos-cmd-nav__stack--${railSide}`}
          aria-label={mode === "BUSINESS" ? "Business command navigation" : "LifeOS command navigation"}
          hidden={!expanded}
        >
          {mode === "BUSINESS" ? (
            <>
              <CmdIcon
                id="space-switch"
                label="Personal Space"
                Icon={IconLink}
                revealed={revealedId === "space-switch"}
                railSide={railSide}
                tapMode={tapMode}
                onReveal={() => revealLabel("space-switch")}
                onLaunch={flipSpace}
              />
              <CmdIcon
                id="home"
                label="Home"
                Icon={IconHome}
                active={businessHomeActive}
                revealed={revealedId === "home"}
                railSide={railSide}
                tapMode={tapMode}
                onReveal={() => revealLabel("home")}
                onLaunch={goBusinessHome}
              />
              <CmdIcon
                id="explore"
                label="Explore"
                Icon={IconExplore}
                active={businessHomeActive}
                revealed={revealedId === "explore"}
                railSide={railSide}
                tapMode={tapMode}
                onReveal={() => revealLabel("explore")}
                onLaunch={goBusinessExplore}
              />
              <CmdIcon
                id="activities"
                label="Activities"
                Icon={IconActivity}
                active={path.startsWith("/app/activity")}
                revealed={revealedId === "activities"}
                railSide={railSide}
                tapMode={tapMode}
                onReveal={() => revealLabel("activities")}
                onLaunch={goActivities}
              />
              <CmdIcon
                id="finance"
                label="Finance"
                Icon={IconWallet}
                active={path.startsWith("/app/wallet")}
                revealed={revealedId === "finance"}
                railSide={railSide}
                tapMode={tapMode}
                onReveal={() => revealLabel("finance")}
                onLaunch={goFinance}
              />
              <CmdIcon
                id="messaging"
                label="Messaging"
                Icon={IconMessage}
                active={path === messagesTo || path.startsWith(`${messagesTo}/`)}
                revealed={revealedId === "messaging"}
                railSide={railSide}
                tapMode={tapMode}
                onReveal={() => revealLabel("messaging")}
                onLaunch={goMessaging}
              />
              <CmdIcon
                id="notifications"
                label="Notification"
                Icon={IconBell}
                active={path.startsWith("/app/notifications")}
                badge={unread}
                revealed={revealedId === "notifications"}
                railSide={railSide}
                tapMode={tapMode}
                onReveal={() => revealLabel("notifications")}
                onLaunch={goNotifications}
              />
            </>
          ) : (
            <>
              <CmdIcon
                id="notifications"
                label="Notifications"
                Icon={IconBell}
                active={path.startsWith("/app/notifications")}
                badge={unread}
                revealed={revealedId === "notifications"}
                railSide={railSide}
                tapMode={tapMode}
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
                tapMode={tapMode}
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
                tapMode={tapMode}
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
                tapMode={tapMode}
                onReveal={() => revealLabel("streamify")}
                onLaunch={goStreamify}
              />
              <CmdIcon
                id="learnverse"
                label="Learnverse"
                Icon={LearnverseIcon}
                active={path.includes("/learnverse")}
                revealed={revealedId === "learnverse"}
                railSide={railSide}
                tapMode={tapMode}
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
                tapMode={tapMode}
                onReveal={() => revealLabel("explore")}
                onLaunch={goExplorePlus}
              />
              <CmdIcon
                id="home"
                label="Home"
                Icon={IconHome}
                active={personalHomeActive}
                revealed={revealedId === "home"}
                railSide={railSide}
                tapMode={tapMode}
                onReveal={() => revealLabel("home")}
                onLaunch={goPersonalHome}
              />

              <span className="lifeos-cmd-nav__gap" aria-hidden />

              <CmdIcon
                id="space-switch"
                label="Business Space"
                Icon={IconWallet}
                revealed={revealedId === "space-switch"}
                railSide={railSide}
                tapMode={tapMode}
                onReveal={() => revealLabel("space-switch")}
                onLaunch={flipSpace}
              />
            </>
          )}

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
            data-no-nav-dock
            onClick={(e) => {
              e.stopPropagation();
              selectKernel("offline");
            }}
          >
            <IconReceive size={22} />
            <span className="lifeos-kernel-bar__label">Offline</span>
          </button>
          <button
            type="button"
            className={`lifeos-kernel-bar__btn${kernel === "main" ? " is-active" : ""}`}
            aria-label="Main"
            aria-pressed={kernel === "main"}
            title="Main"
            data-no-nav-dock
            onClick={(e) => {
              e.stopPropagation();
              selectKernel("main");
            }}
          >
            <IconKernel size={22} />
            <span className="lifeos-kernel-bar__label">Main</span>
          </button>
          <button
            type="button"
            className={`lifeos-kernel-bar__btn${kernel === "free" ? " is-active" : ""}`}
            aria-label="Free"
            aria-pressed={kernel === "free"}
            title="Free"
            data-no-nav-dock
            onClick={(e) => {
              e.stopPropagation();
              selectKernel("free");
            }}
          >
            <IconTicket size={22} />
            <span className="lifeos-kernel-bar__label">Free</span>
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
  tapMode,
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
  tapMode: CmdTapMode;
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
      mode: tapMode,
    }),
  );

  // Recreate recognizer when tap mode changes (Personal ↔ Business).
  useEffect(() => {
    recognizer.current = createCmdTapRecognizer({
      onReveal: () => onRevealRef.current(),
      onLaunch: () => onLaunchRef.current(),
      mode: tapMode,
    });
    return () => recognizer.current.cancel();
  }, [tapMode]);

  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
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
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={onPointerUp}
        onClick={(e) => {
          e.stopPropagation();
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

function LearnverseIcon({ size = 20 }: { size?: number }) {
  const [mode, setMode] = useState<"book" | "cap">("book");
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setMode("book");
      return;
    }
    const id = window.setInterval(() => {
      setMode((m) => (m === "book" ? "cap" : "book"));
    }, 4200);
    return () => window.clearInterval(id);
  }, []);
  return mode === "book" ? <IconBook size={size} /> : <IconGraduationCap size={size} />;
}

function EdgeChevron({ handleSide, open }: { handleSide: "left" | "right"; open: boolean }) {
  const pointLeft = handleSide === "right" ? !open : open;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      {pointLeft ? (
        <path d="M14.5 5.5 8.5 12l6 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9.5 5.5 15.5 12l-6 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
