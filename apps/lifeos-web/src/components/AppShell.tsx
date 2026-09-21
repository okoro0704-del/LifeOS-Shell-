import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  IconBell,
  IconBook,
  IconLink,
  IconMessage,
  IconSearch,
  IconTicket,
} from "@lifeos/ui";
import type { InstalledAppManifest } from "@lifeos/shared";
import { UniversalAppLauncher } from "@lifeos/shell-ui";
import { shellPathForApp } from "@lifeos/shell-core";
import { useAuth } from "../hooks/useAuth";
import { useCommandLayer } from "../hooks/useCommandLayer";
import { useWorkspace, type WorkspaceMode } from "../context/WorkspaceContext";
import { installedAppsService, notificationService } from "../lib/services";
import { isLifeOsPersonalDemoEnabled, personalDemoSequence } from "../lib/personalDemoActivity";
import { markNeedsFaceOnKernelSwitch } from "../lib/personalConnectivity";
import { setLastSelectedKernel } from "../lib/kernelNavigation";
import { CommandOverlay } from "./CommandOverlay";
import { LifeOsCommandNavigation } from "./LifeOsCommandNavigation";
import { NavigationDockGestures } from "./NavigationDockGestures";
import { ActiveKernelSignature } from "./ActiveKernelSignature";
import { TransientAlertSurface } from "./TransientAlertSurface";
import { SurfaceSwitcherBar } from "./SurfaceSwitcherBar";
import { BroadcastRemoteControl } from "./BroadcastRemoteControl";
import { TvSurface } from "./TvSurface";
import { RadioSurface } from "./RadioSurface";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";
import { LifeOSWakeListener } from "./LifeOSWakeListener";
import { PageTopBar } from "./PageTopBar";
import { VerificationStars } from "./VerificationStars";
import { resolvePageMeta } from "../lib/pageMeta";
import { WorkspaceToggle } from "./shell/WorkspaceToggle";
import { primaryNavForMode, personalKernelFromPath, type ShellNavItem } from "./shell/nav";

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const sharedLinks: { to: string; label: string; Icon: IconComp; ask?: boolean }[] = [
  { to: "/app/messages", label: "Messages", Icon: IconMessage },
  { to: "/app/search", label: "Ask LifeOS", Icon: IconSearch, ask: true },
  { to: "/app/notifications", label: "Inbox", Icon: IconBell },
  { to: "/app/connections", label: "Connections", Icon: IconLink },
  { to: "/app/plans", label: "Today", Icon: IconTicket },
  { to: "/app/saved", label: "Saved", Icon: IconBook },
];

const sharedSettingsLinks: { to: string; label: string }[] = [
  { to: "/app/shared/identity", label: "Identity (TrustID)" },
  { to: "/app/shared/security", label: "Security & devices" },
  { to: "/app/shared/notifications", label: "ElfCom & alerts" },
  { to: "/app/shared/bridge", label: "Cross-space bridge" },
  { to: "/app/profile", label: "Profile" },
];

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function filterAppsForMode(
  apps: InstalledAppManifest[],
  mode: WorkspaceMode,
): InstalledAppManifest[] {
  if (mode === "PERSONAL") {
    return apps.filter((a) => a.audience === "personal");
  }
  return apps.filter((a) => a.audience !== "personal");
}

function isBusinessDetailPath(pathname: string): boolean {
  if (pathname === "/app/business" || pathname.startsWith("/app/business/modules")) {
    return false;
  }
  return Boolean(pathname.match(/^\/app\/business\/[^/]+$/));
}

