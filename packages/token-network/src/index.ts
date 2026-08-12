import { TOKEN_SYMBOL } from "@lifeos/shared";

export { TOKEN_SYMBOL };

export type WalletInfo = {
  address: string;
  ownerTrustId: string;
  symbol: string;
};

export type Balance = {
  amount: number;
  symbol: string;
  formatted: string;
};

export type TransactionKind = "send" | "receive" | "pay" | "refund";

export type Transaction = {
  id: string;
  kind: TransactionKind;
  amount: number;
  symbol: string;
  counterparty: string;
  memo?: string;
  createdAt: string;
  status: "completed" | "pending" | "failed";
};

export type SendParams = {
  to: string;
  amount: number;
  memo?: string;
};

export type PaymentParams = {
  merchant: string;
  amount: number;
  reference?: string;
};

/**
 * FinProv ledger contract (historical name: TokenNetworkProvider).
 * LifeOS ships this interface only — no mock ledger in-core.
 */
export interface TokenNetworkProvider {
  getWallet(ownerTrustId: string): Promise<WalletInfo>;
  getBalance(ownerTrustId: string): Promise<Balance>;
  getTransactions(ownerTrustId: string): Promise<Transaction[]>;
  send(ownerTrustId: string, params: SendParams): Promise<Transaction>;
  requestPayment(ownerTrustId: string, params: PaymentParams): Promise<Transaction>;
  receiveAddress(ownerTrustId: string): Promise<{ address: string; symbol: string }>;
}

/** @deprecated Alias — prefer binding via LifeOS container FinProv port. */
export type IFinProvLedgerProvider = TokenNetworkProvider;

export class FinProvUnboundError extends Error {
  readonly code = "module_unbound";
  constructor() {
    super("Module Unbound / Awaiting Sovereign Node: finprov");
    this.name = "FinProvUnboundError";
  }
}

/**
 * Null adapter for the contract package — refuses all ledger operations.
 * Real FinProv nodes implement TokenNetworkProvider and bind via LifeOS DI.
 */
export class UnboundTokenNetworkProvider implements TokenNetworkProvider {
  async getWallet(): Promise<WalletInfo> {
    throw new FinProvUnboundError();
  }
  async getBalance(): Promise<Balance> {
    throw new FinProvUnboundError();
  }
  async getTransactions(): Promise<Transaction[]> {
    throw new FinProvUnboundError();
  }
  async send(): Promise<Transaction> {
    throw new FinProvUnboundError();
  }
  async requestPayment(): Promise<Transaction> {
    throw new FinProvUnboundError();
  }
  async receiveAddress(): Promise<{ address: string; symbol: string }> {
    throw new FinProvUnboundError();
  }
}

/** Always returns the unbound adapter — mock ledger removed from the shell. */
export function createTokenNetworkProvider(
  _kind: "mock" | "real" | "unbound" = "unbound",
): TokenNetworkProvider {
  void _kind;
  return new UnboundTokenNetworkProvider();
}
