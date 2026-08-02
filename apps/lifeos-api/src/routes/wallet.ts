import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireSession } from "../lib/auth.js";
import { getTokenNetwork } from "../services/token-network.js";
import { prisma } from "../lib/prisma.js";

const sendBody = z.object({
  to: z.string().min(1),
  amount: z.number().positive(),
  memo: z.string().optional(),
});

const payBody = z.object({
  merchant: z.string().min(1),
  amount: z.number().positive(),
  reference: z.string().optional(),
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
      const [wallet, balance, transactions] = await Promise.all([
        tn.getWallet(trustId),
        tn.getBalance(trustId),
        tn.getTransactions(trustId),
      ]);
      return {
        wallet,
        balance,
        transactions: transactions.slice(0, 20),
        mock: true,
        notice: "Mock Token Network data — not real financial transactions.",
      };
    } catch {
      return walletUnavailable(reply);
    }
  });

  app.get("/wallet/balance", { preHandler: requireSession }, async (req, reply) => {
    try {
      const balance = await getTokenNetwork().getBalance(req.lifeosUser!.trustId);
      return { ...balance, mock: true };
    } catch {
      return walletUnavailable(reply);
    }
  });

  app.get("/wallet/transactions", { preHandler: requireSession }, async (req, reply) => {
    try {
      const txs = await getTokenNetwork().getTransactions(req.lifeosUser!.trustId);
      return { transactions: txs, mock: true };
    } catch {
      return walletUnavailable(reply);
    }
  });

  app.post("/wallet/send", { preHandler: requireSession }, async (req, reply) => {
    const body = sendBody.parse(req.body);
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
