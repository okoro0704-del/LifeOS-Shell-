import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, SecurityCard } from "@lifeos/ui";
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
          Wallet, activity, and experiences — with identity that stays yours.
        </p>

        {status === "session_expired" ? (
          <StatusBanner
            title="Your session ended"
            detail="Continue with TrustID to sign in again."
          />
        ) : null}

        {status === "lifeos_unavailable" ? (
          <StatusBanner
            title="Something went wrong"
            detail="We couldn't load LifeOS. Try again in a moment."
          />
        ) : null}

        {trustIdUp === false ? (
          <StatusBanner
            title="Identity service unavailable"
            detail="Please try again shortly."
          />
        ) : null}

        <SecurityCard
          eyebrow="Identity"
          title="Secure your LifeOS session"
          detail="Sign in once with TrustID. No LifeOS password. No separate consumer account."
          action={
            <Button
              className="full-width"
              disabled={trustIdUp === false || starting}
              onClick={() => {
                setStarting(true);
                void authClient.beginLogin();
              }}
            >
              Continue with TrustID →
            </Button>
          }
        />
      </div>
    </div>
  );
}
