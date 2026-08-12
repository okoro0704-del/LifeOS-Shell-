import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireSession } from "../lib/auth.js";
import { container } from "../container.js";
import { ModuleUnboundError } from "../ports/unbound.js";

function datazoneUnavailable(reply: FastifyReply) {
  return reply.code(503).send({
    error: "storage_unavailable",
    code: "module_unbound",
    module: "datazone",
    message: "Module Unbound / Awaiting Sovereign Node: datazone",
  });
}

const putBody = z.object({
  namespace: z.string().min(1).max(64),
  key: z.string().min(1).max(512),
  body: z.string(),
  contentType: z.string().optional(),
});

/** DataZone routing hooks — empty until a storage node is bound. */
export async function storageRoutes(app: FastifyInstance) {
  app.get("/storage/status", { preHandler: requireSession }, async () => {
    const dz = container.getDataZone();
    return {
      module: "datazone",
      bound: dz.bound,
      status: dz.bound ? "bound" : "unbound",
      message: dz.bound
        ? "Module bound: datazone"
        : "Module Unbound / Awaiting Sovereign Node: datazone",
    };
  });

  app.post("/storage/objects", { preHandler: requireSession }, async (req, reply) => {
    const body = putBody.parse(req.body);
    const dz = container.getDataZone();
    if (!dz.bound) return datazoneUnavailable(reply);
    try {
      const ref = await dz.put(body);
      return { object: ref };
    } catch (err) {
      if (err instanceof ModuleUnboundError) return datazoneUnavailable(reply);
      throw err;
    }
  });
}
