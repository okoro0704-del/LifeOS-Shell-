import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ActivityItem, ExperienceRecord, QuickAccessItem, SearchResult } from "@lifeos/shared";
import {
  ActivityRow,
  Button,
  EmptyState,
  ExperienceCard,
  IconActivity,
  IconBell,
  IconBook,
  IconExplore,
  IconTicket,
  IconWallet,
  QuickAction,
  SectionHeader,
  Skeleton,
  StatusBadge,
} from "@lifeos/ui";
import {
  activityService,
  commandService,
  connectionService,
  discoverService,
} from "../lib/services";
import { useAuth } from "../hooks/useAuth";
import { useCommandLayer } from "../hooks/useCommandLayer";
import { StatusBanner } from "../components/StatusBanner";
import { AskLifeOSTrigger } from "../components/CommandOverlay";
import { ActionPreview } from "../components/ActionPreview";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function quickIcon(item: QuickAccessItem) {
  const key = item.icon || item.actionId;
  if (key === "wallet" || item.actionId === "OPEN_WALLET") return <IconWallet size={20} />;
  if (key === "book" || item.actionId === "DISCOVER_BUSINESSES") return <IconBook size={20} />;
  if (key === "ticket" || item.actionId === "VIEW_TICKETS") return <IconTicket size={20} />;
  if (key === "activity" || item.actionId === "VIEW_ACTIVITY") return <IconActivity size={20} />;
  if (key === "bell" || item.actionId === "VIEW_NOTIFICATIONS") return <IconBell size={20} />;
  if (key === "explore") return <IconExplore size={20} />;
  return <IconExplore size={20} />;
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openCommand, setPreview, preview } = useCommandLayer();
  const [dataError, setDataError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [featured, setFeatured] = useState<(ExperienceRecord & { availability?: string })[]>([]);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [quick, setQuick] = useState<QuickAccessItem[]>([]);
  const [aiResults, setAiResults] = useState<SearchResult[]>([]);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [act, disc, conns, qa] = await Promise.all([
          activityService.list(),
          discoverService.get(),
          connectionService.list().catch(() => ({ connections: [] })),
          commandService.quickAccess().catch(() => ({ items: [] as QuickAccessItem[] })),
        ]);
        setActivities(act.activities);
        setFeatured((disc.featured as typeof featured).slice(0, 4));
        setConnectedIds(
          new Set(
            conns.connections
              .filter((c) => c.status === "connected")
              .map((c) => c.experienceId),
          ),
        );
        setQuick(qa.items.slice(0, 8));
      } catch {
        setDataError("We couldn't load your home feed. Try again.");
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

  async function onQuick(item: QuickAccessItem) {
    if (["BOOK_SERVICE", "PAY_INVOICE", "CHECK_IN"].includes(item.actionId)) {
      const outcome = await commandService.executeAction(item.actionId, item.params, false);
      if (outcome.type === "preview") setPreview(outcome.preview);
      return;
    }
    if (item.navigateTo) {
      navigate(item.navigateTo);
      return;
    }
    const outcome = await commandService.executeAction(item.actionId, item.params, false);
    if (outcome.type === "navigate") navigate(outcome.path);
    if (outcome.type === "preview") setPreview(outcome.preview);
  }

  async function confirmHomePreview() {
    if (!preview) return;
    setConfirmBusy(true);
    try {
      const outcome = await commandService.executeAction(preview.actionId, preview.params, true);
      setPreview(null);
      if (outcome.type === "navigate") navigate(outcome.path);
      if (outcome.type === "executed") {
        const act = await activityService.list();
        setActivities(act.activities);
      }
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <div className="page home-page">
      <header className="home-greeting">
        <div className="home-greeting__text">
          <p className="home-greeting__hello">{greeting()}</p>
          <h1 className="home-greeting__name">{first}</h1>
        </div>
        <StatusBadge label="Identity protected" tone="ok" />
      </header>

      {dataError ? (
        <StatusBanner title={dataError} detail="Check your connection and refresh." />
      ) : null}

      <section className="home-command" aria-label="Ask LifeOS">
        <AskLifeOSTrigger />
        <p className="muted small home-command__hint">Search, navigate, or ask — LifeOS understands intent.</p>
      </section>

      <section aria-label="Quick Access">
        <SectionHeader
          title="Quick Access"
          action={
            <button type="button" className="text-link" onClick={() => openCommand()}>
              More
            </button>
          }
        />
        {loading ? (
          <Skeleton height={72} label="Loading quick access" />
        ) : (
          <div className="quick-row">
            {quick.map((item) => (
              <QuickAction
                key={item.id}
                icon={quickIcon(item)}
                label={item.label}
                onClick={() => void onQuick(item)}
              />
            ))}
          </div>
        )}
      </section>

      {preview ? (
        <section aria-label="Action preview">
          <ActionPreview
            preview={preview}
            busy={confirmBusy}
            onCancel={() => setPreview(null)}
            onConfirm={() => void confirmHomePreview()}
          />
        </section>
      ) : null}

      {aiMessage || aiResults.length ? (
        <section aria-label="Ask LifeOS results">
          <SectionHeader title="For this request" subtitle={aiMessage ?? undefined} />
          <div className="command-home-results">
            {aiResults.map((r) => (
              <div key={r.id} className="command-home-card">
                <span className="command-result__type">{r.type}</span>
                <strong>{r.title}</strong>
                {r.subtitle ? <span className="muted small">{r.subtitle}</span> : null}
                <div className="row-actions">
                  {r.actions.slice(0, 2).map((a) => (
                    <Button
                      key={a.id}
                      size="sm"
                      variant="soft"
                      onClick={() =>
                        void commandService.executeAction(a.actionId, a.params, false).then((o) => {
                          if (o.type === "navigate") navigate(o.path);
                          if (o.type === "preview") setPreview(o.preview);
                          if (o.type === "results") {
                            setAiResults(o.results);
                            setAiMessage(o.message);
                          }
                        })
                      }
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader
          title="Today"
          action={
            <Link to="/app/activity" className="text-link">
              All
            </Link>
          }
        />
        {loading ? (
          <Skeleton height={88} label="Loading today" />
        ) : todayItems.length === 0 ? (
          <EmptyState
            title="Nothing on for today"
            detail="Ask LifeOS to find something, or explore the ecosystem."
            action={
              <Button variant="soft" size="sm" onClick={() => openCommand("Find a spa")}>
                Ask LifeOS →
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
          title="For you"
          action={
            <Link to="/app/discover" className="text-link">
              Explore
            </Link>
          }
        />
        {loading ? (
          <div className="exp-rail">
            <Skeleton height={200} />
            <Skeleton height={200} />
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
    </div>
  );
}
