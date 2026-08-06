/**
 * Preview Fiat (cash) wallet — not a real bank account.
 * Deterministic per TrustID so the UI feels personal without storing banking data.
 */

export type FiatTransaction = {
  id: string;
  kind: "send" | "receive" | "pay" | "deposit";
  amount: number;
  currency: string;
  counterparty: string;
  memo?: string;
  createdAt: string;
  status: string;
  rail: "fiat";
};

export type FiatWalletView = {
  currency: string;
  currencyName: string;
  label: string;
  accountMask: string;
  balance: {
    amount: number;
    currency: string;
    formatted: string;
  };
  transactions: FiatTransaction[];
  preview: true;
  notice: string;
};

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function formatNgn(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getFiatWallet(trustId: string): FiatWalletView {
  const seed = hashSeed(trustId || "lifeos");
  const amount = 50_000 + (seed % 450_000);
  const last4 = String(1000 + (seed % 9000));
  const now = Date.now();

  const transactions: FiatTransaction[] = [
    {
      id: `fiat_tx_${seed}_1`,
      kind: "deposit",
      amount: 25_000,
      currency: "NGN",
      counterparty: "Bank transfer in",
      memo: "Preview deposit",
      createdAt: new Date(now - 86400000 * 2).toISOString(),
      status: "completed",
      rail: "fiat",
    },
    {
      id: `fiat_tx_${seed}_2`,
      kind: "pay",
      amount: 12_500,
      currency: "NGN",
      counterparty: "Sunrise Hotel",
      memo: "Room deposit",
      createdAt: new Date(now - 86400000).toISOString(),
      status: "completed",
      rail: "fiat",
    },
    {
      id: `fiat_tx_${seed}_3`,
      kind: "receive",
      amount: 8_000,
      currency: "NGN",
      counterparty: "Refund",
      createdAt: new Date(now - 3600000 * 5).toISOString(),
      status: "completed",
      rail: "fiat",
    },
  ];

  return {
    currency: "NGN",
    currencyName: "Nigerian Naira",
    label: "LifeOS Cash",
    accountMask: `•••• ${last4}`,
    balance: {
      amount,
      currency: "NGN",
      formatted: formatNgn(amount),
    },
    transactions,
    preview: true,
    notice:
      "Cash wallet is a LifeOS preview of physical fiat money. Real bank rails are not connected yet.",
  };
}
