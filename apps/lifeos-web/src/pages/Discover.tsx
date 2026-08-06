import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type {
  ExperiencePermission,
  ExperienceRecord,
  ExperienceSessionPublic,
} from "@lifeos/shared";
import {
  Chip,
  EmptyState,
  ExperienceCard,
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

const CATEGORY_CHIPS = [
  { id: "All", label: "All" },
  { id: "Hotels", label: "Stay" },
  { id: "Restaurants", label: "Eat" },
  { id: "Apartments", label: "Stay+" },
  { id: "Services", label: "Wellness" },
  { id: "Transport", label: "Travel" },
  { id: "Other", label: "More" },
] as const;

export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<Listing[]>([]);
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [category, setCategory] = useState<string>(params.get("category") || "All");
  const [query, setQuery] = useState("");
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

  useEffect(() => {
    const cat = params.get("category");
    if (cat) setCategory(cat);
  }, [params]);

  useEffect(() => {
    void discoverService
      .get()
      .then((d) => {
        setItems(d.items);
        setFeatured(d.featured as Listing[]);
      })
      .catch(() => setError("We couldn't load experiences. Try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!openId || !items.length) return;
    const experience = items.find((i) => i.id === openId);
    if (!experience) return;
    void (async () => {
      try {
        const perms = await discoverService.permissions(openId);
        if (perms.connected) {
          const { session: exSession } = await discoverService.session(openId);
          setSession({ experience, session: exSession });
        } else {
          setPending({ experience, requestable: perms.requestable });
        }
      } catch {
        setError("We couldn't open this experience. Try again.");
      }
    })();
  }, [openId, items]);

  const filtered = useMemo(() => {
    let list = items;
    if (category !== "All") list = list.filter((i) => i.category === category);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.displayName.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.businessName.toLowerCase().includes(q) ||
          (i.location ?? "").toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, category, query]);

  const nearYou = useMemo(() => items.filter((i) => i.location).slice(0, 6), [items]);
  const showFiltered = category !== "All" || query.trim().length > 0;

  function openExperience(id: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("open", id);
      return next;
    });
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

  function selectCategory(id: string) {
    setCategory(id);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id === "All") next.delete("category");
      else next.set("category", id);
      return next;
    });
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
    <div className="page">
      <SectionHeader title="Discover" subtitle="Experiences across your trusted ecosystem" />

      {error ? <StatusBanner title={error} /> : null}

      <SearchBar
        id="discover-search"
        placeholder="What are you looking for?"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        aria-label="Search experiences"
      />

      <div className="chip-row" role="tablist" aria-label="Categories">
        {CATEGORY_CHIPS.map((c) => (
          <Chip
            key={c.id}
            active={category === c.id}
            onClick={() => selectCategory(c.id)}
            role="tab"
            aria-selected={category === c.id}
          >
            {c.label}
          </Chip>
        ))}
      </div>

      {loading ? (
        <>
          <Skeleton height={180} label="Loading experiences" />
          <Skeleton height={180} />
        </>
      ) : showFiltered ? (
        <>
          <SectionHeader
            title={query.trim() ? "Results" : CATEGORY_CHIPS.find((c) => c.id === category)?.label || category}
            subtitle={`${filtered.length} available`}
          />
          {filtered.length === 0 ? (
            <EmptyState
              title="No matches"
              detail="Try another category or clear your search."
              action={
                <button type="button" className="text-link" onClick={() => { setQuery(""); selectCategory("All"); }}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="exp-grid">
              {filtered.map((e) => (
                <ExperienceCard
                  key={e.id}
                  name={e.displayName}
                  category={e.category}
                  location={e.location}
                  availability={e.availability ?? "Available now"}
                  initial={e.icon ?? e.displayName}
                  onClick={() => openExperience(e.id)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <SectionHeader title="Recommended" />
          <div className="exp-rail">
            {featured.map((e) => (
              <ExperienceCard
                key={e.id}
                name={e.displayName}
                category={e.category}
                location={e.location}
                availability={e.availability ?? "Available now"}
                initial={e.icon ?? e.displayName}
                onClick={() => openExperience(e.id)}
              />
            ))}
          </div>
          {!featured.length ? <EmptyState title="Nothing featured yet." /> : null}

          <SectionHeader title="Nearby" subtitle="Location-tagged experiences" />
          {nearYou.length === 0 ? (
            <EmptyState title="Nothing nearby yet" detail="Experiences with locations will appear here." />
          ) : (
            <div className="exp-rail">
              {nearYou.map((e) => (
                <ExperienceCard
                  key={e.id}
                  name={e.displayName}
                  category={e.category}
                  location={e.location}
                  availability={e.availability ?? "Available now"}
                  initial={e.icon ?? e.displayName}
                  onClick={() => openExperience(e.id)}
                />
              ))}
            </div>
          )}

          <SectionHeader
            title="All experiences"
            action={
              <Link to="/app/search" className="text-link">
                Search
              </Link>
            }
          />
          <div className="exp-grid">
            {items.map((e) => (
              <ExperienceCard
                key={e.id}
                name={e.displayName}
                category={e.category}
                location={e.location}
                availability={e.availability ?? "Available now"}
                initial={e.icon ?? e.displayName}
                onClick={() => openExperience(e.id)}
              />
            ))}
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
