import { Link } from "react-router-dom";
import { AskLifeOSTrigger } from "../../components/CommandOverlay";

/**
 * Personal Main kernel — default on login and when switching into Personal.
 * Offline ← Main → Free (swipe or edge double-tap).
 */
export function PersonalHomePage() {
  return (
    <div className="page personal-page">
      <header className="page-header">
        <p className="personal-kernel-badge muted small">Personal · Main</p>
        <h1>LifeOS</h1>
        <p className="muted">
          Your personal shell. Swipe or double-tap left for Offline, right for Free. Double-tap Space
          to enter Business.
        </p>
      </header>

      <div className="personal-ask-slot">
        <AskLifeOSTrigger />
      </div>

      <ul className="personal-home-grid">
        <li>
          <Link to="/app/personal/offline" className="personal-home-card">
            <strong>Offline</strong>
            <span className="muted small">Vault kernel — documents, keys, private assets</span>
          </Link>
        </li>
        <li>
          <Link to="/app/personal/free" className="personal-home-card">
            <strong>Free</strong>
            <span className="muted small">Open feed and federated discovery</span>
          </Link>
        </li>
        <li>
          <Link to="/app/shared/identity" className="personal-home-card">
            <strong>Identity</strong>
            <span className="muted small">TrustID and verification</span>
          </Link>
        </li>
        <li>
          <Link to="/app/shared/bridge" className="personal-home-card">
            <strong>Bridge</strong>
            <span className="muted small">Link personal artifacts into Business</span>
          </Link>
        </li>
      </ul>

      <nav className="personal-kernel-rail" aria-label="Personal kernels">
        <Link to="/app/personal/offline">Offline</Link>
        <span className="personal-kernel-rail__active" aria-current="page">
          Main
        </span>
        <Link to="/app/personal/free">Free</Link>
      </nav>
    </div>
  );
}
