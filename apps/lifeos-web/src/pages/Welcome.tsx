import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, SecurityCard } from "@lifeos/ui";
import { authClient, authGatewayWeb, checkAuthGatewayReachable } from "../lib/api";
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
  const [returning, setReturning] = useState<ReturningIdentity | null>(() => getReturningIdentity());
  /** Silent lock — prevents double-tap without painting busy/spinner UI. */
  const entering = useRef(false);

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    void checkAuthGatewayReachable().then(setGatewayUp);
  }, []);

  function enterLifeOS() {
    if (!returning || entering.current || gatewayUp === false) return;
    entering.current = true;
    // Immediate redirect — no spinners, status copy, or intermediate LifeOS chrome.
    void authClient.beginLogin({
      loginHint: returning.trustId,
      preferPasskey: true,
      silentUi: true,
      phone: returning.phone,
      deviceName: returning.deviceName,
    });
  }

  function startFresh() {
    if (entering.current || gatewayUp === false) return;
    entering.current = true;
    void authClient.beginLogin({ prompt: "login" });
  }

  function switchAccount() {
    if (entering.current) return;
    clearReturningIdentity();
    setReturning(null);
  }

  function openDeviceCodeLogin() {
    if (entering.current) return;
    const enroll = new URL("/enroll", authGatewayWeb);
    enroll.searchParams.set("source", "lifeos");
    window.location.href = enroll.toString();
  }

  return (
    <div className="welcome">
      <div className="welcome-atmosphere" aria-hidden />
      <div className="welcome-inner">
        <p className="brand-hero">LifeOS</p>

        {returning ? (
          <>
            <h1>Welcome back</h1>
            <p className="lead">Your account is ready on this device.</p>
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
              returning ? "Enter LifeOS again to continue." : "Log into LifeOS again to continue."
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
              disabled={gatewayUp === false}
              onClick={enterLifeOS}
            >
              Enter LifeOS
            </Button>
            <button
              type="button"
              className="returning-card__switch"
              onClick={switchAccount}
            >
              Log into another Account
            </button>
            <button
              type="button"
              className="returning-card__device-code"
              onClick={openDeviceCodeLogin}
            >
              I have a device code for logging into a secondary device
            </button>
          </div>
        ) : (
          <SecurityCard
            eyebrow="LifeOS Gateway"
            title="Log into LifeOS"
            detail="Sign in once through the LifeOS Gateway. Next time, Enter LifeOS unlocks this device instantly."
            action={
              <>
                <Button
                  className="full-width"
                  disabled={gatewayUp === false}
                  onClick={startFresh}
                >
                  Log into LifeOS →
                </Button>
                <button
                  type="button"
                  className="returning-card__device-code"
                  onClick={openDeviceCodeLogin}
                  style={{ marginTop: "0.75rem", width: "100%" }}
                >
                  I have a device code for logging into a secondary device
                </button>
              </>
            }
          />
        )}
      </div>
    </div>
  );
}
