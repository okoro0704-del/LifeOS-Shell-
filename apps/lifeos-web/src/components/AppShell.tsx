import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { notificationService } from "../lib/services";

const tabs = [
  { to: "/app", end: true, label: "Home", icon: "⌂" },
  { to: "/app/wallet", label: "Wallet", icon: "◈" },
  { to: "/app/discover", label: "Discover", icon: "◎" },
  { to: "/app/activity", label: "Activity", icon: "☰" },
  { to: "/app/profile", label: "Profile", icon: "◉" },
];

export function AppShell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [offline, setOffline] = useState(!navigator.onLine);

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

  return (
    <div className="shell">
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
            Notifications{unread ? ` (${unread})` : ""}
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
            <div className="mono muted">{user.trustId}</div>
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
              ⌕
            </NavLink>
            <NavLink to="/app/notifications" className="icon-btn" aria-label="Notifications">
              ✉
              {unread ? <span className="badge-dot">{unread}</span> : null}
            </NavLink>
          </div>
        </header>
        {offline ? (
          <div className="offline-banner">
            You&apos;re offline. Some experiences may be unavailable.
          </div>
        ) : null}
        <main className="content">
          <Outlet />
        </main>
        <nav className="bottom-nav" aria-label="Primary">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => `bottom-item${isActive ? " active" : ""}`}
            >
              <span aria-hidden>{t.icon}</span>
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
