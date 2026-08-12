import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, SecurityCard } from "@lifeos/ui";
import { authClient, checkAuthGatewayReachable } from "../lib/api";
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
  const [gatewayUp, setGatewayUp] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);
  const [returning, setReturning] = useState<ReturningIdentity | null>(() => getReturningIdentity());

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    void checkAuthGatewayReachable().then(setGatewayUp);
  }, []);

  function startPasskey() {
    if (!returning) return;
    setStarting(true);
    void authClient.beginLogin({
      loginHint: returning.trustId,
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
            <h1>Log into LifeOS</h1>
            <p className="lead">
              Wallet, activity, and experiences — signed in through the LifeOS Gateway.
            </p>
          </>
        )}

        {status === "session_expired" ? (
          <StatusBanner
            title="Your session ended"
            detail={
              returning
                ? "Use your passkey to sign in again."
                : "Log into LifeOS again to continue."
            }
          />
        ) : null}

        {status === "lifeos_unavailable" ? (
          <StatusBanner
            title="Something went wrong"
            detail="We couldn't load LifeOS. Try again in a moment."
          />
        ) : null}

        {gatewayUp === false ? (
          <StatusBanner
            title="LifeOS Gateway unavailable"
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
                  {[returning.deviceName, returning.trustId].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
            <Button
              className="full-width"
              disabled={gatewayUp === false || starting}
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
              Not {returning.firstName}? Log into another account
            </button>
          </div>
        ) : (
          <SecurityCard
            eyebrow="LifeOS Gateway"
            title="Log into LifeOS"
            detail="Sign in once through the LifeOS Gateway. We'll remember you on this device so next time you only need your passkey."
            action={
              <Button
                className="full-width"
                disabled={gatewayUp === false || starting}
                onClick={startFresh}
              >
                Log into LifeOS →
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
