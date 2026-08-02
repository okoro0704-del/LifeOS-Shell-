import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@lifeos/ui";
import { authClient, checkTrustIdReachable } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { StatusBanner } from "../components/StatusBanner";

export function WelcomePage() {
  const { user, loading, status } = useAuth();
  const navigate = useNavigate();
  const [trustIdUp, setTrustIdUp] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    void checkTrustIdReachable().then(setTrustIdUp);
  }, []);

  return (
    <div className="welcome">
      <div className="welcome-atmosphere" aria-hidden />
      <div className="welcome-inner">
        <p className="brand-hero">LifeOS</p>
        <h1>Your everyday shell for a trusted digital life</h1>
        <p className="lead">
          Identity stays with TrustID. LifeOS brings together your wallet, activity,
          and business experiences — without owning their backends.
        </p>

        {status === "session_expired" ? (
          <StatusBanner
            title="Your LifeOS session has expired"
            detail="Continue with TrustID to sign in again."
          />
        ) : null}

        {status === "lifeos_unavailable" ? (
          <StatusBanner
            title="We couldn't load your LifeOS data"
            detail="The LifeOS API may be offline. You can still try signing in once it recovers."
          />
        ) : null}

        {trustIdUp === false ? (
          <StatusBanner
            title="TrustID is temporarily unavailable"
            detail="Start the TrustID API on port 8787, then try again."
          />
        ) : null}

        <Button
          className="welcome-cta"
          disabled={trustIdUp === false || starting}
          onClick={() => {
            setStarting(true);
            void authClient.beginLogin();
          }}
        >
          Continue with TrustID
        </Button>
        <p className="fine muted">
          No LifeOS password. No separate consumer account.
        </p>
      </div>
    </div>
  );
}
