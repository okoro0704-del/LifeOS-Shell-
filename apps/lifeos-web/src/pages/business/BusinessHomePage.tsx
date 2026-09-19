import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DiscoverableBusiness, DiscoverableOffering } from "@lifeos/shared";
import { KernelBrandBar } from "../personal/PersonalHomePage";
import { DiscoveryQuadGrid } from "../../components/DiscoveryQuadGrid";
import { discoverService } from "../../lib/services";

/**
 * Business Space home — zero conventional chrome.
 * Green LifeOS identity (shared KernelBrandBar) + discovery sections.
 *
 * "Businesses Near" uses canonical discover listings. Proximity/distance is NOT
 * fabricated — no km claims unless the API later provides them.
 */
export function BusinessHomePage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<DiscoverableBusiness[]>([]);
  const [services, setServices] = useState<DiscoverableOffering[]>([]);
  const [products, setProducts] = useState<DiscoverableOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [bizExpanded, setBizExpanded] = useState(false);
  const [svcExpanded, setSvcExpanded] = useState(false);
  const [prdExpanded, setPrdExpanded] = useState(false);

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
      setBusinesses(liveBiz);
      setServices(liveOff.filter((o) => o.type !== "PRODUCT"));
      setProducts(liveOff.filter((o) => o.type === "PRODUCT"));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const bizItems = useMemo(() => businesses.map((b) => ({ ...b, id: b.id || b.businessId })), [businesses]);
  const svcItems = useMemo(() => services.map((o) => ({ ...o, id: o.id })), [services]);
  const prdItems = useMemo(() => products.map((o) => ({ ...o, id: o.id })), [products]);

  return (
    <div className="page business-home business-home--immersive">
      <KernelBrandBar hidden={false} align="end" />

      <div className="business-home__body">
        <DiscoveryQuadGrid
          title="Businesses Near"
          subtitle="From LifeOS discovery"
          items={bizItems}
          loading={loading}
          emptyLabel="No businesses available."
          expandAriaLabel="View all businesses"
          expanded={bizExpanded}
          onExpand={() => setBizExpanded(true)}
          onCollapse={() => setBizExpanded(false)}
          renderItem={(b) => (
            <button
              type="button"
              className="discovery-quad__card"
              onClick={() => navigate(`/app/business/${b.businessId || b.id}`)}
            >
              {b.logo ? (
                <img className="discovery-quad__media" src={b.logo} alt="" loading="lazy" />
              ) : (
                <span className="discovery-quad__media discovery-quad__media--fallback" aria-hidden />
              )}
              <span className="discovery-quad__caption">
                <strong>{b.businessName}</strong>
                {b.category ? <span className="muted small">{b.category}</span> : null}
              </span>
            </button>
          )}
        />

        <DiscoveryQuadGrid
          title="Services"
          items={svcItems}
          loading={loading}
          emptyLabel="No services available."
          expandAriaLabel="View all services"
          expanded={svcExpanded}
          onExpand={() => setSvcExpanded(true)}
          onCollapse={() => setSvcExpanded(false)}
          renderItem={(o) => (
            <button
              type="button"
              className="discovery-quad__card"
              onClick={() => navigate(`/app/discover?offering=${o.id}`)}
            >
              {o.image ? (
                <img className="discovery-quad__media" src={o.image} alt="" loading="lazy" />
              ) : (
                <span className="discovery-quad__media discovery-quad__media--fallback" aria-hidden />
              )}
              <span className="discovery-quad__caption">
                <strong>{o.name}</strong>
                {o.businessName ? <span className="muted small">{o.businessName}</span> : null}
              </span>
            </button>
          )}
        />

        <DiscoveryQuadGrid
          title="Products"
          items={prdItems}
          loading={loading}
          emptyLabel="No products available."
          expandAriaLabel="View all products"
          expanded={prdExpanded}
          onExpand={() => setPrdExpanded(true)}
          onCollapse={() => setPrdExpanded(false)}
          renderItem={(o) => (
            <button
              type="button"
              className="discovery-quad__card"
              onClick={() => navigate(`/app/discover?offering=${o.id}`)}
            >
              {o.image ? (
                <img className="discovery-quad__media" src={o.image} alt="" loading="lazy" />
              ) : (
                <span className="discovery-quad__media discovery-quad__media--fallback" aria-hidden />
              )}
              <span className="discovery-quad__caption">
                <strong>{o.name}</strong>
                {o.priceFormatted ? (
                  <span className="muted small">{o.priceFormatted}</span>
                ) : o.businessName ? (
                  <span className="muted small">{o.businessName}</span>
                ) : null}
              </span>
            </button>
          )}
        />
      </div>
    </div>
  );
}
