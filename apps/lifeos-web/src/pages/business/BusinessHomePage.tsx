import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AskLifeOSTrigger } from "../../components/CommandOverlay";
import { discoverService } from "../../lib/services";
import type { DiscoverableBusiness, DiscoverableOffering } from "@lifeos/shared";

const BOOSTED_NAME_HINTS = ["premium", "featured", "sponsor", "boost"];
const RAIL_VISIBLE = 9;

function isBoostedBusiness(b: DiscoverableBusiness): boolean {
  const hay = `${b.businessName} ${b.category ?? ""}`.toLowerCase();
  return BOOSTED_NAME_HINTS.some((h) => hay.includes(h)) || Boolean((b as { featured?: boolean }).featured);
}

function isBoostedOffering(o: DiscoverableOffering, boostedBizIds: Set<string>): boolean {
  if (o.featured) return true;
  if (o.businessId && boostedBizIds.has(o.businessId)) return true;
  const hay = `${o.name} ${o.businessName ?? ""}`.toLowerCase();
  return BOOSTED_NAME_HINTS.some((h) => hay.includes(h));
}

function railThumb(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/800`;
}

const MOCK_BUSINESSES: DiscoverableBusiness[] = Array.from({ length: 14 }, (_, i) => ({
  id: `mock-biz-${i + 1}`,
  businessId: `mock-biz-${i + 1}`,
  businessName:
    i < 2
      ? `Featured Kitchen ${i + 1}`
      : ["Harbour Cafe", "City Fix Lab", "Green Grocer", "Nova Salon", "Pulse Gym", "Book Nook", "Auto Care", "Pet Place", "Tech Desk", "Bloom Florist", "Daily Bread", "Craft Studio"][
          i % 12
        ]!,
  experienceId: "mock",
  description: "Nearby on LifeOS",
  location: ["Ikeja", "Lekki", "Yaba", "Surulere", "VI"][i % 5]!,
  category: ["Food", "Services", "Retail", "Health", "Beauty"][i % 5]!,
  offeringCount: 3 + (i % 5),
  source: "mock",
}));

const MOCK_OFFERINGS: DiscoverableOffering[] = Array.from({ length: 16 }, (_, i) => ({
  id: `mock-off-${i + 1}`,
  type: "SERVICE",
  name:
    i < 2
      ? `Boosted ${["Massage", "Delivery"][i]}`
      : ["Haircut", "Laundry", "Meal kit", "Phone repair", "Yoga class", "Car wash", "Tutoring", "Photo shoot", "Catering", "Cleaning", "Pet walk", "Design consult", "Spa hour", "Bike hire"][
          i % 14
        ]!,
  description: "Available near you",
  businessId: `mock-biz-${(i % 12) + 1}`,
  businessName: MOCK_BUSINESSES[i % MOCK_BUSINESSES.length]!.businessName,
  category: (["Wellness", "More", "Eat", "Fitness", "Activities"] as const)[i % 5]!,
  experienceId: "mock",
  price: 1500 + i * 250,
  currency: "NGN",
  priceFormatted: `₦${(1500 + i * 250).toLocaleString()}`,
  bookingCapability: true,
  commerceCapability: true,
  capabilities: [],
  source: "mock",
  featured: i < 2,
  image: railThumb(`svc-${i + 1}`),
}));

type PhysicalProduct = {
  id: string;
  name: string;
  seller: string;
  kind: string;
};

const PHYSICAL_PRODUCTS: PhysicalProduct[] = [
  { id: "pp1", name: "Jollof meal box", seller: "Harbour Cafe", kind: "Food" },
  { id: "pp2", name: "Cold press juice", seller: "Green Grocer", kind: "Drinks" },
  { id: "pp3", name: "Ceramic floor tiles", seller: "Craft Studio", kind: "Building" },
  { id: "pp4", name: "Weekly grocery pack", seller: "Daily Bread", kind: "Groceries" },
  { id: "pp5", name: "Palm oil 5L", seller: "Green Grocer", kind: "Groceries" },
  { id: "pp6", name: "Suya platter", seller: "Harbour Cafe", kind: "Food" },
  { id: "pp7", name: "Wall paint set", seller: "City Fix Lab", kind: "Home" },
  { id: "pp8", name: "Fresh tomatoes crate", seller: "Bloom Florist", kind: "Produce" },
];

type BizRow = { b: DiscoverableBusiness; boosted: boolean; distance: number };
type OffRow = { o: DiscoverableOffering; boosted: boolean; distance: number };

/**
 * Business space home — Ask LifeOS, near-me rails, physical Products.
 */
export function BusinessHomePage() {
  const navigate = useNavigate();
  const [locLabel, setLocLabel] = useState("Near you");
  const [businesses, setBusinesses] = useState<DiscoverableBusiness[]>([]);
  const [offerings, setOfferings] = useState<DiscoverableOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [businessesExpanded, setBusinessesExpanded] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocLabel("Location unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setLocLabel("Near your location"),
      () => setLocLabel("Near you"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      discoverService.listBusinesses().catch(() => ({ businesses: [] as DiscoverableBusiness[] })),
      discoverService.offerings({}).catch(() => ({ offerings: [] as DiscoverableOffering[] })),
    ]).then(([biz, offs]) => {
      if (cancelled) return;
      const liveBiz = biz.businesses ?? [];
      const liveOff = offs.offerings ?? [];
      setBusinesses(liveBiz.length >= 10 ? liveBiz : [...liveBiz, ...MOCK_BUSINESSES]);
      setOfferings(liveOff.length >= 10 ? liveOff : [...liveOff, ...MOCK_OFFERINGS]);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rankedBusinesses = useMemo(() => {
    const withMeta: BizRow[] = businesses.map((b, i) => ({
      b,
      boosted: isBoostedBusiness(b),
      distance: 1.2 + (i % 8) * 0.7,
    }));
    withMeta.sort((a, c) => {
      if (a.boosted !== c.boosted) return a.boosted ? -1 : 1;
      return a.distance - c.distance;
    });
    return withMeta;
  }, [businesses]);

  const boostedBizIds = useMemo(() => {
    const ids = new Set<string>();
    for (const { b, boosted } of rankedBusinesses) {
      if (boosted) ids.add(b.businessId || b.id);
    }
    return ids;
  }, [rankedBusinesses]);

  const rankedServices = useMemo(() => {
    const withMeta: OffRow[] = offerings.map((o, i) => ({
      o,
      boosted: isBoostedOffering(o, boostedBizIds),
      distance: 0.8 + (i % 9) * 0.55,
    }));
    withMeta.sort((a, c) => {
      if (a.boosted !== c.boosted) return a.boosted ? -1 : 1;
      return a.distance - c.distance;
    });
    return withMeta;
  }, [offerings, boostedBizIds]);

  const servicesRail = rankedServices.slice(0, RAIL_VISIBLE);
  const businessesRail = rankedBusinesses.slice(0, RAIL_VISIBLE);

  return (
    <div className="page business-home">
      <div className="personal-ask-slot business-home__ask">
        <AskLifeOSTrigger />
      </div>

      <section className="business-home__section" aria-label="Services near me">
        <div className="business-home__section-head">
          <h2>Services near me</h2>
          <span className="muted small">{locLabel}</span>
        </div>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : rankedServices.length === 0 ? (
          <p className="muted">No services nearby yet.</p>
        ) : servicesExpanded ? (
          <ul className="business-home__vertical" aria-label="All services near me">
            {rankedServices.map(({ o, distance }) => (
              <li key={o.id} className="business-home__vertical-item">
                <div className="business-home__card-meta">
                  <span className="muted small">{o.category || o.type || "Service"}</span>
                </div>
                <strong>{o.name}</strong>
                <span className="muted small">
                  {o.businessName ? `${o.businessName} · ` : ""}
                  {distance.toFixed(1)} km
                </span>
                <button
                  type="button"
                  className="los-btn los-btn--ghost los-btn--sm"
                  onClick={() => navigate(`/app/discover?offering=${o.id}`)}
                >
                  View
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="los-btn los-btn--soft los-btn--sm"
                onClick={() => setServicesExpanded(false)}
              >
                Back to rail
              </button>
            </li>
          </ul>
        ) : (
          <div className="near-rail near-rail--hero" role="list">
            {servicesRail.map(({ o, distance }) => (
              <button
                key={o.id}
                type="button"
                className="near-rail__card near-rail__card--media"
                role="listitem"
                onClick={() => navigate(`/app/discover?offering=${o.id}`)}
              >
                <img
                  className="near-rail__thumb"
                  src={o.image || railThumb(o.id)}
                  alt=""
                  loading="lazy"
                />
                <span className="near-rail__caption">
                  <strong>{o.name}</strong>
                  <span className="muted small">{distance.toFixed(1)} km</span>
                </span>
              </button>
            ))}
            {rankedServices.length > RAIL_VISIBLE ? (
              <button
                type="button"
                className="near-rail__card near-rail__card--media near-rail__card--more"
                role="listitem"
                onClick={() => setServicesExpanded(true)}
              >
                <span className="near-rail__caption">
                  <strong>See more</strong>
                  <span className="muted small">Browse all</span>
                </span>
              </button>
            ) : null}
          </div>
        )}
      </section>

      <section className="business-home__section" aria-label="Businesses near me">
        <div className="business-home__section-head">
          <h2>Businesses near me</h2>
          <span className="muted small">Nearby</span>
        </div>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : rankedBusinesses.length === 0 ? (
          <p className="muted">No businesses nearby yet.</p>
        ) : businessesExpanded ? (
          <ul className="business-home__vertical" aria-label="All businesses near me">
            {rankedBusinesses.map(({ b, distance }) => (
              <li key={b.id} className="business-home__vertical-item">
                <div className="business-home__card-meta">
                  <span className="muted small">{b.category || "Business"}</span>
                </div>
                <strong>{b.businessName}</strong>
                <span className="muted small">
                  {distance.toFixed(1)} km
                  {b.location ? ` · ${b.location}` : ""}
                </span>
                <button
                  type="button"
                  className="los-btn los-btn--ghost los-btn--sm"
                  onClick={() => navigate(`/app/business/${b.businessId || b.id}`)}
                >
                  Open
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="los-btn los-btn--soft los-btn--sm"
                onClick={() => setBusinessesExpanded(false)}
              >
                Back to rail
              </button>
            </li>
          </ul>
        ) : (
          <div className="near-rail near-rail--hero" role="list">
            {businessesRail.map(({ b, distance }) => (
              <button
                key={b.id}
                type="button"
                className="near-rail__card near-rail__card--media"
                role="listitem"
                onClick={() => navigate(`/app/business/${b.businessId || b.id}`)}
              >
                <img
                  className="near-rail__thumb"
                  src={b.logo || railThumb(b.id)}
                  alt=""
                  loading="lazy"
                />
                <span className="near-rail__caption">
                  <strong>{b.businessName}</strong>
                  <span className="muted small">{distance.toFixed(1)} km</span>
                </span>
              </button>
            ))}
            {rankedBusinesses.length > RAIL_VISIBLE ? (
              <button
                type="button"
                className="near-rail__card near-rail__card--media near-rail__card--more"
                role="listitem"
                onClick={() => setBusinessesExpanded(true)}
              >
                <span className="near-rail__caption">
                  <strong>See more</strong>
                  <span className="muted small">Browse all</span>
                </span>
              </button>
            ) : null}
          </div>
        )}
      </section>

      <section className="business-home__section" aria-label="Products">
        <div className="business-home__section-head">
          <h2>Products</h2>
          <span className="muted small">Food · goods · nearby</span>
        </div>
        <div className="near-rail near-rail--hero" role="list">
          {PHYSICAL_PRODUCTS.map((p) => (
            <button key={p.id} type="button" className="near-rail__card near-rail__card--media" role="listitem">
              <img className="near-rail__thumb" src={railThumb(p.id)} alt="" loading="lazy" />
              <span className="near-rail__boost">{p.kind}</span>
              <span className="near-rail__caption">
                <strong>{p.name}</strong>
                <span className="muted small">{p.seller}</span>
              </span>
            </button>
          ))}
          <button type="button" className="near-rail__card near-rail__card--media near-rail__card--more" role="listitem">
            <span className="near-rail__caption">
              <strong>See more</strong>
              <span className="muted small">Browse all</span>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
