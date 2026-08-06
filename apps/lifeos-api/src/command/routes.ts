import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ACTION_IDS, SEARCH_RESULT_TYPES, type ActionId } from "@lifeos/shared";
import { requireSession } from "../lib/auth.js";
import { getAIProvider } from "../command/ai-provider.js";
import { listActions } from "../command/action-registry.js";
import {
  clearCommandHistory,
  executeConfirmedAction,
  listRecentCommands,
  resolveActionPath,
  runCommand,
} from "../command/command-service.js";
import { quickAccessService } from "../command/quick-access.js";
import { getUniversalSearch } from "../command/search/engine.js";
import { getBusinessDirectory } from "../services/directory.js";

export async function commandRoutes(app: FastifyInstance) {
  /** Universal search — normalized results + back-compat business/experience arrays. */
  app.get("/search", { preHandler: requireSession }, async (req) => {
    const q = String((req.query as { q?: string }).q ?? "").trim();
    const typeRaw = String((req.query as { type?: string }).type ?? "");
    const types = typeRaw
      ? typeRaw
          .split(",")
          .map((t) => t.trim())
          .filter((t): t is (typeof SEARCH_RESULT_TYPES)[number] =>
            (SEARCH_RESULT_TYPES as readonly string[]).includes(t),
          )
      : undefined;

    if (!q) {
      return { query: q, results: [], groups: {}, businesses: [], experiences: [] };
    }

    const { results, groups } = await getUniversalSearch().search({
      userId: req.lifeosUser!.id,
      trustId: req.lifeosUser!.trustId,
      query: q,
      types,
    });

    // Back-compat for existing Search page
    const directory = getBusinessDirectory();
    const legacy = await directory.search(q);

    return {
      query: q,
      results,
      groups,
      businesses: legacy.map((r) => ({
        id: r.businessId,
        name: r.businessName,
        category: r.category,
        location: r.location,
        experienceId: r.id,
      })),
      experiences: legacy,
    };
  });

  app.post("/commands", { preHandler: requireSession }, async (req) => {
    const body = z
      .object({
        text: z.string().min(1).max(200),
        source: z.enum(["text", "voice", "touch", "deeplink", "notification"]).optional(),
        sessionId: z.string().uuid().optional(),
      })
      .parse(req.body);
    return runCommand({
      userId: req.lifeosUser!.id,
      trustId: req.lifeosUser!.trustId,
      text: body.text,
      source: body.source ?? "text",
      sessionId: body.sessionId,
    });
  });

  app.post("/commands/plan", { preHandler: requireSession }, async (req) => {
    const body = z.object({ text: z.string().min(1).max(200) }).parse(req.body);
    const { planQuery } = await import("../command/query-planner.js");
    return { plan: planQuery(body.text) };
  });

  app.get("/commands/session", { preHandler: requireSession }, async (req) => {
    const { commandSessionService } = await import("../command/command-session.js");
    const session = commandSessionService.latestForUser(req.lifeosUser!.id);
    if (!session) return { session: null };
    return {
      session: {
        sessionId: session.sessionId,
        intent: session.intent,
        filters: session.filters,
        resultCount: session.resultCount,
        selectedResultId: session.selectedResultId,
        pendingActionId: session.pendingActionId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        reason: session.reason,
      },
    };
  });

  app.get("/commands/recent", { preHandler: requireSession }, async (req) => {
    const items = await listRecentCommands(req.lifeosUser!.id);
    return { items };
  });

  app.delete("/commands/recent", { preHandler: requireSession }, async (req) => {
    return clearCommandHistory(req.lifeosUser!.id);
  });

  app.delete("/commands/recent/:id", { preHandler: requireSession }, async (req) => {
    const id = (req.params as { id: string }).id;
    const { prisma } = await import("../lib/prisma.js");
    await prisma.commandHistory.deleteMany({
      where: { id, userId: req.lifeosUser!.id },
    });
    return { ok: true };
  });

  app.get("/commands/shortcuts", { preHandler: requireSession }, async () => {
    const { COMMAND_SHORTCUTS } = await import("@lifeos/shared");
    return { shortcuts: COMMAND_SHORTCUTS };
  });

  app.get("/location", { preHandler: requireSession }, async (req) => {
    const { locationPermissionService } = await import("../command/location.js");
    return { location: locationPermissionService.get(req.lifeosUser!.id) };
  });

  app.post("/location/grant", { preHandler: requireSession }, async (req) => {
    const body = z
      .object({ mode: z.enum(["coarse", "precise"]).optional(), label: z.string().max(80).optional() })
      .parse(req.body ?? {});
    const { locationPermissionService } = await import("../command/location.js");
    return {
      location: locationPermissionService.grant(
        req.lifeosUser!.id,
        body.mode ?? "coarse",
        body.label,
      ),
    };
  });

  app.post("/location/revoke", { preHandler: requireSession }, async (req) => {
    const { locationPermissionService } = await import("../command/location.js");
    return { location: locationPermissionService.revoke(req.lifeosUser!.id) };
  });

  app.get("/quick-access", { preHandler: requireSession }, async (req) => {
    const items = await quickAccessService.getItems(req.lifeosUser!.id);
    return { items };
  });

  app.post("/quick-access/pin", { preHandler: requireSession }, async (req) => {
    const body = z.object({ id: z.string().min(1) }).parse(req.body);
    const quickAccess = await quickAccessService.pin(req.lifeosUser!.id, body.id);
    const items = await quickAccessService.getItems(req.lifeosUser!.id);
    return { quickAccess, items };
  });

  app.post("/quick-access/unpin", { preHandler: requireSession }, async (req) => {
    const body = z.object({ id: z.string().min(1) }).parse(req.body);
    const quickAccess = await quickAccessService.unpin(req.lifeosUser!.id, body.id);
    const items = await quickAccessService.getItems(req.lifeosUser!.id);
    return { quickAccess, items };
  });

  app.post("/quick-access/hide", { preHandler: requireSession }, async (req) => {
    const body = z.object({ id: z.string().min(1) }).parse(req.body);
    const quickAccess = await quickAccessService.hide(req.lifeosUser!.id, body.id);
    const items = await quickAccessService.getItems(req.lifeosUser!.id);
    return { quickAccess, items };
  });

  app.post("/quick-access/restore", { preHandler: requireSession }, async (req) => {
    const body = z.object({ id: z.string().min(1) }).parse(req.body);
    const quickAccess = await quickAccessService.restore(req.lifeosUser!.id, body.id);
    const items = await quickAccessService.getItems(req.lifeosUser!.id);
    return { quickAccess, items };
  });

  app.post("/quick-access/reorder", { preHandler: requireSession }, async (req) => {
    const body = z.object({ order: z.array(z.string()).max(32) }).parse(req.body);
    const quickAccess = await quickAccessService.reorder(req.lifeosUser!.id, body.order);
    const items = await quickAccessService.getItems(req.lifeosUser!.id);
    return { quickAccess, items };
  });

  app.get("/suggestions", { preHandler: requireSession }, async (req) => {
    const q = String((req.query as { q?: string }).q ?? "").trim();
    const ai = getAIProvider();
    const intent = await ai.classifyIntent(q || "help");
    const suggestions = await ai.suggestActions({ intent });
    const recent = await listRecentCommands(req.lifeosUser!.id, 8);
    const quick = await quickAccessService.getItems(req.lifeosUser!.id);
    const { COMMAND_SHORTCUTS } = await import("@lifeos/shared");
    return {
      suggestions,
      recent,
      quickAccess: quick,
      intents: intent,
      shortcuts: COMMAND_SHORTCUTS,
    };
  });

  app.post("/ai/intent", { preHandler: requireSession }, async (req) => {
    const body = z.object({ text: z.string().min(1).max(200) }).parse(req.body);
    const intent = await getAIProvider().classifyIntent(body.text);
    return { intent };
  });

  app.post("/ai/plan", { preHandler: requireSession }, async (req) => {
    const body = z.object({ text: z.string().min(1).max(200) }).parse(req.body);
    const ai = getAIProvider();
    const intent = await ai.classifyIntent(body.text);
    const plan = await ai.plan({ intent });
    return { intent, plan };
  });

  app.get("/actions", { preHandler: requireSession }, async () => {
    return { actions: listActions() };
  });

  app.post("/actions/execute", { preHandler: requireSession }, async (req) => {
    const body = z
      .object({
        actionId: z.enum(ACTION_IDS as unknown as [ActionId, ...ActionId[]]),
        params: z.record(z.unknown()).optional(),
        confirmed: z.boolean().optional().default(false),
      })
      .parse(req.body);

    if (!body.confirmed) {
      return resolveActionPath(body.actionId, body.params ?? {});
    }
    return executeConfirmedAction({
      userId: req.lifeosUser!.id,
      trustId: req.lifeosUser!.trustId,
      actionId: body.actionId,
      params: body.params ?? {},
      confirmed: true,
    });
  });
}
