import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AUDIT_EVENTS, DEFAULT_PREFERENCES } from "@lifeos/shared";
import {
  clearSessionCookie,
  extractSessionToken,
  requireSession,
  resolveAuthStatus,
  setSessionCookie,
  toPublicUser,
} from "../lib/auth.js";
import { config } from "../lib/config.js";
import { hashSecret, randomToken } from "../lib/crypto.js";
import { putEphemeralPresentation } from "../lib/ephemeral-identity.js";
import { prisma } from "../lib/prisma.js";
import { verifyZkClaims } from "../lib/zk-verify.js";
import { auditLog } from "../services/audit.js";
import {
  checkTrustIdAvailable,
  fetchTrustIdUserInfo,
  publicDisplayName,
  TrustIdError,
} from "../services/trustid.js";

const groth16Proof = z.object({
  pi_a: z.array(z.string()).min(2),
  pi_b: z.array(z.array(z.string())).min(2),
  pi_c: z.array(z.string()).min(2),
  protocol: z.string().optional(),
  curve: z.string().optional(),
});

const zkClaimSchema = z.object({
  claimType: z.string().min(1),
  proof: groth16Proof,
  publicSignals: z.array(z.string()).min(1),
  nullifier: z.string().optional(),
  disclosed: z
    .object({
      trustTier: z.number().int().min(0).max(3).optional(),
      identityStatus: z.string().optional(),
      verified: z.boolean().optional(),
      authorized: z.boolean().optional(),
    })
    .optional(),
  issuedAt: z.string().optional(),
  audience: z.string().optional(),
  protocol: z.literal("groth16").optional(),
});

/** Session handshake — cryptographic proofs preferred; raw PII never persisted. */
const sessionBody = z.object({
  accessToken: z.string().min(10),
  zkClaims: z.array(zkClaimSchema).optional(),
  /** RAM-only for this LifeOS session — never written to Postgres. */
  ephemeralPresentation: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().min(3).max(32).optional(),
      firstName: z.string().min(1).max(80).optional(),
      lastName: z.string().min(1).max(80).optional(),
    })
    .optional(),
});

async function ensureWelcomeContent(userId: string) {
  const existing = await prisma.activity.count({ where: { userId } });
  if (existing > 0) return;

  await prisma.activity.createMany({
    data: [
      {
        userId,
        kind: "account",
        title: "Welcome to LifeOS",
        detail: "Your shell is ready. Installed apps stream from the LifeOS registry.",
        source: "lifeos",
        status: "completed",
        deepLink: "/app",
        createdAt: new Date(),
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId,
        title: "LifeOS session ready",
        body: "Apps you publish to the registry appear in your launcher automatically.",
        source: "lifeos",
        category: "System",
      },
    ],
  });
}

