import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@lifeos/ui";
import {
  authClient,
  authGatewayWeb,
  checkAuthGatewayReachable,
  storeSessionToken,
  cacheUser,
} from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { StatusBanner } from "../components/StatusBanner";
import {
  clearReturningIdentity,
  getReturningIdentity,
  type ReturningIdentity,
} from "../lib/returningIdentity";
import { hasSeenIntro, markIntroSeen } from "../lib/introSeen";
import { meService } from "../lib/services";

const AUTH_BYPASS = (import.meta.env.VITE_AUTH_BYPASS ?? "").toLowerCase() === "true";

/**
 * Login surface. Returning users land here directly (intro is skipped).
 * When VITE_AUTH_BYPASS=true, TrustID OAuth is skipped (temporary testing).
 */
export function LoginPage() {
  const { user, loading, status, refresh } = useAuth();
  const navigate = useNavigate();
  const [gatewayUp, setGatewayUp] = useState<boolean | null>(null);
  const [returning, setReturning] = useState<ReturningIdentity | null>(() => getReturningIdentity());
  const [bypassError, setBypassError] = useState<string | null>(null);
  const [bypassBusy, setBypassBusy] = useState(false);
  const entering = useRef(false);

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (AUTH_BYPASS) {
      setGatewayUp(true);
      return;
    }
    void checkAuthGatewayReachable().then(setGatewayUp);
  }, []);

  useEffect(() => {
    if (!hasSeenIntro()) markIntroSeen();
  }, []);

  async function enterBypass() {
    if (entering.current || bypassBusy) return;
    entering.current = true;
    setBypassBusy(true);
    setBypassError(null);
    try {
      const res = await meService.devSession();
      storeSessionToken(res.sessionToken);
      cacheUser(res.user);
      await refresh();
      navigate("/app", { replace: true });
    } catch (err) {
      setBypassError(err instanceof Error ? err.message : "Dev session failed");
      entering.current = false;
    } finally {
      setBypassBusy(false);
    }
  }

  function enterLifeOS() {
    if (AUTH_BYPASS) {
      void enterBypass();
      return;
    }
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
    if (AUTH_BYPASS) {
      void enterBypass();
      return;
    }
    if (entering.current || gatewayUp === false) return;
    entering.current = true;
    void authClient.beginLogin({ prompt: "login", silentUi: true });
  }

  function resetPhoneBinding() {
    if (entering.current) return;
    const ok = window.confirm(
      "Reset this phone’s TrustID binding?\n\nUse this after a server wipe so you can Create TrustID again. If your account still exists, tap Enter LifeOS instead.\n\nDelete the old trustedid.netlify.app passkey in device settings if Face ID keeps offering it.",
    );
    if (!ok) return;
    clearReturningIdentity();
    setReturning(null);
    entering.current = false;
  }

  function openRegister() {
    if (AUTH_BYPASS) {
      void enterBypass();
      return;
    }
    if (entering.current || returning) return;
    const register = new URL("/register", authGatewayWeb);
    register.searchParams.set("source", "lifeos");
    window.location.href = register.toString();
  }

  function openDeviceCodeLogin() {
    if (AUTH_BYPASS) {
      void enterBypass();
      return;
    }
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
          {AUTH_BYPASS ? (
            <StatusBanner
              title="TrustID bypass enabled"
              detail="Temporary test mode — set VITE_AUTH_BYPASS=false and LIFEOS_AUTH_BYPASS=false to reconnect TrustID."
            />
          ) : null}

          {bypassError ? <StatusBanner title="Bypass login failed" detail={bypassError} /> : null}

          {status === "session_expired" ? (
            <StatusBanner
              title="Your session ended"
              detail={
                AUTH_BYPASS
                  ? "Continue in test mode to open LifeOS again."
                  : returning
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

          {!AUTH_BYPASS && gatewayUp === false ? (
            <StatusBanner
              title="LifeOS Gateway unavailable"
              detail="Please try again shortly."
            />
          ) : null}

          {AUTH_BYPASS ? (
            <div className="welcome-auth">
              <p className="welcome-auth__label mono">test mode</p>
              <h1>Continue without TrustID</h1>
              <p className="lead">
                Opens a local LifeOS session and streams apps from the registry into your launcher.
              </p>
              <Button className="full-width" disabled={bypassBusy} onClick={() => void enterBypass()}>
                {bypassBusy ? "Entering…" : "Enter LifeOS (bypass)"}
              </Button>
            </div>
          ) : returning ? (
            <div className="welcome-auth">
              <p className="welcome-auth__label mono">welcome back</p>
              <h1>Enter LifeOS Business</h1>
              <p className="lead">
                One TrustID per phone. Unlock with Face ID or fingerprint on this device.
              </p>
              <Button className="full-width" disabled={gatewayUp === false} onClick={enterLifeOS}>
                Enter LifeOS
              </Button>
              <button type="button" className="returning-card__switch" onClick={resetPhoneBinding}>
                Reset this phone’s TrustID binding
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
                Create TrustID once on this phone. After a server wipe, reset binding then create
                again — old passkeys show &quot;Unknown credential&quot;.
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
