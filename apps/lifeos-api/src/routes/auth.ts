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
import { prisma } from "../lib/prisma.js";
import { auditLog } from "../services/audit.js";
import {
  checkTrustIdAvailable,
  fetchTrustIdUserInfo,
  TrustIdError,
} from "../services/trustid.js";

const sessionBody = z.object({
  accessToken: z.string().min(10),
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
        detail: "Your LifeOS profile is connected to TrustID.",
        source: "lifeos",
        status: "completed",
        deepLink: "/app/profile",
        createdAt: new Date(now - 1000),
      },
      {
        userId,
        kind: "wallet_transfer",
        title: "Wallet funded",
        detail: "Starter TOK balance via Token Network (mock).",
        source: "token-network",
        amount: "2,450 TOK",
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
        title: "Payment completed",
        detail: "Mock payment via Token Network.",
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
        body: "You signed in with TrustID. Manage devices in TrustID.",
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
      return reply.code(401).send({ error: "invalid_token", message: "TrustID validation failed" });
    }

    const trustId = identity.trustId;
    const email = identity.contacts?.find((c) => c.type === "email")?.value ?? null;
    const firstName = identity.profile?.firstName ?? null;
    const lastName = identity.profile?.lastName ?? null;
    const displayName = identity.profile?.name ?? trustId;

    const user = await prisma.user.upsert({
      where: { trustId },
      create: {
        trustId,
        displayName,
        email,
        firstName,
        lastName,
        preferences: JSON.stringify(DEFAULT_PREFERENCES),
        lastLoginAt: new Date(),
      },
      update: {
        displayName,
        email,
        firstName,
        lastName,
        lastLoginAt: new Date(),
      },
    });

    await ensureWelcomeContent(user.id);

    const rawToken = randomToken(32);
    const expiresAt = new Date(Date.now() + config.sessionTtlHours * 3600_000);
    await prisma.session.create({
      data: { tokenHash: hashSecret(rawToken), userId: user.id, expiresAt },
    });

    await auditLog(AUDIT_EVENTS.SESSION_CREATED, { userId: user.id, detail: { trustId } });

    setSessionCookie(reply, rawToken, expiresAt);

    return {
      user: toPublicUser(user),
      sessionToken: rawToken,
      expiresAt: expiresAt.toISOString(),
    };
  });

  app.post("/auth/logout", async (req, reply) => {
    const token = extractSessionToken(req);
    if (token) {
      const session = await prisma.session.findUnique({
        where: { tokenHash: hashSecret(token) },
      });
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
        await auditLog(AUDIT_EVENTS.SESSION_REVOKED, { userId: session.userId });
      }
    }
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/me", { preHandler: requireSession }, async (req) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.lifeosUser!.id } });
    return { user: toPublicUser(user), trustIdConnected: true };
  });
}
