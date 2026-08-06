import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SavedOfferingPublic } from "@lifeos/shared";
import { Button, EmptyState, OfferingCard, SectionHeader, Skeleton } from "@lifeos/ui";
import { actionService } from "../lib/services";
import { StatusBanner } from "../components/StatusBanner";

export function SavedPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedOfferingPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await actionService.saved();
    setItems(data.items);
  }

  useEffect(() => {
    void load()
      .catch(() => setError("Couldn't load saved offerings."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <SectionHeader title="Saved" subtitle="Offerings you want to come back to" />
      {error ? <StatusBanner title={error} /> : null}
      {loading ? <Skeleton height={160} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          detail="Save offerings from Discover to find them here."
          action={
            <Button variant="soft" size="sm" onClick={() => navigate("/app/discover")}>
              Open Discover
            </Button>
          }
        />
      ) : (
        <div className="exp-grid">
          {items.map((s) => (
            <div key={s.id} className="saved-card">
              <OfferingCard
                name={s.name}
                businessName={s.businessName}
                category={s.category}
                price={s.priceFormatted}
                onClick={() => navigate(`/app/discover?offering=${s.offeringId}`)}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void actionService.unsave(s.offeringId).then(load)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
