import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireSession } from "../lib/auth.js";
import {
  bootstrapTenant,
  listInstalledAppsForUser,
} from "../services/installed-apps.js";

/**
 * Portal / distributor tenant bootstrap + shell installed-apps registry.
 */
export async function distributorRoutes(app: FastifyInstance) {
  app.post("/v1/distributor/tenants/bootstrap", async (req, reply) => {
    const body = z
      .object({
        appId: z.string().min(1).max(64),
        tenantId: z.string().min(1).max(64),
        trustId: z.string().min(1).max(64),
        displayName: z.string().min(1).max(120),
        subdomain: z.string().min(1).max(63),
        experienceUrl: z.string().url(),
        approvedOrigin: z.string().min(1),
        icon: z.string().url().optional().nullable(),
        osType: z.string().optional(),
        audience: z.enum(["personal", "business"]).optional(),
        experienceId: z.string().optional().nullable(),
        preset: z.string().min(1).max(64).optional().nullable(),
        badgeCount: z.number().int().min(0).optional(),
        launchUrl: z.string().url().optional().nullable(),
      })
      .parse(req.body);

    try {
      const result = await bootstrapTenant({
        ...body,
        icon: body.icon ?? null,
        experienceId: body.experienceId ?? null,
        preset: body.preset ?? null,
        launchUrl: body.launchUrl ?? null,
      });
      return reply.code(result.created ? 201 : 200).send({
        ok: true,
        event: result.event,
        app: result.app,
        projection: result.app.routes,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "bootstrap_failed";
      return reply.code(400).send({ error: "bootstrap_failed", message });
    }
  });

  app.get("/v1/user/installed-apps", { preHandler: requireSession }, async (req) => {
    const apps = await listInstalledAppsForUser(req.lifeosUser!.id);
    return { apps };
  });
}