export async function authRoutes(app: FastifyInstance) {
  app.get("/auth/status", async (req, reply) => {
    const resolved = await resolveAuthStatus(req, reply);
    return {
      status: resolved.status,
      authenticated: resolved.status === "authenticated",
    };
  });

  app.get("/auth/trustid-health", async () => {
    if (config.authBypassEnabled) {
      return { available: false, bypass: true };
    }
    const available = await checkTrustIdAvailable();
    return { available, bypass: false };
  });

  /**
   * Temporary TrustID bypass — mint a real LifeOS session without OAuth.
   * Enable with LIFEOS_AUTH_BYPASS=true; unset to restore TrustID login.
   */
  app.post("/auth/dev-session", async (req, reply) => {
    if (!config.authBypassEnabled) {
      return reply.code(404).send({ error: "not_found" });
    }

    const body = z
      .object({
        trustId: z.string().min(3).max(64).optional(),
        displayName: z.string().min(1).max(80).optional(),
      })
      .parse(req.body ?? {});

    const trustId = (body.trustId ?? config.authBypassTrustId).trim();
    const displayName = (body.displayName ?? config.authBypassDisplayName).trim();

    const user = await prisma.user.upsert({
      where: { trustId },
      create: {
        trustId,
        displayName,
        trustTier: 1,
        identityStatus: "dev_bypass",
        preferences: JSON.stringify(DEFAULT_PREFERENCES),
        lastLoginAt: new Date(),
      },
      update: {
        displayName,
        identityStatus: "dev_bypass",
        lastLoginAt: new Date(),
      },
    });

    await ensureWelcomeContent(user.id);

    const { syncCatalogFromExperiences, syncInstalledAppsFromCatalog } = await import(
      "../services/installed-apps.js"
    );
    await syncCatalogFromExperiences().catch(() => 0);
    await syncInstalledAppsFromCatalog({ userId: user.id, trustId }).catch(() => null);

    const rawToken = randomToken(32);
    const expiresAt = new Date(Date.now() + config.sessionTtlHours * 3600_000);
    await prisma.session.create({
      data: { tokenHash: hashSecret(rawToken), userId: user.id, expiresAt },
    });

    await auditLog(AUDIT_EVENTS.SESSION_CREATED, {
      userId: user.id,
      detail: { trustId, bypass: true },
    });

    setSessionCookie(reply, rawToken, expiresAt);

    return {
      user: toPublicUser(user),
      sessionToken: rawToken,
      expiresAt: expiresAt.toISOString(),
      bypass: true,
      zk: { verified: false, claimCount: 0 },
    };
  });

  app.post("/auth/session", async (req, reply) => {
    const body = sessionBody.parse(req.body);
    let identity;
    try {
      identity = await fetchTrustIdUserInfo(body.accessToken);
    } catch (err) {
      if (err instanceof TrustIdError) {
        const status = err.code === "trustid_unavailable" ? 503 : 401;
        return reply.code(status).send({ error: err.code, message: err.message });
      }
      return reply.code(401).send({ error: "invalid_token", message: "Gateway validation failed" });
    }

    const claims = body.zkClaims ?? [];
    const mustHaveClaims = config.zkRequireClaims && Boolean(identity.zk?.available);
    const verified = await verifyZkClaims(claims, {
      audience: config.trustIdClientId,
      required: mustHaveClaims,
    });

    if (!verified.ok) {
      return reply.code(401).send({
        error: verified.error.code,
        message: verified.error.message,
      });
    }

    const trustId = identity.trustId;
    const disclosedTier = claims
      .map((c) => c.disclosed?.trustTier)
      .find((t) => typeof t === "number");
    const trustTier =
      disclosedTier ??
      identity.trustLevel?.tier ??
      null;
    const identityStatus =
      claims.map((c) => c.disclosed?.identityStatus).find(Boolean) ??
      identity.identityStatus ??
      identity.status ??
      null;
    const zkVerified = claims.length > 0;
    const displayName = publicDisplayName(trustId);

    const user = await prisma.user.upsert({
      where: { trustId },
      create: {
        trustId,
        displayName,
        trustTier,
        identityStatus,
        zkVerifiedAt: zkVerified ? new Date() : null,
        preferences: JSON.stringify(DEFAULT_PREFERENCES),
        lastLoginAt: new Date(),
      },
      update: {
        displayName,
        trustTier,
        identityStatus,
        zkVerifiedAt: zkVerified ? new Date() : null,
        lastLoginAt: new Date(),
      },
    });

    await ensureWelcomeContent(user.id);

    const rawToken = randomToken(32);
    const expiresAt = new Date(Date.now() + config.sessionTtlHours * 3600_000);
    const session = await prisma.session.create({
      data: { tokenHash: hashSecret(rawToken), userId: user.id, expiresAt },
    });

    // Session-scoped contacts/names stay in RAM only.
    if (body.ephemeralPresentation) {
      putEphemeralPresentation(session.id, body.ephemeralPresentation);
    }

    await auditLog(AUDIT_EVENTS.SESSION_CREATED, {
      userId: user.id,
      detail: {
        trustId,
        zkVerified,
        claimTypes: claims.map((c) => c.claimType),
        trustTier,
        identityStatus,
      },
    });

    setSessionCookie(reply, rawToken, expiresAt);

    return {
      user: toPublicUser(user),
      sessionToken: rawToken,
      expiresAt: expiresAt.toISOString(),
      zk: {
        verified: zkVerified,
        claimCount: claims.length,
      },
    };
  });

  app.post("/auth/logout", async (req, reply) => {
    const candidates = new Set<string>();
    const header = req.headers[config.sessionHeaderName];
    if (typeof header === "string" && header.trim()) candidates.add(header.trim());
    const auth = req.headers.authorization;
    if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
      const bearer = auth.slice(7).trim();
      if (bearer) candidates.add(bearer);
    }
    const cookieTok = req.cookies[config.sessionCookieName];
    if (cookieTok) candidates.add(cookieTok);
    const primary = extractSessionToken(req);
    if (primary) candidates.add(primary);

    let revokedUserId: string | null = null;
    for (const token of candidates) {
      const session = await prisma.session.findUnique({
        where: { tokenHash: hashSecret(token) },
      });
      if (session) {
        const { clearEphemeralPresentation } = await import("../lib/ephemeral-identity.js");
        clearEphemeralPresentation(session.id);
        await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
        revokedUserId = session.userId;
      }
    }
    if (revokedUserId) {
      await auditLog(AUDIT_EVENTS.SESSION_REVOKED, { userId: revokedUserId });
    }
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/me", { preHandler: requireSession }, async (req) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.lifeosUser!.id } });
    return {
      user: toPublicUser(user),
      trustIdConnected: !config.authBypassEnabled,
      authBypass: config.authBypassEnabled,
    };
  });
}
