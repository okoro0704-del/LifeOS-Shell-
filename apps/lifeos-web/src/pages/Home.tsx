import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ActivityItem, ExperienceRecord } from "@lifeos/shared";
import {
  ActivityRow,
  Button,
  EmptyState,
  ExperienceCard,
  QuickAction,
  SectionHeader,
  Skeleton,
  StatusBadge,
  WalletCard,
} from "@lifeos/ui";
import { ApiError } from "../lib/api";
import {
  activityService,
  connectionService,
  discoverService,
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

function maskAddress(address?: string) {
  if (!address || address.length < 8) return "••••";
  return `•••• ${address.slice(-4)}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<string>("—");
  const [walletAddress, setWalletAddress] = useState<string | undefined>();
  const [walletError, setWalletError] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [featured, setFeatured] = useState<(ExperienceRecord & { availability?: string })[]>([]);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void (async () => {
      try {
        const [bal, wallet, act, disc, conns] = await Promise.all([
          walletService.balance().catch((err) => {
            if (!(err instanceof ApiError && err.code === "wallet_unavailable")) {
              /* ignore */
            }
            setWalletError(true);
            return null;
          }),
          walletService.get().catch(() => null),
          activityService.list(),
          discoverService.get(),
          connectionService.list().catch(() => ({ connections: [] })),
        ]);
        if (bal) setBalance(bal.formatted);
        if (wallet?.wallet.address) setWalletAddress(wallet.wallet.address);
        setActivities(act.activities);
        setFeatured((disc.featured as typeof featured).slice(0, 4));
        setConnectedIds(
          new Set(
            conns.connections
              .filter((c) => c.status === "connected")
              .map((c) => c.experienceId),
          ),
        );
      } catch (err) {
        setDataError("We couldn't load your home feed. Try again.");
        void err;
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const first = user?.firstName || user?.displayName?.split(" ")[0] || "there";
  const todayItems = useMemo(
    () => activities.filter((a) => isToday(a.createdAt)).slice(0, 4),
    [activities],
  );
  const recentItems = useMemo(() => activities.slice(0, 5), [activities]);

  return (
    <div className="page home-page">
      <header className="home-greeting">
        <p className="home-greeting__hello">{greeting()}</p>
        <h1 className="home-greeting__name">{first}</h1>
        <StatusBadge label="Identity protected" tone="ok" />
      </header>

      {dataError ? (
        <StatusBanner
          title={dataError}
          detail="Check your connection and refresh."
        />
      ) : null}

      <section aria-label="Wallet">
        {loading ? (
          <Skeleton height={180} label="Loading wallet" className="wallet-skel-block" />
        ) : (
          <WalletCard
            balance={walletError ? undefined : balance}
            locked={walletError}
            lockedMessage="Connect with TrustID to continue"
            mask={maskAddress(walletAddress)}
            actions={
              walletError ? null : (
                <>
                  <Link to="/app/wallet?action=pay" className="los-wallet__action">
                    Pay
                  </Link>
                  <Link to="/app/wallet?action=send" className="los-wallet__action">
                    Send
                  </Link>
                  <Link to="/app/wallet?action=receive" className="los-wallet__action">
                    Receive
                  </Link>
                </>
              )
            }
          />
        )}
      </section>

      <section aria-label="Quick actions">
        <div className="quick-row">
          <QuickAction icon="◈" label="Pay" onClick={() => navigate("/app/wallet?action=pay")} />
          <QuickAction icon="↑" label="Send" onClick={() => navigate("/app/wallet?action=send")} />
          <QuickAction icon="↓" label="Receive" onClick={() => navigate("/app/wallet?action=receive")} />
          <QuickAction icon="⌂" label="Book" onClick={() => navigate("/app/discover?category=Hotels")} />
          <QuickAction icon="◎" label="Discover" onClick={() => navigate("/app/discover")} />
          <QuickAction icon="☰" label="Tickets" onClick={() => navigate("/app/activity")} />
        </div>
      </section>

      <section>
        <SectionHeader title="Today" />
        {loading ? (
          <Skeleton height={88} label="Loading today" />
        ) : todayItems.length === 0 ? (
          <EmptyState
            title="Nothing scheduled yet"
            detail="Discover something for today."
            action={
              <Button variant="soft" size="sm" onClick={() => navigate("/app/discover")}>
                Discover something for today →
              </Button>
            }
          />
        ) : (
          <div className="surface-block">
            {todayItems.map((a) => (
              <ActivityRow
                key={a.id}
                kind={a.kind}
                title={a.title}
                detail={a.detail}
                time={formatTime(a.createdAt)}
                amount={a.amount ?? undefined}
                onClick={a.deepLink ? () => navigate(a.deepLink!) : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          title="Recommended"
          action={
            <Link to="/app/discover" className="text-link">
              See all
            </Link>
          }
        />
        {loading ? (
          <div className="exp-rail">
            <Skeleton height={180} />
            <Skeleton height={180} />
          </div>
        ) : featured.length === 0 ? (
          <EmptyState
            title="No experiences yet"
            detail="Browse the ecosystem when businesses are available."
            action={
              <Button variant="soft" size="sm" onClick={() => navigate("/app/discover")}>
                Open Explore
              </Button>
            }
          />
        ) : (
          <div className="exp-rail">
            {featured.map((e) => (
              <ExperienceCard
                key={e.id}
                name={e.displayName}
                category={e.category}
                location={e.location}
                availability={e.availability ?? "Available now"}
                initial={e.icon ?? e.displayName}
                connected={connectedIds.has(e.id)}
                onClick={() => navigate(`/app/discover?open=${e.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          title="Recent activity"
          action={
            <Link to="/app/activity" className="text-link">
              All
            </Link>
          }
        />
        {loading ? (
          <Skeleton height={120} />
        ) : recentItems.length === 0 ? (
          <EmptyState title="No recent activity" detail="Events from connected experiences will appear here." />
        ) : (
          <div className="surface-block">
            {recentItems.map((a) => (
              <ActivityRow
                key={a.id}
                kind={a.kind}
                title={a.title}
                detail={a.detail}
                time={formatTime(a.createdAt)}
                amount={a.amount ?? undefined}
                onClick={a.deepLink ? () => navigate(a.deepLink!) : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
