import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireSession } from "../lib/auth.js";
import { getTokenNetwork } from "../services/token-network.js";
import { prisma } from "../lib/prisma.js";
import { getFiatWallet } from "../services/fiat-wallet.js";

const sendBody = z.object({
  to: z.string().min(1),
  amount: z.number().positive(),
  memo: z.string().optional(),
  rail: z.enum(["token", "fiat"]).optional().default("token"),
});

const payBody = z.object({
  merchant: z.string().min(1),
  amount: z.number().positive(),
  reference: z.string().optional(),
  rail: z.enum(["token", "fiat"]).optional().default("token"),
});

function walletUnavailable(reply: FastifyReply) {
  return reply.code(503).send({
    error: "wallet_unavailable",
    message: "Wallet unavailable.",
  });
}

export async function walletRoutes(app: FastifyInstance) {
  app.get("/wallet", { preHandler: requireSession }, async (req, reply) => {
    try {
      const tn = getTokenNetwork();
      const trustId = req.lifeosUser!.trustId;
      const [wallet, balance, transactions, fiat] = await Promise.all([
        tn.getWallet(trustId),
        tn.getBalance(trustId),
        tn.getTransactions(trustId),
        Promise.resolve(getFiatWallet(trustId)),
      ]);
      return {
        fiat,
        token: {
          wallet,
          balance,
          transactions: transactions.slice(0, 20),
        },
        // Back-compat for older clients
        wallet,
        balance,
        transactions: transactions.slice(0, 20),
        mock: true,
        notice:
          "Cash (fiat) and Tokens are preview balances in LifeOS — not real bank or Token Network settlement.",
      };
    } catch {
      return walletUnavailable(reply);
    }
  });

  app.get("/wallet/balance", { preHandler: requireSession }, async (req, reply) => {
    try {
      const trustId = req.lifeosUser!.trustId;
      const [token, fiat] = await Promise.all([
        getTokenNetwork().getBalance(trustId),
        Promise.resolve(getFiatWallet(trustId)),
      ]);
      return {
        ...token,
        fiat: fiat.balance,
        formatted: fiat.balance.formatted,
        mock: true,
      };
    } catch {
      return walletUnavailable(reply);
    }
  });

  app.get("/wallet/transactions", { preHandler: requireSession }, async (req, reply) => {
    try {
      const trustId = req.lifeosUser!.trustId;
      const [tokenTxs, fiat] = await Promise.all([
        getTokenNetwork().getTransactions(trustId),
        Promise.resolve(getFiatWallet(trustId)),
      ]);
      return {
        transactions: tokenTxs,
        fiatTransactions: fiat.transactions,
        mock: true,
      };
    } catch {
      return walletUnavailable(reply);
    }
  });

  app.post("/wallet/send", { preHandler: requireSession }, async (req, reply) => {
    const body = sendBody.parse(req.body);
    if (body.rail === "fiat") {
      return reply.code(501).send({
        error: "fiat_not_live",
        message: "Cash transfers are coming soon. Token send is available in preview.",
      });
    }
    try {
      const tx = await getTokenNetwork().send(req.lifeosUser!.trustId, body);
      await prisma.activity.create({
        data: {
          userId: req.lifeosUser!.id,
          kind: "wallet_transfer",
          title: "Sent TOK",
          detail: `Sent ${tx.amount} ${tx.symbol} to ${tx.counterparty} (mock)`,
          source: "token-network",
          amount: `${tx.amount} ${tx.symbol}`,
        },
      });
      return { transaction: tx, mock: true };
    } catch (err) {
      return reply.code(400).send({
        error: "send_failed",
        message: err instanceof Error ? err.message : "Send failed",
      });
    }
  });

  app.post("/wallet/pay", { preHandler: requireSession }, async (req, reply) => {
    const body = payBody.parse(req.body);
    if (body.rail === "fiat") {
      return reply.code(501).send({
        error: "fiat_not_live",
        message: "Cash payments are coming soon. Token pay is available in preview.",
      });
    }
    try {
      const tx = await getTokenNetwork().requestPayment(req.lifeosUser!.trustId, body);
      await prisma.activity.create({
        data: {
          userId: req.lifeosUser!.id,
          kind: "payment",
          title: "Payment",
          detail: `Paid ${tx.amount} ${tx.symbol} to ${tx.counterparty} (mock)`,
          source: "token-network",
          amount: `${tx.amount} ${tx.symbol}`,
        },
      });
      return { transaction: tx, mock: true };
    } catch (err) {
      return reply.code(400).send({
        error: "pay_failed",
        message: err instanceof Error ? err.message : "Payment failed",
      });
    }
  });

  app.get("/wallet/receive", { preHandler: requireSession }, async (req, reply) => {
    try {
      const addr = await getTokenNetwork().receiveAddress(req.lifeosUser!.trustId);
      return { ...addr, mock: true };
    } catch {
      return walletUnavailable(reply);
    }
  });
}
