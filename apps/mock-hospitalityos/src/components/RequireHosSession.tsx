import { useEffect, useState, type ReactNode } from "react";
import { assertSessionActive, clearLocalSession, type HosSession } from "../lib/session";

export function RequireHosSession({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<HosSession | null | undefined>(undefined);

  useEffect(() => {
    void assertSessionActive().then(setSession);
  }, []);

  if (session === undefined) {
    return (
      <div className="hos">
        <p className="muted">Checking session…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="hos">
        <div className="hos-os">HospitalityOS</div>
        <h1>Sign in via LifeOS</h1>
        <p className="muted">
          This guest experience requires a verified LifeOS experience session.
          Opening with query parameters alone is not accepted.
        </p>
        <a className="hos-btn" href="http://localhost:5174/app/discover">
          Open in LifeOS
        </a>
      </div>
    );
  }

  return <>{children}</>;
}

export function useHosSession(): HosSession | null {
  const [session, setSession] = useState<HosSession | null>(null);
  useEffect(() => {
    void assertSessionActive().then(setSession);
  }, []);
  return session;
}

export function logoutHos() {
  clearLocalSession();
  window.location.href = "http://localhost:5174/app/discover";
}
