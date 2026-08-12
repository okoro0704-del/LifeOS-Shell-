import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

/**
 * Temporary test helper — wipe LifeOS users/sessions.
 * Enabled only when WIPE_SECRET is set.
 */
export async function wipeRoutes(app: FastifyInstance) {
  async function wipe(req: { headers: Record<string, unknown>; query?: unknown }, reply: {
    code: (n: number) => { send: (b: unknown) => unknown };
  }) {
    const secret = process.env.WIPE_SECRET;
    if (!secret) {
      return reply.code(404).send({ error: "not_found" });
    }
    const header = req.headers["x-wipe-secret"];
    const querySecret =
      typeof req.query === "object" && req.query && "secret" in req.query
        ? String((req.query as { secret?: string }).secret ?? "")
        : "";
    if (header !== secret && querySecret !== secret) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const deletedSessions = await prisma.session.deleteMany({});
    const deletedUsers = await prisma.user.deleteMany({});
    return {
      ok: true,
      deletedSessions: deletedSessions.count,
      deletedUsers: deletedUsers.count,
    };
  }

  app.post("/dev/wipe-users", async (req, reply) => {
    void req.body;
    return wipe(req, reply);
  });

  app.get("/dev/wipe-users", async (req, reply) => wipe(req, reply));
}
