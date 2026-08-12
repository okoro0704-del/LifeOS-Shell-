import type { PaymentPreview } from "@lifeos/shared";

/**
 * Payment adapter contract used by bookings / action orchestrator.
 * Implementations live behind FinProv (IFinProvPaymentProvider).
 */
export interface LifeOsPaymentAdapter {
  getBalance(trustId: string): Promise<{ fiatFormatted: string; tokenFormatted: string }>;
  getPaymentMethods(trustId: string): Promise<Array<{ id: string; label: string; kind: "fiat" | "token" }>>;
  createPaymentIntent(input: {
    trustId: string;
    amount: number;
    currency: string;
    merchant: string;
    reference?: string;
  }): Promise<{ intentId: string; status: "requires_confirmation"; amount: number; currency: string }>;
  authorizePayment(input: {
    intentId: string;
    confirmed: boolean;
    authorizationToken?: string;
  }): Promise<{ paymentId: string; status: "authorized" | "failed"; receiptId?: string; message: string }>;
  getPaymentStatus(paymentId: string): Promise<{ status: string; paymentId: string }>;
  getReceipt(receiptId: string): Promise<{ receiptId: string; summary: string }>;
  buildPaymentPreview(input: {
    amount: number;
    currency: string;
    feeRate?: number;
  }): PaymentPreview;
}
