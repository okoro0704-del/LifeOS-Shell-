import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authorizePublicationIngest,
  discoverPublicationSources,
  listFeedProjections,
  reconcileEcosystemPublications,
  upsertPublicationProjection,
} from "../services/ecosystem-publications.js";

/**
 * Ecosystem publication ingestion + feed + reconciliation.
 * LifeOS stores consumer projections only — origin apps remain canonical.
 */
export async function publicationRoutes(app: FastifyInstance) {
  app.get("/v1/publications/feed", async (req) => {
    const query = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).optional(),
        cursor: z.string().min(1).optional(),
      })
      .parse(req.query ?? {});

    // Live path without origin push: refresh projections when sources are stale.
    const staleBefore = new Date(Date.now() - 60_000);
    const staleSource = await prisma.publicationSource.findFirst({
      where: {
        status: "active",
        OR: [{ lastScannedAt: null }, { lastScannedAt: { lt: staleBefore } }],
      },
    });
    const empty = (await listFeedProjections({ limit: 1 })).length === 0;
    if (empty || staleSource) {
      await reconcileEcosystemPublications({ dryRun: false }).catch((err) => {
        req.log.warn({ err }, "publication soft-reconcile failed");
      });
    }

    const items = await listFeedProjections({
      limit: query.limit,
      cursor: query.cursor,
    });
    return {
      items,
      count: items.length,
      nextCursor: items.length ? items[items.length - 1]?.id : null,
    };
  });

  app.post("/v1/publications/ingest", async (req, reply) => {
    if (!authorizePublicationIngest(req.headers as Record<string, unknown>)) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const body = z
      .object({
        originApplicationId: z.string().min(1).max(64),
        originTenantId: z.string().min(1).max(128),
        originPublicationId: z.string().min(1).max(128),
        originAssetIds: z.array(z.string().min(1)).max(32).optional(),
        originCreatorId: z.string().min(1).max(128).optional().nullable(),
        publicationType: z.string().min(1).max(32),
        privacy: z.string().min(1).max(32).optional(),
        publicationState: z.string().min(1).max(32).optional(),
        title: z.string().min(1).max(500),
        caption: z.string().max(8000).optional(),
        authorDisplayName: z.string().max(200).optional(),
        authorSlug: z.string().min(1).max(63),
        publicDestinationUrl: z.string().url(),
        mediaUrl: z.string().url().optional().nullable(),
        mediaStatus: z.enum(["ok", "broken", "none"]).optional(),
        publishedAt: z.string().datetime().or(z.string().min(1)),
        rawMetadata: z.record(z.unknown()).optional(),
      })
      .parse(req.body);

    if (/localhost|127\.0\.0\.1/i.test(body.publicDestinationUrl)) {
      return reply.code(400).send({ error: "invalid_destination", message: "localhost destinations are not allowed" });
    }

    const result = await upsertPublicationProjection(body);
    req.log.info(
      {
        event: "publication.ingest",
        originPublicationId: body.originPublicationId,
        originApplicationId: body.originApplicationId,
        created: result.created,
        projectionId: result.id,
      },
      "publication ingested",
    );
    return reply.code(result.created ? 201 : 200).send({
      ok: true,
      created: result.created,
      projectionId: result.id,
    });
  });

  app.post("/v1/publications/reconcile", async (req, reply) => {
    if (!authorizePublicationIngest(req.headers as Record<string, unknown>)) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const body = z
      .object({
        dryRun: z.boolean().optional(),
      })
      .parse(req.body ?? {});

    const report = await reconcileEcosystemPublications({ dryRun: body.dryRun ?? false });
    req.log.info(
      {
        event: "publication.reconcile",
        dryRun: Boolean(body.dryRun),
        created: report.created,
        missing: report.missing,
        errors: report.errors,
      },
      "publication reconcile finished",
    );
    return { ok: true, dryRun: Boolean(body.dryRun), report };
  });

  app.get("/v1/publications/sources", async (req, reply) => {
    if (!authorizePublicationIngest(req.headers as Record<string, unknown>)) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const discovery = await discoverPublicationSources();
    return { ok: true, ...discovery };
  });
}
