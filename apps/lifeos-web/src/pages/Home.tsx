import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type {
  AttentionItem,
  ContinueItem,
  DiscoverableOffering,
  LifePlanItem,
  QuickAccessItem,
  RecommendationItem,
  SearchResult,
} from "@lifeos/shared";
import {
  Button,
  EmptyState,
  IconActivity,
  IconBell,
  IconBook,
  IconExplore,
  IconTicket,
  IconWallet,
  OfferingCard,
  QuickAction,
  SectionHeader,
  Skeleton,
  StatusBadge,
} from "@lifeos/ui";
import {
  actionService,
  activityService,
  commandService,
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

function formatTime(iso?: string | null) {
  if (!iso) return "";
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

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openCommand, setPreview, preview } = useCommandLayer();
  const [dataError, setDataError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [forYou, setForYou] = useState<DiscoverableOffering[]>([]);
  const [recs, setRecs] = useState<RecommendationItem[]>([]);
  const [quick, setQuick] = useState<QuickAccessItem[]>([]);
  const [today, setToday] = useState<LifePlanItem[]>([]);
  const [upcoming, setUpcoming] = useState<LifePlanItem[]>([]);
  const [continueItems, setContinue] = useState<ContinueItem[]>([]);
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [aiResults, setAiResults] = useState<SearchResult[]>([]);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [providerHint, setProviderHint] = useState<string | null>(null);

  useEffect(() => {
    const offlineNow = typeof navigator !== "undefined" && !navigator.onLine;
    setOffline(offlineNow);
    void (async () => {
      try {
        const [disc, qa, plans] = await Promise.all([
          discoverService.get(),
          commandService.quickAccess().catch(() => ({ items: [] as QuickAccessItem[] })),
          actionService.plans().catch(() => null),
        ]);
        setForYou((disc.featuredOfferings ?? disc.offerings ?? []).slice(0, 4));
        setQuick(qa.items.slice(0, 8));
        if (plans) {
          setToday(plans.life?.today ?? []);
          setUpcoming((plans.life?.upcoming ?? []).slice(0, 4));
          setContinue(plans.continueItems ?? []);
          setAttention((plans.attention ?? []).slice(0, 3));
          setRecs((plans.recommendations ?? []).slice(0, 4));
          if (plans.providerErrors?.length) {
            setProviderHint("Some live sources are unavailable — showing what we can.");
          }
        }
      } catch {
        setDataError(
          offlineNow
            ? "You're offline. Some information may be outdated."
            : "We couldn't load your home feed. Try again.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const first = user?.firstName || user?.displayName?.split(" ")[0] || "there";

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
        await activityService.list();
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

      {offline || dataError ? (
        <StatusBanner
          title={dataError ?? "You're offline. Some information may be outdated."}
          detail="Cached Today and Saved may still appear when available."
        />
      ) : null}
      {providerHint ? <StatusBanner title={providerHint} /> : null}

      <section className="home-command" aria-label="Ask LifeOS">
        <AskLifeOSTrigger />
        <p className="muted small home-command__hint">
          Ask what’s on today, or find something for the weekend.
        </p>
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

      {attention.length > 0 ? (
        <section>
          <SectionHeader title="Needs attention" />
          <div className="surface-block">
            {attention.map((a) => (
              <button
                key={a.id}
                type="button"
                className="plan-row"
                onClick={() => a.href && navigate(a.href)}
              >
                <div>
                  <strong>{a.title}</strong>
                  <div className="muted small">{a.detail}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader
          title="Today"
          action={
            <Link to="/app/plans" className="text-link">
              Plans
            </Link>
          }
        />
        {loading ? (
          <Skeleton height={88} label="Loading today" />
        ) : today.length === 0 ? (
          <EmptyState
            title="Nothing on for today"
            detail="Ask LifeOS what you can do next."
            action={
              <Button variant="soft" size="sm" onClick={() => openCommand("What can I do tonight?")}>
                Ask LifeOS →
              </Button>
            }
          />
        ) : (
          <div className="surface-block">
            {today.map((a) => (
              <button
                key={a.id}
                type="button"
                className="plan-row plan-row--actions"
                onClick={() => a.action?.href && navigate(a.action.href)}
              >
                <div className="plan-row__when">{formatTime(a.startAt)}</div>
                <div>
                  <strong>{a.title}</strong>
                  <div className="muted small">{a.subtitle}</div>
                </div>
                {a.action ? <span className="text-link">{a.action.label}</span> : null}
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          title="Upcoming"
          action={
            <Link to="/app/plans" className="text-link">
              All
            </Link>
          }
        />
        {loading ? (
          <Skeleton height={64} label="Loading upcoming" />
        ) : upcoming.length === 0 ? (
          <p className="muted small pad-inline">Nothing upcoming — explore when you’re ready.</p>
        ) : (
          <div className="surface-block">
            {upcoming.map((a) => (
              <button
                key={a.id}
                type="button"
                className="plan-row"
                onClick={() => a.action?.href && navigate(a.action.href)}
              >
                <div>
                  <strong>{a.title}</strong>
                  <div className="muted small">
                    {[a.subtitle, a.startAt && formatTime(a.startAt)].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {continueItems.length > 0 ? (
        <section>
          <SectionHeader title="Continue where you left off" />
          <div className="surface-block">
            {continueItems.slice(0, 3).map((c) => (
              <button key={c.id} type="button" className="plan-row" onClick={() => navigate(c.href)}>
                <div>
                  <strong>{c.title}</strong>
                  <div className="muted small">{c.subtitle}</div>
                </div>
                <span className="text-link">Resume</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

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
        ) : recs.length > 0 ? (
          <div className="surface-block">
            <p className="muted small pad-inline">Based on your activity</p>
            {recs.map((r) => (
              <button
                key={r.id}
                type="button"
                className="plan-row"
                onClick={() => navigate(`/app/discover?offering=${r.offeringId}`)}
              >
                <div>
                  <strong>{r.name}</strong>
                  <div className="muted small">
                    {r.businessName} · {r.reason}
                  </div>
                </div>
                <span className="mono">{r.priceFormatted}</span>
              </button>
            ))}
          </div>
        ) : forYou.length === 0 ? (
          <EmptyState
            title="No offerings yet"
            detail="Discover things you can do across the ecosystem."
            action={
              <Button variant="soft" size="sm" onClick={() => navigate("/app/discover")}>
                Open Discover
              </Button>
            }
          />
        ) : (
          <div className="exp-rail">
            {forYou.map((o) => (
              <OfferingCard
                key={o.id}
                name={o.name}
                businessName={o.businessName}
                category={o.category}
                price={o.priceFormatted}
                priceUnit={o.priceUnit}
                duration={o.duration}
                location={o.location}
                availability={o.availability}
                badge={o.badge}
                rating={o.rating}
                onClick={() => navigate(`/app/discover?offering=${o.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
