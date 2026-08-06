/**
 * Wallet adapter interface for the Command Layer.
 * Does NOT implement Token Network — wraps existing LifeOS wallet surfaces only.
 */
export interface WalletProvider {
  getBalance(trustId: string): Promise<{
    fiatFormatted: string;
    tokenFormatted: string;
  }>;
  getTransactions(trustId: string): Promise<
    Array<{
      id: string;
      kind: string;
      amount: number;
      unit: string;
      counterparty: string;
      createdAt: string;
      rail: "fiat" | "token";
    }>
  >;
  preparePayment(input: {
    merchant: string;
    amount: number;
    reference?: string;
  }): Promise<{
    merchant: string;
    amount: number;
    reference?: string;
    currency: string;
    status: "prepared";
  }>;
  /** Never auto-executes — caller must confirm then invoke requestPayment. */
  requestPayment(input: {
    trustId: string;
    merchant: string;
    amount: number;
    reference?: string;
    confirmed: boolean;
  }): Promise<{ ok: boolean; message: string }>;
}
