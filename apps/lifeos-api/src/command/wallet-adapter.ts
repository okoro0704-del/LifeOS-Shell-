import { ModuleUnboundError } from "../ports/unbound.js";
import { container } from "../container.js";
import type { WalletProvider } from "./wallet-provider.js";

/**
 * Command-layer wallet adapter over FinProv ports.
 * No mock balances — unbound FinProv throws ModuleUnboundError.
 */
export class FinProvWalletAdapter implements WalletProvider {
  async getBalance(trustId: string) {
    const payment = container.getFinProvPayment();
    if (!payment.bound) throw new ModuleUnboundError("finprov");
    return payment.getBalance(trustId);
  }

  async getTransactions(trustId: string) {
    const ledger = container.getFinProvLedger();
    const fiat = container.getFinProvFiat();
    if (!ledger.bound && !fiat.bound) throw new ModuleUnboundError("finprov");
    const rows: Awaited<ReturnType<WalletProvider["getTransactions"]>> = [];
    if (fiat.bound) {
      const cash = await fiat.getCashWallet(trustId);
      rows.push(
        ...cash.transactions.map((t) => ({
          id: t.id,
          kind: t.kind,
          amount: t.amount,
          unit: t.currency,
          counterparty: t.counterparty,
          createdAt: t.createdAt,
          rail: "fiat" as const,
        })),
      );
    }
    if (ledger.bound) {
      const tokenTxs = await ledger.getTransactions(trustId);
      rows.push(
        ...tokenTxs.map((t) => ({
          id: t.id,
          kind: t.kind,
          amount: t.amount,
          unit: t.symbol,
          counterparty: t.counterparty,
          createdAt: t.createdAt,
          rail: "token" as const,
        })),
      );
    }
    return rows;
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
    const ledger = container.getFinProvLedger();
    if (!ledger.bound) {
      return { ok: false, message: "Module Unbound / Awaiting Sovereign Node: finprov" };
    }
    await ledger.requestPayment(input.trustId, {
      merchant: input.merchant,
      amount: input.amount,
      reference: input.reference,
    });
    return { ok: true, message: "Payment recorded via FinProv." };
  }
}

let wallet: WalletProvider | null = null;

export function getCommandWalletProvider(): WalletProvider {
  if (!wallet) wallet = new FinProvWalletAdapter();
  return wallet;
}

export function setCommandWalletProvider(provider: WalletProvider) {
  wallet = provider;
}
