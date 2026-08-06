import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type {
  AttentionItem,
  ContinueItem,
  LifePlanItem,
  RecommendationItem,
  TimelineEntry,
} from "@lifeos/shared";
import { Button, EmptyState, SectionHeader, Skeleton } from "@lifeos/ui";
import { actionService } from "../lib/services";
import { StatusBanner } from "../components/StatusBanner";

function formatWhen(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function PlanRow({
  item,
  onOpen,
}: {
  item: LifePlanItem;
  onOpen: (item: LifePlanItem) => void;
}) {
  return (
    <div className="plan-row plan-row--actions">
      <button type="button" className="plan-row__main" onClick={() => onOpen(item)}>
        <div className="plan-row__when">{formatTime(item.startAt) || formatWhen(item.startAt)}</div>
        <div>
          <strong>{item.title}</strong>
          <div className="muted small">
            {[item.subtitle, item.type, item.status].filter(Boolean).join(" · ")}
          </div>
        </div>
      </button>
      {item.action ? (
        <Button size="sm" variant="soft" onClick={() => onOpen(item)}>
          {item.action.label}
        </Button>
      ) : null}
    </div>
  );
}

export function PlansPage() {
  const navigate = useNavigate();
  const [today, setToday] = useState<LifePlanItem[]>([]);
  const [tomorrow, setTomorrow] = useState<LifePlanItem[]>([]);
  const [thisWeek, setThisWeek] = useState<LifePlanItem[]>([]);
  const [upcoming, setUpcoming] = useState<LifePlanItem[]>([]);
  const [completed, setCompleted] = useState<LifePlanItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [continueItems, setContinue] = useState<ContinueItem[]>([]);
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [view, setView] = useState<"list" | "timeline">("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [providerErrors, setProviderErrors] = useState<string[]>([]);

  useEffect(() => {
    const offlineNow = typeof navigator !== "undefined" && !navigator.onLine;
    setOffline(offlineNow);
    void actionService
      .plans()
      .then((d) => {
        setToday(d.life?.today ?? []);
        setTomorrow(d.life?.tomorrow ?? []);
        setThisWeek(d.life?.thisWeek ?? []);
        setUpcoming(d.life?.upcoming ?? []);
        setCompleted(d.life?.completed ?? []);
        setTimeline(d.timeline ?? []);
        setContinue(d.continueItems ?? []);
        setAttention(d.attention ?? []);
        setRecommendations(d.recommendations ?? []);
        setProviderErrors(d.providerErrors ?? []);
      })
      .catch(() => {
        setError("Couldn't load your plans.");
        if (offlineNow) {
          setError("You're offline. Some information may be outdated.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function openItem(item: LifePlanItem) {
    if (item.action?.href) navigate(item.action.href);
  }

  return (
    <div className="page">
      <SectionHeader
        title="Today"
        subtitle="What’s happening in your life"
        action={
          <button
            type="button"
            className="text-link"
            onClick={() => setView((v) => (v === "list" ? "timeline" : "list"))}
          >
            {view === "list" ? "Timeline" : "List"}
          </button>
        }
      />
      {offline ? (
        <StatusBanner title="You're offline. Some information may be outdated." />
      ) : null}
      {error ? <StatusBanner title={error} /> : null}
      {providerErrors.length > 0 ? (
        <StatusBanner
          title="Some sources unavailable"
          detail={providerErrors.slice(0, 2).join(" · ")}
        />
      ) : null}
      {loading ? <Skeleton height={120} label="Loading today" /> : null}

      {attention.length > 0 ? (
        <section>
          <SectionHeader title="Needs attention" />
          <div className="surface-block">
            {attention.slice(0, 4).map((a) => (
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
                <span className={`attn-pill attn-pill--${a.severity}`}>{a.severity}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {continueItems.length > 0 ? (
        <section>
          <SectionHeader title="Continue" />
          <div className="surface-block">
            {continueItems.map((c) => (
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

      {view === "timeline" ? (
        <section>
          <SectionHeader title="Timeline" />
          {!loading && timeline.length === 0 ? (
            <EmptyState title="No timeline items yet" detail="Book something to see it here." />
          ) : (
            <div className="surface-block timeline-list">
              {timeline.map((t) => (
                <div key={t.id} className="timeline-row">
                  <div className="timeline-row__label muted small">{t.label}</div>
                  <PlanRow item={t.item} onOpen={openItem} />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <SectionHeader title="Today" />
          {!loading && today.length === 0 ? (
            <EmptyState
              title="Nothing scheduled today"
              detail="Discover something to do."
              action={
                <Button variant="soft" size="sm" onClick={() => navigate("/app/discover")}>
                  Discover
                </Button>
              }
            />
          ) : (
            <div className="surface-block">
              {today.map((p) => (
                <PlanRow key={p.id} item={p} onOpen={openItem} />
              ))}
            </div>
          )}

          <SectionHeader title="Tomorrow" />
          {!loading && tomorrow.length === 0 ? (
            <p className="muted small pad-inline">Nothing tomorrow yet.</p>
          ) : (
            <div className="surface-block">
              {tomorrow.map((p) => (
                <PlanRow key={p.id} item={p} onOpen={openItem} />
              ))}
            </div>
          )}

          <SectionHeader title="This week" />
          {!loading && thisWeek.length === 0 ? (
            <p className="muted small pad-inline">Nothing else this week.</p>
          ) : (
            <div className="surface-block">
              {thisWeek.map((p) => (
                <PlanRow key={p.id} item={p} onOpen={openItem} />
              ))}
            </div>
          )}

          <SectionHeader
            title="Upcoming"
            action={
              <Link to="/app/discover" className="text-link">
                Discover
              </Link>
            }
          />
          {!loading && upcoming.length === 0 ? (
            <EmptyState title="No upcoming plans" />
          ) : (
            <div className="surface-block">
              {upcoming.map((p) => (
                <PlanRow key={p.id} item={p} onOpen={openItem} />
              ))}
            </div>
          )}

          <SectionHeader
            title="Completed"
            action={
              <Link to="/app/activity" className="text-link">
                Activity
              </Link>
            }
          />
          {!loading && completed.length === 0 ? (
            <p className="muted small pad-inline">No completed items yet.</p>
          ) : (
            <div className="surface-block">
              {completed.slice(0, 8).map((p) => (
                <PlanRow key={p.id} item={p} onOpen={openItem} />
              ))}
            </div>
          )}
        </>
      )}

      <SectionHeader
        title="Saved"
        action={
          <Link to="/app/saved" className="text-link">
            All
          </Link>
        }
      />
      <p className="muted small pad-inline">
        <Link to="/app/saved" className="text-link">
          View saved offerings
        </Link>
      </p>

      {recommendations.length > 0 ? (
        <section>
          <SectionHeader title="For you" subtitle="Based on your activity" />
          <div className="surface-block">
            {recommendations.slice(0, 4).map((r) => (
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
    </div>
  );
}
