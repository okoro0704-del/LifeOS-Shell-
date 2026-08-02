import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { EXPERIENCE_PERMISSIONS, PERMISSION_LABELS, type ExperiencePermission } from "@lifeos/shared";
import { requireSession } from "../lib/auth.js";
import { getBusinessDirectory } from "../services/directory.js";
import { getExperienceProvider, parsePerms } from "../services/experience.js";

export async function discoverRoutes(app: FastifyInstance) {
  const directory = getBusinessDirectory();
  const experiences = getExperienceProvider();

  app.get("/discover", { preHandler: requireSession }, async (req) => {
    const q = typeof (req.query as { q?: string }).q === "string" ? (req.query as { q: string }).q : undefined;
    const category =
      typeof (req.query as { category?: string }).category === "string"
        ? (req.query as { category: string }).category
        : undefined;
    const items = await directory.list({ q, category });
    const categories = await directory.categories();
    return {
      categories,
      featured: items.filter((i) => i.featured),
      items,
    };
  });

  app.get("/discover/categories", { preHandler: requireSession }, async () => {
    return { categories: await directory.categories() };
  });

  app.get("/search", { preHandler: requireSession }, async (req) => {
    const q = String((req.query as { q?: string }).q ?? "").trim();
    if (!q) return { query: q, businesses: [], experiences: [] };
    const results = await directory.search(q);
    return {
      query: q,
      businesses: results.map((r) => ({
        id: r.businessId,
        name: r.businessName,
        category: r.category,
        location: r.location,
        experienceId: r.id,
      })),
      experiences: results,
    };
  });

  app.get("/experiences", { preHandler: requireSession }, async () => {
    const items = await directory.list();
    return { experiences: items };
  });

  app.get<{ Params: { id: string } }>(
    "/experiences/:id",
    { preHandler: requireSession },
    async (req, reply) => {
      const experience = await directory.getById(req.params.id);
      if (!experience) return reply.code(404).send({ error: "not_found" });
      const connection = await experiences.getConnection(req.lifeosUser!.id, experience.id);
      return {
        experience,
        connection: connection
          ? {
              id: connection.id,
              status: connection.status,
              grantedPermissions: connection.grantedPermissions,
              connectedAt: connection.connectedAt.toISOString(),
              disconnectedAt: connection.disconnectedAt?.toISOString() ?? null,
            }
          : null,
      };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/experiences/:id/permissions",
    { preHandler: requireSession },
    async (req, reply) => {
      try {
        const requested = await experiences.getPermissions(req.params.id);
        const connection = await experiences.getConnection(req.lifeosUser!.id, req.params.id);
        return {
          experienceId: req.params.id,
          requestable: requested.map((p) => ({
            id: p,
            label: PERMISSION_LABELS[p],
          })),
          catalog: EXPERIENCE_PERMISSIONS.map((p) => ({
            id: p,
            label: PERMISSION_LABELS[p],
          })),
          granted: connection?.status === "connected" ? connection.grantedPermissions : [],
          connected: connection?.status === "connected" || false,
        };
      } catch {
        return reply.code(404).send({ error: "not_found" });
      }
    },
  );

  const connectBody = z.object({
    permissions: z.array(z.string()).min(1),
  });

  app.post<{ Params: { id: string } }>(
    "/experiences/:id/connect",
    { preHandler: requireSession },
    async (req, reply) => {
      const body = connectBody.parse(req.body);
      const permissions = body.permissions.filter((p): p is ExperiencePermission =>
        (EXPERIENCE_PERMISSIONS as readonly string[]).includes(p),
      );
      try {
        const result = await experiences.connect(
          req.lifeosUser!.id,
          req.params.id,
          permissions,
        );
        const session = await experiences.createExperienceSession({
          userId: req.lifeosUser!.id,
          trustId: req.lifeosUser!.trustId,
          displayName: req.lifeosUser!.displayName,
          experienceId: req.params.id,
        });
        return { ...result, session };
      } catch (err) {
        const code = (err as Error & { code?: string }).code;
        if (code === "permission_denied") {
          return reply.code(403).send({
            error: "permission_denied",
            message: err instanceof Error ? err.message : "Permission denied",
          });
        }
        if (code === "not_found") return reply.code(404).send({ error: "not_found" });
        throw err;
      }
    },
  );

  const denyBody = z.object({
    permissions: z.array(z.string()).min(1),
  });

  app.post<{ Params: { id: string } }>(
    "/experiences/:id/permissions/deny",
    { preHandler: requireSession },
    async (req) => {
      const body = denyBody.parse(req.body);
      const permissions = body.permissions.filter((p): p is ExperiencePermission =>
        (EXPERIENCE_PERMISSIONS as readonly string[]).includes(p),
      );
      await experiences.denyPermissions(req.lifeosUser!.id, req.params.id, permissions);
      return { ok: true };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/experiences/:id/session",
    { preHandler: requireSession },
    async (req, reply) => {
      try {
        const session = await experiences.createExperienceSession({
          userId: req.lifeosUser!.id,
          trustId: req.lifeosUser!.trustId,
          displayName: req.lifeosUser!.displayName,
          experienceId: req.params.id,
        });
        return { session };
      } catch (err) {
        const code = (err as Error & { code?: string }).code;
        if (code === "not_connected") {
          return reply.code(403).send({ error: "not_connected", message: "Connect and grant permissions first" });
        }
        return reply.code(400).send({
          error: code || "session_failed",
          message: err instanceof Error ? err.message : "Failed",
        });
      }
    },
  );
}

void parsePerms;
