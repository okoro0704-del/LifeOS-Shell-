import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ORCHESTRATED_ACTIONS, type OrchestratedAction } from "@lifeos/shared";
import { requireSession } from "../lib/auth.js";
import { actionOrchestrator } from "../services/action-orchestrator.js";
import { getPlans } from "../services/plans.js";
import { isSaved, listSaved, saveOffering, unsaveOffering } from "../services/saved-offerings.js";

const actionEnum = z.enum(ORCHESTRATED_ACTIONS as unknown as [OrchestratedAction, ...OrchestratedAction[]]);

const previewBody = z.object({
  action: actionEnum,
  offeringId: z.string().min(1),
  slotId: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  partySize: z.number().int().positive().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  notes: z.string().optional(),
  params: z.record(z.unknown()).optional(),
});

const confirmBody = previewBody.extend({
  confirmed: z.literal(true),
  expectedTotal: z.number().optional(),
  authorizationToken: z.string().optional(),
});

export async function actionRoutes(app: FastifyInstance) {
  app.get("/actions/for-offering", { preHandler: requireSession }, async (req, reply) => {
    const offeringId = String((req.query as { offeringId?: string }).offeringId ?? "");
    if (!offeringId) return reply.code(400).send({ error: "offeringId_required" });
    const detail = await actionOrchestrator.listActionsForOffering(offeringId);
    if (!detail) return reply.code(404).send({ error: "not_found" });
    return detail;
  });

  app.post("/actions/preview", { preHandler: requireSession }, async (req, reply) => {
    const body = previewBody.parse(req.body);
    try {
      const preview = await actionOrchestrator.preview(
        req.lifeosUser!.id,
        req.lifeosUser!.trustId,
        body,
      );
      return { preview };
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === "not_found") return reply.code(404).send({ error: "not_found" });
      if (code === "capability_denied") return reply.code(403).send({ error: code, message: (err as Error).message });
      if (code === "slot_unavailable") {
        return reply.code(409).send({
          error: "slot_unavailable",
          message: (err as Error).message,
          recovery: "choose_another_time",
        });
      }
      throw err;
    }
  });

  app.post("/actions/confirm", { preHandler: requireSession }, async (req, reply) => {
    const body = confirmBody.parse(req.body);
    try {
      const result = await actionOrchestrator.confirm(
        req.lifeosUser!.id,
        req.lifeosUser!.trustId,
        req.lifeosUser!.displayName,
        body,
      );
      const status =
        result.status === "FAILED"
          ? 409
          : result.status === "REQUIRES_AUTHORIZATION"
            ? 401
            : 200;
      return reply.code(status === 200 ? 200 : status).send({ result });
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === "not_found") return reply.code(404).send({ error: "not_found" });
      throw err;
    }
  });

  app.get("/actions/history", { preHandler: requireSession }, async (req) => {
    const filter = String((req.query as { filter?: string }).filter ?? "recent") as
      | "recent"
      | "upcoming"
      | "completed"
      | "cancelled";
    const items = await actionOrchestrator.listHistory(req.lifeosUser!.id, filter);
    return { items };
  });

  app.get<{ Params: { id: string } }>("/actions/:id", { preHandler: requireSession }, async (req, reply) => {
    const result = await actionOrchestrator.getAction(req.lifeosUser!.id, req.params.id);
    if (!result) return reply.code(404).send({ error: "not_found" });
    return { result };
  });

  app.get("/plans", { preHandler: requireSession }, async (req) => {
    return getPlans(req.lifeosUser!.id, req.lifeosUser!.trustId);
  });

  app.get("/context", { preHandler: requireSession }, async (req) => {
    const { personalContextService } = await import("../services/personal-context.js");
    const snapshot = await personalContextService.getSnapshot(
      req.lifeosUser!.id,
      req.lifeosUser!.trustId,
    );
    return { context: snapshot };
  });

  app.get("/context/ai", { preHandler: requireSession }, async (req) => {
    const { personalContextService } = await import("../services/personal-context.js");
    const snapshot = await personalContextService.getSnapshot(
      req.lifeosUser!.id,
      req.lifeosUser!.trustId,
    );
    return { context: personalContextService.toAiSafe(snapshot) };
  });

  app.post("/plans/groups", { preHandler: requireSession }, async (req, reply) => {
    const body = z
      .object({
        title: z.string().min(1).max(120),
        items: z
          .array(
            z.object({
              id: z.string(),
              type: z.string(),
              title: z.string(),
              subtitle: z.string().nullable().optional(),
              source: z.string(),
              sourceId: z.string().nullable().optional(),
              experienceId: z.string().nullable().optional(),
              offeringId: z.string().nullable().optional(),
              startAt: z.string().nullable().optional(),
              endAt: z.string().nullable().optional(),
              status: z.string(),
              location: z.string().nullable().optional(),
            }),
          )
          .max(20),
      })
      .parse(req.body);
    const { personalContextService } = await import("../services/personal-context.js");
    const group = await personalContextService.createPlanGroup(
      req.lifeosUser!.id,
      body.title,
      body.items as import("@lifeos/shared").LifePlanItem[],
    );
    return reply.code(201).send({ group });
  });

  app.get("/saved", { preHandler: requireSession }, async (req) => {
    return { items: await listSaved(req.lifeosUser!.id) };
  });

  app.post<{ Params: { id: string } }>(
    "/offerings/:id/save",
    { preHandler: requireSession },
    async (req, reply) => {
      try {
        await saveOffering(req.lifeosUser!.id, req.params.id);
        return { ok: true, saved: true };
      } catch (err) {
        if ((err as Error & { code?: string }).code === "not_found") {
          return reply.code(404).send({ error: "not_found" });
        }
        throw err;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/offerings/:id/save",
    { preHandler: requireSession },
    async (req) => {
      await unsaveOffering(req.lifeosUser!.id, req.params.id);
      return { ok: true, saved: false };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/offerings/:id/saved",
    { preHandler: requireSession },
    async (req) => {
      return { saved: await isSaved(req.lifeosUser!.id, req.params.id) };
    },
  );
}
