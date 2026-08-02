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
            title="Your LifeOS session has expired"
            detail="Continue with TrustID."
            action={
              <Button onClick={() => navigate("/")}>Continue with TrustID</Button>
            }
          />
        </div>
      </div>
    );
  }

  if (status === "lifeos_unavailable") {
    return (
      <div className="welcome">
        <div className="welcome-inner">
          <p className="brand-hero">LifeOS</p>
          <StatusBanner
            title="We couldn't load your LifeOS data"
            detail="Check that the LifeOS API is running, then retry."
            action={<Button onClick={() => window.location.reload()}>Retry</Button>}
          />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  return <Outlet />;
}
