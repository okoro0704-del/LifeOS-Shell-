import { Link } from "react-router-dom";

/** Personal space landing. */
export function PersonalHomePage() {
  return (
    <div className="page personal-page">
      <header className="page-header">
        <h1>Personal space</h1>
        <p className="muted">
          Digiconomy-ported vault, discovery, and personal finance — same TrustID session as
          Business space.
        </p>
      </header>
      <ul className="personal-home-grid">
        <li>
          <Link to="/app/personal/vault" className="personal-home-card">
            <strong>Vault</strong>
            <span className="muted">Encrypted documents &amp; keys</span>
          </Link>
        </li>
        <li>
          <Link to="/app/personal/discovery" className="personal-home-card">
            <strong>Discovery</strong>
            <span className="muted">Personal feed &amp; ecosystem updates</span>
          </Link>
        </li>
        <li>
          <Link to="/app/personal/finance" className="personal-home-card">
            <strong>Finance</strong>
            <span className="muted">Private ledger summary</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
