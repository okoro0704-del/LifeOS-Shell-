import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireSession } from "../lib/auth.js";
import { container } from "../container.js";
import { ModuleUnboundError } from "../ports/unbound.js";
import { prisma } from "../lib/prisma.js";

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

function finprovUnavailable(reply: FastifyReply) {
  return reply.code(503).send({
    error: "wallet_unavailable",
    code: "module_unbound",
    module: "finprov",
    message: "Module Unbound / Awaiting Sovereign Node: finprov",
  });
}

export async function walletRoutes(app: FastifyInstance) {
  app.get("/wallet", { preHandler: requireSession }, async (_req, reply) => {
    const ledger = container.getFinProvLedger();
    const fiat = container.getFinProvFiat();
    if (!ledger.bound && !fiat.bound) {
      return finprovUnavailable(reply);
    }
    try {
      const trustId = _req.lifeosUser!.trustId;
      const token = ledger.bound
        ? {
            wallet: await ledger.getWallet(trustId),
            balance: await ledger.getBalance(trustId),
            transactions: (await ledger.getTransactions(trustId)).slice(0, 20),
          }
        : null;
      const cash = fiat.bound ? await fiat.getCashWallet(trustId) : null;
      return {
        fiat: cash,
        token,
        wallet: token?.wallet ?? null,
        balance: token?.balance ?? null,
        transactions: token?.transactions ?? [],
        bound: true,
        module: "finprov",
      };
    } catch (err) {
      if (err instanceof ModuleUnboundError) return finprovUnavailable(reply);
      return finprovUnavailable(reply);
    }
  });

  app.get("/wallet/balance", { preHandler: requireSession }, async (req, reply) => {
    const ledger = container.getFinProvLedger();
    if (!ledger.bound) return finprovUnavailable(reply);
    try {
      return await ledger.getBalance(req.lifeosUser!.trustId);
    } catch {
      return finprovUnavailable(reply);
    }
  });

  app.get("/wallet/transactions", { preHandler: requireSession }, async (req, reply) => {
    const ledger = container.getFinProvLedger();
    const fiat = container.getFinProvFiat();
    if (!ledger.bound && !fiat.bound) return finprovUnavailable(reply);
    try {
      const trustId = req.lifeosUser!.trustId;
      return {
        transactions: ledger.bound ? await ledger.getTransactions(trustId) : [],
        fiatTransactions: fiat.bound ? (await fiat.getCashWallet(trustId)).transactions : [],
      };
    } catch {
      return finprovUnavailable(reply);
    }
  });

  app.post("/wallet/send", { preHandler: requireSession }, async (req, reply) => {
    const body = sendBody.parse(req.body);
    if (body.rail === "fiat") {
      return reply.code(503).send({
        error: "wallet_unavailable",
        code: "module_unbound",
        module: "finprov",
        message: "Module Unbound / Awaiting Sovereign Node: finprov",
      });
    }
    const ledger = container.getFinProvLedger();
    if (!ledger.bound) return finprovUnavailable(reply);
    try {
      const tx = await ledger.send(req.lifeosUser!.trustId, body);
      await prisma.activity.create({
        data: {
          userId: req.lifeosUser!.id,
          kind: "wallet_transfer",
          title: "Sent tokens",
          detail: `${body.amount} to ${body.to}`,
          source: "finprov",
          amount: String(body.amount),
          status: "completed",
          deepLink: "/app/wallet",
        },
      });
      return { transaction: tx };
    } catch (err) {
      if (err instanceof ModuleUnboundError) return finprovUnavailable(reply);
      return reply.code(400).send({
        error: "send_failed",
        message: err instanceof Error ? err.message : "Send failed",
      });
    }
  });

  app.post("/wallet/pay", { preHandler: requireSession }, async (req, reply) => {
    const body = payBody.parse(req.body);
    const ledger = container.getFinProvLedger();
    if (!ledger.bound) return finprovUnavailable(reply);
    try {
      const tx = await ledger.requestPayment(req.lifeosUser!.trustId, body);
      return { transaction: tx };
    } catch (err) {
      if (err instanceof ModuleUnboundError) return finprovUnavailable(reply);
      return reply.code(400).send({
        error: "pay_failed",
        message: err instanceof Error ? err.message : "Payment failed",
      });
    }
  });

  app.get("/wallet/receive", { preHandler: requireSession }, async (req, reply) => {
    const ledger = container.getFinProvLedger();
    if (!ledger.bound) return finprovUnavailable(reply);
    try {
      return await ledger.receiveAddress(req.lifeosUser!.trustId);
    } catch {
      return finprovUnavailable(reply);
    }
  });
}
