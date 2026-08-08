import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type {
  DiscoverableBusiness,
  DiscoverableOffering,
  ExperiencePermission,
  ExperienceRecord,
  ExperienceSessionPublic,
} from "@lifeos/shared";
import {
  Chip,
  EmptyState,
  SearchBar,
  SectionHeader,
  Skeleton,
} from "@lifeos/ui";
import { ExperienceViewer } from "../components/ExperienceViewer";
import { PermissionConsent } from "../components/PermissionConsent";
import { PermissionRequestSheet } from "../components/PermissionRequestSheet";
import { StatusBanner } from "../components/StatusBanner";
import { discoverService } from "../lib/services";

type Listing = ExperienceRecord & { loadable: boolean; availability?: string };

const BUSINESS_CHIPS = [
  { id: "All", label: "All" },
  { id: "Stay", label: "Hotels & stays" },
  { id: "Eat", label: "Dining" },
  { id: "Wellness", label: "Wellness" },
  { id: "Fitness", label: "Fitness" },
  { id: "Cinema", label: "Cinema" },
  { id: "Events", label: "Events" },
  { id: "Activities", label: "Activities" },
  { id: "Travel", label: "Travel" },
] as const;

const BUSINESS_COVERS: Record<string, string> = {
  Stay: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
  Eat: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80",
  Wellness: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
  Fitness: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
  Cinema: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
  Events: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80",
  Activities: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=80",
  Travel: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80",
};

