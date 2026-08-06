import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ActionPreviewPayload, CommandOutcome, SearchResult } from "@lifeos/shared";

type CommandLayerState = {
  open: boolean;
  query: string;
  openCommand: (seed?: string) => void;
  closeCommand: () => void;
  setQuery: (q: string) => void;
  preview: ActionPreviewPayload | null;
  setPreview: (p: ActionPreviewPayload | null) => void;
  lastOutcome: CommandOutcome | null;
  setLastOutcome: (o: CommandOutcome | null) => void;
  pendingResults: SearchResult[];
  setPendingResults: (r: SearchResult[]) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
};

const CommandLayerContext = createContext<CommandLayerState | null>(null);

export function CommandLayerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<ActionPreviewPayload | null>(null);
  const [lastOutcome, setLastOutcome] = useState<CommandOutcome | null>(null);
  const [pendingResults, setPendingResults] = useState<SearchResult[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const openCommand = useCallback((seed?: string) => {
    if (seed != null) setQuery(seed);
    setOpen(true);
  }, []);

  const closeCommand = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({
      open,
      query,
      openCommand,
      closeCommand,
      setQuery,
      preview,
      setPreview,
      lastOutcome,
      setLastOutcome,
      pendingResults,
      setPendingResults,
      sessionId,
      setSessionId,
    }),
    [open, query, openCommand, closeCommand, preview, lastOutcome, pendingResults, sessionId],
  );

  return <CommandLayerContext.Provider value={value}>{children}</CommandLayerContext.Provider>;
}

export function useCommandLayer() {
  const ctx = useContext(CommandLayerContext);
  if (!ctx) throw new Error("useCommandLayer requires CommandLayerProvider");
  return ctx;
}
