import { Link } from "react-router-dom";
import { AskLifeOSTrigger } from "../../components/CommandOverlay";

/**
 * Business space home — consume content and patronize businesses.
 */
export function BusinessHomePage() {
  return (
    <div className="page personal-page">
      <header className="page-header">
        <p className="personal-kernel-badge muted small">Business</p>
        <h1>LifeOS</h1>
        <p className="muted">
          Discover and patronize businesses. Ask LifeOS by text or voice. Double-tap Space to return
          to Personal Main.
        </p>
      </header>

      <div className="personal-ask-slot">
        <AskLifeOSTrigger />
      </div>

      <ul className="personal-home-grid">
        <li>
          <Link to="/app/activity" className="personal-home-card">
            <strong>Activity</strong>
            <span className="muted small">Orders, bookings, and recent moves</span>
          </Link>
        </li>
        <li>
          <Link to="/app/wallet" className="personal-home-card">
            <strong>Finance</strong>
            <span className="muted small">Cash, tokens, and payments</span>
          </Link>
        </li>
        <li>
          <Link to="/app/services/explore" className="personal-home-card">
            <strong>Explore</strong>
            <span className="muted small">Browse services and book</span>
          </Link>
        </li>
        <li>
          <Link to="/app/discover" className="personal-home-card">
            <strong>Discover</strong>
            <span className="muted small">Offerings from the LifeOS registry</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
