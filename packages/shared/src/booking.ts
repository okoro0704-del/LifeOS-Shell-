/** Shared booking ledger statuses — LifeOS shell + business PWAs. */
export const BOOKING_STATUSES = ["held", "confirmed", "cancelled", "failed"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type BookingPublic = {
  id: string;
  businessId: string;
  experienceId: string;
  offeringId: string;
  slotId?: string | null;
  status: BookingStatus;
  amount: number;
  currency: string;
  quantity: number;
  externalReference: string;
  paymentId?: string | null;
  receiptId?: string | null;
  hospitalityRoomId?: string | null;
  title: string;
  scheduledAt?: string | null;
  heldUntil?: string | null;
  actionRecordId?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};
