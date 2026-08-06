import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  ActionPreviewPayload,
  CommandHistoryEntry,
  CommandOutcome,
  QuickAccessItem,
  SearchResult,
} from "@lifeos/shared";
import { COMMAND_SHORTCUTS } from "@lifeos/shared";
import { Button, EmptyState, Skeleton } from "@lifeos/ui";
import { commandService } from "../lib/services";
import { useCommandLayer } from "../hooks/useCommandLayer";
import { ActionPreview } from "./ActionPreview";

function applyOutcome(
  outcome: CommandOutcome & { sessionId?: string },
  navigate: ReturnType<typeof useNavigate>,
  setPreview: (p: ActionPreviewPayload | null) => void,
  setResults: (r: SearchResult[]) => void,
  setMessage: (m: string) => void,
  close: () => void,
  setSessionId: (id: string | null) => void,
) {
  if (outcome.sessionId) setSessionId(outcome.sessionId);
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
  if (outcome.type === "results" || outcome.type === "compare") {
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

/** First-class Command Center — Ask LifeOS is the doorway into LifeOS. */
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
    sessionId,
    setSessionId,
  } = useCommandLayer();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [recent, setRecent] = useState<CommandHistoryEntry[]>([]);
  const [quick, setQuick] = useState<QuickAccessItem[]>([]);
  const [shortcuts, setShortcuts] = useState<{ id: string; label: string; query: string }[]>([
    ...COMMAND_SHORTCUTS,
  ]);
  const [liveResults, setLiveResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [canCompare, setCanCompare] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    void commandService
      .suggestions(query)
      .then((s) => {
        setRecent(s.recent);
        setQuick(s.quickAccess);
        if (s.shortcuts?.length) setShortcuts(s.shortcuts);
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
      const outcome = await commandService.run(trimmed, "text", sessionId ?? undefined);
      setLastOutcome(outcome);
      setCanCompare(Boolean(outcome.type === "results" && outcome.canCompare));
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
        setSessionId,
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
      applyOutcome(outcome, navigate, setPreview, setPendingResults, setMessage, closeCommand, setSessionId);
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
      applyOutcome(outcome, navigate, setPreview, setPendingResults, setMessage, closeCommand, setSessionId);
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

  const grouped = {
    OFFERING: displayResults.filter((r) => r.type === "OFFERING"),
    BUSINESS: displayResults.filter((r) => r.type === "BUSINESS"),
    PERSONAL: displayResults.filter((r) =>
      ["PERSONAL", "BOOKING", "TICKET", "ACTIVITY"].includes(r.type),
    ),
    OTHER: displayResults.filter(
      (r) => !["OFFERING", "BUSINESS", "PERSONAL", "BOOKING", "TICKET", "ACTIVITY"].includes(r.type),
    ),
  };

  return (
    <div className="command-overlay" role="presentation">
      <button
        type="button"
        className="command-overlay__backdrop"
        aria-label="Close Command Center"
        onClick={closeCommand}
      />
      <div className="command-panel command-panel--center" role="dialog" aria-modal="true" aria-label="Command Center">
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
            Command Center
          </label>
          <div className="command-panel__input-row">
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
              placeholder="Tell LifeOS what you need…"
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-activedescendant={flatItems[activeIndex] ? `${listId}-${activeIndex}` : undefined}
            />
            <button
              type="button"
              className="command-mic"
              aria-label="Voice input coming soon"
              title="Voice ready — recognition coming soon"
              disabled
            >
              ⌄
            </button>
          </div>
          <span className="command-panel__hint muted small">
            {busy ? "Understanding…" : "Enter to run · Esc to close · ↑↓ · Ctrl/⌘ K"}
          </span>
        </form>

        {error ? <p className="command-panel__error">{error}</p> : null}
        {message ? <p className="command-panel__message">{message}</p> : null}

        {canCompare && displayResults.length > 1 && !preview ? (
          <div className="command-panel__toolbar">
            <Button size="sm" variant="soft" onClick={() => void runCommand("cheapest")}>
              Compare · cheapest
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void runCommand("book it")}>
              Book top result
            </Button>
          </div>
        ) : null}

        {preview ? (
          <ActionPreview
            preview={preview}
            busy={confirmBusy}
            onCancel={() => setPreview(null)}
            onConfirm={() => void confirmPreview()}
          />
        ) : (
          <div id={listId} className="command-panel__body" role="listbox" aria-label="Command results">
            {busy && !displayResults.length ? <Skeleton height={64} label="Loading" /> : null}

            {!query.trim() ? (
              <section>
                <h4 className="command-panel__section">Suggested</h4>
                <div className="command-chips">
                  {shortcuts.slice(0, 8).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="command-chip"
                      onClick={() => {
                        setQuery(s.query);
                        void runCommand(s.query);
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

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
                      <span className="command-row__meta">
                        {item.subtitle ?? (item.pinned ? "Pinned" : "Quick")}
                      </span>
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
              <>
                {(
                  [
                    ["OFFERING", "Offerings"],
                    ["PERSONAL", "Your activity & plans"],
                    ["BUSINESS", "Businesses"],
                    ["OTHER", "More"],
                  ] as const
                ).map(([key, label]) =>
                  grouped[key].length ? (
                    <section key={key}>
                      <h4 className="command-panel__section">{label}</h4>
                      {grouped[key].map((r) => (
                        <div key={r.id} className="command-result" role="option">
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
                      ))}
                    </section>
                  ) : null,
                )}
                {displayResults.length === 0 && !busy ? (
                  <EmptyState
                    title="No matches"
                    detail="Try “massage tomorrow”, “my hotel”, or “what’s happening today?”."
                  />
                ) : null}
              </>
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
      aria-label="Open Command Center"
    >
      <span className="ask-lifeos-trigger__icon" aria-hidden>
        ⌘
      </span>
      <span className="ask-lifeos-trigger__text">
        {compact ? "Ask LifeOS" : "Ask LifeOS…"}
      </span>
      {!compact ? <kbd className="ask-lifeos-trigger__kbd">Ctrl K</kbd> : null}
    </button>
  );
}
