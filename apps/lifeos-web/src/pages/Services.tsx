import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { DiscoverableOffering } from "@lifeos/shared";
import {
  Button,
  EmptyState,
  IconEat,
  IconExplore,
  IconStay,
  IconTicket,
  OfferingCard,
  SectionHeader,
  Skeleton,
} from "@lifeos/ui";
import { discoverService } from "../lib/services";
import { SERVICE_VERTICALS, serviceVerticalById } from "../lib/serviceCatalog";
import { StatusBanner } from "../components/StatusBanner";

function VerticalIcon({ tone, size = 28 }: { tone: string; size?: number }) {
  if (tone === "stay") return <IconStay size={size} />;
  if (tone === "eat") return <IconEat size={size} />;
  if (tone === "cinema" || tone === "events") return <IconTicket size={size} />;
  return <IconExplore size={size} />;
}

/** Full catalog of services — scrolls like a vertical video feed. */
export function ServicesPage() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void discoverService
      .offerings({})
      .then((d) => {
        const next: Record<string, number> = {};
        for (const o of d.offerings) {
          next[o.category] = (next[o.category] ?? 0) + 1;
        }
        setCounts(next);
      })
      .catch(() => setError("Couldn't load services."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page services-page">
      <header className="services-page__head">
        <SectionHeader
          title="Services"
          subtitle="Scroll through what LifeOS can do for you"
          action={
            <Link to="/app" className="text-link">
              Home
            </Link>
          }
        />
      </header>

      {error ? <StatusBanner title={error} /> : null}

      {loading ? (
        <div className="services-feed" aria-busy="true">
          <Skeleton height={320} label="Loading services" />
          <Skeleton height={320} />
        </div>
      ) : (
        <div className="services-feed" role="list" aria-label="All services">
          {SERVICE_VERTICALS.map((v, i) => {
            const count = counts[v.id] ?? 0;
            return (
              <button
                key={v.id}
                type="button"
                role="listitem"
                className={`services-reel services-reel--${v.tone}`}
                style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
                onClick={() =>
                  navigate(
                    v.id === "Stay"
                      ? `/app/services/Stay/feed`
                      : `/app/services/${encodeURIComponent(v.id)}`,
                  )
                }
              >
                <div className="services-reel__glow" aria-hidden />
                <div className="services-reel__media">
                  <span className="services-reel__icon">
                    <VerticalIcon tone={v.tone} />
                  </span>
                </div>
                <div className="services-reel__body">
                  <span className="services-reel__index">{String(i + 1).padStart(2, "0")}</span>
                  <h2 className="services-reel__title">{v.label}</h2>
                  <p className="services-reel__blurb">{v.blurb}</p>
                  <span className="services-reel__meta">
                    {count > 0 ? `${count} options` : "Browse"} · Tap to pick
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Offerings inside one service vertical — Stay opens the swipe feed. */
export function ServiceCategoryPage() {
  const { category = "" } = useParams();
  const navigate = useNavigate();
  const vertical = serviceVerticalById(category);
  const [offerings, setOfferings] = useState<DiscoverableOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = vertical?.label ?? category;
  const blurb = vertical?.blurb ?? "Pick what you prefer";

  useEffect(() => {
    if (!category) return;
    if (category.toLowerCase() === "stay") {
      navigate("/app/services/Stay/feed", { replace: true });
      return;
    }
    setLoading(true);
    void discoverService
      .offerings({ category })
      .then((d) => setOfferings(d.offerings))
      .catch(() => setError("Couldn't load this category."))
      .finally(() => setLoading(false));
  }, [category, navigate]);

  const sorted = useMemo(
    () =>
      [...offerings].sort((a, b) => {
        if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
        return (b.rating ?? 0) - (a.rating ?? 0);
      }),
    [offerings],
  );

  return (
    <div className="page service-category-page">
      <header className="service-category__head">
        <button type="button" className="text-link" onClick={() => navigate("/app/services")}>
          ← All services
        </button>
        <SectionHeader title={title} subtitle={blurb} />
      </header>

      {error ? <StatusBanner title={error} /> : null}

      {loading ? (
        <>
          <Skeleton height={160} label="Loading options" />
          <Skeleton height={160} />
        </>
      ) : sorted.length === 0 ? (
        <EmptyState
          title={`No ${title.toLowerCase()} yet`}
          detail="Try another service, or ask LifeOS."
          action={
            <Button variant="soft" size="sm" onClick={() => navigate("/app/services")}>
              Browse services
            </Button>
          }
        />
      ) : (
        <div className="service-pick-list" role="list" aria-label={`${title} options`}>
          {sorted.map((o, i) => (
            <div
              key={o.id}
              role="listitem"
              className="service-pick"
              style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
            >
              <OfferingCard
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
                image={o.image}
                onClick={() => navigate(`/app/discover?offering=${o.id}`)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
