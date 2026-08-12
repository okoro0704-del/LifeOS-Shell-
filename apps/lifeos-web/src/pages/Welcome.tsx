import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@lifeos/ui";
import { useAuth } from "../hooks/useAuth";
import { getReturningIdentity } from "../lib/returningIdentity";
import { hasSeenIntro, markIntroSeen } from "../lib/introSeen";

const BUSINESS_BOARDS = [
  {
    id: "operate",
    index: "01",
    title: "Every business OS",
    detail: "Hotels, dining, wellness, and more — one shell for every experience you run.",
    tone: "a",
  },
  {
    id: "commerce",
    index: "02",
    title: "Book · order · settle",
    detail: "Unified commerce across your services — customers stay in LifeOS Business.",
    tone: "b",
  },
  {
    id: "trust",
    index: "03",
    title: "Passkey unlock",
    detail: "Face ID or fingerprint on this device. Gateway credentials never leave the vault.",
    tone: "c",
  },
] as const;

/**
 * First-launch intro only. Returning users (or anyone who already entered) skip to /login.
 */
export function WelcomePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [boardIndex, setBoardIndex] = useState(0);
  const skipIntro = Boolean(getReturningIdentity()) || hasSeenIntro();

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (skipIntro) return;
    const id = window.setInterval(() => {
      setBoardIndex((i) => (i + 1) % BUSINESS_BOARDS.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [skipIntro]);

  if (!loading && user) return null;
  if (skipIntro) return <Navigate to="/login" replace />;

  function enterLifeOS() {
    markIntroSeen();
    navigate("/login", { replace: true });
  }

  return (
    <div className="welcome welcome--business welcome--intro">
      <div className="welcome-atmosphere" aria-hidden />
      <div className="welcome-grid" aria-hidden />
      <div className="welcome-inner welcome-inner--business">
        <header className="welcome-brand-block">
          <p className="brand-hero">
            LifeOS <span className="brand-hero__product">Business</span>
          </p>
          <p className="welcome-tagline">Operating system for everyday businesses</p>
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
          <div className="welcome-auth welcome-auth--enter">
            <Button className="full-width" onClick={enterLifeOS}>
              Enter LifeOS
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
