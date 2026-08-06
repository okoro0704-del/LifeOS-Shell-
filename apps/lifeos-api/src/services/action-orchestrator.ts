import {
  AUDIT_EVENTS,
  type ActionConfirmRequest,
  type ActionPreviewRequest,
  type ActionPreviewResponse,
  type ActionResult,
  type OrchestratedAction,
} from "@lifeos/shared";
import { prisma } from "../lib/prisma.js";
import { auditLog } from "./audit.js";
import { getAvailabilityProvider } from "./availability.js";
import { getAuthorizationProvider } from "./authorization.js";
import { getOfferingProvider } from "./offerings.js";
import { getPaymentAdapter } from "./payment-adapter.js";

function mapCapability(action: OrchestratedAction): string {
  if (action === "PURCHASE_TICKET") return "PURCHASE_TICKET";
  if (action === "OPEN_EXPERIENCE") return "OPEN_EXPERIENCE";
  return action;
}

export class ActionOrchestrator {
  async listActionsForOffering(offeringId: string) {
    const offering = await getOfferingProvider().getById(offeringId);
    if (!offering) return null;
    const picker = getAvailabilityProvider().slotPickerConfig(offering);
    return {
      offeringId,
      capabilities: offering.capabilities,
      actions: offering.capabilities.filter((c) => c !== "VIEW" && c !== "SAVE") as OrchestratedAction[],
      slotPicker: picker,
      cancellationPolicy: offering.cancellationPolicy,
    };
  }

  async preview(userId: string, trustId: string, body: ActionPreviewRequest): Promise<ActionPreviewResponse> {
    const offering = await getOfferingProvider().getById(body.offeringId);
    if (!offering) throw Object.assign(new Error("Offering not found"), { code: "not_found" });

    const needed = mapCapability(body.action);
    if (!offering.capabilities.includes(needed as never) && body.action !== "VIEW" && body.action !== "SAVE") {
      throw Object.assign(new Error("This offering does not support that action."), { code: "capability_denied" });
    }

    let slot = null as ActionPreviewResponse["slot"];
    if (body.slotId) {
      const check = await getAvailabilityProvider().checkAvailability(body.offeringId, body.slotId);
      if (!check.available) {
        throw Object.assign(new Error(check.reason ?? "Slot unavailable"), { code: "slot_unavailable" });
      }
      slot = check.slot ?? null;
    }

    const qty = Math.max(1, body.quantity ?? body.partySize ?? 1);
    const unit = offering.price;
    const subtotal = unit * qty;
    const requiresPayment = offering.commerceCapability && ["BOOK", "BUY", "PAY", "PURCHASE_TICKET", "JOIN", "RESERVE"].includes(body.action);
    const payment = requiresPayment
      ? getPaymentAdapter().buildPaymentPreview({ amount: subtotal, currency: offering.currency })
      : undefined;

    const authz = await getAuthorizationProvider().authorizeAction({
      userId,
      trustId,
      action: body.action,
      offeringId: offering.id,
      amount: payment?.total,
      currency: offering.currency,
    });

    const lines = [
      { label: "Offering", value: offering.name },
      { label: "Provider", value: offering.businessName },
      ...(slot ? [{ label: "When", value: slot.label }] : []),
      ...(offering.duration ? [{ label: "Duration", value: offering.duration }] : []),
      ...(qty > 1 ? [{ label: "Quantity", value: String(qty) }] : []),
      { label: "Price", value: offering.priceFormatted },
    ];

    return {
      action: body.action,
      offeringId: offering.id,
      title: titleFor(body.action),
      subtitle: `${offering.name} · ${offering.businessName}`,
      lines,
      amount: payment?.totalFormatted ?? offering.priceFormatted,
      payment,
      policy: offering.cancellationPolicy ?? undefined,
      confirmLabel: confirmLabel(body.action, Boolean(requiresPayment)),
      requiresAuthorization: authz.requiresStepUp || !authz.authorized,
      requiresPayment: Boolean(requiresPayment),
      slot,
      serverQuotedTotal: payment?.total ?? subtotal,
      currency: offering.currency,
      params: {
        ...body.params,
        offeringId: offering.id,
        experienceId: offering.experienceId,
        businessId: offering.businessId,
        businessName: offering.businessName,
        service: offering.name,
        slotId: body.slotId,
        quantity: qty,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        authorizationToken: authz.token,
        expectedTotal: payment?.total ?? subtotal,
      },
    };
  }

