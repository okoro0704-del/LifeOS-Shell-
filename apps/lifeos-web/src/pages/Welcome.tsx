import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, SecurityCard } from "@lifeos/ui";
import { authClient, checkTrustIdReachable } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { StatusBanner } from "../components/StatusBanner";
import {
  clearReturningIdentity,
  getReturningIdentity,
  type ReturningIdentity,
} from "../lib/returningIdentity";

export function WelcomePage() {
  const { user, loading, status } = useAuth();
  const navigate = useNavigate();
  const [trustIdUp, setTrustIdUp] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);
  const [returning, setReturning] = useState<ReturningIdentity | null>(() => getReturningIdentity());

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    void checkTrustIdReachable().then(setTrustIdUp);
  }, []);

  function startPasskey() {
    if (!returning) return;
    setStarting(true);
    void authClient.beginLogin({
      loginHint: returning.email || returning.trustId,
      preferPasskey: true,
      phone: returning.phone,
      deviceName: returning.deviceName,
    });
  }

  function startFresh() {
    setStarting(true);
    void authClient.beginLogin({ prompt: "login" });
  }

  function switchAccount() {
    clearReturningIdentity();
    setReturning(null);
  }

  return (
    <div className="welcome">
      <div className="welcome-atmosphere" aria-hidden />
      <div className="welcome-inner">
        <p className="brand-hero">LifeOS</p>

        {returning ? (
          <>
            <h1>Welcome back</h1>
            <p className="lead">Your details are saved on this device. Continue with your passkey.</p>
          </>
        ) : (
          <>
            <h1>Your everyday shell for a trusted digital life</h1>
            <p className="lead">
              Wallet, activity, and experiences — with identity that stays yours.
            </p>
          </>
        )}

        {status === "session_expired" ? (
          <StatusBanner
            title="Your session ended"
            detail={
              returning
                ? "Use your passkey to sign in again."
                : "Continue with TrustID to sign in again."
            }
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

        {returning ? (
          <div className="returning-card">
            <div className="returning-card__who">
              <Avatar name={returning.displayName} size="lg" src={returning.avatarUrl} />
              <div>
                <strong className="returning-card__name">{returning.firstName}</strong>
                <div className="muted small">
                  {[returning.email, returning.deviceName].filter(Boolean).join(" · ") ||
                    returning.trustId}
                </div>
              </div>
            </div>
            <Button
              className="full-width"
              disabled={trustIdUp === false || starting}
              onClick={startPasskey}
            >
              Use Passkey →
            </Button>
            <button
              type="button"
              className="returning-card__switch"
              disabled={starting}
              onClick={switchAccount}
            >
              Not {returning.firstName}? Login into another account
            </button>
          </div>
        ) : (
          <SecurityCard
            eyebrow="Identity"
            title="Secure your LifeOS session"
            detail="Sign in once with TrustID. We'll remember you on this device so next time you only need your passkey."
            action={
              <Button
                className="full-width"
                disabled={trustIdUp === false || starting}
                onClick={startFresh}
              >
                Continue with TrustID →
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
