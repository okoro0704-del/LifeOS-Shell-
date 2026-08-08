import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { CommandHistoryEntry } from "@lifeos/shared";
import { Button, EmptyState, SectionHeader, Skeleton } from "@lifeos/ui";
import { commandService } from "../lib/services";
import { StatusBanner } from "../components/StatusBanner";
import { AskLifeOSTrigger } from "../components/CommandOverlay";
import { useCommandLayer } from "../hooks/useCommandLayer";

/**
 * Search is a Command Center handoff + recent history destination —
 * not a second search UI.
 */
export function SearchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { openCommand } = useCommandLayer();
  const [recent, setRecent] = useState<CommandHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seed = params.get("q") ?? "";

  useEffect(() => {
    if (seed.trim()) {
      openCommand(seed.trim(), "ask");
    }
  }, [seed, openCommand]);

  useEffect(() => {
    void commandService
      .recent()
      .then((d) => setRecent(d.items))
      .catch(() => setError("Couldn't load recent searches."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="home-command__duo">
        <AskLifeOSTrigger mode="ask" />
        <AskLifeOSTrigger mode="tell" />
      </div>
      <p className="muted small pad-inline" style={{ paddingInline: 0, marginTop: "0.5rem" }}>
        Ask: “hotel rooms near me” · Tell: “book a massage tomorrow”
      </p>
      {error ? <StatusBanner title={error} /> : null}

      <SectionHeader
        title="Recent"
        action={
          recent.length ? (
            <button
              type="button"
              className="text-link"
              onClick={() => void commandService.clearRecent().then(() => setRecent([]))}
            >
              Clear
            </button>
          ) : undefined
        }
      />
      {loading ? <Skeleton height={80} label="Loading recent" /> : null}
      {!loading && recent.length === 0 ? (
        <EmptyState
          title="No recent searches"
          detail="Open Command Center to search the ecosystem."
          action={
            <Button variant="soft" size="sm" onClick={() => openCommand(undefined, "ask")}>
              Ask LifeOS
            </Button>
          }
        />
      ) : (
        <div className="surface-block">
          {recent.slice(0, 12).map((item) => (
            <button
              key={item.id}
              type="button"
              className="plan-row"
              onClick={() => openCommand(item.query, item.kind === "command" ? "tell" : "ask")}
            >
              <div>
                <strong>{item.query}</strong>
                <div className="muted small">{item.kind}</div>
              </div>
              <span className="text-link">{item.kind === "command" ? "Tell" : "Ask"}</span>
            </button>
          ))}
        </div>
      )}

      <SectionHeader title="Shortcuts" />
      <div className="command-chips" style={{ paddingInline: 0 }}>
        {[
          "What's happening today?",
          "Find a massage",
          "My tickets",
          "Show my wallet",
        ].map((q) => (
          <button key={q} type="button" className="command-chip" onClick={() => openCommand(q, "ask")}>
            {q}
          </button>
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={() => navigate("/app/discover")}>
        Browse Discover instead
      </Button>
    </div>
  );
}
