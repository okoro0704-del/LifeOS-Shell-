import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ExperienceRecord } from "@lifeos/shared";
import { EmptyState, ExperienceCard, SearchBar, SectionHeader, Skeleton } from "@lifeos/ui";
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
        .catch(() => setError("We couldn't search right now. Try again."))
        .finally(() => setBusy(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  return (
    <div className="page">
      <SectionHeader title="Search" />
      <SearchBar
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="What are you looking for?"
        autoFocus
        aria-label="Search LifeOS"
      />
      {error ? <StatusBanner title={error} /> : null}
      {busy ? <Skeleton height={48} label="Searching" /> : null}

      {!q.trim() ? (
        <EmptyState
          title="Search the ecosystem"
          detail="Try a hotel, restaurant, or city."
          action={
            <Link to="/app/discover" className="text-link">
              Browse Discover →
            </Link>
          }
        />
      ) : (
        <>
          <SectionHeader title="Results" subtitle={`${businesses.length + experiences.length} found`} />
          {businesses.length === 0 && experiences.length === 0 && !busy ? (
            <EmptyState title="No matches" detail="Try a different spelling or category." />
          ) : (
            <div className="exp-grid">
              {businesses.map((b) => (
                <ExperienceCard
                  key={b.id + b.experienceId}
                  name={b.name}
                  category={b.category}
                  location={b.location}
                  onClick={() => navigate(`/app/discover?open=${b.experienceId}`)}
                />
              ))}
              {experiences.map((e) => (
                <ExperienceCard
                  key={e.id}
                  name={e.displayName}
                  category={e.category}
                  location={e.location}
                  onClick={() => navigate(`/app/discover?open=${e.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
