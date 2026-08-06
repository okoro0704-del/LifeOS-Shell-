import type { SearchResult } from "@lifeos/shared";
import { getCommandWalletProvider } from "../wallet-adapter.js";
import type { SearchContext, SearchProvider } from "./types.js";
import { scoreMatch } from "./types.js";

export class WalletSearchProvider implements SearchProvider {
  readonly id = "wallet";

  async search(ctx: SearchContext): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const walletScore = scoreMatch("wallet cash tokens balance pay send", ctx.query);
    if (walletScore >= 0.5 || /\b(wallet|cash|token|pay|spend)\b/i.test(ctx.query)) {
      const bal = await getCommandWalletProvider().getBalance(ctx.trustId);
      results.push({
        id: "wallet_overview",
        type: "PERSONAL",
        title: "Wallet",
        subtitle: `Cash ${bal.fiatFormatted} · Tokens ${bal.tokenFormatted}`,
        description: "Open Cash and Token wallets",
        icon: "wallet",
        actions: [{ id: "open_wallet", label: "Open", actionId: "OPEN_WALLET" }],
        source: this.id,
        score: Math.max(walletScore, 0.75),
      });
    }

    const txs = await getCommandWalletProvider().getTransactions(ctx.trustId);
    for (const tx of txs) {
      const score = Math.max(
        scoreMatch(tx.counterparty, ctx.query),
        scoreMatch(`${tx.amount} ${tx.unit}`, ctx.query),
        scoreMatch(tx.kind, ctx.query),
        scoreMatch("transaction payment transfer", ctx.query),
      );
      if (score < 0.55 && !/\b(transaction|payment|transfer|spent)\b/i.test(ctx.query)) continue;
      results.push({
        id: `tx_${tx.id}`,
        type: "TRANSACTION",
        title: tx.counterparty,
        subtitle: `${tx.kind} · ${tx.rail}`,
        description: `${tx.amount} ${tx.unit}`,
        actions: [
          { id: `view_tx_${tx.id}`, label: "View", actionId: "OPEN_WALLET" },
          ...(tx.kind === "pay"
            ? [
                {
                  id: `pay_again_${tx.id}`,
                  label: "Pay",
                  actionId: "PAY_INVOICE",
                  params: { merchant: tx.counterparty, amount: tx.amount },
                  requiresConfirmation: true,
                },
              ]
            : []),
        ],
        source: this.id,
        score: Math.max(score, 0.45),
        metadata: { rail: tx.rail, amount: tx.amount },
      });
    }
    return results;
  }
}
