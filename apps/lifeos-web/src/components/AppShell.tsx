import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { notificationService } from "../lib/services";

const tabs = [
  { to: "/app", end: true, label: "Home", icon: "⌂" },
  { to: "/app/wallet", label: "Wallet", icon: "◈" },
  { to: "/app/discover", label: "Discover", icon: "◎" },
  { to: "/app/activity", label: "Activity", icon: "☰" },
  { to: "/app/profile", label: "Profile", icon: "◉" },
] as const;

export function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<void>;
  } | null>(null);
  const [showInstall, setShowInstall] = useState(false);

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
              end={"end" in t ? t.end : undefined}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <span className="nav-icon" aria-hidden>
                {t.icon}
              </span>
              {t.label}
            </NavLink>
          ))}
          <NavLink to="/app/search" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            <span className="nav-icon" aria-hidden>
              ⌕
            </span>
            Search
          </NavLink>
          <NavLink
            to="/app/notifications"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <span className="nav-icon" aria-hidden>
              ✉
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
              ☍
            </span>
            Connections
          </NavLink>
        </nav>
        {user ? (
          <div className="side-foot">
            <div className="side-foot-name">{user.displayName}</div>
            <div className="mono muted small">{user.trustId}</div>
          </div>
        ) : null}
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="brand brand--mobile">
            <span className="brand-mark" aria-hidden />
            <span className="brand-name">LifeOS</span>
          </div>
          <div className="topbar-actions">
            <NavLink to="/app/search" className="icon-btn" aria-label="Search">
              <span aria-hidden>⌕</span>
            </NavLink>
            <NavLink
              to="/app/notifications"
              className="icon-btn"
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
            >
              <span aria-hidden>✉</span>
              {unread ? (
                <span className="badge-dot" aria-hidden>
                  {unread}
                </span>
              ) : null}
            </NavLink>
          </div>
        </header>
        {offline ? (
          <div className="offline-banner" role="status">
            You&apos;re offline. Cached pages may still work; experiences need a connection.
          </div>
        ) : null}
        {showInstall && deferredPrompt ? (
          <div className="install-banner" role="region" aria-label="Install LifeOS">
            <div>
              <strong>Install LifeOS</strong>
              <p className="muted small">Add to your home screen for a fuller OS feel.</p>
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
        <main id="main-content" className="content" key={location.pathname}>
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
        <nav className="bottom-nav" aria-label="Primary">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={"end" in t ? t.end : undefined}
              className={({ isActive }) => `bottom-item${isActive ? " active" : ""}`}
            >
              <span className="bottom-icon" aria-hidden>
                {t.icon}
              </span>
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
