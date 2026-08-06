import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  ActionPreviewPayload,
  CommandHistoryEntry,
  CommandOutcome,
  SearchResult,
} from "@lifeos/shared";
import { ASK_SHORTCUTS, TELL_SHORTCUTS } from "@lifeos/shared";
import { Button, EmptyState, Skeleton } from "@lifeos/ui";
import { commandService } from "../lib/services";
import { useCommandLayer } from "../hooks/useCommandLayer";
import { useFocusTrap } from "../hooks/useFocusTrap";
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

function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const on = () => setMobile(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return mobile;
}

type PanelMode = "idle" | "results" | "preview";

/** Command Center — Ask (search) or Tell (task automation). */
export function CommandOverlay() {
  const {
    open,
    query,
    setQuery,
    commandMode,
    setCommandMode,
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
  const mobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [recent, setRecent] = useState<CommandHistoryEntry[]>([]);
  const [liveResults, setLiveResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [canCompare, setCanCompare] = useState(false);

  const displayResults = pendingResults.length ? pendingResults : liveResults;
  const mode: PanelMode = preview ? "preview" : displayResults.length || message ? "results" : "idle";
  const shortcuts = commandMode === "ask" ? ASK_SHORTCUTS : TELL_SHORTCUTS;
  const isAsk = commandMode === "ask";

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    void commandService
      .recent()
      .then((r) => setRecent(r.items.slice(0, 6)))
      .catch(() => undefined);
    return () => window.clearTimeout(t);
  }, [open, commandMode]);

  useEffect(() => {
    if (!open || !isAsk) return;
    const q = query.trim();
    if (!q || mode === "preview") {
      if (!q) setLiveResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void commandService
        .search(q)
        .then((res) => setLiveResults(res.results.slice(0, 8)))
        .catch(() => undefined);
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query, open, mode, isAsk]);

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

  const flatItems = [
    ...(mode === "idle" && !query.trim()
      ? recent.slice(0, 5).map((r) => ({ kind: "recent" as const, item: r }))
      : []),
    ...(mode !== "preview" ? displayResults.map((r) => ({ kind: "result" as const, item: r })) : []),
  ];

  async function runCommand(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      if (isAsk) {
        const res = await commandService.search(trimmed);
        setLiveResults(res.results);
        setPendingResults(res.results);
        setMessage(
          res.results.length
            ? `Found ${res.results.length} result${res.results.length === 1 ? "" : "s"}`
            : "No matches — try another search.",
        );
        setCanCompare(res.results.length > 1);
        void commandService.run(trimmed, "text", sessionId ?? undefined, "ask").catch(() => undefined);
      } else {
        const outcome = await commandService.run(trimmed, "text", sessionId ?? undefined, "tell");
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
      }
    } catch {
      setError(isAsk ? "Couldn't search. Try again." : "Couldn't run that task. Try again.");
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
    PERSONAL: displayResults.filter((r) =>
      ["PERSONAL", "BOOKING", "TICKET", "ACTIVITY"].includes(r.type),
    ),
    BUSINESS: displayResults.filter((r) => r.type === "BUSINESS"),
    OTHER: displayResults.filter(
      (r) => !["OFFERING", "BUSINESS", "PERSONAL", "BOOKING", "TICKET", "ACTIVITY"].includes(r.type),
    ),
  };

  return (
    <div className={`command-overlay${mobile ? " command-overlay--mobile" : ""}`} role="presentation">
      <button
        type="button"
        className="command-overlay__backdrop"
        aria-label={isAsk ? "Close Ask LifeOS" : "Close Tell LifeOS"}
        onClick={closeCommand}
      />
      <div
        ref={panelRef}
        className={`command-panel${mobile ? " command-panel--sheet" : " command-panel--center"}`}
        role="dialog"
        aria-modal="true"
        aria-label={isAsk ? "Ask LifeOS" : "Tell LifeOS"}
      >
        <div className="command-mode-tabs" role="tablist" aria-label="LifeOS AI mode">
          <button
            type="button"
            role="tab"
            aria-selected={isAsk}
            className={`command-mode-tab${isAsk ? " active" : ""}`}
            onClick={() => {
              setCommandMode("ask");
              setPendingResults([]);
              setLiveResults([]);
              setMessage(null);
              setPreview(null);
            }}
          >
            Ask LifeOS
            <span className="command-mode-tab__hint">Search</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isAsk}
            className={`command-mode-tab${!isAsk ? " active" : ""}`}
            onClick={() => {
              setCommandMode("tell");
              setPendingResults([]);
              setLiveResults([]);
              setMessage(null);
              setPreview(null);
            }}
          >
            Tell LifeOS
            <span className="command-mode-tab__hint">Tasks</span>
          </button>
        </div>

        <form
          className="command-panel__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (flatItems[activeIndex]?.kind === "result") {
              const r = flatItems[activeIndex].item as SearchResult;
              const primary = r.actions[0];
              if (primary) void runAction(primary.actionId, primary.params, false);
              else void runCommand(query);
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
            {isAsk ? "Ask LifeOS" : "Tell LifeOS"}
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
            placeholder={
              isAsk
                ? "Search hotels, food, events, plans…"
                : "Tell LifeOS what to do — book, pay, check in…"
            }
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={flatItems[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          />
          <span className="command-panel__hint muted small">
            {busy
              ? isAsk
                ? "Searching…"
                : "Working on it…"
              : isAsk
                ? "AI-powered search · Enter to search"
                : "AI-powered tasks · Enter to run · confirm when asked"}
          </span>
        </form>

        {error ? <p className="command-panel__error">{error}</p> : null}
        {message && mode !== "idle" ? <p className="command-panel__message">{message}</p> : null}

        {canCompare && displayResults.length > 1 && mode === "results" && isAsk ? (
          <div className="command-panel__toolbar">
            <Button size="sm" variant="soft" onClick={() => void runCommand("cheapest")}>
              Compare · cheapest
            </Button>
          </div>
        ) : null}

        {mode === "preview" && preview ? (
          <ActionPreview
            preview={preview}
            busy={confirmBusy}
            onCancel={() => setPreview(null)}
            onConfirm={() => void confirmPreview()}
          />
        ) : (
          <div
            id={listId}
            className="command-panel__body"
            role="listbox"
            aria-label={isAsk ? "Search results" : "Task results"}
          >
            {busy && mode === "idle" ? <Skeleton height={64} label="Loading" /> : null}

            {mode === "idle" && !query.trim() ? (
              <section>
                <h4 className="command-panel__section">{isAsk ? "Try searching" : "Try a task"}</h4>
                <div className="command-chips">
                  {shortcuts.slice(0, mobile ? 4 : 8).map((s) => (
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

            {mode === "idle" && !query.trim() && recent.length > 0 ? (
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
                {recent.slice(0, 5).map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={activeIndex === i}
                    className={`command-row${activeIndex === i ? " active" : ""}`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => {
                      setQuery(item.query);
                      void runCommand(item.query);
                    }}
                  >
                    <span className="command-row__title">{item.query}</span>
                    <span className="command-row__meta">{item.kind}</span>
                  </button>
                ))}
              </section>
            ) : null}

            {mode === "results" || (query.trim() && mode !== "preview") ? (
              <>
                {(
                  [
                    ["OFFERING", "Offerings"],
                    ["PERSONAL", "Your plans"],
                    ["BUSINESS", "Businesses"],
                    ["OTHER", "More"],
                  ] as const
                ).map(([key, label]) =>
                  grouped[key].length ? (
                    <section key={key}>
                      <h4 className="command-panel__section">{label}</h4>
                      {grouped[key].map((r, i) => (
                        <div
                          key={r.id}
                          id={`${listId}-r-${key}-${i}`}
                          className="command-result"
                          role="option"
                          tabIndex={0}
                          aria-selected={false}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && r.actions[0]) {
                              void runAction(r.actions[0].actionId, r.actions[0].params, false);
                            }
                          }}
                        >
                          <div className="command-result__main">
                            <span className="command-result__type">{r.type}</span>
                            <strong>{r.title}</strong>
                            {r.subtitle ? <span className="muted small">{r.subtitle}</span> : null}
                            {r.description ? <p className="muted small">{r.description}</p> : null}
                          </div>
                          <div className="command-result__actions">
                            {r.actions.slice(0, 1).map((a) => (
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
                    detail={isAsk ? "Try a different search." : "Try a clearer task, like “book a spa”."}
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
  mode = "ask",
}: {
  className?: string;
  compact?: boolean;
  mode?: "ask" | "tell";
}) {
  const { openCommand } = useCommandLayer();
  const isAsk = mode === "ask";
  return (
    <button
      type="button"
      className={`ask-lifeos-trigger ask-lifeos-trigger--${mode} ${className}`.trim()}
      onClick={() => openCommand(undefined, mode)}
      aria-label={isAsk ? "Ask LifeOS — AI search" : "Tell LifeOS — AI tasks"}
    >
      <span className="ask-lifeos-trigger__icon" aria-hidden>
        {isAsk ? "⌕" : "✦"}
      </span>
      <span className="ask-lifeos-trigger__text">
        {compact
          ? isAsk
            ? "Ask LifeOS"
            : "Tell LifeOS"
          : isAsk
            ? "Ask LifeOS…"
            : "Tell LifeOS…"}
      </span>
      {!compact ? (
        <span className="ask-lifeos-trigger__badge">{isAsk ? "Search" : "Tasks"}</span>
      ) : null}
    </button>
  );
}
