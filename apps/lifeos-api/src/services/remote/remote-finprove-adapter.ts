import type { PaymentPreview } from "@lifeos/shared";
import type {
  Balance,
  IFinProvFiatProvider,
  IFinProvLedgerProvider,
  IFinProvPaymentProvider,
  PaymentParams,
  SendParams,
  Transaction,
  WalletInfo,
} from "../../ports/finprov.js";
import { httpJson } from "./http.js";

type FinproveIntent = {
  intentId: string;
  status: string;
  amount: number;
  currency: string;
};

type FinproveBalance = {
  trustId: string;
  fiat: { currency: string; available: number; pending: number; formatted: string };
  token: { currency: string; available: number; pending: number; formatted: string };
};

async function balances(baseUrl: string, trustId: string): Promise<FinproveBalance> {
  return httpJson<FinproveBalance>(
    baseUrl,
    `/api/v1/finprove/balances/${encodeURIComponent(trustId)}`,
  );
}

async function createIntent(
  baseUrl: string,
  body: Record<string, unknown>,
): Promise<FinproveIntent> {
  return httpJson<FinproveIntent>(baseUrl, "/api/v1/finprove/intents", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Payment + fiat views over the standalone Finprove Engine. */
export class RemoteFinprovePaymentAdapter implements IFinProvPaymentProvider, IFinProvFiatProvider {
  readonly nodeId = "finprov" as const;
  readonly bound = true;
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async health() {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(1500) });
      if (!res.ok) return { ok: false, service: "finprove" };
      const h = (await res.json()) as { ok?: boolean; service?: string };
      return { ok: h.ok !== false, service: h.service ?? "finprove" };
    } catch {
      return { ok: false, service: "finprove" };
    }
  }

  async getBalance(trustId: string) {
    const b = await balances(this.baseUrl, trustId);
    return { fiatFormatted: b.fiat.formatted, tokenFormatted: b.token.formatted };
  }

  async getPaymentMethods() {
    return [
      { id: "fiat", label: "Finprove Fiat", kind: "fiat" as const },
      { id: "token", label: "DIGICON", kind: "token" as const },
    ];
  }

  async createPaymentIntent(input: {
    trustId: string;
    amount: number;
    currency: string;
    merchant: string;
    reference?: string;
  }) {
    const intent = await createIntent(this.baseUrl, {
      trustId: input.trustId,
      amount: input.amount,
      currency: input.currency,
      purpose: input.currency.toUpperCase() === "DIGICON" ? "TOKEN_TRANSFER" : "CARD_CHECKOUT",
      reference: input.reference,
      metadata: { merchant: input.merchant },
    });
    return {
      intentId: intent.intentId,
      status: "requires_confirmation" as const,
      amount: intent.amount,
      currency: intent.currency,
    };
  }

  async authorizePayment(input: {
    intentId: string;
    confirmed: boolean;
    authorizationToken?: string;
  }) {
    if (!input.confirmed) {
      return { paymentId: input.intentId, status: "failed" as const, message: "not confirmed" };
    }
    return {
      paymentId: input.intentId,
      status: "authorized" as const,
      receiptId: `rcpt_${input.intentId}`,
      message: "authorized via Finprove",
    };
  }

  async getPaymentStatus(paymentId: string) {
    return { status: "pending", paymentId };
  }

  async getReceipt(receiptId: string) {
    return { receiptId, summary: "Finprove settlement" };
  }

  buildPaymentPreview(input: { amount: number; currency: string; feeRate?: number }): PaymentPreview {
    const feeRate = input.feeRate ?? 0.015;
    const fees = Math.round(input.amount * feeRate);
    const total = input.amount + fees;
    const fmt = (n: number) =>
      input.currency === "NGN"
        ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n)
        : `${n} ${input.currency}`;
    return {
      currency: input.currency,
      lines: [
        { label: "Subtotal", amount: input.amount, formatted: fmt(input.amount) },
        { label: "Service fee", amount: fees, formatted: fmt(fees) },
      ],
      subtotal: input.amount,
      fees,
      taxes: 0,
      discounts: 0,
      total,
      totalFormatted: fmt(total),
      methodLabel: "Finprove",
    };
  }

  async getCashWallet(ownerTrustId: string) {
    const b = await balances(this.baseUrl, ownerTrustId);
    return {
      currency: b.fiat.currency,
      currencyName: b.fiat.currency === "NGN" ? "Naira" : b.fiat.currency,
      label: "Finprove Cash",
      accountMask: "••••",
      balance: {
        currency: b.fiat.currency,
        amount: b.fiat.available,
        formatted: b.fiat.formatted,
      },
      transactions: [],
    };
  }
}

/** Token ledger view over Finprove (DIGICON). */
export class RemoteFinproveLedgerAdapter implements IFinProvLedgerProvider {
  readonly nodeId = "finprov" as const;
  readonly bound = true;
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async getWallet(ownerTrustId: string): Promise<WalletInfo> {
    return { address: `finprove:${ownerTrustId}`, ownerTrustId, symbol: "DIGICON" };
  }

  async getBalance(ownerTrustId: string): Promise<Balance> {
    const b = await balances(this.baseUrl, ownerTrustId);
    return { amount: b.token.available, symbol: "DIGICON", formatted: b.token.formatted };
  }

  async getTransactions(_ownerTrustId: string): Promise<Transaction[]> {
    return [];
  }

  async send(ownerTrustId: string, params: SendParams): Promise<Transaction> {
    const intent = await createIntent(this.baseUrl, {
      trustId: ownerTrustId,
      amount: params.amount,
      currency: "DIGICON",
      purpose: "TOKEN_TRANSFER",
      destination: params.to,
      reference: params.memo,
    });
    return {
      id: intent.intentId,
      kind: "send",
      amount: params.amount,
      symbol: "DIGICON",
      counterparty: params.to,
      memo: params.memo,
      createdAt: new Date().toISOString(),
      status: intent.status === "failed" ? "failed" : "completed",
    };
  }

  async requestPayment(ownerTrustId: string, params: PaymentParams): Promise<Transaction> {
    const intent = await createIntent(this.baseUrl, {
      trustId: ownerTrustId,
      amount: params.amount,
      currency: "DIGICON",
      purpose: "TOKEN_TRANSFER",
      destination: params.merchant,
      reference: params.reference,
    });
    return {
      id: intent.intentId,
      kind: "pay",
      amount: params.amount,
      symbol: "DIGICON",
      counterparty: params.merchant,
      memo: params.reference,
      createdAt: new Date().toISOString(),
      status: intent.status === "failed" ? "failed" : "completed",
    };
  }

  async receiveAddress(ownerTrustId: string) {
    return { address: `finprove:${ownerTrustId}`, symbol: "DIGICON" };
  }
}
