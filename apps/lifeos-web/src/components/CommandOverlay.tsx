import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  ActionPreviewPayload,
  CommandHistoryEntry,
  CommandOutcome,
  QuickAccessItem,
  SearchResult,
} from "@lifeos/shared";
import { Button, EmptyState, Skeleton } from "@lifeos/ui";
import { commandService } from "../lib/services";
import { useCommandLayer } from "../hooks/useCommandLayer";
import { ActionPreview } from "./ActionPreview";

function applyOutcome(
  outcome: CommandOutcome,
  navigate: ReturnType<typeof useNavigate>,
  setPreview: (p: ActionPreviewPayload | null) => void,
  setResults: (r: SearchResult[]) => void,
  setMessage: (m: string) => void,
  close: () => void,
) {
  if (outcome.type === "navigate") {
    close();
    navigate(outcome.path);
    return;
  }
  if (outcome.type === "preview") {
    setPreview(outcome.preview);
    setMessage(outcome.message);
    return;
  }
  if (outcome.type === "results") {
    setResults(outcome.results);
    setMessage(outcome.message);
    return;
  }
  if (outcome.type === "answer") {
    setMessage(outcome.message);
    setResults([]);
    return;
  }
  if (outcome.type === "executed") {
    setMessage(outcome.message);
    setPreview(null);
    setResults([]);
  }
}

