import type { FastifyInstance } from "fastify";
import { AUDIT_EVENTS, type NotificationCategory, type NotificationItem } from "@lifeos/shared";
import { requireSession } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { auditLog } from "../services/audit.js";

export async function notificationRoutes(app: FastifyInstance) {
  app.get("/notifications", { preHandler: requireSession }, async (req) => {
    const rows = await prisma.notification.findMany({
      where: { userId: req.lifeosUser!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const notifications: NotificationItem[] = rows.map((r) => {
      let actionParams: Record<string, unknown> = {};
      try {
        actionParams = JSON.parse(r.actionParams || "{}") as Record<string, unknown>;
      } catch {
        actionParams = {};
      }
      return {
        id: r.id,
        title: r.title,
        body: r.body,
        source: r.source,
        category: (r.category || "System") as NotificationCategory,
        read: r.read,
        createdAt: r.createdAt.toISOString(),
        actionId: r.actionId,
        actionParams,
      };
    });
    return {
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    };
  });

  app.patch<{ Params: { id: string } }>(
    "/notifications/:id/read",
    { preHandler: requireSession },
    async (req, reply) => {
      const row = await prisma.notification.findFirst({
        where: { id: req.params.id, userId: req.lifeosUser!.id },
      });
      if (!row) return reply.code(404).send({ error: "not_found" });
      const updated = await prisma.notification.update({
        where: { id: row.id },
        data: { read: true },
      });
      await auditLog(AUDIT_EVENTS.NOTIFICATION_READ, {
        userId: req.lifeosUser!.id,
        detail: { notificationId: updated.id },
      });
      return {
        notification: {
          id: updated.id,
          title: updated.title,
          body: updated.body,
          source: updated.source,
          category: updated.category,
          read: updated.read,
          createdAt: updated.createdAt.toISOString(),
        },
      };
    },
  );

  // Back-compat with Sprint 1 POST
  app.post<{ Params: { id: string } }>(
    "/notifications/:id/read",
    { preHandler: requireSession },
    async (req, reply) => {
      const row = await prisma.notification.findFirst({
        where: { id: req.params.id, userId: req.lifeosUser!.id },
      });
      if (!row) return reply.code(404).send({ error: "not_found" });
      const updated = await prisma.notification.update({
        where: { id: row.id },
        data: { read: true },
      });
      return { notification: { id: updated.id, read: updated.read } };
    },
  );

  app.post("/notifications/read-all", { preHandler: requireSession }, async (req) => {
    await prisma.notification.updateMany({
      where: { userId: req.lifeosUser!.id, read: false },
      data: { read: true },
    });
    return { ok: true };
  });
}
