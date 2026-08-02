import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ExperienceRecord } from "@lifeos/shared";
import { EmptyState, SectionHeader, Skeleton } from "@lifeos/ui";
import { userFacingMessage } from "../lib/api";
import { discoverService } from "../lib/services";
import { StatusBanner } from "../components/StatusBanner";

export function SearchPage() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<
    { id: string; name: string; category: string; location?: string | null; experienceId: string }[]
  >([]);
  const [experiences, setExperiences] = useState<ExperienceRecord[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!q.trim()) {
      setBusinesses([]);
      setExperiences([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setBusy(true);
      void discoverService
        .search(q.trim())
        .then((res) => {
          setBusinesses(res.businesses);
          setExperiences(res.experiences);
          setError(null);
        })
        .catch((e) => setError(userFacingMessage(e)))
        .finally(() => setBusy(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  return (
    <div className="page">
      <SectionHeader title="Search" subtitle="Businesses and experiences across LifeOS" />
      <input
        className="search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search hotels, restaurants, services…"
        autoFocus
      />
      {error ? <StatusBanner title={error} /> : null}
      {busy ? <Skeleton height={48} /> : null}

      {!q.trim() ? (
        <EmptyState title="Search the ecosystem" detail="Try “Sunrise” or “Restaurant”." />
      ) : (
        <>
          <SectionHeader title="Businesses" />
          {businesses.length === 0 ? (
            <EmptyState title="No businesses matched." />
          ) : (
            <ul className="list">
              {businesses.map((b) => (
                <li
                  key={b.id + b.experienceId}
                  className="list-row clickable"
                  onClick={() => navigate(`/app/discover?open=${b.experienceId}`)}
                >
                  <div>
                    <strong>{b.name}</strong>
                    <div className="muted small">
                      {b.category}
                      {b.location ? ` · ${b.location}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <SectionHeader title="Experiences" />
          {experiences.length === 0 ? (
            <EmptyState title="No experiences matched." />
          ) : (
            <ul className="list">
              {experiences.map((e) => (
                <li key={e.id} className="list-row clickable">
                  <Link to={`/app/discover?open=${e.id}`} className="stretch-link">
                    <strong>{e.displayName}</strong>
                    <div className="muted small">{e.description}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
