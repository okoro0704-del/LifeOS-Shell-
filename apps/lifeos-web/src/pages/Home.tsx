import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type {
  AttentionItem,
  ContinueItem,
  DiscoverableBusiness,
  DiscoverableOffering,
  LifePlanItem,
  RecommendationItem,
  SearchResult,
} from "@lifeos/shared";
import {
  Button,
  EmptyState,
  IconActivity,
  IconBell,
  IconBook,
  IconEat,
  IconExplore,
  IconPay,
  IconStay,
  IconTicket,
  IconWallet,
  SectionHeader,
  Skeleton,
} from "@lifeos/ui";
import {
  actionService,
  activityService,
  commandService,
  discoverService,
} from "../lib/services";
import { SERVICE_VERTICALS } from "../lib/serviceCatalog";
import { SERVICE_CONCEPTS } from "../lib/serviceReels";
import { useCommandLayer } from "../hooks/useCommandLayer";
import { StatusBanner } from "../components/StatusBanner";
import { ActionPreview } from "../components/ActionPreview";
import { ServiceConceptTile } from "../components/ServiceConceptTile";

const BUSINESS_COVERS: Record<string, string> = {
  Stay: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=720&q=80",
  Eat: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=720&q=80",
  Wellness: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=720&q=80",
  Fitness: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=720&q=80",
  Cinema: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=720&q=80",
  Events: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=720&q=80",
  Activities: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=720&q=80",
  Travel: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=720&q=80",
};

const HOME_DISCOVERY = SERVICE_CONCEPTS.slice(0, 8);

