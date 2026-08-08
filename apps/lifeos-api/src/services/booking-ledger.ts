import type { BookingPublic, BookingStatus } from "@lifeos/shared";
import { prisma } from "../lib/prisma.js";
import { getAvailabilityProvider } from "./availability.js";
import { getOfferingProvider } from "./offerings.js";

const HOLD_TTL_MS = 15 * 60 * 1000;

function parseMeta(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function toBookingPublic(row: {
  id: string;
  businessId: string;
  experienceId: string;
  offeringId: string;
  slotId: string | null;
  status: string;
  amount: number;
  currency: string;
  quantity: number;
  externalReference: string;
  paymentId: string | null;
  receiptId: string | null;
  hospitalityRoomId: string | null;
  title: string;
  scheduledAt: Date | null;
  heldUntil: Date | null;
  actionRecordId: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: string;
}): BookingPublic {
  return {
    id: row.id,
    businessId: row.businessId,
    experienceId: row.experienceId,
    offeringId: row.offeringId,
    slotId: row.slotId,
    status: row.status as BookingStatus,
    amount: row.amount,
    currency: row.currency,
    quantity: row.quantity,
    externalReference: row.externalReference,
    paymentId: row.paymentId,
    receiptId: row.receiptId,
    hospitalityRoomId: row.hospitalityRoomId,
    title: row.title,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    heldUntil: row.heldUntil?.toISOString() ?? null,
    actionRecordId: row.actionRecordId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    metadata: parseMeta(row.metadata),
  };
}

export type CreateHoldInput = {
  userId: string;
  offeringId: string;
  slotId?: string | null;
  quantity?: number;
  hospitalityRoomId?: string | null;
  idempotencyKey?: string | null;
  experienceId?: string;
  displayName?: string;
};

export type ConfirmBookingInput = {
  bookingId: string;
  userId: string;
  paymentId?: string | null;
  receiptId?: string | null;
  actionRecordId?: string | null;
  idempotencyKey?: string | null;
};

async function expireStaleHolds() {
  const now = new Date();
  const stale = await prisma.booking.findMany({
    where: { status: "held", heldUntil: { lt: now } },
    select: { id: true, offeringId: true, slotId: true },
  });
  if (!stale.length) return;
  await prisma.booking.updateMany({
    where: { id: { in: stale.map((s) => s.id) }, status: "held" },
    data: { status: "cancelled" },
  });
  for (const row of stale) {
    if (row.slotId) {
      getAvailabilityProvider().releaseSlot?.(row.offeringId, row.slotId, row.id);
    }
  }
}

export class BookingLedger {
  async createHold(input: CreateHoldInput): Promise<BookingPublic> {
    await expireStaleHolds();

    if (input.idempotencyKey) {
      const existing = await prisma.booking.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return toBookingPublic(existing);
    }

    const offering = await getOfferingProvider().getById(input.offeringId);
    if (!offering) {
      const err = new Error("Offering not found");
      (err as Error & { code: string }).code = "not_found";
      throw err;
    }
    if (input.experienceId && offering.experienceId !== input.experienceId) {
      const err = new Error("Offering does not belong to this experience");
      (err as Error & { code: string }).code = "wrong_experience";
      throw err;
    }

    const quantity = Math.max(1, input.quantity ?? 1);
    let scheduledAt: Date | null = null;
    let slotLabel: string | undefined;

    if (input.slotId) {
      const check = await getAvailabilityProvider().checkAvailability(
        input.offeringId,
        input.slotId,
      );
      if (!check.available) {
        const err = new Error(check.reason ?? "That time was just taken.");
        (err as Error & { code: string }).code = "slot_conflict";
        throw err;
      }
      scheduledAt = check.slot?.startsAt ? new Date(check.slot.startsAt) : null;
      slotLabel = check.slot?.label;
    }

    const bookingId = `bk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const externalReference = `los_${bookingId}`;
    const heldUntil = new Date(Date.now() + HOLD_TTL_MS);
    const roomId =
      input.hospitalityRoomId ??
      (typeof offering.metadata?.hospitalityRoomId === "string"
        ? offering.metadata.hospitalityRoomId
        : null);

    const provisionalId = bookingId;
    if (input.slotId) {
      const locked = getAvailabilityProvider().lockSlot?.(
        input.offeringId,
        input.slotId,
        provisionalId,
        HOLD_TTL_MS,
      );
      if (locked === false) {
        const err = new Error("That time was just taken.");
        (err as Error & { code: string }).code = "slot_conflict";
        throw err;
      }
    }

    try {
      const row = await prisma.booking.create({
        data: {
          id: bookingId,
          userId: input.userId,
          businessId: offering.businessId,
          experienceId: offering.experienceId,
          offeringId: offering.id,
          slotId: input.slotId ?? null,
          status: "held",
          amount: offering.price * quantity,
          currency: offering.currency,
          quantity,
          externalReference,
          hospitalityRoomId: roomId,
          title: offering.name,
          scheduledAt,
          heldUntil,
          idempotencyKey: input.idempotencyKey ?? null,
          metadata: JSON.stringify({
            businessName: offering.businessName,
            slotLabel,
            displayName: input.displayName,
          }),
        },
      });
      return toBookingPublic(row);
    } catch (err) {
      if (input.slotId) {
        getAvailabilityProvider().releaseSlot?.(input.offeringId, input.slotId, provisionalId);
      }
      throw err;
    }
  }

  /**
   * Confirm an existing hold, or create+confirm in one step (catalog checkout).
   */
  async confirm(input: ConfirmBookingInput): Promise<BookingPublic> {
    await expireStaleHolds();

    if (input.idempotencyKey) {
      const byKey = await prisma.booking.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (byKey?.status === "confirmed") return toBookingPublic(byKey);
    }

    const row = await prisma.booking.findFirst({
      where: { id: input.bookingId, userId: input.userId },
    });
    if (!row) {
      const err = new Error("Booking not found");
      (err as Error & { code: string }).code = "not_found";
      throw err;
    }
    if (row.status === "confirmed") return toBookingPublic(row);
    if (row.status === "cancelled" || row.status === "failed") {
      const err = new Error("Booking is no longer active");
      (err as Error & { code: string }).code = "booking_inactive";
      throw err;
    }
    if (row.status === "held" && row.heldUntil && row.heldUntil < new Date()) {
      await prisma.booking.update({
        where: { id: row.id },
        data: { status: "cancelled" },
      });
      if (row.slotId) {
        getAvailabilityProvider().releaseSlot?.(row.offeringId, row.slotId, row.id);
      }
      const err = new Error("Hold expired. Request the booking again.");
      (err as Error & { code: string }).code = "hold_expired";
      throw err;
    }

    if (row.slotId) {
      const check = await getAvailabilityProvider().checkAvailability(row.offeringId, row.slotId);
      // Allow if we own the lock
      const owned = getAvailabilityProvider().isSlotLockedBy?.(
        row.offeringId,
        row.slotId,
        row.id,
      );
      if (!check.available && !owned) {
        const err = new Error(check.reason ?? "That time was just taken.");
        (err as Error & { code: string }).code = "slot_conflict";
        throw err;
      }
    }

    const updated = await prisma.booking.update({
      where: { id: row.id },
      data: {
        status: "confirmed",
        paymentId: input.paymentId ?? row.paymentId,
        receiptId: input.receiptId ?? row.receiptId,
        actionRecordId: input.actionRecordId ?? row.actionRecordId,
        heldUntil: null,
        idempotencyKey: input.idempotencyKey ?? row.idempotencyKey,
      },
    });

    // Keep lock for confirmed bookings so slot stays unavailable
    if (row.slotId) {
      getAvailabilityProvider().lockSlot?.(
        row.offeringId,
        row.slotId,
        row.id,
        365 * 24 * 60 * 60 * 1000,
      );
    }

    return toBookingPublic(updated);
  }

  /** Catalog path: hold + confirm atomically after payment. */
  async createConfirmed(input: CreateHoldInput & {
    paymentId?: string | null;
    receiptId?: string | null;
    actionRecordId?: string | null;
  }): Promise<BookingPublic> {
    const hold = await this.createHold(input);
    if (hold.status === "confirmed") return hold;
    return this.confirm({
      bookingId: hold.id,
      userId: input.userId,
      paymentId: input.paymentId,
      receiptId: input.receiptId,
      actionRecordId: input.actionRecordId,
      idempotencyKey: input.idempotencyKey ?? null,
    });
  }

  async cancel(bookingId: string, userId: string): Promise<BookingPublic> {
    const row = await prisma.booking.findFirst({ where: { id: bookingId, userId } });
    if (!row) {
      const err = new Error("Booking not found");
      (err as Error & { code: string }).code = "not_found";
      throw err;
    }
    if (row.status === "cancelled") return toBookingPublic(row);
    const updated = await prisma.booking.update({
      where: { id: row.id },
      data: { status: "cancelled", heldUntil: null },
    });
    if (row.slotId) {
      getAvailabilityProvider().releaseSlot?.(row.offeringId, row.slotId, row.id);
    }
    return toBookingPublic(updated);
  }

  async getById(bookingId: string, userId?: string): Promise<BookingPublic | null> {
    const row = await prisma.booking.findFirst({
      where: { id: bookingId, ...(userId ? { userId } : {}) },
    });
    return row ? toBookingPublic(row) : null;
  }

  async listForUser(userId: string, opts?: { experienceId?: string; status?: BookingStatus[] }) {
    await expireStaleHolds();
    const rows = await prisma.booking.findMany({
      where: {
        userId,
        ...(opts?.experienceId ? { experienceId: opts.experienceId } : {}),
        ...(opts?.status?.length ? { status: { in: opts.status } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toBookingPublic);
  }
}

let ledger: BookingLedger | null = null;

export function getBookingLedger(): BookingLedger {
  if (!ledger) ledger = new BookingLedger();
  return ledger;
}
