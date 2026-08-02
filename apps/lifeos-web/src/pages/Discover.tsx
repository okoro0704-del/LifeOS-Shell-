import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  ExperiencePermission,
  ExperienceRecord,
  ExperienceSessionPublic,
} from "@lifeos/shared";
import { EmptyState, SectionHeader, Skeleton } from "@lifeos/ui";
import { ExperienceViewer } from "../components/ExperienceViewer";
import { PermissionConsent } from "../components/PermissionConsent";
import { PermissionRequestSheet } from "../components/PermissionRequestSheet";
import { StatusBanner } from "../components/StatusBanner";
import { userFacingMessage } from "../lib/api";
import { discoverService } from "../lib/services";

type Listing = ExperienceRecord & { loadable: boolean; availability?: string };

export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [category, setCategory] = useState<string>("All");
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
    if (category === "All") return items;
    return items.filter((i) => i.category === category);
  }, [items, category]);

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

  return (
    <div className="page">
      <SectionHeader
        title="Discover"
        subtitle="Ecosystem directory — business OSs stay the source of truth"
      />

      {error ? <StatusBanner title={error} /> : null}

      <div className="chip-row" role="tablist" aria-label="Categories">
        {["All", ...categories].map((c) => (
          <button
            key={c}
            type="button"
            className={`chip${category === c ? " active" : ""}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <SectionHeader title="Featured" />
      {loading ? (
        <Skeleton height={96} />
      ) : (
        <div className="feature-rail">
          {featured.map((e) => (
            <button
              key={e.id}
              type="button"
              className="feature-tile"
              onClick={() => setParams({ open: e.id })}
            >
              <div className="feature-name">{e.displayName}</div>
              <div className="muted small">
                {(e.metadata?.osLabel as string) ?? e.osType}
              </div>
            </button>
          ))}
        </div>
      )}

      <SectionHeader title="Directory" />
      {loading ? (
        <Skeleton height={160} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No businesses found." />
      ) : (
        <ul className="list">
          {filtered.map((e) => (
            <li
              key={e.id}
              className="list-row clickable biz-card"
              onClick={() => setParams({ open: e.id })}
            >
              <div>
                <strong>{e.displayName}</strong>
                <div className="muted small">
                  {(e.metadata?.osLabel as string) ?? e.osType}
                  {e.location ? ` · ${e.location}` : ""}
                </div>
                <div className="muted small">{e.description}</div>
              </div>
              <div className="biz-meta">
                <span className="badge">{e.category}</span>
                <span className="muted small">{e.availability ?? "Open"}</span>
              </div>
            </li>
          ))}
        </ul>
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