export function CommandOverlay() {
  const {
    open,
    query,
    setQuery,
    closeCommand,
    preview,
    setPreview,
    setLastOutcome,
    pendingResults,
    setPendingResults,
  } = useCommandLayer();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [recent, setRecent] = useState<CommandHistoryEntry[]>([]);
  const [quick, setQuick] = useState<QuickAccessItem[]>([]);
  const [liveResults, setLiveResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    void commandService
      .suggestions(query)
      .then((s) => {
        setRecent(s.recent);
        setQuick(s.quickAccess);
      })
      .catch(() => undefined);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setLiveResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void commandService
        .search(q)
        .then((res) => setLiveResults(res.results.slice(0, 8)))
        .catch(() => undefined);
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (preview) setPreview(null);
        else closeCommand();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, preview, closeCommand, setPreview]);

  const displayResults = pendingResults.length ? pendingResults : liveResults;
  const flatItems = [
    ...(!query.trim() ? quick.map((q) => ({ kind: "quick" as const, item: q })) : []),
    ...(!query.trim()
      ? recent.slice(0, 5).map((r) => ({ kind: "recent" as const, item: r }))
      : []),
    ...displayResults.map((r) => ({ kind: "result" as const, item: r })),
  ];

  async function runCommand(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const outcome = await commandService.run(trimmed);
      setLastOutcome(outcome);
      applyOutcome(
        outcome,
        navigate,
        setPreview,
        (r) => {
          setPendingResults(r);
          setLiveResults(r);
        },
        setMessage,
        closeCommand,
      );
    } catch {
      setError("Couldn't run that command. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(actionId: string, params?: Record<string, unknown>, confirmed = false) {
    setBusy(true);
    setError(null);
    try {
      const outcome = await commandService.executeAction(actionId, params, confirmed);
      setLastOutcome(outcome);
      applyOutcome(outcome, navigate, setPreview, setPendingResults, setMessage, closeCommand);
    } catch {
      setError("Couldn't run that action.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPreview() {
    if (!preview) return;
    setConfirmBusy(true);
    try {
      const outcome = await commandService.executeAction(preview.actionId, preview.params, true);
      setLastOutcome(outcome);
      applyOutcome(outcome, navigate, setPreview, setPendingResults, setMessage, closeCommand);
      if (outcome.type === "executed") {
        window.setTimeout(() => closeCommand(), 600);
      }
    } catch {
      setError("Couldn't confirm that action.");
    } finally {
      setConfirmBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="command-overlay" role="presentation">
      <button type="button" className="command-overlay__backdrop" aria-label="Close Ask LifeOS" onClick={closeCommand} />
      <div
        className="command-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Ask LifeOS"
      >
        <form
          className="command-panel__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (flatItems[activeIndex]?.kind === "result") {
              const r = flatItems[activeIndex].item as SearchResult;
              const primary = r.actions[0];
              if (primary) void runAction(primary.actionId, primary.params, false);
              else void runCommand(query);
            } else if (flatItems[activeIndex]?.kind === "quick") {
              const q = flatItems[activeIndex].item as QuickAccessItem;
              if (q.navigateTo && !["BOOK_SERVICE", "PAY_INVOICE", "CHECK_IN"].includes(q.actionId)) {
                closeCommand();
                navigate(q.navigateTo);
              } else {
                void runAction(q.actionId, q.params, false);
              }
            } else if (flatItems[activeIndex]?.kind === "recent") {
              const r = flatItems[activeIndex].item as CommandHistoryEntry;
              setQuery(r.query);
              void runCommand(r.query);
            } else {
              void runCommand(query);
            }
          }}
        >
          <label className="command-panel__label" htmlFor="ask-lifeos-input">
            Ask LifeOS
          </label>
          <input
            id="ask-lifeos-input"
            ref={inputRef}
            className="command-panel__input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPendingResults([]);
              setMessage(null);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, Math.max(flatItems.length - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              }
            }}
            placeholder="Ask LifeOS..."
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={flatItems[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          />
          <span className="command-panel__hint muted small">
            {busy ? "Thinking…" : "Enter to run · Esc to close · ↑↓ to move"}
          </span>
        </form>

        {error ? <p className="command-panel__error">{error}</p> : null}
        {message ? <p className="command-panel__message">{message}</p> : null}

        {preview ? (
          <ActionPreview
            preview={preview}
            busy={confirmBusy}
            onCancel={() => setPreview(null)}
            onConfirm={() => void confirmPreview()}
          />
        ) : (
          <div id={listId} className="command-panel__body" role="listbox" aria-label="Suggestions">
            {busy && !displayResults.length ? <Skeleton height={64} label="Loading" /> : null}

            {!query.trim() && quick.length > 0 ? (
              <section>
                <h4 className="command-panel__section">Quick Access</h4>
                {quick.map((item, idx) => {
                  const index = idx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={activeIndex === index}
                      className={`command-row${activeIndex === index ? " active" : ""}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => {
                        if (item.navigateTo && !["BOOK_SERVICE", "PAY_INVOICE", "CHECK_IN"].includes(item.actionId)) {
                          closeCommand();
                          navigate(item.navigateTo);
                        } else {
                          void runAction(item.actionId, item.params, false);
                        }
                      }}
                    >
                      <span className="command-row__title">{item.label}</span>
                      <span className="command-row__meta">{item.subtitle ?? (item.pinned ? "Pinned" : "Quick")}</span>
                    </button>
                  );
                })}
              </section>
            ) : null}

            {!query.trim() && recent.length > 0 ? (
              <section>
                <div className="command-panel__section-row">
                  <h4 className="command-panel__section">Recent</h4>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => void commandService.clearRecent().then(() => setRecent([]))}
                  >
                    Clear
                  </button>
                </div>
                {recent.slice(0, 5).map((item, i) => {
                  const index = quick.length + i;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={activeIndex === index}
                      className={`command-row${activeIndex === index ? " active" : ""}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => {
                        setQuery(item.query);
                        void runCommand(item.query);
                      }}
                    >
                      <span className="command-row__title">{item.query}</span>
                      <span className="command-row__meta">{item.kind}</span>
                    </button>
                  );
                })}
              </section>
            ) : null}

            {query.trim() ? (
              <section>
                <h4 className="command-panel__section">
                  {pendingResults.length ? "Results" : "Matches"}
                </h4>
                {displayResults.length === 0 && !busy ? (
                  <EmptyState title="No matches" detail="Try a business, wallet, or “show my bookings”." />
                ) : (
                  displayResults.map((r, i) => {
                    const index = i;
                    return (
                      <div
                        key={r.id}
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={activeIndex === index}
                        className={`command-result${activeIndex === index ? " active" : ""}`}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        <div className="command-result__main">
                          <span className="command-result__type">{r.type}</span>
                          <strong>{r.title}</strong>
                          {r.subtitle ? <span className="muted small">{r.subtitle}</span> : null}
                          {r.description ? <p className="muted small">{r.description}</p> : null}
                        </div>
                        <div className="command-result__actions">
                          {r.actions.slice(0, 2).map((a) => (
                            <Button
                              key={a.id}
                              size="sm"
                              variant={a.requiresConfirmation ? "soft" : "ghost"}
                              onClick={() => void runAction(a.actionId, a.params, false)}
                            >
                              {a.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function AskLifeOSTrigger({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { openCommand } = useCommandLayer();
  return (
    <button
      type="button"
      className={`ask-lifeos-trigger ${className}`.trim()}
      onClick={() => openCommand()}
      aria-label="Ask LifeOS"
    >
      <span className="ask-lifeos-trigger__icon" aria-hidden>
        ⌘
      </span>
      <span className="ask-lifeos-trigger__text">{compact ? "Ask LifeOS" : "Ask LifeOS..."}</span>
      {!compact ? <kbd className="ask-lifeos-trigger__kbd">Ctrl K</kbd> : null}
    </button>
  );
}
