import { getFiatWallet } from "../services/fiat-wallet.js";
import { getTokenNetwork } from "../services/token-network.js";
import type { WalletProvider } from "./wallet-provider.js";

/** Adapter over existing fiat + token preview services — no second ledger. */
export class LifeOsWalletAdapter implements WalletProvider {
  async getBalance(trustId: string) {
    const fiat = getFiatWallet(trustId);
    const token = await getTokenNetwork().getBalance(trustId);
    return {
      fiatFormatted: fiat.balance.formatted,
      tokenFormatted: token.formatted,
    };
  }

  async getTransactions(trustId: string) {
    const fiat = getFiatWallet(trustId);
    const tokenTxs = await getTokenNetwork().getTransactions(trustId);
    return [
      ...fiat.transactions.map((t) => ({
        id: t.id,
        kind: t.kind,
        amount: t.amount,
        unit: t.currency,
        counterparty: t.counterparty,
        createdAt: t.createdAt,
        rail: "fiat" as const,
      })),
      ...tokenTxs.map((t) => ({
        id: t.id,
        kind: t.kind,
        amount: t.amount,
        unit: t.symbol,
        counterparty: t.counterparty,
        createdAt: t.createdAt,
        rail: "token" as const,
      })),
    ];
  }

  async preparePayment(input: { merchant: string; amount: number; reference?: string }) {
    return {
      merchant: input.merchant,
      amount: input.amount,
      reference: input.reference,
      currency: "NGN",
      status: "prepared" as const,
    };
  }

  async requestPayment(input: {
    trustId: string;
    merchant: string;
    amount: number;
    reference?: string;
    confirmed: boolean;
  }) {
    if (!input.confirmed) {
      return { ok: false, message: "Payment requires explicit user confirmation." };
    }
    // Preview: record via token network pay mock only after confirmation.
    await getTokenNetwork().requestPayment(input.trustId, {
      merchant: input.merchant,
      amount: input.amount,
      reference: input.reference,
    });
    return { ok: true, message: "Payment recorded (preview)." };
  }
}

let wallet: WalletProvider | null = null;

export function getCommandWalletProvider(): WalletProvider {
  if (!wallet) wallet = new LifeOsWalletAdapter();
  return wallet;
}
