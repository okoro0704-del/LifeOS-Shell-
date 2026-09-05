import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { z } from "zod";
import { requireSession } from "../lib/auth.js";
import { config } from "../lib/config.js";
import { prisma } from "../lib/prisma.js";
import {
  bootstrapTenant,
  listInstalledAppsForUser,
} from "../services/installed-apps.js";

function authorizeDistribution(req: { headers: Record<string, unknown> }): boolean {
  const secret =
    process.env.MASTER_DISTRIBUTION_SECRET ||
    process.env.DISTRIBUTOR_SECRET ||
    "";
  if (!secret) {
    // Allow in non-production when unset so local smoke tests work.
    return config.isDev;
  }
  const auth = String(req.headers.authorization ?? "");
  return auth === `Bearer ${secret}`;
}

async function dispatchElfComRelease(input: {
  appId: string;
  version: string;
  platform: string;
  releaseId: string;
}): Promise<boolean> {
  const base = (process.env.ELFCOM_BASE_URL || process.env.ELFCOM_API_URL || "").replace(
    /\/$/,
    "",
  );
  if (!base) return false;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = process.env.ELFCOM_BAAS_API_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;
  try {
    const res = await fetch(`${base}/v1/notifications/push`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "lifeos.release.published",
        title: `LifeOS ${input.version} (${input.platform})`,
        body: `${input.appId} ${input.version} published for ${input.platform}.`,
        data: input,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Portal / distributor tenant bootstrap + shell installed-apps registry + releases hub.
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

  /**
   * Master Distribution Hub — accept web/desktop/mobile release uploads.
   * Accepts JSON `{ appId, version, platform, artifactBase64?, filename? }`.
   */
  app.post("/v1/releases", async (req, reply) => {
    if (!authorizeDistribution(req as { headers: Record<string, unknown> })) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const body = z
      .object({
        appId: z.string().min(1).max(64),
        version: z.string().min(1).max(64),
        platform: z.string().min(1).max(32),
        filename: z.string().min(1).max(256).optional(),
        contentType: z.string().min(1).max(128).optional(),
        artifactBase64: z.string().optional(),
        artifactUrl: z.string().url().optional(),
        sizeBytes: z.number().int().nonnegative().optional(),
      })
      .parse(req.body);

    const { appId, version, platform } = body;
    const filename = body.filename ?? `${appId}-${platform}-${version}`;
    const contentTypeFile = body.contentType ?? "application/octet-stream";
    const bytes = body.artifactBase64 ? Buffer.from(body.artifactBase64, "base64") : Buffer.alloc(0);
    const sizeBytes = bytes.length || body.sizeBytes || 0;
    const sha256 = bytes.length ? createHash("sha256").update(bytes).digest("hex") : null;
    const storeInline = bytes.length > 0 && bytes.length <= 2_000_000;

    const release = await prisma.releaseArtifact.upsert({
      where: { appId_version_platform: { appId, version, platform } },
      create: {
        appId,
        version,
        platform,
        filename,
        contentType: contentTypeFile,
        sizeBytes,
        sha256,
        artifactUrl: storeInline
          ? `data:${contentTypeFile};base64,${bytes.toString("base64")}`
          : body.artifactUrl ?? null,
      },
      update: {
        filename,
        contentType: contentTypeFile,
        sizeBytes,
        sha256,
        artifactUrl: storeInline
          ? `data:${contentTypeFile};base64,${bytes.toString("base64")}`
          : body.artifactUrl ?? null,
      },
    });

    const elfcomNotified = await dispatchElfComRelease({
      appId,
      version,
      platform,
      releaseId: release.id,
    });
    if (elfcomNotified) {
      await prisma.releaseArtifact.update({
        where: { id: release.id },
        data: { elfcomNotified: true },
      });
    }

    return reply.code(201).send({
      success: true,
      id: release.id,
      appId,
      version,
      platform,
      sizeBytes,
      sha256,
      elfcomNotified,
      createdAt: release.createdAt.toISOString(),
    });
  });
}
