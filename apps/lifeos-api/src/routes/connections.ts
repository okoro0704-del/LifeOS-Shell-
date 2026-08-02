import type { FastifyInstance } from "fastify";
import type { ExperienceConnectionPublic, OsType } from "@lifeos/shared";
import { requireSession } from "../lib/auth.js";
import { getExperienceProvider, parsePerms } from "../services/experience.js";

export async function connectionRoutes(app: FastifyInstance) {
  const experiences = getExperienceProvider();

  app.get("/connections", { preHandler: requireSession }, async (req) => {
    const rows = await experiences.listConnections(req.lifeosUser!.id);
    const connections: ExperienceConnectionPublic[] = rows.map((r) => {
      let osLabel = r.experience.osType;
      try {
        const meta = JSON.parse(r.experience.metadata) as { osLabel?: string };
        if (meta.osLabel) osLabel = meta.osLabel;
      } catch {
        /* keep */
      }
      return {
        id: r.id,
        experienceId: r.experienceId,
        businessName: r.experience.businessName,
        displayName: r.experience.displayName,
        osType: r.experience.osType as OsType,
        osLabel,
        status: r.status === "connected" ? "connected" : "disconnected",
        grantedPermissions: parsePerms(r.grantedPermissions),
        connectedAt: r.connectedAt.toISOString(),
        disconnectedAt: r.disconnectedAt?.toISOString() ?? null,
      };
    });
    return { connections };
  });

  app.delete<{ Params: { id: string } }>(
    "/connections/:id",
    { preHandler: requireSession },
    async (req, reply) => {
      try {
        await experiences.disconnect(req.lifeosUser!.id, req.params.id);
        return { ok: true, status: "disconnected" };
      } catch (err) {
        const code = (err as Error & { code?: string }).code;
        if (code === "not_found") return reply.code(404).send({ error: "not_found" });
        throw err;
      }
    },
  );
}
