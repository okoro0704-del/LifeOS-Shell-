import { createHash, randomUUID } from "node:crypto";
import { TOKEN_SYMBOL } from "@lifeos/shared";

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

/** Abstract Token Network — replace Mock with Real later without UI changes. */
export interface TokenNetworkProvider {
  getWallet(ownerTrustId: string): Promise<WalletInfo>;
  getBalance(ownerTrustId: string): Promise<Balance>;
  getTransactions(ownerTrustId: string): Promise<Transaction[]>;
  send(ownerTrustId: string, params: SendParams): Promise<Transaction>;
  requestPayment(ownerTrustId: string, params: PaymentParams): Promise<Transaction>;
  receiveAddress(ownerTrustId: string): Promise<{ address: string; symbol: string }>;
}

function formatAmount(amount: number, symbol = TOKEN_SYMBOL) {
  return `${amount.toLocaleString("en-US")} ${symbol}`;
}

type Store = {
  balance: number;
  address: string;
  txs: Transaction[];
};

/** In-memory mock ledger keyed by TrustID. Not custody-grade. */
export class MockTokenNetworkProvider implements TokenNetworkProvider {
  private stores = new Map<string, Store>();

  private store(ownerTrustId: string): Store {
    let s = this.stores.get(ownerTrustId);
    if (!s) {
      const slug = createHash("sha256").update(ownerTrustId).digest("hex").slice(0, 12);
      s = {
        balance: 2450,
        address: `tok_${slug}`,
        txs: [
          {
            id: "tx_seed_1",
            kind: "receive",
            amount: 500,
            symbol: TOKEN_SYMBOL,
            counterparty: "Welcome grant",
            memo: "LifeOS starter balance",
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            status: "completed",
          },
          {
            id: "tx_seed_2",
            kind: "pay",
            amount: 50,
            symbol: TOKEN_SYMBOL,
            counterparty: "Sunrise Hotel",
            memo: "Deposit",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            status: "completed",
          },
          {
            id: "tx_seed_3",
            kind: "receive",
            amount: 2000,
            symbol: TOKEN_SYMBOL,
            counterparty: "Transfer in",
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            status: "completed",
          },
        ],
      };
      this.stores.set(ownerTrustId, s);
    }
    return s;
  }

  async getWallet(ownerTrustId: string): Promise<WalletInfo> {
    const s = this.store(ownerTrustId);
    return { address: s.address, ownerTrustId, symbol: TOKEN_SYMBOL };
  }

  async getBalance(ownerTrustId: string): Promise<Balance> {
    const s = this.store(ownerTrustId);
    return {
      amount: s.balance,
      symbol: TOKEN_SYMBOL,
      formatted: formatAmount(s.balance),
    };
  }

  async getTransactions(ownerTrustId: string): Promise<Transaction[]> {
    return [...this.store(ownerTrustId).txs].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  }

  async send(ownerTrustId: string, params: SendParams): Promise<Transaction> {
    const s = this.store(ownerTrustId);
    if (params.amount <= 0) throw new Error("Invalid amount");
    if (params.amount > s.balance) throw new Error("Insufficient balance");
    s.balance -= params.amount;
    const tx: Transaction = {
      id: `tx_${randomUUID()}`,
      kind: "send",
      amount: params.amount,
      symbol: TOKEN_SYMBOL,
      counterparty: params.to,
      memo: params.memo,
      createdAt: new Date().toISOString(),
      status: "completed",
    };
    s.txs.unshift(tx);
    return tx;
  }

  async requestPayment(ownerTrustId: string, params: PaymentParams): Promise<Transaction> {
    const s = this.store(ownerTrustId);
    if (params.amount <= 0) throw new Error("Invalid amount");
    if (params.amount > s.balance) throw new Error("Insufficient balance");
    s.balance -= params.amount;
    const tx: Transaction = {
      id: `tx_${randomUUID()}`,
      kind: "pay",
      amount: params.amount,
      symbol: TOKEN_SYMBOL,
      counterparty: params.merchant,
      memo: params.reference,
      createdAt: new Date().toISOString(),
      status: "completed",
    };
    s.txs.unshift(tx);
    return tx;
  }

  async receiveAddress(ownerTrustId: string) {
    const s = this.store(ownerTrustId);
    return { address: s.address, symbol: TOKEN_SYMBOL };
  }
}

export function createTokenNetworkProvider(
  kind: "mock" | "real" = "mock",
): TokenNetworkProvider {
  if (kind === "real") {
    throw new Error("RealTokenNetworkProvider is not implemented in V1");
  }
  return new MockTokenNetworkProvider();
}
