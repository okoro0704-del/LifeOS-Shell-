import { Link } from "react-router-dom";
import { AskLifeOSTrigger } from "../../components/CommandOverlay";

/**
 * Consumer space home — patronize businesses and consume content.
 * Digiconomy vault kernels (offline / main / free) live in the personal user app.
 */
export function PersonalHomePage() {
  return (
    <div className="page personal-page">
      <header className="page-header">
        <h1>LifeOS</h1>
        <p className="muted">
          Discover and patronize businesses. Ask LifeOS anything — by text or voice — in this space
          or Business.
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
          <Link to="/app/personal/finance" className="personal-home-card">
            <strong>Finance</strong>
            <span className="muted small">Your money view in this space</span>
          </Link>
        </li>
        <li>
          <Link to="/app/services/explore" className="personal-home-card">
            <strong>Explore</strong>
            <span className="muted small">Browse services and patronize businesses</span>
          </Link>
        </li>
        <li>
          <Link to="/app/discover" className="personal-home-card">
            <strong>Discover</strong>
            <span className="muted small">Offerings from the LifeOS registry</span>
          </Link>
        </li>
      </ul>

      <p className="muted small personal-kernel-note">
        Personal vault kernels (offline, main, free space) open in your Digiconomy personal app —
        not in this LifeOS consumer shell.
      </p>
    </div>
  );
}
