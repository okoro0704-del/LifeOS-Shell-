/**
 * FinProv — sovereign finance / ledger port.
 * Wraps the historical Token Network provider shape without embedding a ledger.
 */
import type {
  Balance,
  PaymentParams,
  SendParams,
  TokenNetworkProvider,
  Transaction,
  WalletInfo,
} from "@lifeos/token-network";

export type {
  Balance,
  PaymentParams,
  SendParams,
  Transaction,
  WalletInfo,
};

/** Canonical FinProv ledger contract (Token Network–compatible). */
export type IFinProvLedgerProvider = TokenNetworkProvider & {
  readonly nodeId: "finprov";
  readonly bound: boolean;
};

export type FiatBalanceView = {
  currency: string;
  amount: number;
  formatted: string;
};

export interface IFinProvFiatProvider {
  readonly nodeId: "finprov";
  readonly bound: boolean;
  getCashWallet(ownerTrustId: string): Promise<{
    currency: string;
    currencyName: string;
    label: string;
    accountMask: string;
    balance: FiatBalanceView;
    transactions: Array<{
      id: string;
      kind: string;
      amount: number;
      currency: string;
      counterparty: string;
      memo?: string;
      createdAt: string;
      status: string;
      rail: "fiat";
    }>;
  }>;
}

/**
 * Payment orchestration port — settles through FinProv when bound.
 * Kept separate so bookings/actions depend on a contract, not a mock ledger.
 */
export interface IFinProvPaymentProvider {
  readonly nodeId: "finprov";
  readonly bound: boolean;
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
  }): import("@lifeos/shared").PaymentPreview;
}
