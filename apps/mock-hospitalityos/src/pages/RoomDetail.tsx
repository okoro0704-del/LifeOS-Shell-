import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { BookingPublic } from "@lifeos/shared";
import { ROOMS } from "../lib/data";
import { holdRoomBooking, listMyBookings } from "../lib/bookings";
import { lifeosDiscoverUrl, lifeosWebOrigin } from "../lib/lifeos";
import { useHosSession } from "../components/RequireHosSession";

export function RoomDetail() {
  const { id } = useParams();
  const room = useMemo(() => ROOMS.find((r) => r.id === id), [id]);
  const session = useHosSession();
  const [booking, setBooking] = useState<BookingPublic | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!room || !session) return;
    let cancelled = false;
    void listMyBookings()
      .then(({ bookings }) => {
        if (cancelled) return;
        const match = bookings.find(
          (b) =>
            b.hospitalityRoomId === room.id ||
            (b.title === room.name && (b.status === "held" || b.status === "confirmed")),
        );
        if (match) setBooking(match);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [room, session]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; bookingId?: string; status?: string };
      if (!data || typeof data !== "object") return;
      if (data.type === "lifeos.booking.updated" && data.bookingId) {
        setBooking((prev) =>
          prev && prev.id === data.bookingId
            ? { ...prev, status: (data.status as BookingPublic["status"]) || prev.status }
            : prev,
        );
        void listMyBookings()
          .then(({ bookings }) => {
            const match = bookings.find((b) => b.id === data.bookingId);
            if (match) setBooking(match);
          })
          .catch(() => undefined);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!room) {
    return (
      <div className="hos">
        <p>Room not found.</p>
        <Link to="/">Back</Link>
      </div>
    );
  }

  async function requestHold() {
    if (!room) return;
    setBusy(true);
    setError(null);
    try {
      const { booking: held } = await holdRoomBooking({ roomId: room.id });
      setBooking(held);
      window.parent.postMessage(
        {
          type: "experience.booking.created",
          bookingId: held.id,
          status: held.status,
        },
        lifeosWebOrigin(),
      );
      window.parent.postMessage(
        {
          type: "experience.request_payment",
          bookingId: held.id,
          amount: held.amount,
          currency: held.currency,
          title: held.title,
        },
        lifeosWebOrigin(),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not hold this room.");
    } finally {
      setBusy(false);
    }
  }

  function requestLifeOsPayment() {
    if (!booking) return;
    window.parent.postMessage(
      {
        type: "experience.request_payment",
        bookingId: booking.id,
        amount: booking.amount,
        currency: booking.currency,
        title: booking.title,
      },
      lifeosWebOrigin(),
    );
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

      {error ? <p className="error">{error}</p> : null}

      {booking ? (
        <div className="hos-confirm">
          <h2>{booking.status === "confirmed" ? "Booking confirmed" : "Booking held"}</h2>
          <p>
            Thanks, {session?.displayName ?? "Guest"}. Ref{" "}
            <span className="mono">{booking.externalReference}</span> is on the shared LifeOS
            ledger — visible in LifeOS Activity and here.
          </p>
          <p className="muted small">Status: {booking.status}</p>
          {booking.status === "held" ? (
            <>
              <button type="button" className="hos-btn" onClick={requestLifeOsPayment}>
                Pay in LifeOS
              </button>
              <a className="hos-btn secondary" href={session?.returnUrl ?? lifeosDiscoverUrl()}>
                Return to LifeOS
              </a>
            </>
          ) : (
            <a className="hos-btn" href={session?.returnUrl ?? lifeosDiscoverUrl()}>
              Return to LifeOS
            </a>
          )}
        </div>
      ) : (
        <button className="hos-btn" type="button" disabled={busy || !session} onClick={() => void requestHold()}>
          {busy ? "Holding…" : "Request booking"}
        </button>
      )}
    </div>
  );
}
