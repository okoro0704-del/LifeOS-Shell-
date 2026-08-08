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
import {
  ApiError,
  cacheUser,
  getCachedUser,
  getStoredSessionToken,
  isExplicitlyLoggedOut,
  markLoggedOut,
  storeSessionToken,
} from "../lib/api";
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

function readInitialUser(): LifeOsUserPublic | null {
  if (isExplicitlyLoggedOut()) return null;
  if (!getStoredSessionToken()) return null;
  return getCachedUser<LifeOsUserPublic>();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LifeOsUserPublic | null>(() => readInitialUser());
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ClientAuthStatus>("loading");

  const refresh = useCallback(async () => {
    // After Sign out, stay signed out until the next login — do not restore via cookie.
    if (isExplicitlyLoggedOut()) {
      void meService.logout().catch(() => undefined);
      cacheUser(null);
      setUser(null);
      setStatus("unauthenticated");
      setLoading(false);
      return;
    }

    try {
      const data = await meService.get();
      cacheUser(data.user);
      setUser(data.user);
      setStatus("authenticated");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "session_expired" || err.code === "unauthorized") {
          storeSessionToken(null);
          cacheUser(null);
          setUser(null);
          setStatus(err.code === "session_expired" ? "session_expired" : "unauthenticated");
        } else if (err.code === "lifeos_unavailable") {
          // Transient API / network errors must not sign the user out.
          const cached = getCachedUser<LifeOsUserPublic>();
          if (cached && getStoredSessionToken()) {
            setUser(cached);
            setStatus("authenticated");
          } else {
            setStatus("lifeos_unavailable");
          }
        } else {
          setUser(null);
          setStatus("unauthenticated");
        }
      } else {
        const cached = getCachedUser<LifeOsUserPublic>();
        if (cached && getStoredSessionToken()) {
          setUser(cached);
          setStatus("authenticated");
        } else {
          setStatus("lifeos_unavailable");
        }
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
    markLoggedOut();
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
        cacheUser(next);
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
