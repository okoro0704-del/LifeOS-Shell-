import { logoutHos, useHosSession } from "../components/RequireHosSession";

export function RestaurantPage() {
  const session = useHosSession();
  return (
    <div className="hos">
      <header className="hos-top">
        <div>
          <div className="hos-os">HospitalityOS</div>
          <h1>Grand Restaurant</h1>
        </div>
        <a className="hos-back" href={session?.returnUrl ?? "http://localhost:5174/app/discover"}>
          ← LifeOS
        </a>
      </header>
      <p>
        Hello {session?.displayName ?? "Guest"}. Table booking UI (mock) — orders stay in this
        HospitalityOS process.
      </p>
      <ul className="hos-list">
        <li>
          <div>
            <strong>Tonight 7:30 PM</strong>
            <span>2 guests · courtyard</span>
          </div>
        </li>
      </ul>
      <button type="button" className="hos-btn" onClick={logoutHos}>
        End session
      </button>
    </div>
  );
}
