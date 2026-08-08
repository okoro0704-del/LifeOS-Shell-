import { logoutHos, useHosSession } from "../components/RequireHosSession";
import { lifeosDiscoverUrl } from "../lib/lifeos";

export function ApartmentPage() {
  const session = useHosSession();
  return (
    <div className="hos">
      <header className="hos-top">
        <div>
          <div className="hos-os">RealEstateOS (preview)</div>
          <h1>Harbor Apartments</h1>
        </div>
        <a className="hos-back" href={session?.returnUrl ?? lifeosDiscoverUrl()}>
          ← LifeOS
        </a>
      </header>
      <p>
        Hi {session?.displayName ?? "Guest"}. Listing served for V1 demos — a future RealEstateOS
        deploy can replace this without changing LifeOS core.
      </p>
      <button type="button" className="hos-btn" onClick={logoutHos}>
        End session
      </button>
    </div>
  );
}
