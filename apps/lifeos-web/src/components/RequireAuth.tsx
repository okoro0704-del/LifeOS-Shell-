import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { StatusBanner } from "./StatusBanner";
import { Button } from "@lifeos/ui";

export function RequireAuth() {
  const { user, loading, status } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="welcome">
        <div className="welcome-inner">
          <p className="brand-hero">LifeOS Business</p>
          <p className="lead">Loading…</p>
        </div>
      </div>
    );
  }

  if (status === "session_expired") {
    return (
      <div className="welcome">
        <div className="welcome-inner">
          <p className="brand-hero">LifeOS Business</p>
          <StatusBanner
            title="Your session ended"
            detail="Log into LifeOS Business again to continue."
            action={
              <Button onClick={() => navigate("/")}>Log into LifeOS Business →</Button>
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
          <p className="brand-hero">LifeOS Business</p>
          <StatusBanner
            title="Something went wrong"
            detail="We couldn't load LifeOS Business. Try again in a moment."
            action={<Button onClick={() => window.location.reload()}>Try again</Button>}
          />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  return <Outlet />;
}
