import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DiscoverableBusiness, DiscoverableOffering } from "@lifeos/shared";
import { KernelBrandBar } from "../personal/PersonalHomePage";
import {
  DiscoveryQuad,
  ExpandedDiscoveryGrid,
  type DiscoveryKind,
} from "../../components/DiscoveryQuadGrid";
import { discoverService } from "../../lib/services";
import {
  buildDemoBusinesses,
  buildDemoProducts,
  buildDemoServices,
  isLifeOsDemoDiscoveryEnabled,
} from "../../lib/demoDiscoveryFixtures";

/**
 * Business Space home — edge-to-edge discovery quads + diamond expand/contract.
 * activeDiscovery is exclusive: null | business | service | product.
 */
export function BusinessHomePage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<DiscoverableBusiness[]>([]);
  const [services, setServices] = useState<DiscoverableOffering[]>([]);
  const [products, setProducts] = useState<DiscoverableOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDiscovery, setActiveDiscovery] = useState<DiscoveryKind | null>(null);
  const homeScrollRef = useRef<HTMLDivElement>(null);
  const savedScroll = useRef(0);

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
      if (isLifeOsDemoDiscoveryEnabled()) {
        // Isolated demo fixtures for experience testing — never written to production DB.
        setBusinesses(buildDemoBusinesses(24));
        setServices(buildDemoServices(24));
        setProducts(buildDemoProducts(24));
      } else {
        setBusinesses(liveBiz);
        setServices(liveOff.filter((o) => o.type !== "PRODUCT"));
        setProducts(liveOff.filter((o) => o.type === "PRODUCT"));
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const expand = useCallback((kind: DiscoveryKind) => {
    const root = homeScrollRef.current;
    savedScroll.current = root?.scrollTop ?? window.scrollY ?? 0;
    setActiveDiscovery(kind);
    window.history.pushState({ lifeosBizDiscovery: kind }, "");
  }, []);

  const contract = useCallback(() => {
    const state = window.history.state as { lifeosBizDiscovery?: DiscoveryKind } | null;
    if (state?.lifeosBizDiscovery) {
      window.history.back();
      return;
    }
    setActiveDiscovery(null);
    requestAnimationFrame(() => {
      const root = homeScrollRef.current;
      if (root) root.scrollTop = savedScroll.current;
      else window.scrollTo(0, savedScroll.current);
    });
  }, []);

  useEffect(() => {
    const onPop = () => {
      setActiveDiscovery(null);
      requestAnimationFrame(() => {
        const root = homeScrollRef.current;
        if (root) root.scrollTop = savedScroll.current;
        else window.scrollTo(0, savedScroll.current);
      });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const bizItems = useMemo(() => businesses.map((b) => ({ ...b, id: b.id || b.businessId })), [businesses]);
  const svcItems = useMemo(() => services.map((o) => ({ ...o, id: o.id })), [services]);
  const prdItems = useMemo(() => products.map((o) => ({ ...o, id: o.id })), [products]);

  if (activeDiscovery === "business") {
    return (
      <div className="page business-home business-home--discovery">
        <KernelBrandBar hidden={false} />
        <ExpandedDiscoveryGrid
          title="Businesses"
          items={bizItems}
          contractAriaLabel="Return to Business Space Home"
          onContract={contract}
          renderItem={(b) => (
            <button
              type="button"
              className="discovery-quad__card"
              data-no-nav-dock
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
      </div>
    );
  }

  if (activeDiscovery === "service") {
    return (
      <div className="page business-home business-home--discovery">
        <KernelBrandBar hidden={false} />
        <ExpandedDiscoveryGrid
          title="Services"
          items={svcItems}
          contractAriaLabel="Return to Business Space Home"
          onContract={contract}
          renderItem={(o) => (
            <button
              type="button"
              className="discovery-quad__card"
              data-no-nav-dock
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
      </div>
    );
  }

  if (activeDiscovery === "product") {
    return (
      <div className="page business-home business-home--discovery">
        <KernelBrandBar hidden={false} />
        <ExpandedDiscoveryGrid
          title="Products"
          items={prdItems}
          contractAriaLabel="Return to Business Space Home"
          onContract={contract}
          renderItem={(o) => (
            <button
              type="button"
              className="discovery-quad__card"
              data-no-nav-dock
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
    );
  }

  return (
    <div className="page business-home business-home--immersive" ref={homeScrollRef}>
      <KernelBrandBar hidden={false} />

      <div className="business-home__body">
        <DiscoveryQuad
          title="Businesses Near"
          subtitle="From LifeOS discovery"
          items={bizItems}
          loading={loading}
          emptyLabel="No businesses available."
          expandAriaLabel="View all businesses"
          onExpand={() => expand("business")}
          renderItem={(b) => (
            <button
              type="button"
              className="discovery-quad__card"
              data-no-nav-dock
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

        <DiscoveryQuad
          title="Services"
          items={svcItems}
          loading={loading}
          emptyLabel="No services available."
          expandAriaLabel="View all services"
          onExpand={() => expand("service")}
          renderItem={(o) => (
            <button
              type="button"
              className="discovery-quad__card"
              data-no-nav-dock
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

        <DiscoveryQuad
          title="Products"
          items={prdItems}
          loading={loading}
          emptyLabel="No products available."
          expandAriaLabel="View all products"
          onExpand={() => expand("product")}
          renderItem={(o) => (
            <button
              type="button"
              className="discovery-quad__card"
              data-no-nav-dock
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
      <div className="business-home__breath" aria-hidden />
    </div>
  );
}
