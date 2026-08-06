import type { PaymentPreview } from "@lifeos/shared";
import { getCommandWalletProvider } from "../command/wallet-adapter.js";

/**
 * Payment adapter — Token Network remains the ledger.
 * LifeOS never mutates balances directly.
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

function fmt(amount: number, currency: string): string {
  if (currency === "NGN") {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(
      amount,
    );
  }
  return `${amount} ${currency}`;
}

const intents = new Map<string, { amount: number; currency: string; merchant: string; trustId: string }>();

export class MockPaymentAdapter implements LifeOsPaymentAdapter {
  async getBalance(trustId: string) {
    return getCommandWalletProvider().getBalance(trustId);
  }

  async getPaymentMethods(_trustId: string) {
    return [
      { id: "cash_wallet", label: "LifeOS Cash", kind: "fiat" as const },
      { id: "token_wallet", label: "LifeOS Tokens", kind: "token" as const },
    ];
  }

  async createPaymentIntent(input: {
    trustId: string;
    amount: number;
    currency: string;
    merchant: string;
    reference?: string;
  }) {
    const intentId = `pi_${Date.now().toString(36)}`;
    intents.set(intentId, {
      amount: input.amount,
      currency: input.currency,
      merchant: input.merchant,
      trustId: input.trustId,
    });
    return { intentId, status: "requires_confirmation" as const, amount: input.amount, currency: input.currency };
  }

  async authorizePayment(input: {
    intentId: string;
    confirmed: boolean;
    authorizationToken?: string;
  }) {
    const intent = intents.get(input.intentId);
    if (!intent) {
      return { paymentId: "", status: "failed" as const, message: "Payment intent not found." };
    }
    if (!input.confirmed) {
      return { paymentId: "", status: "failed" as const, message: "Payment requires confirmation." };
    }
    // Preview settlement via existing wallet adapter (mock Token Network pay)
    await getCommandWalletProvider().requestPayment({
      trustId: intent.trustId,
      merchant: intent.merchant,
      amount: intent.amount,
      reference: input.intentId,
      confirmed: true,
    });
    const paymentId = `pay_${Date.now().toString(36)}`;
    const receiptId = `rcpt_${Date.now().toString(36)}`;
    return {
      paymentId,
      status: "authorized" as const,
      receiptId,
      message: "Payment authorized (preview — Token Network ledger not mutated by LifeOS).",
    };
  }

  async getPaymentStatus(paymentId: string) {
    return { status: "authorized", paymentId };
  }

  async getReceipt(receiptId: string) {
    return { receiptId, summary: "Payment receipt (preview)." };
  }

  buildPaymentPreview(input: { amount: number; currency: string; feeRate?: number }): PaymentPreview {
    const feeRate = input.feeRate ?? 0.015;
    const fees = Math.round(input.amount * feeRate);
    const taxes = 0;
    const discounts = 0;
    const total = input.amount + fees + taxes - discounts;
    return {
      currency: input.currency,
      lines: [
        { label: "Subtotal", amount: input.amount, formatted: fmt(input.amount, input.currency) },
        { label: "Service fee", amount: fees, formatted: fmt(fees, input.currency) },
      ],
      subtotal: input.amount,
      fees,
      taxes,
      discounts,
      total,
      totalFormatted: fmt(total, input.currency),
      methodLabel: "LifeOS Cash (preview)",
    };
  }
}

let payment: LifeOsPaymentAdapter | null = null;

export function getPaymentAdapter(): LifeOsPaymentAdapter {
  if (!payment) payment = new MockPaymentAdapter();
  return payment;
}
