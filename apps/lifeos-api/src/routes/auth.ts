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

  const now = Date.now();
  await prisma.activity.createMany({
    data: [
      {
        userId,
        kind: "account",
        title: "Welcome to LifeOS",
        detail: "Your LifeOS profile is connected via the LifeOS Gateway.",
        source: "lifeos",
        status: "completed",
        deepLink: "/app/profile",
        createdAt: new Date(now - 1000),
      },
      {
        userId,
        kind: "wallet_transfer",
        title: "Finance ready when FinProv binds",
        detail: "Wallet rails await the FinProv sovereign node.",
        source: "lifeos",
        amount: null,
        status: "completed",
        deepLink: "/app/wallet",
        createdAt: new Date(now - 86400000 * 3),
      },
      {
        userId,
        kind: "hotel_booking",
        title: "Booking confirmed",
        detail: "Sunrise Hotel",
        source: "hospitalityos",
        amount: "50 TOK",
        status: "completed",
        experienceId: "exp_sunrise_hotel",
        deepLink: "/app/discover?open=exp_sunrise_hotel",
        createdAt: new Date(now - 86400000),
      },
      {
        userId,
        kind: "payment",
        title: "Payment placeholder",
        detail: "Settlement will run through FinProv when bound.",
        source: "token-network",
        amount: "50 TOK",
        status: "completed",
        deepLink: "/app/wallet",
        createdAt: new Date(now - 86400000 + 60000),
      },
      {
        userId,
        kind: "restaurant_order",
        title: "Restaurant order ready",
        detail: "Grand Restaurant",
        source: "hospitalityos",
        amount: "28 TOK",
        status: "completed",
        experienceId: "exp_grand_restaurant",
        deepLink: "/app/discover?open=exp_grand_restaurant",
        createdAt: new Date(now - 3600000),
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId,
        title: "Your LifeOS session was created",
        body: "You signed in through the LifeOS Gateway. Manage devices in LifeOS Gateway.",
        source: "lifeos",
        category: "Security",
      },
      {
        userId,
        title: "Your hotel check-in is available",
        body: "Sunrise Hotel is ready for check-in.",
        source: "hospitalityos",
        category: "Business",
        actionId: "CHECK_IN",
        actionParams: JSON.stringify({
          experienceId: "exp_sunrise_hotel",
          bookingId: "preview_booking",
        }),
      },
      {
        userId,
        title: "Payment completed",
        body: "Your payment of 50 TOK was completed (mock).",
        source: "token-network",
        category: "Wallet",
        actionId: "OPEN_WALLET",
        actionParams: "{}",
      },
      {
        userId,
        title: "Restaurant order ready",
        body: "Your restaurant order is ready.",
        source: "hospitalityos",
        category: "Business",
        actionId: "OPEN_EXPERIENCE",
        actionParams: JSON.stringify({ experienceId: "exp_grand_restaurant" }),
      },
      {
        userId,
        title: "New business experience available",
        body: "Grand Restaurant is now discoverable in LifeOS.",
        source: "lifeos",
        category: "System",
        actionId: "DISCOVER_BUSINESSES",
        actionParams: "{}",
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
    const available = await checkTrustIdAvailable();
    return { available };
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
    return { user: toPublicUser(user), trustIdConnected: true };
  });
}
