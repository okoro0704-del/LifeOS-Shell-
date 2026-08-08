import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { ROOMS } from "../lib/data";
import { lifeosDiscoverUrl, lifeosWebOrigin } from "../lib/lifeos";
import { useHosSession } from "../components/RequireHosSession";

export function RoomDetail() {
  const { id } = useParams();
  const room = useMemo(() => ROOMS.find((r) => r.id === id), [id]);
  const session = useHosSession();
  const [booked, setBooked] = useState(false);

  if (!room) {
    return (
      <div className="hos">
        <p>Room not found.</p>
        <Link to="/">Back</Link>
      </div>
    );
  }

  function requestLifeOsPayment() {
    window.parent.postMessage(
      {
        type: "experience.request_permission",
        permissions: ["wallet.view", "wallet.pay"],
      },
      lifeosWebOrigin(),
    );
  }

  return (
    <div className="hos">
      <header className="hos-top">
        <div>
          <div className="hos-os">HospitalityOS</div>
          <h1>{room.name}</h1>
        </div>
        <Link className="hos-back" to="/">
          ← Rooms
        </Link>
      </header>

      <p className="muted">{room.description}</p>
      <p>
        <strong>{room.beds}</strong> · <strong>{room.price} TOK</strong> / night
      </p>

      {booked ? (
        <div className="hos-confirm">
          <h2>Booking held</h2>
          <p>
            Thanks, {session?.displayName ?? "Guest"}. Confirm and pay from LifeOS so wallet, identity,
            and this business stay in one place.
          </p>
          <button type="button" className="hos-btn" onClick={requestLifeOsPayment}>
            Request payment permission
          </button>
          <a className="hos-btn secondary" href={session?.returnUrl ?? lifeosDiscoverUrl()}>
            Return to LifeOS to pay
          </a>
        </div>
      ) : (
        <button className="hos-btn" type="button" onClick={() => setBooked(true)}>
          Request booking
        </button>
      )}
    </div>
  );
}
