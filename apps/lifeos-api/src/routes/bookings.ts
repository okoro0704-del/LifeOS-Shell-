import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireSession } from "../lib/auth.js";
import { requireExperienceToken } from "../lib/experience-auth.js";
import { prisma } from "../lib/prisma.js";
import { getAuthorizationProvider } from "../services/authorization.js";
import { getBookingLedger } from "../services/booking-ledger.js";
import { getOfferingProvider } from "../services/offerings.js";
import { getPaymentAdapter } from "../services/payment-adapter.js";
import { auditLog } from "../services/audit.js";
import { AUDIT_EVENTS } from "@lifeos/shared";

function mapErr(reply: { code: (n: number) => { send: (b: unknown) => unknown } }, err: unknown) {
  const code = (err as Error & { code?: string }).code;
  const message = err instanceof Error ? err.message : "Request failed";
  if (code === "not_found") return reply.code(404).send({ error: code, message });
  if (code === "slot_conflict" || code === "hold_expired" || code === "booking_inactive") {
    return reply.code(409).send({ error: code, message });
  }
  if (code === "wrong_experience") return reply.code(403).send({ error: code, message });
  return reply.code(400).send({ error: code ?? "invalid_request", message });
}

export async function bookingRoutes(app: FastifyInstance) {
  /** LifeOS shell — list current user's bookings. */
  app.get("/bookings", { preHandler: requireSession }, async (req) => {
    const q = req.query as { experienceId?: string };
    const bookings = await getBookingLedger().listForUser(req.lifeosUser!.id, {
      experienceId: q.experienceId,
      status: ["held", "confirmed"],
    });
    return { bookings };
  });

  app.get<{ Params: { id: string } }>(
    "/bookings/:id",
    { preHandler: requireSession },
    async (req, reply) => {
      const booking = await getBookingLedger().getById(req.params.id, req.lifeosUser!.id);
      if (!booking) return reply.code(404).send({ error: "not_found" });
      return { booking };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/bookings/:id/cancel",
    { preHandler: requireSession },
    async (req, reply) => {
      try {
        const booking = await getBookingLedger().cancel(req.params.id, req.lifeosUser!.id);
        return { booking };
      } catch (err) {
        return mapErr(reply, err);
      }
    },
  );

  /**
   * Shell confirms a hold created by the business PWA (pay in LifeOS).
   */
  app.post<{ Params: { id: string } }>(
    "/bookings/:id/confirm",
    { preHandler: requireSession },
    async (req, reply) => {
      const body = z
        .object({
          authorizationToken: z.string().optional(),
          idempotencyKey: z.string().optional(),
        })
        .parse(req.body ?? {});

      const existing = await getBookingLedger().getById(req.params.id, req.lifeosUser!.id);
      if (!existing) return reply.code(404).send({ error: "not_found" });
      if (existing.status === "confirmed") return { booking: existing };

      const offering = await getOfferingProvider().getById(existing.offeringId);
      if (!offering) return reply.code(404).send({ error: "not_found", message: "Offering missing" });

      let paymentId: string | undefined;
      let receiptId: string | undefined;

      if (existing.amount > 0) {
        const payAuth = await getAuthorizationProvider().authorizePayment({
          userId: req.lifeosUser!.id,
          trustId: req.lifeosUser!.trustId,
          action: "BOOK",
          offeringId: offering.id,
          amount: existing.amount,
          currency: existing.currency,
        });
        if (!payAuth.authorized) {
          return reply.code(403).send({
            error: "requires_authorization",
            message: payAuth.message,
          });
        }
        const intent = await getPaymentAdapter().createPaymentIntent({
          trustId: req.lifeosUser!.trustId,
          amount: existing.amount,
          currency: existing.currency,
          merchant: offering.businessName,
          reference: existing.id,
        });
        const paid = await getPaymentAdapter().authorizePayment({
          intentId: intent.intentId,
          confirmed: true,
          authorizationToken: body.authorizationToken ?? payAuth.token,
        });
        if (paid.status !== "authorized") {
          return reply.code(402).send({
            error: "payment_failed",
            message: paid.message || "Payment failed.",
          });
        }
        paymentId = paid.paymentId;
        receiptId = paid.receiptId;
      }

      try {
        const booking = await getBookingLedger().confirm({
          bookingId: existing.id,
          userId: req.lifeosUser!.id,
          paymentId,
          receiptId,
          idempotencyKey: body.idempotencyKey ?? `shell-confirm:${existing.id}`,
        });

        const record = await prisma.actionRecord.create({
          data: {
            userId: req.lifeosUser!.id,
            action: "BOOK",
            status: "SUCCESS",
            offeringId: offering.id,
            businessId: offering.businessId,
            experienceId: offering.experienceId,
            externalReference: booking.externalReference,
            bookingId: booking.id,
            paymentId: paymentId ?? null,
            receiptId: receiptId ?? null,
            message: `Book · ${offering.name}`,
            scheduledAt: booking.scheduledAt ? new Date(booking.scheduledAt) : null,
            metadata: JSON.stringify({ source: "experience-pwa", bookingStatus: booking.status }),
          },
        });

        await prisma.booking.update({
          where: { id: booking.id },
          data: { actionRecordId: record.id },
        });

        await prisma.activity.create({
          data: {
            userId: req.lifeosUser!.id,
            kind: "experience",
            title: `Book · ${offering.name}`,
            detail: [offering.businessName, booking.externalReference].filter(Boolean).join(" · "),
            source: "booking-ledger",
            status: "completed",
            amount: offering.priceFormatted,
            experienceId: offering.experienceId,
            deepLink: `/app/business/${offering.businessId}`,
            metadata: JSON.stringify({
              bookingId: booking.id,
              actionRecordId: record.id,
              externalReference: booking.externalReference,
            }),
          },
        });

        await prisma.notification.create({
          data: {
            userId: req.lifeosUser!.id,
            title: "Booking confirmed",
            body: `${offering.name} at ${offering.businessName}`,
            source: "lifeos-bookings",
            category: "Business",
            actionId: "OPEN_EXPERIENCE",
            actionParams: JSON.stringify({
              experienceId: offering.experienceId,
              bookingId: booking.id,
            }),
          },
        });

        await auditLog(AUDIT_EVENTS.ACTION_CONFIRMED, {
          userId: req.lifeosUser!.id,
          detail: { bookingId: booking.id, source: "shell-confirm-hold" },
        });

        return { booking: { ...booking, actionRecordId: record.id }, actionRecordId: record.id };
      } catch (err) {
        return mapErr(reply, err);
      }
    },
  );

  /** Experience PWA — list bookings for this guest + experience. */
  app.get("/experience/bookings", { preHandler: requireExperienceToken }, async (req) => {
    const auth = req.experienceAuth!;
    const bookings = await getBookingLedger().listForUser(auth.userId, {
      experienceId: auth.experienceId,
      status: ["held", "confirmed"],
    });
    return { bookings };
  });

  app.post("/experience/bookings/hold", { preHandler: requireExperienceToken }, async (req, reply) => {
    const auth = req.experienceAuth!;
    const body = z
      .object({
        offeringId: z.string().min(1),
        slotId: z.string().optional(),
        quantity: z.number().int().positive().optional(),
        hospitalityRoomId: z.string().optional(),
        idempotencyKey: z.string().optional(),
      })
      .parse(req.body);

    try {
      const booking = await getBookingLedger().createHold({
        userId: auth.userId,
        offeringId: body.offeringId,
        slotId: body.slotId,
        quantity: body.quantity,
        hospitalityRoomId: body.hospitalityRoomId,
        idempotencyKey: body.idempotencyKey,
        experienceId: auth.experienceId,
        displayName: auth.displayName,
      });
      return { booking };
    } catch (err) {
      return mapErr(reply, err);
    }
  });

  app.post<{ Params: { id: string } }>(
    "/experience/bookings/:id/cancel",
    { preHandler: requireExperienceToken },
    async (req, reply) => {
      try {
        const booking = await getBookingLedger().cancel(req.params.id, req.experienceAuth!.userId);
        if (booking.experienceId !== req.experienceAuth!.experienceId) {
          return reply.code(403).send({ error: "wrong_experience" });
        }
        return { booking };
      } catch (err) {
        return mapErr(reply, err);
      }
    },
  );
}
