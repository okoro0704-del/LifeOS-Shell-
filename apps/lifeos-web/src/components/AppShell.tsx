import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  IconActivity,
  IconBell,
  IconBook,
  IconExplore,
  IconHome,
  IconLink,
  IconMessage,
  IconSearch,
  IconTicket,
  IconWallet,
} from "@lifeos/ui";
import { useAuth } from "../hooks/useAuth";
import { useCommandLayer } from "../hooks/useCommandLayer";
import { notificationService } from "../lib/services";
import { CommandOverlay } from "./CommandOverlay";
import { PageTopBar } from "./PageTopBar";
import { VerificationStars } from "./VerificationStars";
import { resolvePageMeta } from "../lib/pageMeta";

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const tabs: {
  to: string;
  end?: boolean;
  label: string;
  Icon: IconComp;
}[] = [
  { to: "/app", end: true, label: "Home", Icon: IconHome },
  { to: "/app/discover", label: "Explore", Icon: IconExplore },
  { to: "/app/wallet", label: "Finance", Icon: IconWallet },
  { to: "/app/activity", label: "Activity", Icon: IconActivity },
];

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { openCommand } = useCommandLayer();
  const [unread, setUnread] = useState(0);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<void>;
  } | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const avatarSrc = user?.preferences?.avatarUrl ?? null;
  const firstName = user?.firstName || user?.displayName?.split(" ")[0] || "there";
  const onExplore = location.pathname.startsWith("/app/services/explore");
  const isImmersive =
    location.pathname.startsWith("/app/business/") ||
    Boolean(location.pathname.match(/^\/app\/services\/explore\/[^/]+$/));
  const isHome =
    location.pathname === "/app" ||
    location.pathname === "/app/" ||
    location.pathname.replace(/\/+$/, "") === "/app";
  const pageMeta = isHome ? null : resolvePageMeta(location.pathname);

  useEffect(() => {
    void notificationService.list().then((d) => setUnread(d.unreadCount)).catch(() => undefined);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

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
          <span className="brand-name">LifeOS</span>
        </div>
        <nav className="side-nav">
          {tabs.map((t) => (
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
          <NavLink
            to="/app/messages"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <span className="nav-icon" aria-hidden>
              <IconMessage size={20} />
            </span>
            Messages
          </NavLink>
          <NavLink
            to="/app/search"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              openCommand(undefined, "ask");
            }}
          >
            <span className="nav-icon" aria-hidden>
              <IconSearch size={20} />
            </span>
            Ask LifeOS
          </NavLink>
          <NavLink
            to="/app/notifications"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <span className="nav-icon" aria-hidden>
              <IconBell size={20} />
            </span>
            Notifications
            {unread ? (
              <span className="nav-count" aria-label={`${unread} unread`}>
                {unread}
              </span>
            ) : null}
          </NavLink>
          <NavLink
            to="/app/connections"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <span className="nav-icon" aria-hidden>
              <IconLink size={20} />
            </span>
            Connections
          </NavLink>
          <NavLink to="/app/plans" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            <span className="nav-icon" aria-hidden>
              <IconTicket size={20} />
            </span>
            Today
          </NavLink>
          <NavLink to="/app/saved" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            <span className="nav-icon" aria-hidden>
              <IconBook size={20} />
            </span>
            Saved
          </NavLink>
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
        {isHome ? (
          <header className="app-header">
            <div className="app-header__greeting">
              <p className="app-header__hello">{timeGreeting()},</p>
              <h1 className="app-header__name">{firstName}</h1>
              <VerificationStars />
            </div>
            <div className="app-header__actions">
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
            <span>Showing your latest saved information.</span>
          </div>
        ) : null}

        {showInstall && deferredPrompt ? (
          <div className="install-banner" role="region" aria-label="Install LifeOS">
            <div>
              <strong>Install LifeOS</strong>
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
          <nav className="bottom-nav bottom-nav--fab bottom-nav--float" aria-label="Primary">
            {tabs.slice(0, 2).map((t) => (
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
            <button
              type="button"
              className={`bottom-fab${onExplore ? " active" : ""}`}
              aria-label={onExplore ? "Close services discover" : "Discover services"}
              aria-pressed={onExplore}
              onClick={() => {
                if (onExplore) navigate("/app");
                else navigate("/app/services/explore");
              }}
            >
              <span aria-hidden>{onExplore ? "×" : "+"}</span>
            </button>
            {tabs.slice(2).map((t) => (
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
          </nav>
        ) : null}
      </div>
    </div>
  );
}
