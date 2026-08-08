import type { BookingPublic } from "@lifeos/shared";
import { experienceFetch } from "./session";

/** Map HospitalityOS room ids → LifeOS catalog offerings. */
export const ROOM_OFFERING_IDS: Record<string, string> = {
  deluxe: "off_sunrise_deluxe",
  twin: "off_sunrise_twin",
  suite: "off_sunrise_suite",
};

export async function listMyBookings() {
  return experienceFetch<{ bookings: BookingPublic[] }>("/experience/bookings");
}

export async function holdRoomBooking(input: {
  roomId: string;
  offeringId?: string;
  slotId?: string;
  idempotencyKey?: string;
}) {
  const offeringId = input.offeringId ?? ROOM_OFFERING_IDS[input.roomId];
  if (!offeringId) throw new Error("Unknown room offering");
  const day = new Date();
  const slotId = input.slotId ?? `room_in_0`;
  return experienceFetch<{ booking: BookingPublic }>("/experience/bookings/hold", {
    method: "POST",
    body: JSON.stringify({
      offeringId,
      slotId,
      hospitalityRoomId: input.roomId,
      quantity: 1,
      idempotencyKey: input.idempotencyKey ?? `hos-room:${input.roomId}:${slotId}:${day.toISOString().slice(0, 10)}`,
    }),
  });
}

export async function cancelBooking(bookingId: string) {
  return experienceFetch<{ booking: BookingPublic }>(`/experience/bookings/${bookingId}/cancel`, {
    method: "POST",
    body: "{}",
  });
}
