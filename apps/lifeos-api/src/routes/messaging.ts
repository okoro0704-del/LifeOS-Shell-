import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireSession } from "../lib/auth.js";
import { container } from "../container.js";
import { ModuleUnboundError } from "../ports/unbound.js";

function elfcomUnavailable(reply: FastifyReply) {
  return reply.code(503).send({
    error: "messaging_unavailable",
    code: "module_unbound",
    module: "elfcom",
    message: "Module Unbound / Awaiting Sovereign Node: elfcom",
  });
}

const sendBody = z.object({
  threadId: z.string().min(1),
  body: z.string().min(1).max(4000),
});

/** ElfCom routing hooks — empty until a messaging node is bound. */
export async function messagingRoutes(app: FastifyInstance) {
  app.get("/messaging/status", { preHandler: requireSession }, async () => {
    const elf = container.getElfCom();
    return {
      module: "elfcom",
      bound: elf.bound,
      status: elf.bound ? "bound" : "unbound",
      message: elf.bound
        ? "Module bound: elfcom"
        : "Module Unbound / Awaiting Sovereign Node: elfcom",
    };
  });

  app.get("/messaging/threads", { preHandler: requireSession }, async (req, reply) => {
    const elf = container.getElfCom();
    if (!elf.bound) return elfcomUnavailable(reply);
    try {
      const threads = await elf.listThreads(req.lifeosUser!.trustId);
      return { threads };
    } catch (err) {
      if (err instanceof ModuleUnboundError) return elfcomUnavailable(reply);
      throw err;
    }
  });

  app.post("/messaging/send", { preHandler: requireSession }, async (req, reply) => {
    const body = sendBody.parse(req.body);
    const elf = container.getElfCom();
    if (!elf.bound) return elfcomUnavailable(reply);
    try {
      const message = await elf.sendMessage({
        ownerTrustId: req.lifeosUser!.trustId,
        threadId: body.threadId,
        body: body.body,
      });
      return { message };
    } catch (err) {
      if (err instanceof ModuleUnboundError) return elfcomUnavailable(reply);
      throw err;
    }
  });
}
