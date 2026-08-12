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

const BUSINESS_BOARDS = [
  {
    id: "operate",
    title: "Operate every business OS",
    detail: "Hotels, dining, wellness, and more — one shell for every experience you run.",
    tone: "a",
  },
  {
    id: "commerce",
    title: "Book, order, and get paid",
    detail: "Unified commerce across your services — customers stay in LifeOS Business.",
    tone: "b",
  },
  {
    id: "trust",
    title: "Identity that stays sovereign",
    detail: "Passkey unlock on this device. No passwords. Gateway credentials never leave the vault.",
    tone: "c",
  },
] as const;

export function WelcomePage() {
  const { user, loading, status } = useAuth();
  const navigate = useNavigate();
  const [gatewayUp, setGatewayUp] = useState<boolean | null>(null);
  const [returning, setReturning] = useState<ReturningIdentity | null>(() => getReturningIdentity());
  const [boardIndex, setBoardIndex] = useState(0);
  /** Silent lock — prevents double-tap without painting busy/spinner UI. */
  const entering = useRef(false);

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    void checkAuthGatewayReachable().then(setGatewayUp);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBoardIndex((i) => (i + 1) % BUSINESS_BOARDS.length);
    }, 4500);
    return () => window.clearInterval(id);
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
  }

  function openDeviceCodeLogin() {
    if (entering.current) return;
    const enroll = new URL("/enroll", authGatewayWeb);
    enroll.searchParams.set("source", "lifeos");
    window.location.href = enroll.toString();
  }

  return (
    <div className="welcome welcome--business">
      <div className="welcome-atmosphere" aria-hidden />
      <div className="welcome-inner welcome-inner--business">
        <header className="welcome-brand-block">
          <p className="brand-hero">LifeOS Business</p>
        </header>

        <section className="welcome-boards" aria-roledescription="carousel" aria-label="LifeOS Business">
          <div className="welcome-boards__track" style={{ transform: `translateX(-${boardIndex * 100}%)` }}>
            {BUSINESS_BOARDS.map((board) => (
              <article
                key={board.id}
                className={`welcome-board welcome-board--${board.tone}`}
                aria-hidden={BUSINESS_BOARDS[boardIndex].id !== board.id}
              >
                <p className="welcome-board__eyebrow">LifeOS Business</p>
                <h2 className="welcome-board__title">{board.title}</h2>
                <p className="welcome-board__detail">{board.detail}</p>
              </article>
            ))}
          </div>
          <div className="welcome-boards__dots" role="tablist" aria-label="Slides">
            {BUSINESS_BOARDS.map((board, i) => (
              <button
                key={board.id}
                type="button"
                role="tab"
                aria-selected={i === boardIndex}
                className={`welcome-boards__dot${i === boardIndex ? " is-active" : ""}`}
                onClick={() => setBoardIndex(i)}
                aria-label={`Show slide ${i + 1}`}
              />
            ))}
          </div>
        </section>

        <div className="welcome-login">
          {returning ? (
            <>
              <h1>Welcome back</h1>
              <p className="lead">Your account is ready on this device.</p>
            </>
          ) : (
            <>
              <h1>Log into LifeOS Business</h1>
              <p className="lead">Enter with your passkey — biometric unlock stays on this device.</p>
            </>
          )}

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
                Enter LifeOS Business
              </Button>
              <button type="button" className="returning-card__switch" onClick={switchAccount}>
                Log into another Account
              </button>
              <button type="button" className="returning-card__device-code" onClick={openDeviceCodeLogin}>
                I have a device code
              </button>
            </div>
          ) : (
            <SecurityCard
              eyebrow="LifeOS Business"
              title="Log into LifeOS Business"
              detail="Sign in once. Next time, Enter LifeOS Business unlocks this device with Face ID or fingerprint."
              action={
                <>
                  <Button
                    className="full-width"
                    disabled={gatewayUp === false}
                    onClick={startFresh}
                  >
                    Log into LifeOS Business →
                  </Button>
                  <button
                    type="button"
                    className="returning-card__device-code"
                    onClick={openDeviceCodeLogin}
                    style={{ marginTop: "0.75rem", width: "100%" }}
                  >
                    I have a device code
                  </button>
                </>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
