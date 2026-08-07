import { useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
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
];

const PLUS_SERVICES: Array<{
  id: string;
  label: string;
  blurb: string;
  href: string;
}> = [
  { id: "room", label: "Book a room", blurb: "Hotel rooms nearby", href: "/app/services/Stay/feed" },
  { id: "apt", label: "Book an apartment", blurb: "Short stays & studios", href: "/app/services/Stay/feed?focus=off_harbor_studio" },
  { id: "ride", label: "Book a ride", blurb: "Travel & getting around", href: "/app/services/Travel" },
  { id: "spa", label: "Book spa / wellness", blurb: "Treatments & recovery", href: "/app/services/Wellness" },
  { id: "dinner", label: "Book dining", blurb: "Tables & meals", href: "/app/services/Eat" },
  { id: "cinema", label: "Cinema tickets", blurb: "Showtimes near you", href: "/app/services/Cinema" },
  { id: "events", label: "Book an event", blurb: "Nights out & tickets", href: "/app/services/Events" },
  { id: "fitness", label: "Book fitness", blurb: "Classes & gym time", href: "/app/services/Fitness" },
  { id: "all", label: "All services", blurb: "Browse every vertical", href: "/app/services" },
];

export function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { openCommand } = useCommandLayer();
  const [unread, setUnread] = useState(0);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [servicesOpen, setServicesOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<void>;
  } | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const avatarSrc = user?.preferences?.avatarUrl ?? null;

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

  useEffect(() => {
    setServicesOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!servicesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setServicesOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [servicesOpen]);

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
        <header className="app-header">
          <div className="app-header__brand">
            <span className="brand-mark brand-mark--sm" aria-hidden />
            <span className="brand-name">LifeOS</span>
          </div>
          <div className="app-header__actions">
            <NavLink
              to="/app/messages"
              className="icon-btn"
              aria-label={unread ? `Messages, ${unread} unread` : "Messages"}
            >
              <IconMessage size={20} />
              {unread ? (
                <span className="badge-dot" aria-hidden>
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </NavLink>
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

        {servicesOpen ? (
          <div className="services-sheet" role="presentation">
            <button
              type="button"
              className="services-sheet__backdrop"
              aria-label="Close services"
              onClick={() => setServicesOpen(false)}
            />
            <div
              ref={sheetRef}
              className="services-sheet__panel"
              role="dialog"
              aria-modal="true"
              aria-label="Book a service"
            >
              <div className="services-sheet__handle" aria-hidden />
              <h2 className="services-sheet__title">What do you want to book?</h2>
              <p className="muted small services-sheet__sub">Rooms, rides, dining, and more</p>
              <div className="services-sheet__list">
                {PLUS_SERVICES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="services-sheet__item"
                    onClick={() => {
                      setServicesOpen(false);
                      navigate(s.href);
                    }}
                  >
                    <strong>{s.label}</strong>
                    <span className="muted small">{s.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <nav className="bottom-nav bottom-nav--fab bottom-nav--glass" aria-label="Primary">
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
            className={`bottom-fab${servicesOpen ? " active" : ""}`}
            aria-label="Book a service"
            aria-expanded={servicesOpen}
            onClick={() => setServicesOpen((v) => !v)}
          >
            <span aria-hidden>{servicesOpen ? "×" : "+"}</span>
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
      </div>
    </div>
  );
}
