import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  IconActivity,
  IconBell,
  IconBook,
  IconExplore,
  IconHome,
  IconLink,
  IconProfile,
  IconSearch,
  IconTicket,
  IconWallet,
} from "@lifeos/ui";
import { useAuth } from "../hooks/useAuth";
import { useCommandLayer } from "../hooks/useCommandLayer";
import { notificationService } from "../lib/services";
import { CommandOverlay, AskLifeOSTrigger } from "./CommandOverlay";

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const tabs: {
  to: string;
  end?: boolean;
  label: string;
  Icon: IconComp;
}[] = [
  { to: "/app", end: true, label: "Home", Icon: IconHome },
  { to: "/app/discover", label: "Explore", Icon: IconExplore },
  { to: "/app/wallet", label: "Wallet", Icon: IconWallet },
  { to: "/app/activity", label: "Activity", Icon: IconActivity },
  { to: "/app/profile", label: "Profile", Icon: IconProfile },
];

export function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const { openCommand } = useCommandLayer();
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
          <div className="side-foot">
            <div className="side-foot-name">{user.displayName}</div>
            <div className="mono muted small">{user.trustId}</div>
          </div>
        ) : null}
      </aside>

      <div className="shell-main">
        <header className="app-header">
          <div className="app-header__brand">
            <span className="brand-mark brand-mark--sm" aria-hidden />
            <span className="brand-name">LifeOS</span>
          </div>
          <div className="app-header__actions">
            <AskLifeOSTrigger compact mode="ask" className="ask-lifeos-trigger--header" />
            <button type="button" className="icon-btn" aria-label="Ask LifeOS" onClick={() => openCommand(undefined, "ask")}>
              <IconSearch size={20} />
            </button>
            <NavLink
              to="/app/notifications"
              className="icon-btn"
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
            >
              <IconBell size={20} />
              {unread ? (
                <span className="badge-dot" aria-hidden>
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </NavLink>
          </div>
        </header>

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

        <main id="main-content" className="content" key={location.pathname}>
          <div className="page-enter">
            <Outlet />
          </div>
        </main>

        <CommandOverlay />

        <nav className="bottom-nav" aria-label="Primary">
          {tabs.map((t) => (
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
      </div>
    </div>
  );
}