function formatTime(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function roomInitials(o: DiscoverableOffering) {
  return o.businessName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const QUICK_LINKS = [
  { id: "bookings", label: "Bookings", href: "/app/activity?filter=bookings", Icon: IconBook },
  { id: "wallet", label: "Finance", href: "/app/wallet", Icon: IconWallet },
  { id: "activity", label: "Activity", href: "/app/activity", Icon: IconActivity },
  { id: "payments", label: "Payments", href: "/app/wallet", Icon: IconPay },
  { id: "messages", label: "Messages", href: "/app/notifications", Icon: IconBell },
  { id: "more", label: "More", href: "/app/services", Icon: IconExplore },
] as const;

const CATEGORY_PILLS = [
  { id: "Stay", label: "Hotels", Icon: IconStay, href: "/app/services/Stay/feed" },
  { id: "Wellness", label: "Spa", Icon: IconExplore, href: "/app/services/Wellness" },
  { id: "Eat", label: "Dining", Icon: IconEat, href: "/app/services/Eat" },
  { id: "Events", label: "Events", Icon: IconTicket, href: "/app/services/Events" },
  { id: "Fitness", label: "Fitness", Icon: IconActivity, href: "/app/services/Fitness" },
  { id: "More", label: "More", Icon: IconExplore, href: "/app/services" },
] as const;

export function HomePage() {
  const navigate = useNavigate();
  const { openCommand, setPreview, preview } = useCommandLayer();
  const [dataError, setDataError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [forYou, setForYou] = useState<DiscoverableOffering[]>([]);
  const [homeRooms, setHomeRooms] = useState<DiscoverableOffering[]>([]);
  const [homeBusinesses, setHomeBusinesses] = useState<DiscoverableBusiness[]>([]);
  const [recs, setRecs] = useState<RecommendationItem[]>([]);
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
        const [disc, rooms, biz, plans] = await Promise.all([
          discoverService.get(),
          discoverService
            .offerings({ category: "Stay" })
            .catch(() => ({ offerings: [] as DiscoverableOffering[] })),
          discoverService.listBusinesses().catch(() => ({ businesses: [] as DiscoverableBusiness[] })),
          actionService.plans().catch(() => null),
        ]);
        setForYou((disc.featuredOfferings ?? disc.offerings ?? []).slice(0, 8));
        const roomList = rooms.offerings
          .filter((o) => o.type === "ROOM" || o.category === "Stay")
          .sort((a, b) => {
            if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
            return (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
          });
        setHomeRooms(roomList.slice(0, 8));
        setHomeBusinesses(
          [...(biz.businesses ?? [])]
            .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
            .slice(0, 8),
        );
        if (plans) {
          setToday(plans.life?.today ?? []);
          setUpcoming((plans.life?.upcoming ?? []).slice(0, 4));
          setContinue(plans.continueItems ?? []);
          setAttention((plans.attention ?? []).slice(0, 3));
          setRecs((plans.recommendations ?? []).slice(0, 6));
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

  const recommended = useMemo(() => {
    if (homeRooms.length) return homeRooms;
    return forYou.slice(0, 6);
  }, [homeRooms, forYou]);

  const glance = useMemo(() => {
    const items = [...today, ...upcoming].slice(0, 6);
    return items;
  }, [today, upcoming]);

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

  function openRoomFeed(roomId?: string) {
    const qs = roomId ? `?focus=${encodeURIComponent(roomId)}` : "";
    navigate(`/app/services/Stay/feed${qs}`);
  }

  function openOffering(o: DiscoverableOffering) {
    if (o.type === "ROOM" || o.category === "Stay") {
      openRoomFeed(o.id);
      return;
    }
    navigate(`/app/discover?offering=${o.id}`);
  }

  return (
    <div className="page home-page home-page--mock">
      {offline || dataError ? (
        <StatusBanner
          title={dataError ?? "You're offline. Some information may be outdated."}
          detail="Cached Today and Saved may still appear when available."
        />
      ) : null}
      {providerHint ? <StatusBanner title={providerHint} /> : null}

      <section className="home-ask-bar" aria-label="Ask or Tell LifeOS">
        <p className="home-ask-bar__prompt">How can we make your day amazing?</p>
        <button
          type="button"
          className="home-ask-bar__btn"
          onClick={() => openCommand(undefined, "ask")}
        >
          <span className="home-ask-bar__spark" aria-hidden>
            ✦
          </span>
          <span className="home-ask-bar__copy">
            <strong>Ask or tell LifeOS anything...</strong>
            <span>Search, plan, book, pay, and more</span>
          </span>
        </button>
      </section>

      <section aria-label="Discovery near you" className="home-media-section">
        <SectionHeader title="Discovery near you" />
        <div className="home-media-rail" role="list">
          {HOME_DISCOVERY.map((concept) => (
            <div key={concept.id} className="home-media-rail__item" role="listitem">
              <ServiceConceptTile
                concept={concept}
                onOpen={() =>
                  navigate(`/app/services/explore/${encodeURIComponent(concept.id)}`)
                }
              />
            </div>
          ))}
          <button
            type="button"
            className="home-see-more"
            role="listitem"
            onClick={() => navigate("/app/services/explore")}
            aria-label="See more Discovery"
          >
            <span className="home-see-more__label">See more</span>
            <span className="home-see-more__hint">Discovery</span>
          </button>
        </div>
      </section>

      <section aria-label="Explore for businesses" className="home-media-section">
        <SectionHeader
          title="Explore for businesses"
          action={
            <button type="button" className="text-link" onClick={() => navigate("/app/discover")}>
              See all
            </button>
          }
        />
        {loading && homeBusinesses.length === 0 ? (
          <div className="home-media-rail">
            <Skeleton height={200} />
            <Skeleton height={200} />
          </div>
        ) : (
          <div className="home-media-rail" role="list">
            {homeBusinesses.map((b) => (
              <button
                key={b.businessId}
                type="button"
                role="listitem"
                className="discover-tile home-biz-tile"
                onClick={() => navigate(`/app/business/${encodeURIComponent(b.businessId)}`)}
                aria-label={b.businessName}
              >
                <img
                  className="discover-tile__media"
                  src={b.logo || BUSINESS_COVERS[b.category] || BUSINESS_COVERS.Stay}
                  alt=""
                  loading="lazy"
                />
                <div className="discover-tile__shade" aria-hidden />
                <div className="discover-tile__meta">
                  <strong className="discover-tile__title">{b.businessName}</strong>
                  <span className="discover-tile__cat">
                    {b.category}
                    {b.location ? ` · ${b.location}` : ""}
                  </span>
                </div>
              </button>
            ))}
            <button
              type="button"
              className="home-see-more"
              role="listitem"
              onClick={() => navigate("/app/discover")}
              aria-label="See more businesses"
            >
              <span className="home-see-more__label">See more</span>
              <span className="home-see-more__hint">Explore</span>
            </button>
          </div>
        )}
      </section>

      <section aria-label="Quick access" className="home-quick">
        <div className="home-quick__row" role="list">
          {QUICK_LINKS.map((q) => (
            <button
              key={q.id}
              type="button"
              role="listitem"
              className="home-quick__item"
              onClick={() => navigate(q.href)}
            >
              <span className="home-quick__icon" aria-hidden>
                <q.Icon size={22} />
              </span>
              <span className="home-quick__label">{q.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Recommended for you">
        <SectionHeader
          title="Recommended for you"
          action={
            <button type="button" className="text-link" onClick={() => openRoomFeed()}>
              See all
            </button>
          }
        />
        {loading ? (
          <div className="home-reco-rail">
            <Skeleton height={240} />
            <Skeleton height={240} />
          </div>
        ) : recommended.length === 0 ? (
          <EmptyState
            title="Nothing recommended yet"
            detail="Browse hotel rooms nearby."
            action={
              <Button variant="soft" size="sm" onClick={() => openRoomFeed()}>
                Browse rooms
              </Button>
            }
          />
        ) : (
          <div className="home-reco-rail" role="list">
            {recommended.map((o) => (
              <button
                key={o.id}
                type="button"
                role="listitem"
                className="home-reco-card"
                onClick={() => openOffering(o)}
              >
                <div className={`home-reco-card__media home-reco-card__media--${o.category.toLowerCase()}`}>
                  {o.image ? (
                    <img src={o.image} alt="" />
                  ) : (
                    <span className="home-reco-card__initials">{roomInitials(o)}</span>
                  )}
                  {o.badge ? <span className="home-reco-card__badge">{o.badge}</span> : null}
                  <span className="home-reco-card__cat">{o.category === "Stay" ? "Rooms" : o.category}</span>
                </div>
                <div className="home-reco-card__body">
                  <strong>{o.name}</strong>
                  <span className="muted small">{o.businessName}</span>
                  <div className="home-reco-card__meta">
                    {o.rating != null ? <span>★ {o.rating.toFixed(1)}</span> : null}
                    <span className="home-reco-card__price">
                      {o.priceFormatted}
                      {o.priceUnit ? ` / ${o.priceUnit}` : ""}
                    </span>
                  </div>
                  {o.availability ? (
                    <span className="home-reco-card__avail">{o.availability}</span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Today at a glance">
        <SectionHeader
          title="Today at a glance"
          action={
            <Link to="/app/plans" className="text-link">
              View all
            </Link>
          }
        />
        {loading ? (
          <Skeleton height={120} label="Loading today" />
        ) : glance.length === 0 ? (
          <EmptyState
            title="Nothing on for today"
            detail="Ask LifeOS what you can do next."
            action={
              <Button variant="soft" size="sm" onClick={() => openCommand("What can I do tonight?", "ask")}>
                Ask LifeOS →
              </Button>
            }
          />
        ) : (
          <div className="home-glance-rail" role="list">
            {glance.map((a) => (
              <button
                key={a.id}
                type="button"
                role="listitem"
                className="home-glance-card"
                onClick={() => a.action?.href && navigate(a.action.href)}
              >
                <span className="home-glance-card__icon" aria-hidden>
                  <IconTicket size={18} />
                </span>
                <span className="home-glance-card__when">{formatTime(a.startAt) || "Soon"}</span>
                <strong>{a.title}</strong>
                <span className="muted small">{a.subtitle}</span>
                <span className="home-glance-card__tag">Upcoming</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {preview ? (
        <section aria-label="Action confirmation" className="home-preview-section">
          <ActionPreview
            preview={preview}
            busy={confirmBusy}
            onCancel={() => setPreview(null)}
            onConfirm={() => void confirmHomePreview()}
            asSection
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
                  {r.actions.slice(0, 1).map((a) => (
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

      {attention[0] || continueItems[0] ? (
        <section className="right-now" aria-label="Needs attention">
          <SectionHeader title="Needs attention" />
          {attention[0] ? (
            <button
              type="button"
              className="right-now__card"
              onClick={() => navigate(attention[0].href ?? "/app/plans")}
            >
              <div>
                <strong>{attention[0].title}</strong>
                <div className="muted small">{attention[0].detail ?? "Review"}</div>
              </div>
              <span className="text-link">Review</span>
            </button>
          ) : continueItems[0] ? (
            <button
              type="button"
              className="right-now__card"
              onClick={() => navigate(continueItems[0].href)}
            >
              <div>
                <strong>{continueItems[0].title}</strong>
                <div className="muted small">{continueItems[0].subtitle}</div>
              </div>
              <span className="text-link">Resume</span>
            </button>
          ) : null}
        </section>
      ) : null}

      {recs.length > 0 ? (
        <section>
          <SectionHeader title="Based on your activity" />
          <div className="surface-block">
            {recs.slice(0, 3).map((r) => (
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
        </section>
      ) : null}

      <section aria-label="Browse categories" className="home-cats">
        <div className="home-cats__row" role="list">
          {CATEGORY_PILLS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="listitem"
              className="home-cats__pill"
              onClick={() => navigate(c.href)}
            >
              <c.Icon size={16} />
              {c.label}
            </button>
          ))}
        </div>
        <p className="muted small home-cats__hint">
          {SERVICE_VERTICALS.length} service verticals · swipe rooms like a feed
        </p>
      </section>
    </div>
  );
}
