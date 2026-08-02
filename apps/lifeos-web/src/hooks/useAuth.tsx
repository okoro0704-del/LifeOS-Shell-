import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LifeOsUserPublic } from "@lifeos/shared";
import { ApiError } from "../lib/api";
import { meService } from "../lib/services";

export type ClientAuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "session_expired"
  | "lifeos_unavailable";

type AuthState = {
  user: LifeOsUserPublic | null;
  loading: boolean;
  status: ClientAuthStatus;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: LifeOsUserPublic | null) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LifeOsUserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ClientAuthStatus>("loading");

  const refresh = useCallback(async () => {
    try {
      const data = await meService.get();
      setUser(data.user);
      setStatus("authenticated");
    } catch (err) {
      setUser(null);
      if (err instanceof ApiError) {
        if (err.code === "session_expired") setStatus("session_expired");
        else if (err.code === "lifeos_unavailable") setStatus("lifeos_unavailable");
        else setStatus("unauthenticated");
      } else {
        setStatus("lifeos_unavailable");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await meService.logout();
    } catch {
      /* still clear local state */
    }
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      status,
      refresh,
      logout,
      setUser: (next: LifeOsUserPublic | null) => {
        setUser(next);
        setStatus(next ? "authenticated" : "unauthenticated");
      },
    }),
    [user, loading, status, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
