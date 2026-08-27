/**
 * Primitive #6 — FundzMan Engine (Pass-Through Wallet, Billing & Escrow)
 */
export type InitiatePaymentPayload = {
  /** Payer TrustID (opaque identity handle). */
  payerTrustId: string;
  /** Merchant / payee handle. */
  payeeId: string;
  amount: number;
  currency: string;
  /** Domain shell reference — never FundzMan domain logic. */
  reference?: string;
  /** Optional escrow hold before release. */
  escrow?: boolean;
  metadata?: Record<string, unknown>;
};

export type PaymentResult = {
  paymentId: string;
  status: "pending" | "authorized" | "settled" | "failed" | "escrow_held";
  amount: number;
  currency: string;
  receiptId?: string;
  message?: string;
};

export type WalletBalanceSummary = {
  userId: string;
  currency: string;
  available: number;
  pending: number;
  formattedAvailable: string;
};

export type BillPaymentPayload = {
  payerTrustId: string;
  /** Upstream bill / utility reference. */
  billId: string;
  amount: number;
  currency: string;
  /** Pass-through — FundzMan does not interpret domain meaning. */
  passThrough: Record<string, unknown>;
};

export interface IFundzManWalletProvider {
  readonly primitiveId: "fundzman";
  readonly bound: boolean;
  health(): Promise<{ ok: boolean; service?: string }>;
  initiatePayment(payload: InitiatePaymentPayload): Promise<PaymentResult>;
  billPassThrough(payload: BillPaymentPayload): Promise<PaymentResult>;
  getWalletSummary(userId: string): Promise<WalletBalanceSummary>;
}
