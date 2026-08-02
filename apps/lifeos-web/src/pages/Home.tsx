import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ActivityItem, ExperienceRecord } from "@lifeos/shared";
import { Button, EmptyState, SectionHeader, Skeleton, StatusDot } from "@lifeos/ui";
import { ApiError, userFacingMessage } from "../lib/api";
import { activityService, discoverService, walletService } from "../lib/services";
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

  useEffect(() => {
    void (async () => {
      try {
        const [bal, act, disc] = await Promise.all([
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
        ]);
        if (bal) setBalance(bal.formatted);
        setActivities(act.activities.slice(0, 3));
        setFeatured(disc.featured.slice(0, 3));
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
        <StatusDot label="TrustID Connected ✓" />
      </header>

      {dataError ? <StatusBanner title={dataError} /> : null}

      <section className="home-wallet fade-in delay-2">
        <div className="label">Wallet · mock</div>
        {loading && !walletError ? (
          <Skeleton height={40} className="wallet-skel" />
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

      <section className="fade-in delay-2">
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
          <Link to="/app/activity" className="quick-tile">
            Activity
          </Link>
        </div>
      </section>

      <section className="fade-in delay-3">
        <SectionHeader
          title="Activity"
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
          title="Experiences"
          subtitle="Businesses and services you can open"
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
        <div style={{ marginTop: "1rem" }}>
          <Button variant="soft" className="full-width" onClick={() => navigate("/app/discover")}>
            Browse ecosystem
          </Button>
        </div>
      </section>
    </div>
  );
}
