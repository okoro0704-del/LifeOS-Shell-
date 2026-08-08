import { Link } from "react-router-dom";
import { HOTEL_NAME, ROOMS } from "../lib/data";
import { lifeosDiscoverUrl, lifeosWebOrigin } from "../lib/lifeos";
import { logoutHos, useHosSession } from "../components/RequireHosSession";

export function HotelHome() {
  const session = useHosSession();

  return (
    <div className="hos">
      <header className="hos-top">
        <div>
          <div className="hos-os">HospitalityOS</div>
          <h1>{HOTEL_NAME}</h1>
        </div>
        <a className="hos-back" href={session?.returnUrl ?? lifeosDiscoverUrl()}>
          ← LifeOS
        </a>
      </header>

      <section className="hos-greet">
        <p>
          Welcome, <strong>{session?.displayName ?? "Guest"}</strong>
        </p>
        <p className="muted">
          Authenticated via a signed LifeOS experience session
          {session ? (
            <>
              {" "}
              (<span className="mono">{session.sessionId.slice(0, 12)}…</span>). TrustID tokens
              were never received by HospitalityOS.
            </>
          ) : null}
        </p>
        <p className="muted small">
          Scopes: {(session?.scopes ?? []).join(", ") || "none"}
        </p>
        <button type="button" className="hos-btn" onClick={logoutHos}>
          End HospitalityOS session
        </button>
        <button
          type="button"
          className="hos-btn secondary"
          onClick={() => {
            window.parent.postMessage(
              { type: "experience.request_permission", permissions: ["wallet.view"] },
              lifeosWebOrigin(),
            );
          }}
        >
          Request wallet.view from LifeOS
        </button>
      </section>

      <section>
        <h2>Rooms</h2>
        <ul className="hos-list">
          {ROOMS.map((room) => (
            <li key={room.id}>
              <Link to={`/rooms/${room.id}`}>
                <strong>{room.name}</strong>
                <span>
                  {room.beds} · from {room.price} TOK
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
