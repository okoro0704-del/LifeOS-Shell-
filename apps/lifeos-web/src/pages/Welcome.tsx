import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button } from "@lifeos/ui";
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
    index: "01",
    title: "Every business OS",
    detail: "Hotels, dining, wellness — one shell.",
    tone: "a",
  },
  {
    id: "commerce",
    index: "02",
    title: "Book · order · settle",
    detail: "Commerce stays inside LifeOS Business.",
    tone: "b",
  },
  {
    id: "trust",
    index: "03",
    title: "Passkey unlock",
    detail: "Face ID or fingerprint. Credentials stay local.",
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
    }, 4200);
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
      <div className="welcome-grid" aria-hidden />
      <div className="welcome-inner welcome-inner--business">
        <header className="welcome-brand-block">
          <p className="brand-hero">
            LifeOS <span className="brand-hero__product">Business</span>
          </p>
          <p className="welcome-brand-meta mono">identity · commerce · ops</p>
        </header>

        <section className="welcome-boards" aria-roledescription="carousel" aria-label="LifeOS Business">
          <div className="welcome-boards__track" style={{ transform: `translateX(-${boardIndex * 100}%)` }}>
            {BUSINESS_BOARDS.map((board) => (
              <article
                key={board.id}
                className={`welcome-board welcome-board--${board.tone}`}
                aria-hidden={BUSINESS_BOARDS[boardIndex].id !== board.id}
              >
                <div className="welcome-board__top">
                  <span className="welcome-board__index mono">{board.index}</span>
                  <span className="welcome-board__tag mono">module</span>
                </div>
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
              <div className="returning-card__who">
                <Avatar name={returning.displayName} size="md" src={returning.avatarUrl} />
                <div>
                  <strong className="returning-card__name">{returning.firstName}</strong>
                  <div className="muted small mono">
                    {[returning.deviceName, returning.trustId].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
              <Button className="full-width" disabled={gatewayUp === false} onClick={enterLifeOS}>
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
            <div className="welcome-auth">
              <p className="welcome-auth__label mono">secure entry</p>
              <h1>Log into LifeOS Business</h1>
              <p className="lead">Passkey unlock — Face ID or fingerprint on this device.</p>
              <Button className="full-width" disabled={gatewayUp === false} onClick={startFresh}>
                Log into LifeOS Business →
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