  async confirm(
    userId: string,
    trustId: string,
    displayName: string,
    body: ActionConfirmRequest,
  ): Promise<ActionResult> {
    if (!body.confirmed) {
      return failResult(body.action, body.offeringId, "Confirmation required.");
    }

    let preview: ActionPreviewResponse;
    try {
      preview = await this.preview(userId, trustId, body);
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      const message = err instanceof Error ? err.message : "Preview failed";
      if (code === "slot_unavailable") {
        return {
          id: `ar_fail_${Date.now()}`,
          status: "FAILED",
          action: body.action,
          offeringId: body.offeringId,
          message,
          timestamp: new Date().toISOString(),
          metadata: { code, recovery: "choose_another_time" },
        };
      }
      throw err;
    }

    if (preview.requiresAuthorization) {
      return {
        id: `ar_auth_${Date.now()}`,
        status: "REQUIRES_AUTHORIZATION",
        action: body.action,
        offeringId: body.offeringId,
        message: "Additional authorization is required before this action can continue.",
        timestamp: new Date().toISOString(),
      };
    }

    // Never trust client-supplied price
    if (
      preview.requiresPayment &&
      body.expectedTotal != null &&
      body.expectedTotal !== preview.serverQuotedTotal
    ) {
      return {
        id: `ar_price_${Date.now()}`,
        status: "FAILED",
        action: body.action,
        offeringId: body.offeringId,
        message: "The price changed. Review the updated total and try again.",
        timestamp: new Date().toISOString(),
        metadata: { code: "price_changed", serverQuotedTotal: preview.serverQuotedTotal },
      };
    }

    // Final availability check at confirm time
    if (body.slotId) {
      const recheck = await getAvailabilityProvider().checkAvailability(body.offeringId, body.slotId);
      if (!recheck.available) {
        return {
          id: `ar_slot_${Date.now()}`,
          status: "FAILED",
          action: body.action,
          offeringId: body.offeringId,
          message: recheck.reason ?? "That time was just taken.",
          timestamp: new Date().toISOString(),
          metadata: { code: "slot_conflict", recovery: "choose_another_time" },
        };
      }
    }

    const offering = await getOfferingProvider().getById(body.offeringId);
    if (!offering) return failResult(body.action, body.offeringId, "Offering not found.");

    let paymentId: string | undefined;
    let receiptId: string | undefined;

    if (preview.requiresPayment) {
      const payAuth = await getAuthorizationProvider().authorizePayment({
        userId,
        trustId,
        action: body.action,
        offeringId: offering.id,
        amount: preview.serverQuotedTotal,
        currency: offering.currency,
      });
      if (!payAuth.authorized) {
        return {
          id: `ar_payauth_${Date.now()}`,
          status: "REQUIRES_AUTHORIZATION",
          action: body.action,
          offeringId: offering.id,
          message: payAuth.message,
          timestamp: new Date().toISOString(),
        };
      }

      const intent = await getPaymentAdapter().createPaymentIntent({
        trustId,
        amount: preview.serverQuotedTotal,
        currency: offering.currency,
        merchant: offering.businessName,
        reference: offering.id,
      });
      const paid = await getPaymentAdapter().authorizePayment({
        intentId: intent.intentId,
        confirmed: true,
        authorizationToken: body.authorizationToken ?? payAuth.token,
      });
      if (paid.status !== "authorized") {
        await auditLog(AUDIT_EVENTS.ACTION_FAILED, {
          userId,
          detail: { action: body.action, offeringId: offering.id, reason: paid.message },
        });
        await prisma.notification.create({
          data: {
            userId,
            title: "Payment failed",
            body: paid.message,
            source: "lifeos-actions",
            category: "Wallet",
            actionId: "OPEN_WALLET",
            actionParams: "{}",
          },
        });
        return {
          id: `ar_payfail_${Date.now()}`,
          status: "FAILED",
          action: body.action,
          offeringId: offering.id,
          message: paid.message || "Payment failed.",
          timestamp: new Date().toISOString(),
          metadata: { code: "payment_failed" },
        };
      }
      paymentId = paid.paymentId;
      receiptId = paid.receiptId;
    }

    const scheduledAt = preview.slot?.startsAt ? new Date(preview.slot.startsAt) : null;
    const bookingId = `bk_${Date.now().toString(36)}`;
    const externalReference = `hos_${bookingId}`;

    const record = await prisma.actionRecord.create({
      data: {
        userId,
        action: body.action,
        status: "SUCCESS",
        offeringId: offering.id,
        businessId: offering.businessId,
        experienceId: offering.experienceId,
        externalReference,
        bookingId,
        paymentId: paymentId ?? null,
        receiptId: receiptId ?? null,
        message: `${titleFor(body.action)} · ${offering.name}`,
        scheduledAt,
        metadata: JSON.stringify({
          slotId: body.slotId,
          quantity: preview.params.quantity,
          displayName,
          total: preview.serverQuotedTotal,
        }),
      },
    });

    const activity = await prisma.activity.create({
      data: {
        userId,
        kind: body.action === "PURCHASE_TICKET" ? "experience" : body.action === "PAY" ? "payment" : "experience",
        title: `${titleFor(body.action)} · ${offering.name}`,
        detail: [offering.businessName, preview.slot?.label, preview.amount].filter(Boolean).join(" · "),
        source: "action-orchestrator",
        status: "completed",
        amount: preview.amount ?? null,
        experienceId: offering.experienceId,
        deepLink: `/app/discover?offering=${offering.id}`,
        metadata: JSON.stringify({
          actionRecordId: record.id,
          offeringId: offering.id,
          bookingId,
          paymentId,
          action: body.action,
        }),
      },
    });

    await prisma.notification.create({
      data: {
        userId,
        title: `${titleFor(body.action)} confirmed`,
        body: `${offering.name} at ${offering.businessName}${preview.slot ? ` · ${preview.slot.label}` : ""}`,
        source: "lifeos-actions",
        category: "Business",
        actionId: "OPEN_EXPERIENCE",
        actionParams: JSON.stringify({
          experienceId: offering.experienceId,
          offeringId: offering.id,
        }),
      },
    });

    await auditLog(AUDIT_EVENTS.ACTION_CONFIRMED, {
      userId,
      detail: { action: body.action, offeringId: offering.id, bookingId, paymentId },
    });

    return {
      id: record.id,
      status: "SUCCESS",
      action: body.action,
      offeringId: offering.id,
      businessId: offering.businessId,
      experienceId: offering.experienceId,
      externalReference,
      bookingId,
      paymentId: paymentId ?? null,
      receiptId: receiptId ?? null,
      message: "Action completed. Open the experience to finish any provider-side steps.",
      timestamp: record.createdAt.toISOString(),
      launchExperienceId: offering.experienceId,
      activityId: activity.id,
    };
  }

