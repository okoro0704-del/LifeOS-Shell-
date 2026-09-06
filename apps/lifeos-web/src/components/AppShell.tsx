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
import { markNeedsFaceOnKernelSwitch } from "../lib/personalConnectivity";
import { CommandOverlay } from "./CommandOverlay";
import { PageTopBar } from "./PageTopBar";
import { VerificationStars } from "./VerificationStars";
import { resolvePageMeta } from "../lib/pageMeta";
import { WorkspaceToggle } from "./shell/WorkspaceToggle";
import { primaryNavForMode, personalKernelFromPath, personalNavBase, workspaceHomePath, type ShellNavItem } from "./shell/nav";

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
  const location = useLocation();
  const navigate = useNavigate();
  const { openCommand } = useCommandLayer();
  const [unread, setUnread] = useState(0);
  const [offline, setOffline] = useState(!navigator.onLine);
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
  const personalBase = personalNavBase(personalKernel);
  const onExplore =
    location.pathname === `${personalBase}/plus` ||
    location.pathname.endsWith("/plus");
  const isImmersive =
    isBusinessDetailPath(location.pathname) ||
    Boolean(location.pathname.match(/^\/app\/services\/explore\/[^/]+$/));
  const isBusinessHome = pathNorm === "/app/business";
  const isHome =
    location.pathname === "/app" ||
    location.pathname === "/app/" ||
    pathNorm === "/app" ||
    isBusinessHome;
  /** Personal Home sections use kernel brand chrome — hide shell greeting. */
  const hideChrome =
    mode === "PERSONAL" &&
    (/^\/app\/personal\/(post|reels|connects|communities)$/.test(pathNorm) ||
      /^\/app\/personal\/(free|offline)\/(post|reels|connects|communities)$/.test(pathNorm) ||
      pathNorm === "/app/personal");
  const pageMeta = isHome || hideChrome ? null : resolvePageMeta(location.pathname);
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

  const handleModeChange = (_next: WorkspaceMode) => {};

  useEffect(() => {
    void notificationService.list().then((d) => setUnread(d.unreadCount)).catch(() => undefined);
    void installedAppsService
      .list()
      .then((d) => setInstalledApps(d.apps ?? []))
      .catch(() => setInstalledApps([]))
      .finally(() => setAppsLoading(false));
    const on = () => {
      setOffline(false);
      setBackOnlineNotice(true);
      markNeedsFaceOnKernelSwitch(true);
    };
    const off = () => {
      setOffline(true);
      setBackOnlineNotice(false);
      if (mode === "PERSONAL") {
        navigate("/app/personal/offline/post");
      }
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [mode, navigate]);

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

  return (
    <div className="shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
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

        {backOnlineNotice && !offline ? (
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
          className={`content${isImmersive ? " content--immersive" : ""}`}
          key={location.pathname}
        >
          <div className="page-enter">
            <Outlet />
          </div>
        </main>

        <CommandOverlay />

        {!isImmersive ? (
          <nav
            className={`bottom-nav bottom-nav--fab bottom-nav--float${
              mode === "PERSONAL" && personalKernel !== "main"
                ? ` bottom-nav--kernel-${personalKernel}`
                : ""
            }`}
            aria-label="Primary"
          >
            {tabs.slice(0, 2).map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) => {
                  const path = location.pathname.replace(/\/+$/, "") || "/";
                  const prefixHit = t.matchPrefixes?.some(
                    (p) => path === p || path.startsWith(`${p}/`),
                  );
                  return `bottom-item${isActive || prefixHit ? " active" : ""}`;
                }}
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
                className={({ isActive }) => `bottom-item${isActive ? " active" : ""}`}
              >
                <span className="bottom-icon" aria-hidden>
                  <t.Icon size={22} />
                </span>
                <span>{t.label}</span>
              </NavLink>
            ))}
            <WorkspaceToggle variant="space" onModeChange={handleModeChange} />
          </nav>
        ) : null}
      </div>
    </div>
  );
}
