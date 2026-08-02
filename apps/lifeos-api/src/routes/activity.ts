import type { FastifyInstance } from "fastify";
import type { ActivityItem, ActivityKind } from "@lifeos/shared";
import { requireSession } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export async function activityRoutes(app: FastifyInstance) {
  app.get("/activity", { preHandler: requireSession }, async (req) => {
    const rows = await prisma.activity.findMany({
      where: { userId: req.lifeosUser!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const activities: ActivityItem[] = rows.map((r) => {
      let metadata: Record<string, unknown> = {};
      try {
        metadata = JSON.parse(r.metadata) as Record<string, unknown>;
      } catch {
        /* */
      }
      return {
        id: r.id,
        kind: r.kind as ActivityKind,
        title: r.title,
        detail: r.detail,
        description: r.detail,
        source: r.source,
        status: r.status,
        amount: r.amount,
        deepLink: r.deepLink,
        experienceId: r.experienceId,
        metadata,
        createdAt: r.createdAt.toISOString(),
      };
    });
    return { activities };
  });
}
