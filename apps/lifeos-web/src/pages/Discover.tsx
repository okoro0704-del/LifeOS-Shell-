import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type {
  ExperiencePermission,
  ExperienceRecord,
  ExperienceSessionPublic,
} from "@lifeos/shared";
import { Chip, EmptyState, SectionHeader, Skeleton } from "@lifeos/ui";
import { ExperienceViewer } from "../components/ExperienceViewer";
import { PermissionConsent } from "../components/PermissionConsent";
import { PermissionRequestSheet } from "../components/PermissionRequestSheet";
import { StatusBanner } from "../components/StatusBanner";
import { userFacingMessage } from "../lib/api";
import { discoverService } from "../lib/services";

type Listing = ExperienceRecord & { loadable: boolean; availability?: string };

const SECTION_CATEGORIES = ["Hotels", "Restaurants", "Apartments"] as const;

function BizTile({
  e,
  onOpen,
}: {
  e: Listing;
  onOpen: (id: string) => void;
}) {
  return (
    <button type="button" className="feature-tile" onClick={() => onOpen(e.id)}>
      <div className="biz-logo" aria-hidden>
        {(e.icon && e.icon.length === 1 ? e.icon : e.displayName.slice(0, 1)).toUpperCase()}
      </div>
      <div className="feature-name">{e.displayName}</div>
      <div className="muted small">
        {(e.metadata?.osLabel as string) ?? e.osType}
        {e.location ? ` · ${e.location}` : ""}
      </div>
    </button>
  );
}

export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [category, setCategory] = useState<string>("All");
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
    void discoverService
      .get()
      .then((d) => {
        setItems(d.items);
        setFeatured(d.featured as Listing[]);
        setCategories(d.categories);
      })
      .catch((e) => setError(userFacingMessage(e)))
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
      } catch (e) {
        setError(userFacingMessage(e));
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
          (i.location ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, category, query]);

  const byCategory = useMemo(() => {
    const map: Record<string, Listing[]> = {};
    for (const c of SECTION_CATEGORIES) {
      map[c] = items.filter((i) => i.category === c).slice(0, 4);
    }
    return map;
  }, [items]);

  const nearYou = useMemo(
    () => items.filter((i) => i.location).slice(0, 4),
    [items],
  );

  const popular = useMemo(() => items.slice(0, 4), [items]);
  const recentlyAdded = useMemo(() => [...items].reverse().slice(0, 4), [items]);

  function openExperience(id: string) {
    setParams({ open: id });
  }

  function clearOpen() {
    params.delete("open");
    setParams(params);
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
    } catch (e) {
      setError(userFacingMessage(e));
    }
  }

  const showDirectory = category !== "All" || query.trim().length > 0;

  return (
    <div className="page">
      <SectionHeader
        title="Discover"
        subtitle="Marketplace for TrustID ecosystem experiences"
        action={
          <Link to="/app/search" className="text-link">
            Advanced
          </Link>
        }
      />

      {error ? <StatusBanner title={error} /> : null}

      <label className="sr-only" htmlFor="discover-search">
        Search experiences
      </label>
      <input
        id="discover-search"
        className="search-input"
        type="search"
        placeholder="Search hotels, restaurants, apartments…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />

      <div className="chip-row" role="tablist" aria-label="Categories">
        {["All", ...categories].map((c) => (
          <Chip
            key={c}
            active={category === c}
            onClick={() => setCategory(c)}
            role="tab"
            aria-selected={category === c}
          >
            {c}
          </Chip>
        ))}
      </div>

      {loading ? (
        <>
          <Skeleton height={96} label="Loading featured" />
          <Skeleton height={160} label="Loading directory" />
        </>
      ) : showDirectory ? (
        <>
          <SectionHeader
            title={category === "All" ? "Results" : category}
            subtitle={`${filtered.length} experience${filtered.length === 1 ? "" : "s"}`}
          />
          {filtered.length === 0 ? (
            <EmptyState
              title="No matches"
              detail="Try another category or clear your search."
            />
          ) : (
            <ul className="list">
              {filtered.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className="list-row clickable biz-card full-width-btn"
                    onClick={() => openExperience(e.id)}
                  >
                    <div className="biz-row">
                      <div className="biz-logo" aria-hidden>
                        {e.displayName.slice(0, 1)}
                      </div>
                      <div>
                        <strong>{e.displayName}</strong>
                        <div className="muted small">
                          {(e.metadata?.osLabel as string) ?? e.osType}
                          {e.location ? ` · ${e.location}` : ""}
                        </div>
                        <div className="muted small">{e.description}</div>
                      </div>
                    </div>
                    <div className="biz-meta">
                      <span className="badge">{e.category}</span>
                      <span className="muted small">{e.availability ?? "Open"}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <SectionHeader title="Featured" />
          <div className="feature-rail">
            {featured.map((e) => (
              <BizTile key={e.id} e={e} onOpen={openExperience} />
            ))}
          </div>
          {!featured.length ? <EmptyState title="No featured experiences." /> : null}

          <SectionHeader title="Near you" subtitle="Location-tagged listings" />
          {nearYou.length === 0 ? (
            <EmptyState title="Nothing nearby yet." />
          ) : (
            <div className="feature-rail">
              {nearYou.map((e) => (
                <BizTile key={e.id} e={e} onOpen={openExperience} />
              ))}
            </div>
          )}

          {SECTION_CATEGORIES.map((cat) =>
            byCategory[cat]?.length ? (
              <section key={cat}>
                <SectionHeader
                  title={cat}
                  action={
                    <button type="button" className="text-link" onClick={() => setCategory(cat)}>
                      See all
                    </button>
                  }
                />
                <div className="feature-rail">
                  {byCategory[cat].map((e) => (
                    <BizTile key={e.id} e={e} onOpen={openExperience} />
                  ))}
                </div>
              </section>
            ) : null,
          )}

          <SectionHeader title="Popular" />
          <div className="feature-rail">
            {popular.map((e) => (
              <BizTile key={e.id} e={e} onOpen={openExperience} />
            ))}
          </div>

          <SectionHeader title="Recently added" />
          <div className="feature-rail">
            {recentlyAdded.map((e) => (
              <BizTile key={e.id} e={e} onOpen={openExperience} />
            ))}
          </div>

          <SectionHeader title="Categories" />
          <div className="chip-row">
            {categories.map((c) => (
              <Chip key={c} onClick={() => setCategory(c)}>
                {c}
              </Chip>
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
