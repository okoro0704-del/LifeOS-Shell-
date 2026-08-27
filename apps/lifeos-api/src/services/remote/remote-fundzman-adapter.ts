import type {
  BillPaymentPayload,
  IFundzManWalletProvider,
  InitiatePaymentPayload,
  PaymentResult,
  WalletBalanceSummary,
} from "@lifeos/shared";
import { httpJson } from "./http.js";

/**
 * Remote FundzMan Engine adapter — pass-through wallet / billing / escrow.
 * Consumes REST: POST /v1/wallet/pay, POST /v1/wallet/bill-pass-through,
 * GET /v1/wallet/:userId/summary
 */
export class RemoteFundzManAdapter implements IFundzManWalletProvider {
  readonly primitiveId = "fundzman" as const;
  readonly bound = true;
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async health() {
    try {
      const h = await httpJson<{ ok?: boolean; service?: string }>(
        this.baseUrl,
        "/health",
      );
      return { ok: h.ok !== false, service: h.service ?? "fundzman" };
    } catch {
      return { ok: false, service: "fundzman" };
    }
  }

  async initiatePayment(payload: InitiatePaymentPayload): Promise<PaymentResult> {
    return httpJson<PaymentResult>(this.baseUrl, "/v1/wallet/pay", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async billPassThrough(payload: BillPaymentPayload): Promise<PaymentResult> {
    return httpJson<PaymentResult>(this.baseUrl, "/v1/wallet/bill-pass-through", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getWalletSummary(userId: string): Promise<WalletBalanceSummary> {
    return httpJson<WalletBalanceSummary>(
      this.baseUrl,
      `/v1/wallet/${encodeURIComponent(userId)}/summary`,
    );
  }
}

/**
 * In-process FundzMan for offline / unit tests when PRIMITIVES_MODE=local.
 * No real settlement — deterministic stubs only.
 */
export class LocalFundzManAdapter implements IFundzManWalletProvider {
  readonly primitiveId = "fundzman" as const;
  readonly bound = true;
  private seq = 0;

  async health() {
    return { ok: true, service: "fundzman-local" };
  }

  async initiatePayment(payload: InitiatePaymentPayload): Promise<PaymentResult> {
    this.seq += 1;
    return {
      paymentId: `local_pay_${this.seq}`,
      status: payload.escrow ? "escrow_held" : "authorized",
      amount: payload.amount,
      currency: payload.currency,
      receiptId: `local_rcpt_${this.seq}`,
      message: "local fundzman stub",
    };
  }

  async billPassThrough(payload: BillPaymentPayload): Promise<PaymentResult> {
    this.seq += 1;
    return {
      paymentId: `local_bill_${this.seq}`,
      status: "settled",
      amount: payload.amount,
      currency: payload.currency,
      receiptId: `local_bill_rcpt_${this.seq}`,
      message: "local bill pass-through",
    };
  }

  async getWalletSummary(userId: string): Promise<WalletBalanceSummary> {
    return {
      userId,
      currency: "NGN",
      available: 0,
      pending: 0,
      formattedAvailable: "₦0",
    };
  }
}