export function AppShell() {
  const { user } = useAuth();
  const { mode, setMode } = useWorkspace();
  const { surface, broadcastMode, enterBroadcast, exitBroadcast } = useLifeOsSurface();
  const location = useLocation();
  const navigate = useNavigate();
  const { openCommand } = useCommandLayer();
  const livingActive = surface === "LIVING_LIFEOS";
  const personalSurfaces = mode === "PERSONAL";
  const bareBroadcast = personalSurfaces && broadcastMode;
  const [unread, setUnread] = useState(0);
  const [demoUnread, setDemoUnread] = useState(0);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [offlinePrompt, setOfflinePrompt] = useState(false);
  /** Back online while inhabiting Offline kernel — choose Free / Main / Stay. */
  const [onlineKernelPrompt, setOnlineKernelPrompt] = useState(false);
  const [backOnlineNotice, setBackOnlineNotice] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<void>;
  } | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledAppManifest[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const avatarSrc = user?.preferences?.avatarUrl ?? null;
  const firstName = user?.firstName || user?.displayName?.split(" ")[0] || "there";
  const pathNorm = location.pathname.replace(/\/+$/, "") || "/";
  const personalKernel = personalKernelFromPath(location.pathname) ?? "main";
  const isImmersive =
    isBusinessDetailPath(location.pathname) ||
    pathNorm === "/app/elcom" ||
    Boolean(location.pathname.match(/^\/app\/services\/explore\/[^/]+$/));
  const isBusinessHome = pathNorm === "/app/business";
  const isHome =
    location.pathname === "/app" ||
    location.pathname === "/app/" ||
    pathNorm === "/app" ||
    isBusinessHome;
  /** Personal Home / LearnVerse / Streamify / Business home use their own glass chrome. */
  const hideChrome =
    (mode === "PERSONAL" &&
      (/^\/app\/personal\/(post|reels|products|communities|search)$/.test(pathNorm) ||
        /^\/app\/personal\/(free|offline)\/(post|reels|products|communities|search)$/.test(pathNorm) ||
        /\/personal(\/(free|offline))?\/(learnverse|streamify)/.test(pathNorm) ||
        pathNorm === "/app/personal" ||
        pathNorm.endsWith("/plus"))) ||
    (mode === "BUSINESS" && pathNorm === "/app/business");
  const pageMeta =
    isHome || hideChrome || pathNorm === "/app/elcom" || pathNorm === "/app/services/explore"
      ? null
      : resolvePageMeta(location.pathname);
  const tabs = useMemo(
    () => primaryNavForMode(mode, personalKernel),
    [mode, personalKernel],
  );
  const launcherApps = useMemo(
    () => filterAppsForMode(installedApps, mode),
    [installedApps, mode],
  );
  const brandName = "LifeOS";

  // Keep workspace mode aligned with personal/business home routes only.
  // Do not fight mid-navigation when mode was just flipped.
  useEffect(() => {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/app/personal" || path.startsWith("/app/personal/")) {
      if (mode !== "PERSONAL") setMode("PERSONAL");
      return;
    }
    if (path === "/app/business" || path.startsWith("/app/business/")) {
      if (mode !== "BUSINESS") setMode("BUSINESS");
    }
  }, [location.pathname, mode, setMode]);

  // Offline kernel path ↔ bare TV/Radio broadcast session.
  useEffect(() => {
    if (mode !== "PERSONAL") {
      if (broadcastMode) exitBroadcast();
      return;
    }
    if (personalKernel === "offline") {
      enterBroadcast();
    } else if (broadcastMode) {
      exitBroadcast();
    }
  }, [mode, personalKernel, broadcastMode, enterBroadcast, exitBroadcast]);

  const handleModeChange = (_next: WorkspaceMode) => {};

  useEffect(() => {
    void notificationService.list().then((d) => setUnread(d.unreadCount)).catch(() => undefined);
    void installedAppsService
      .list()
      .then((d) => setInstalledApps(d.apps ?? []))
      .catch(() => setInstalledApps([]))
      .finally(() => setAppsLoading(false));
  }, []);

  // Demo-only badge contribution — never mutates production unread.
  useEffect(() => {
    if (mode !== "PERSONAL" || !isLifeOsPersonalDemoEnabled()) {
      setDemoUnread(0);
      return;
    }
    const seen = new Set<string>();
    setDemoUnread(personalDemoSequence().filter((e) => e.kind !== "live").length);
    const onDemo = (ev: Event) => {
      const detail = (ev as CustomEvent<{ id?: string; kind?: string }>).detail;
      if (detail?.id) seen.add(detail.id);
      setDemoUnread(personalDemoSequence().filter((e) => e.kind !== "live" && !seen.has(e.id)).length);
    };
    window.addEventListener("lifeos:personal-demo-event", onDemo);
    return () => window.removeEventListener("lifeos:personal-demo-event", onDemo);
  }, [mode]);

  useEffect(() => {
    const on = () => {
      setOffline(false);
      setOfflinePrompt(false);
      markNeedsFaceOnKernelSwitch(true);
      // In Offline kernel with connectivity restored → offer Free / Main / Stay.
      if (mode === "PERSONAL" && personalKernel === "offline") {
        setBackOnlineNotice(false);
        setOnlineKernelPrompt(true);
      } else {
        setOnlineKernelPrompt(false);
        setBackOnlineNotice(true);
      }
    };
    const off = () => {
      setOffline(true);
      setBackOnlineNotice(false);
      setOnlineKernelPrompt(false);
      // Never auto-switch kernels — ask the user.
      if (mode === "PERSONAL" && personalKernel !== "offline") {
        setOfflinePrompt(true);
      }
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [mode, navigate, personalKernel]);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("lifeos.install.dismissed");
    const handler = (e: Event) => {
      e.preventDefault();
      const ev = e as Event & { prompt: () => Promise<void> };
      setDeferredPrompt(ev);
      if (!dismissed) setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const shellUnread = unread + (mode === "PERSONAL" ? demoUnread : 0);

  return (
    <NavigationDockGestures>
    <div
      className={`shell shell--side-dock${
        personalSurfaces && !livingActive ? " is-living-suspended" : ""
      }${bareBroadcast ? " is-broadcast-bare" : ""}${
        personalSurfaces ? ` shell--surface-${surface.toLowerCase()}` : ""
      }`}
      data-lifeos-surface={personalSurfaces ? surface : undefined}
      data-broadcast={bareBroadcast ? "1" : undefined}
    >
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {personalSurfaces ? <SurfaceSwitcherBar /> : null}
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">{brandName}</span>
        </div>
        <div className="sidebar-workspace">
          <WorkspaceToggle onModeChange={handleModeChange} />
        </div>
        <nav className="side-nav">
          {tabs.map((t: ShellNavItem) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <span className="nav-icon" aria-hidden>
                <t.Icon size={20} />
              </span>
              {t.label}
            </NavLink>
          ))}
          <div className="side-nav-divider" aria-hidden />
          <span className="side-nav-section">Shared</span>
          {sharedLinks.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              onClick={
                t.ask
                  ? (e) => {
                      e.preventDefault();
                      openCommand(undefined, "ask");
                    }
                  : undefined
              }
            >
              <span className="nav-icon" aria-hidden>
                <t.Icon size={20} />
              </span>
              {t.label}
              {t.to === "/app/notifications" && unread ? (
                <span className="nav-count" aria-label={`${unread} unread`}>
                  {unread}
                </span>
              ) : null}
            </NavLink>
          ))}
          <div className="side-nav-divider" aria-hidden />
          <span className="side-nav-section">Shared settings</span>
          {sharedSettingsLinks.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => `nav-item nav-item--compact${isActive ? " active" : ""}`}
            >
              {t.label}
            </NavLink>
          ))}
          {(mode === "BUSINESS" || launcherApps.length > 0) && (
            <>
              <div className="side-nav-divider" aria-hidden />
              <UniversalAppLauncher
                apps={launcherApps}
                loading={appsLoading}
                onLaunch={(app) => navigate(shellPathForApp(app))}
              />
            </>
          )}
        </nav>
        {user ? (
          <button
            type="button"
            className="side-foot side-foot--btn"
            onClick={() => navigate("/app/profile")}
            aria-label="Open profile"
          >
            <Avatar name={user.displayName} size="sm" src={avatarSrc} />
            <div className="side-foot__text">
              <div className="side-foot-name">{user.displayName}</div>
              <div className="mono muted small">{user.trustId}</div>
            </div>
          </button>
        ) : null}
      </aside>

      <div className="shell-main">
        {isHome && !hideChrome ? (
          <header className="app-header">
            <div className="app-header__greeting">
              <p className="app-header__hello">{timeGreeting()},</p>
              <h1 className="app-header__name">{firstName}</h1>
              <VerificationStars />
            </div>
            <div className="app-header__actions">
              <div className="app-header__workspace">
                <WorkspaceToggle onModeChange={handleModeChange} />
              </div>
              <NavLink
                to="/app/messages"
                className="icon-btn icon-btn--lg"
                aria-label={unread ? `Messages, ${unread} unread` : "Messages"}
              >
                <IconMessage size={26} />
                {unread ? (
                  <span className="badge-dot" aria-hidden>
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </NavLink>
              <NavLink
                to="/app/notifications"
                className="icon-btn icon-btn--lg"
                aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              >
                <IconBell size={26} />
                {unread ? (
                  <span className="badge-dot" aria-hidden>
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </NavLink>
              <button
                type="button"
                className="header-avatar"
                aria-label="Open profile"
                onClick={() => navigate("/app/profile")}
              >
                <Avatar name={user?.displayName || "You"} size="sm" src={avatarSrc} />
                <span className="header-avatar__dot" aria-hidden />
              </button>
            </div>
          </header>
        ) : pageMeta ? (
          <PageTopBar title={pageMeta.title} subtitle={pageMeta.subtitle} />
        ) : null}

        {offline ? (
          <div className="offline-banner" role="status">
            <strong>You&apos;re offline</strong>
          </div>
        ) : null}

        {offlinePrompt ? (
          <div
            className="offline-kernel-prompt"
            role="dialog"
            aria-modal="true"
            aria-label="You are offline"
          >
            <div className="offline-kernel-prompt__sheet">
              <h2>You lost internet</h2>
              <p>
                You can keep living in LifeOS. Local TV and Radio stay available when you summon them.
              </p>
              <div className="offline-kernel-prompt__actions">
                <button
                  type="button"
                  className="los-btn los-btn--primary"
                  onClick={() => setOfflinePrompt(false)}
                >
                  Stay in LifeOS
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {onlineKernelPrompt ? (
          <div
            className="offline-kernel-prompt"
            role="dialog"
            aria-modal="true"
            aria-label="Internet restored"
          >
            <div className="offline-kernel-prompt__sheet">
              <h2>You have internet again</h2>
              <p>Would you like to leave My TV / My Radio? Choose where to go, or keep watching.</p>
              <div className="offline-kernel-prompt__actions offline-kernel-prompt__actions--triple">
                <button
                  type="button"
                  className="los-btn los-btn--primary"
                  onClick={() => {
                    setOnlineKernelPrompt(false);
                    exitBroadcast();
                    setLastSelectedKernel("free", user?.trustId);
                    navigate("/app/personal/free/post");
                  }}
                >
                  Free
                </button>
                <button
                  type="button"
                  className="los-btn los-btn--primary"
                  onClick={() => {
                    setOnlineKernelPrompt(false);
                    exitBroadcast();
                    setLastSelectedKernel("main", user?.trustId);
                    navigate("/app/personal/post");
                  }}
                >
                  Main
                </button>
                <button
                  type="button"
                  className="los-btn"
                  onClick={() => setOnlineKernelPrompt(false)}
                >
                  Stay
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {backOnlineNotice && !offline && !onlineKernelPrompt ? (
          <div className="online-banner" role="status">
            <strong>You&apos;re back online</strong>
            <button
              type="button"
              className="online-banner__dismiss"
              onClick={() => setBackOnlineNotice(false)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {showInstall && deferredPrompt ? (
          <div className="install-banner" role="region" aria-label={`Install ${brandName}`}>
            <div>
              <strong>Install {brandName}</strong>
              <p className="muted small">Add to your home screen for everyday access.</p>
            </div>
            <div className="row-actions">
              <button
                type="button"
                className="los-btn los-btn--primary los-btn--sm"
                onClick={() => {
                  void deferredPrompt.prompt().then(() => {
                    setShowInstall(false);
                    setDeferredPrompt(null);
                  });
                }}
              >
                Install
              </button>
              <button
                type="button"
                className="los-btn los-btn--ghost los-btn--sm"
                onClick={() => {
                  sessionStorage.setItem("lifeos.install.dismissed", "1");
                  setShowInstall(false);
                }}
              >
                Not now
              </button>
            </div>
          </div>
        ) : null}

        <main
          id="main-content"
          className={`content${isImmersive ? " content--immersive" : ""}${
            personalSurfaces && !livingActive ? " content--surface-suspended" : ""
          }`}
          key={location.pathname}
          aria-hidden={personalSurfaces && !livingActive ? true : undefined}
        >
          <div className="page-enter">
            <Outlet />
          </div>
        </main>

        {personalSurfaces ? (
          <>
            <TvSurface />
            <RadioSurface />
            <BroadcastRemoteControl />
          </>
        ) : null}

        <CommandOverlay />
        <LifeOSWakeListener />
        {!isImmersive && livingActive && !bareBroadcast ? (
          <>
            <LifeOsCommandNavigation apps={installedApps} unread={shellUnread} />
            <ActiveKernelSignature />
            <TransientAlertSurface />
          </>
        ) : null}
      </div>
    </div>
    </NavigationDockGestures>
  );
}
