import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { StatusBanner } from "./StatusBanner";
import { Button } from "@lifeos/ui";
import { PUBLIC_LIFEOS_ENTRY, rememberTrustReturn } from "../lib/trustBoundary";

export function RequireAuth() {
  const { user, loading, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;

  if (loading) {
    return (
      <div className="welcome">
        <div className="welcome-inner">
          <p className="brand-hero">LifeOS</p>
          <p className="lead">Loading…</p>
        </div>
      </div>
    );
  }

  if (status === "session_expired") {
    return (
      <div className="welcome">
        <div className="welcome-inner">
          <p className="brand-hero">LifeOS</p>
          <StatusBanner
            title="Your session ended"
            detail="Log into LifeOS again to continue."
            action={
              <>
                <Button onClick={() => { rememberTrustReturn(returnTo); navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`); }}>Log into LifeOS →</Button>
                <Button variant="soft" onClick={() => navigate(PUBLIC_LIFEOS_ENTRY)}>Continue browsing</Button>
              </>
            }
          />
        </div>
      </div>
    );
  }

  if (status === "lifeos_unavailable") {
    // Keep the shell if we already know the user — refresh/network blips must not eject them.
    if (user) return <Outlet />;
    return (
      <div className="welcome">
        <div className="welcome-inner">
          <p className="brand-hero">LifeOS</p>
          <StatusBanner
            title="Something went wrong"
            detail="We couldn't load LifeOS. Try again in a moment."
            action={
              <>
                <Button onClick={() => window.location.reload()}>Try again</Button>
                <Button variant="soft" onClick={() => navigate(PUBLIC_LIFEOS_ENTRY)}>Continue browsing</Button>
              </>
            }
          />
        </div>
      </div>
    );
  }

  if (!user) {
    rememberTrustReturn(returnTo);
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }
  return <Outlet />;
}