/** Explore — businesses on LifeOS. Tap a business for its full service page. */
export function DiscoverPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [businesses, setBusinesses] = useState<DiscoverableBusiness[]>([]);
  const [offerings, setOfferings] = useState<DiscoverableOffering[]>([]);
  const [experiences, setExperiences] = useState<Listing[]>([]);
  const [category, setCategory] = useState<string>(params.get("category") || "All");
  const [query, setQuery] = useState(params.get("q") || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState<{
    experience: Listing;
    requestable: { id: ExperiencePermission; label: string }[];
  } | null>(null);
  const [session, setSession] = useState<{
    experience: Listing;
    session: ExperienceSessionPublic;
  } | null>(null);
  const [extraPerms, setExtraPerms] = useState<{
    requested: ExperiencePermission[];
    alreadyGranted: ExperiencePermission[];
  } | null>(null);

  const openId = params.get("open");
  const legacyBusiness = params.get("business");
  const legacyOffering = params.get("offering");

  // Legacy query deep-links → full business page
  useEffect(() => {
    if (legacyBusiness) {
      const qs = legacyOffering ? `?offering=${encodeURIComponent(legacyOffering)}` : "";
      navigate(`/app/business/${encodeURIComponent(legacyBusiness)}${qs}`, { replace: true });
      return;
    }
    if (legacyOffering) {
      void discoverService
        .getOffering(legacyOffering)
        .then((res) => {
          navigate(
            `/app/business/${encodeURIComponent(res.offering.businessId)}?offering=${encodeURIComponent(legacyOffering)}`,
            { replace: true },
          );
        })
        .catch(() => setError("We couldn't open that offering."));
    }
  }, [legacyBusiness, legacyOffering, navigate]);

  useEffect(() => {
    const cat = params.get("category");
    if (cat) setCategory(cat);
  }, [params]);

  useEffect(() => {
    void Promise.all([discoverService.listBusinesses(), discoverService.get()])
      .then(([biz, disc]) => {
        setBusinesses(biz.businesses ?? []);
        setOfferings(disc.offerings ?? []);
        setExperiences(disc.items);
      })
      .catch(() => setError("We couldn't load businesses. Try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!openId) return;
    let cancelled = false;
    void (async () => {
      try {
        let experience: Listing | undefined = experiences.find((i) => i.id === openId);
        if (!experience) {
          const res = await discoverService.getExperience(openId);
          experience = {
            ...res.experience,
            loadable: res.experience.loadable,
            availability:
              typeof res.experience.metadata?.availability === "string"
                ? res.experience.metadata.availability
                : undefined,
          };
        }
        if (cancelled || !experience) return;
        const perms = await discoverService.permissions(openId);
        if (cancelled) return;
        if (perms.connected) {
          const { session: exSession } = await discoverService.session(openId);
          if (!cancelled) setSession({ experience, session: exSession });
        } else {
          setPending({ experience, requestable: perms.requestable });
        }
      } catch {
        if (!cancelled) setError("We couldn't open this experience. Try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openId, experiences]);

  const deployedExperienceIds = useMemo(
    () => new Set(experiences.filter((e) => e.status === "active" || e.loadable).map((e) => e.id)),
    [experiences],
  );

  const coverByBusiness = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of offerings) {
      if (o.image && !map.has(o.businessId)) map.set(o.businessId, o.image);
    }
    return map;
  }, [offerings]);

  const filteredBusinesses = useMemo(() => {
    let list = businesses.filter(
      (b) => deployedExperienceIds.size === 0 || deployedExperienceIds.has(b.experienceId),
    );
    if (!list.length) list = businesses;
    if (category !== "All") list = list.filter((b) => b.category === category);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.businessName.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          (b.location ?? "").toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }, [businesses, category, query, deployedExperienceIds]);

  function selectCategory(id: string) {
    setCategory(id);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id === "All") next.delete("category");
      else next.set("category", id);
      return next;
    });
  }

  function businessCover(b: DiscoverableBusiness) {
    return (
      b.logo ||
      coverByBusiness.get(b.businessId) ||
      BUSINESS_COVERS[b.category] ||
      BUSINESS_COVERS.Stay
    );
  }

  function clearOpen() {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("open");
      return next;
    });
    setPending(null);
    setSession(null);
    setExtraPerms(null);
  }

  async function handlePermissionRequest(permissions: string[]) {
    if (!session) return;
    try {
      const perms = await discoverService.permissions(session.experience.id);
      const requested = permissions.filter((p): p is ExperiencePermission =>
        perms.requestable.some((r) => r.id === p),
      );
      const alreadyGranted = perms.granted;
      const novel = requested.filter((p) => !alreadyGranted.includes(p));
      if (!novel.length) return;
      setExtraPerms({ requested: novel, alreadyGranted });
    } catch {
      setError("We couldn't update permissions. Try again.");
    }
  }

  return (
    <div className="page explore-page">
      {error ? <StatusBanner title={error} /> : null}

      <SearchBar
        id="explore-search"
        placeholder="Search businesses on LifeOS…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        aria-label="Search businesses"
      />

      <div className="chip-row" role="group" aria-label="Business categories">
        {BUSINESS_CHIPS.map((c) => (
          <Chip key={c.id} active={category === c.id} onClick={() => selectCategory(c.id)}>
            {c.label}
          </Chip>
        ))}
      </div>

      {loading ? (
        <>
          <Skeleton height={200} label="Loading businesses" />
          <Skeleton height={200} />
        </>
      ) : filteredBusinesses.length === 0 ? (
        <EmptyState
          title="No businesses found"
          detail="Try another category, or clear your search."
          action={
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setQuery("");
                selectCategory("All");
              }}
            >
              Show all businesses
            </button>
          }
        />
      ) : (
        <>
          <SectionHeader
            title={query.trim() ? "Results" : "Deployed businesses"}
            subtitle={`${filteredBusinesses.length} on LifeOS`}
          />
          <div className="business-grid" role="list">
            {filteredBusinesses.map((b) => {
              const live = deployedExperienceIds.has(b.experienceId);
              return (
                <button
                  key={b.businessId}
                  type="button"
                  role="listitem"
                  className="business-card"
                  onClick={() => navigate(`/app/business/${encodeURIComponent(b.businessId)}`)}
                >
                  <div className="business-card__media">
                    <img src={businessCover(b)} alt="" loading="lazy" />
                    <span className={`business-card__badge${live ? " business-card__badge--live" : ""}`}>
                      {live ? "Live on LifeOS" : b.category}
                    </span>
                  </div>
                  <div className="business-card__body">
                    <strong className="business-card__name">{b.businessName}</strong>
                    <span className="business-card__meta">
                      {b.category}
                      {b.location ? ` · ${b.location}` : ""}
                      {b.rating != null ? ` · ★ ${b.rating.toFixed(1)}` : ""}
                    </span>
                    <p className="business-card__desc">{b.description}</p>
                    <span className="business-card__count">
                      {b.offeringCount ?? 0} service{(b.offeringCount ?? 0) === 1 ? "" : "s"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {pending ? (
        <PermissionConsent
          experience={pending.experience}
          requestable={pending.requestable}
          onCancel={clearOpen}
          onConnected={(exSession) => {
            setPending(null);
            setSession({ experience: pending.experience, session: exSession });
          }}
        />
      ) : null}

      {session ? (
        <ExperienceViewer
          experience={session.experience}
          session={session.session}
          onClose={clearOpen}
          onPermissionRequest={(p) => void handlePermissionRequest(p)}
        />
      ) : null}

      {session && extraPerms ? (
        <PermissionRequestSheet
          experience={session.experience}
          requested={extraPerms.requested}
          alreadyGranted={extraPerms.alreadyGranted}
          onCancel={() => setExtraPerms(null)}
          onResolved={(exSession) => {
            setExtraPerms(null);
            if (exSession) {
              setSession({ experience: session.experience, session: exSession });
            }
          }}
        />
      ) : null}
    </div>
  );
}