  async getAction(userId: string, id: string): Promise<ActionResult | null> {
    const row = await prisma.actionRecord.findFirst({ where: { id, userId } });
    if (!row) return null;
    return {
      id: row.id,
      status: row.status as ActionResult["status"],
      action: row.action as OrchestratedAction,
      offeringId: row.offeringId,
      businessId: row.businessId,
      experienceId: row.experienceId,
      externalReference: row.externalReference,
      bookingId: row.bookingId,
      paymentId: row.paymentId,
      receiptId: row.receiptId,
      message: row.message,
      timestamp: row.createdAt.toISOString(),
      launchExperienceId: row.experienceId,
    };
  }

  async listHistory(userId: string, filter?: "recent" | "upcoming" | "completed" | "cancelled") {
    const now = new Date();
    const rows = await prisma.actionRecord.findMany({
      where: {
        userId,
        ...(filter === "cancelled" ? { status: "CANCELLED" } : {}),
        ...(filter === "completed" ? { status: "SUCCESS" } : {}),
        ...(filter === "upcoming"
          ? { scheduledAt: { gte: now }, status: { in: ["SUCCESS", "PENDING"] } }
          : {}),
      },
      orderBy: filter === "upcoming" ? { scheduledAt: "asc" } : { createdAt: "desc" },
      take: 40,
    });
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      action: row.action,
      offeringId: row.offeringId,
      experienceId: row.experienceId,
      message: row.message,
      scheduledAt: row.scheduledAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      bookingId: row.bookingId,
      paymentId: row.paymentId,
    }));
  }
}

function titleFor(action: OrchestratedAction): string {
  const map: Record<string, string> = {
    BOOK: "Booking",
    BUY: "Purchase",
    RESERVE: "Reservation",
    JOIN: "Join",
    PURCHASE_TICKET: "Ticket",
    VIEW: "View",
    SAVE: "Saved",
    OPEN_EXPERIENCE: "Open",
    PAY: "Payment",
    CHECK_IN: "Check-in",
    CANCEL: "Cancel",
    WAITLIST: "Waitlist",
  };
  return map[action] ?? action;
}

function confirmLabel(action: OrchestratedAction, pay: boolean): string {
  if (pay && (action === "BOOK" || action === "PURCHASE_TICKET" || action === "BUY" || action === "JOIN")) {
    return "Confirm & Pay";
  }
  if (action === "BOOK") return "Confirm Booking";
  if (action === "RESERVE") return "Confirm Reservation";
  if (action === "PAY") return "Confirm & Pay";
  return "Confirm";
}

function failResult(action: OrchestratedAction, offeringId: string, message: string): ActionResult {
  return {
    id: `ar_err_${Date.now()}`,
    status: "FAILED",
    action,
    offeringId,
    message,
    timestamp: new Date().toISOString(),
  };
}

export const actionOrchestrator = new ActionOrchestrator();
