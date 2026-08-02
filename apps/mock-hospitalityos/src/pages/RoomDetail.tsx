import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { ROOMS } from "../lib/data";
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
          <h2>Booking held (mock)</h2>
          <p>
            Thanks, {session?.displayName ?? "Guest"}. Confirmation lives only in HospitalityOS —
            LifeOS does not store the reservation.
          </p>
          <a className="hos-btn" href={session?.returnUrl ?? "http://localhost:5174/app/discover"}>
            Return to LifeOS
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
