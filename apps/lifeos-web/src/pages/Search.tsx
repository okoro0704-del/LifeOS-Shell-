import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { SearchResult } from "@lifeos/shared";
import { Button, EmptyState, SectionHeader, Skeleton } from "@lifeos/ui";
import { commandService } from "../lib/services";
import { StatusBanner } from "../components/StatusBanner";
import { AskLifeOSTrigger } from "../components/CommandOverlay";
import { useCommandLayer } from "../hooks/useCommandLayer";
import { ActionPreview } from "../components/ActionPreview";

export function SearchPage() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  const { openCommand, preview, setPreview } = useCommandLayer();
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    const seed = params.get("q");
    if (seed) setQ(seed);
  }, [params]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setBusy(true);
      void commandService
        .search(q.trim())
        .then((res) => {
          setResults(res.results);
          setError(null);
        })
        .catch(() => setError("We couldn't search right now. Try again."))
        .finally(() => setBusy(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [q]);

  return (
    <div className="page">
      <SectionHeader title="Search" subtitle="Universal search across LifeOS" />
      <AskLifeOSTrigger />
      <label className="los-search" style={{ marginTop: "0.75rem" }}>
        <span className="visually-hidden">Search query</span>
        <input
          className="los-search__input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Business, booking, wallet, activity…"
          aria-label="Universal search"
        />
      </label>
      <p className="muted small">
        Or{" "}
        <button type="button" className="text-link" onClick={() => openCommand(q)}>
          Ask LifeOS
        </button>{" "}
        with natural language.
      </p>
      {error ? <StatusBanner title={error} /> : null}
      {preview ? (
        <ActionPreview
          preview={preview}
          busy={confirmBusy}
          onCancel={() => setPreview(null)}
          onConfirm={() => {
            void (async () => {
              setConfirmBusy(true);
              try {
                const outcome = await commandService.executeAction(
                  preview.actionId,
                  preview.params,
                  true,
                );
                setPreview(null);
                if (outcome.type === "navigate") navigate(outcome.path);
              } finally {
                setConfirmBusy(false);
              }
            })();
          }}
        />
      ) : null}
      {busy ? <Skeleton height={48} label="Searching" /> : null}

      {!q.trim() ? (
        <EmptyState title="Search the ecosystem" detail="Try a hotel, spa, wallet, or booking." />
      ) : (
        <>
          <SectionHeader title="Results" subtitle={`${results.length} found`} />
          {results.length === 0 && !busy ? (
            <EmptyState title="No matches" detail="Try a different spelling or Ask LifeOS." />
          ) : (
            <div className="command-home-results">
              {results.map((r) => (
                <div key={r.id} className="command-home-card">
                  <span className="command-result__type">{r.type}</span>
                  <strong>{r.title}</strong>
                  {r.subtitle ? <span className="muted small">{r.subtitle}</span> : null}
                  <div className="row-actions">
                    {r.actions.slice(0, 2).map((a) => (
                      <Button
                        key={a.id}
                        size="sm"
                        variant="soft"
                        onClick={() =>
                          void commandService.executeAction(a.actionId, a.params, false).then((o) => {
                            if (o.type === "navigate") navigate(o.path);
                            if (o.type === "preview") setPreview(o.preview);
                          })
                        }
                      >
                        {a.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
