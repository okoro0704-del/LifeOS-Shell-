import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type WorkspaceMode = "PERSONAL" | "BUSINESS";

export type WorkspaceContextType = {
  mode: WorkspaceMode;
  activeBusinessId: string | null;
  setMode: (newMode: WorkspaceMode) => void;
  /** @deprecated Prefer setMode — kept for prompt compatibility */
  toggleMode: (newMode: WorkspaceMode) => void;
  setActiveBusinessId: (id: string | null) => void;
};

const STORAGE_KEY = "lifeos_active_workspace";
const BUSINESS_ID_KEY = "lifeos_active_business_id";
const COOKIE_KEY = "lifeos_active_workspace";

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

function writeWorkspaceCookie(mode: WorkspaceMode) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(mode)}; path=/; max-age=31536000; SameSite=Lax`;
}

function readStoredMode(): WorkspaceMode {
  if (typeof localStorage === "undefined") return "PERSONAL";
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (fromStorage === "PERSONAL" || fromStorage === "BUSINESS") return fromStorage;
  const fromCookie = readCookie(COOKIE_KEY);
  if (fromCookie === "PERSONAL" || fromCookie === "BUSINESS") return fromCookie;
  return "PERSONAL";
}

function readStoredBusinessId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(BUSINESS_ID_KEY);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<WorkspaceMode>(() => readStoredMode());
  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(() =>
    readStoredBusinessId(),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
    writeWorkspaceCookie(mode);
  }, [mode]);

  useEffect(() => {
    if (activeBusinessId) {
      localStorage.setItem(BUSINESS_ID_KEY, activeBusinessId);
    } else {
      localStorage.removeItem(BUSINESS_ID_KEY);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    function onExternalWorkspace(ev: Event) {
      const detail = (ev as CustomEvent<{ mode?: string }>).detail;
      const next = detail?.mode ?? localStorage.getItem(STORAGE_KEY);
      if (next === "PERSONAL" || next === "BUSINESS") {
        setModeState(next);
      }
    }
    window.addEventListener("lifeos:workspace-change", onExternalWorkspace);
    window.addEventListener("storage", onExternalWorkspace);
    return () => {
      window.removeEventListener("lifeos:workspace-change", onExternalWorkspace);
      window.removeEventListener("storage", onExternalWorkspace);
    };
  }, []);

  const setMode = useCallback((newMode: WorkspaceMode) => {
    setModeState(newMode);
  }, []);

  const setActiveBusinessId = useCallback((id: string | null) => {
    setActiveBusinessIdState(id);
  }, []);

  const value = useMemo<WorkspaceContextType>(
    () => ({
      mode,
      activeBusinessId,
      setMode,
      toggleMode: setMode,
      setActiveBusinessId,
    }),
    [mode, activeBusinessId, setMode, setActiveBusinessId],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      <div
        data-workspace-mode={mode.toLowerCase()}
        className={`lifeos-shell mode-${mode.toLowerCase()}`}
      >
        {children}
      </div>
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
