import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ActivityItem, ExperienceRecord, NotificationItem } from "@lifeos/shared";
import { Button, EmptyState, SectionHeader, Skeleton, StatusDot } from "@lifeos/ui";
import { ApiError, userFacingMessage } from "../lib/api";
import {
  activityService,
  connectionService,
  discoverService,
  notificationService,
  walletService,
} from "../lib/services";
import { useAuth } from "../hooks/useAuth";
import { StatusBanner } from "../components/StatusBanner";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<string>("—");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [featured, setFeatured] = useState<(ExperienceRecord & { featured?: boolean })[]>([]);
  const [nearby, setNearby] = useState<(ExperienceRecord & { availability?: string })[]>([]);
  const [recentExperiences, setRecentExperiences] = useState<
    { id: string; displayName: string; osLabel: string }[]
  >([]);
  const [notes, setNotes] = useState<NotificationItem[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [bal, act, disc, conns, notifs] = await Promise.all([
          walletService.balance().catch((err) => {
            setWalletError(
              err instanceof ApiError && err.code === "wallet_unavailable"
                ? "Wallet unavailable."
                : userFacingMessage(err),
            );
            return null;
          }),
          activityService.list(),
          discoverService.get(),
          connectionService.list().catch(() => ({ connections: [] })),
          notificationService.list().catch(() => ({ notifications: [], unreadCount: 0 })),
        ]);
        if (bal) setBalance(bal.formatted);
        setActivities(act.activities.slice(0, 4));
        setFeatured(disc.featured.slice(0, 3));
        setNearby(disc.items.filter((i) => i.location).slice(0, 3));
        const connected = conns.connections
          .filter((c) => c.status === "connected")
          .slice(0, 3)
          .map((c) => ({
            id: c.experienceId,
            displayName: c.displayName,
            osLabel: c.osLabel,
          }));
        setRecentExperiences(connected);
        setNotes(notifs.notifications.filter((n) => !n.read).slice(0, 2));
      } catch (err) {
        setDataError(userFacingMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const first = user?.firstName || user?.displayName?.split(" ")[0] || "there";

  return (
    <div className="page home-page">
      <header className="home-hero">
        <p className="eyebrow fade-in">LifeOS</p>
        <h1 className="fade-in delay-1">
          {greeting()}, {first}
        </h1>
        <StatusDot label="TrustID connected" />
      </header>

      {dataError ? <StatusBanner title={dataError} /> : null}

      <section className="home-wallet fade-in delay-2" aria-label="Wallet summary">
        <div className="label">Wallet · mock</div>
        {loading && !walletError ? (
          <Skeleton height={40} className="wallet-skel" label="Loading balance" />
        ) : walletError ? (
          <p className="wallet-error">{walletError}</p>
        ) : (
          <div className="wallet-amount">{balance}</div>
        )}
        <div className="home-wallet-actions">
          <Link to="/app/wallet?action=pay" className="home-chip">
            Pay
          </Link>
          <Link to="/app/wallet?action=send" className="home-chip">
            Send
          </Link>
          <Link to="/app/wallet?action=receive" className="home-chip">
            Receive
          </Link>
        </div>
      </section>

      <section className="fade-in delay-2" aria-label="Quick actions">
        <div className="quick-grid">
          <Link to="/app/wallet?action=pay" className="quick-tile">
            Pay
          </Link>
          <Link to="/app/search" className="quick-tile">
            Search
          </Link>
          <Link to="/app/discover" className="quick-tile">
            Discover
          </Link>
          <Link to="/app/connections" className="quick-tile">
            Connections
          </Link>
        </div>
      </section>

      <section className="fade-in delay-3">
        <SectionHeader
          title="Continue"
          subtitle="Pick up where you left off"
          action={
            <Link to="/app/connections" className="text-link">
              All
            </Link>
          }
        />
        {loading ? (
          <Skeleton height={72} label="Loading experiences" />
        ) : recentExperiences.length === 0 ? (
          <EmptyState
            title="No recent experiences"
            detail="Connect a business from Discover to see it here."
            action={
              <Button variant="soft" size="sm" onClick={() => navigate("/app/discover")}>
                Browse Discover
              </Button>
            }
          />
        ) : (
          <div className="feature-rail">
            {recentExperiences.map((e) => (
              <Link key={e.id} to={`/app/discover?open=${e.id}`} className="feature-tile">
                <div className="biz-logo" aria-hidden>
                  {e.displayName.slice(0, 1)}
                </div>
                <div className="feature-name">{e.displayName}</div>
                <div className="muted small">{e.osLabel}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="fade-in delay-3">
        <SectionHeader
          title="Near you"
          subtitle="Experiences with a location"
          action={
            <Link to="/app/discover" className="text-link">
              Map soon
            </Link>
          }
        />
        {loading ? (
          <Skeleton height={72} />
        ) : nearby.length === 0 ? (
          <EmptyState title="Nothing nearby yet." detail="Location-tagged businesses will appear here." />
        ) : (
          <ul className="list">
            {nearby.map((e) => (
              <li key={e.id}>
                <Link to={`/app/discover?open=${e.id}`} className="list-row stretch-link">
                  <div>
                    <strong>{e.displayName}</strong>
                    <div className="muted small">{e.location}</div>
                  </div>
                  <span className="badge">{e.category}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="fade-in delay-3">
        <SectionHeader
          title="Recent activity"
          action={
            <Link to="/app/activity" className="text-link">
              See all
            </Link>
          }
        />
        {loading ? (
          <Skeleton height={72} />
        ) : activities.length === 0 ? (
          <EmptyState title="No activity yet." detail="Your ecosystem events will appear here." />
        ) : (
          <ul className="list">
            {activities.map((a) => (
              <li key={a.id} className="list-row">
                <div>
                  <strong>{a.title}</strong>
                  <div className="muted small">{a.detail}</div>
                </div>
                {a.amount ? <span className="mono">{a.amount}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="fade-in delay-3">
        <SectionHeader
          title="Notifications"
          action={
            <Link to="/app/notifications" className="text-link">
              Inbox
            </Link>
          }
        />
        {loading ? (
          <Skeleton height={56} />
        ) : notes.length === 0 ? (
          <EmptyState title="You're all caught up." />
        ) : (
          <ul className="list">
            {notes.map((n) => (
              <li key={n.id} className="list-row unread">
                <div>
                  <strong>{n.title}</strong>
                  <div className="muted small">{n.body}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="fade-in delay-3">
        <SectionHeader
          title="Featured"
          action={
            <Link to="/app/discover" className="text-link">
              Discover
            </Link>
          }
        />
        <div className="feature-rail">
          {featured.map((e) => (
            <Link key={e.id} to={`/app/discover?open=${e.id}`} className="feature-tile">
              <div className="feature-name">{e.displayName}</div>
              <div className="muted small">
                {(e.metadata?.osLabel as string) ?? e.category}
              </div>
            </Link>
          ))}
        </div>
        {!loading && featured.length === 0 ? <EmptyState title="No experiences yet." /> : null}
        <div className="section-cta">
          <Button variant="soft" className="full-width" onClick={() => navigate("/app/discover")}>
            Browse ecosystem
          </Button>
        </div>
      </section>
    </div>
  );
}
