import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@lifeos/ui";
import { authClient, authGatewayWeb, checkAuthGatewayReachable } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { StatusBanner } from "../components/StatusBanner";
import {
  clearReturningIdentity,
  getReturningIdentity,
  type ReturningIdentity,
} from "../lib/returningIdentity";
import { hasSeenIntro, markIntroSeen } from "../lib/introSeen";

/**
 * Login surface. Returning users land here directly (intro is skipped).
 */
export function LoginPage() {
  const { user, loading, status } = useAuth();
  const navigate = useNavigate();
  const [gatewayUp, setGatewayUp] = useState<boolean | null>(null);
  const [returning, setReturning] = useState<ReturningIdentity | null>(() => getReturningIdentity());
  const entering = useRef(false);

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    void checkAuthGatewayReachable().then(setGatewayUp);
  }, []);

  useEffect(() => {
    // Anyone who reaches login has left first-launch intro behind.
    if (!hasSeenIntro()) markIntroSeen();
  }, []);

  function enterLifeOS() {
    if (!returning || entering.current || gatewayUp === false) return;
    entering.current = true;
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
    void authClient.beginLogin({ prompt: "login", silentUi: true });
  }

  function switchAccount() {
    if (entering.current) return;
    clearReturningIdentity();
    setReturning(null);
    entering.current = false;
  }

  function openRegister() {
    if (entering.current) return;
    clearReturningIdentity();
    setReturning(null);
    const register = new URL("/register", authGatewayWeb);
    register.searchParams.set("source", "lifeos");
    window.location.href = register.toString();
  }

  function openDeviceCodeLogin() {
    if (entering.current) return;
    const enroll = new URL("/enroll", authGatewayWeb);
    enroll.searchParams.set("source", "lifeos");
    window.location.href = enroll.toString();
  }

  return (
    <div className="welcome welcome--business welcome--login">
      <div className="welcome-atmosphere" aria-hidden />
      <div className="welcome-grid" aria-hidden />
      <div className="welcome-inner welcome-inner--business welcome-inner--login">
        <header className="welcome-brand-block">
          <p className="brand-hero">
            LifeOS <span className="brand-hero__product">Business</span>
          </p>
        </header>

        <div className="welcome-login">
          {status === "session_expired" ? (
            <StatusBanner
              title="Your session ended"
              detail={
                returning
                  ? "Enter LifeOS Business again to continue."
                  : "Log into LifeOS Business again to continue."
              }
            />
          ) : null}

          {status === "lifeos_unavailable" ? (
            <StatusBanner
              title="Something went wrong"
              detail="We couldn't load LifeOS Business. Try again in a moment."
            />
          ) : null}

          {gatewayUp === false ? (
            <StatusBanner
              title="LifeOS Gateway unavailable"
              detail="Please try again shortly."
            />
          ) : null}

          {returning ? (
            <div className="welcome-auth">
              <p className="welcome-auth__label mono">welcome back</p>
              <h1>Enter LifeOS Business</h1>
              <p className="lead">Unlock with Face ID or fingerprint on this device.</p>
              <Button className="full-width" disabled={gatewayUp === false} onClick={enterLifeOS}>
                Enter LifeOS
              </Button>
              <button type="button" className="returning-card__switch" onClick={switchAccount}>
                Log into another Account
              </button>
              <button type="button" className="returning-card__device-code" onClick={openRegister}>
                Create a new TrustID
              </button>
              <button type="button" className="returning-card__device-code" onClick={openDeviceCodeLogin}>
                I have a device code
              </button>
            </div>
          ) : (
            <div className="welcome-auth">
              <p className="welcome-auth__label mono">secure entry</p>
              <h1>Log into LifeOS Business</h1>
              <p className="lead">
                After a server reset, create a new TrustID first — old Face ID / fingerprint
                passkeys will show &quot;Unknown credential&quot;.
              </p>
              <Button className="full-width" disabled={gatewayUp === false} onClick={openRegister}>
                Create TrustID →
              </Button>
              <Button
                className="full-width"
                variant="soft"
                disabled={gatewayUp === false}
                onClick={startFresh}
              >
                I already have a TrustID
              </Button>
              <button type="button" className="returning-card__device-code" onClick={openDeviceCodeLogin}>
                I have a device code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
