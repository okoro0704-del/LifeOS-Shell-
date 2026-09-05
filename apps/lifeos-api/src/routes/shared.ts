import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DEFAULT_PREFERENCES, type LifeOsPreferences } from "@lifeos/shared";
import { requireSession, toPublicUser } from "../lib/auth.js";
import { hashSecret } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";
import { extractSessionToken } from "../lib/auth.js";

function parsePrefs(raw: string): LifeOsPreferences {
  try {
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<LifeOsPreferences>) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function didFromTrustId(trustId: string) {
  const id = trustId.replace(/^TD-?/i, "").toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `did:trustid:${id || trustId}`;
}

/**
 * Shared settings BFF — identity, security, notifications, cross-space bridge.
 * Lives on lifeos-api (not lifeos-web) so Netlify SPA stays static.
 */
export async function sharedRoutes(app: FastifyInstance) {
  app.get("/v1/shared/identity", { preHandler: requireSession }, async (req) => {
    const user = req.lifeosUser!;
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const memberships = await prisma.businessMember.findMany({
      where: { userId: user.id, status: "active" },
      include: { business: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      trustId: user.trustId,
      did: didFromTrustId(user.trustId),
      displayName: user.displayName,
      zkVerified: Boolean(user.zkVerifiedAt),
      trustTier: user.trustTier,
      identityStatus: user.identityStatus,
      sessionStatus: "active",
      zeroPii: true,
      publicVerificationKeys: [
        {
          id: `${didFromTrustId(user.trustId)}#keys-1`,
          type: "Ed25519VerificationKey2020",
          controller: didFromTrustId(user.trustId),
          publicKeyMultibase: `z${Buffer.from(user.trustId).toString("base64url").slice(0, 44)}`,
        },
      ],
      memberships: memberships.map((m) => ({
        id: m.id,
        role: m.role,
        businessId: m.businessId,
        businessName: m.business.name,
        businessSlug: m.business.slug,
      })),
      user: toPublicUser(row),
    };
  });

  app.post("/v1/shared/identity/backup", { preHandler: requireSession }, async (req) => {
    const user = req.lifeosUser!;
    const did = didFromTrustId(user.trustId);
    const payload = {
      version: 1,
      did,
      trustId: user.trustId,
      exportedAt: new Date().toISOString(),
      note: "Encrypted session key backup placeholder — zero PII. Store offline.",
      ciphertext: Buffer.from(`${did}:${user.id}:${Date.now()}`).toString("base64"),
    };
    return { backup: payload };
  });

  app.get("/v1/shared/security/devices", { preHandler: requireSession }, async (req) => {
    const userId = req.lifeosUser!.id;
    const devices = await prisma.deviceSession.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
    });
    const sessions = await prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const prefs = parsePrefs(
      (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).preferences,
    );

    return {
      biometricLockEnabled: Boolean(prefs.biometricLockEnabled),
      devices: devices.map((d) => ({
        id: d.id,
        platform: d.platform,
        deviceLabel: d.deviceLabel,
        lastSeenAt: d.lastSeenAt.toISOString(),
        createdAt: d.createdAt.toISOString(),
      })),
      sessions: sessions.map((s) => ({
        id: s.id,
        platform: s.platform ?? "web",
        deviceLabel: s.deviceLabel ?? "Browser session",
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
      })),
    };
  });

  app.post("/v1/shared/security/devices/register", { preHandler: requireSession }, async (req, reply) => {
    const body = z
      .object({
        platform: z.enum(["web", "tauri", "capacitor-android", "capacitor-ios", "desktop", "mobile"]),
        deviceLabel: z.string().min(1).max(120),
      })
      .parse(req.body);

    const row = await prisma.deviceSession.create({
      data: {
        userId: req.lifeosUser!.id,
        platform: body.platform,
        deviceLabel: body.deviceLabel,
      },
    });
    return reply.code(201).send({
      device: {
        id: row.id,
        platform: row.platform,
        deviceLabel: row.deviceLabel,
        lastSeenAt: row.lastSeenAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      },
    });
  });

  app.post("/v1/shared/security/biometric", { preHandler: requireSession }, async (req) => {
    const body = z.object({ enabled: z.boolean() }).parse(req.body);
    const userId = req.lifeosUser!.id;
    const row = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const prefs = parsePrefs(row.preferences);
    prefs.biometricLockEnabled = body.enabled;
    await prisma.user.update({
      where: { id: userId },
      data: { preferences: JSON.stringify(prefs) },
    });
    return { biometricLockEnabled: body.enabled };
  });

  app.post("/v1/shared/security/sessions/:sessionId/revoke", { preHandler: requireSession }, async (req, reply) => {
    const sessionId = z.string().min(1).parse((req.params as { sessionId: string }).sessionId);
    const userId = req.lifeosUser!.id;
    const currentToken = extractSessionToken(req);
    const currentHash = currentToken ? hashSecret(currentToken) : null;

    const target = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!target) return reply.code(404).send({ error: "not_found" });
    if (currentHash && target.tokenHash === currentHash) {
      return reply.code(400).send({ error: "cannot_revoke_current", message: "Use Sign out for this device." });
    }

    await prisma.session.update({
      where: { id: target.id },
      data: { revokedAt: new Date(), expiresAt: new Date() },
    });
    return { ok: true };
  });

  app.post("/v1/shared/security/devices/:deviceId/revoke", { preHandler: requireSession }, async (req, reply) => {
    const deviceId = z.string().min(1).parse((req.params as { deviceId: string }).deviceId);
    const result = await prisma.deviceSession.updateMany({
      where: { id: deviceId, userId: req.lifeosUser!.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!result.count) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });

  app.get("/v1/shared/notifications", { preHandler: requireSession }, async (req) => {
    const prefs = parsePrefs(
      (await prisma.user.findUniqueOrThrow({ where: { id: req.lifeosUser!.id } })).preferences,
    );
    return {
      channels: {
        desktop: prefs.notifyDesktop ?? true,
        mobilePush: prefs.notifyMobilePush ?? true,
        inApp: prefs.notifyInApp ?? prefs.notificationsEnabled,
      },
      filters: {
        businessWhilePersonal: prefs.notifyBusinessWhilePersonal ?? false,
        marketingTips: prefs.marketingTips,
      },
    };
  });

  app.patch("/v1/shared/notifications", { preHandler: requireSession }, async (req) => {
    const body = z
      .object({
        desktop: z.boolean().optional(),
        mobilePush: z.boolean().optional(),
        inApp: z.boolean().optional(),
        businessWhilePersonal: z.boolean().optional(),
        marketingTips: z.boolean().optional(),
      })
      .parse(req.body);

    const userId = req.lifeosUser!.id;
    const row = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const prefs = parsePrefs(row.preferences);
    if (body.desktop !== undefined) prefs.notifyDesktop = body.desktop;
    if (body.mobilePush !== undefined) prefs.notifyMobilePush = body.mobilePush;
    if (body.inApp !== undefined) {
      prefs.notifyInApp = body.inApp;
      prefs.notificationsEnabled = body.inApp;
    }
    if (body.businessWhilePersonal !== undefined) {
      prefs.notifyBusinessWhilePersonal = body.businessWhilePersonal;
    }
    if (body.marketingTips !== undefined) prefs.marketingTips = body.marketingTips;

    await prisma.user.update({
      where: { id: userId },
      data: { preferences: JSON.stringify(prefs) },
    });

    return {
      channels: {
        desktop: prefs.notifyDesktop ?? true,
        mobilePush: prefs.notifyMobilePush ?? true,
        inApp: prefs.notifyInApp ?? true,
      },
      filters: {
        businessWhilePersonal: prefs.notifyBusinessWhilePersonal ?? false,
        marketingTips: prefs.marketingTips,
      },
    };
  });

  app.get("/v1/shared/bridge", { preHandler: requireSession }, async (req) => {
    const userId = req.lifeosUser!.id;
    const [vault, memberships, bridges] = await Promise.all([
      prisma.personalVaultItem.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.businessMember.findMany({
        where: { userId, status: "active" },
        include: { business: true },
      }),
      prisma.crossSpaceBridge.findMany({
        where: { ownerUserId: userId },
        include: { business: true },
        orderBy: { bridgedAt: "desc" },
        take: 50,
      }),
    ]);

    const vaultTitles = new Map(vault.map((v) => [v.id, v.title]));

    return {
      vaultItems: vault.map((v) => ({
        id: v.id,
        title: v.title,
        kind: v.kind,
        createdAt: v.createdAt.toISOString(),
      })),
      businesses: memberships.map((m) => ({
        id: m.businessId,
        name: m.business.name,
        role: m.role,
      })),
      audit: bridges.map((b) => ({
        id: b.id,
        personalVaultItemId: b.personalVaultItemId,
        vaultTitle: vaultTitles.get(b.personalVaultItemId) ?? "(revoked item)",
        targetBusinessId: b.targetBusinessId,
        businessName: b.business.name,
        targetModule: b.targetModule,
        status: b.status,
        bridgedAt: b.bridgedAt.toISOString(),
      })),
    };
  });

  app.post("/v1/shared/bridge/transfer", { preHandler: requireSession }, async (req, reply) => {
    const body = z
      .object({
        personalVaultItemId: z.string().min(1),
        targetBusinessId: z.string().min(1),
        targetModule: z.string().min(1).max(64).default("financeos"),
      })
      .parse(req.body);

    const userId = req.lifeosUser!.id;
    const trustId = req.lifeosUser!.trustId;

    const item = await prisma.personalVaultItem.findFirst({
      where: { id: body.personalVaultItemId, userId },
    });
    if (!item) {
      return reply.code(404).send({ error: "vault_item_not_found" });
    }

    const membership = await prisma.businessMember.findFirst({
      where: {
        userId,
        businessId: body.targetBusinessId,
        status: "active",
      },
    });
    if (!membership) {
      return reply.code(403).send({ error: "not_business_member" });
    }

    const link = await prisma.crossSpaceBridge.upsert({
      where: {
        personalVaultItemId_targetBusinessId_targetModule: {
          personalVaultItemId: body.personalVaultItemId,
          targetBusinessId: body.targetBusinessId,
          targetModule: body.targetModule,
        },
      },
      create: {
        ownerUserId: userId,
        personalVaultItemId: body.personalVaultItemId,
        targetBusinessId: body.targetBusinessId,
        targetModule: body.targetModule,
        metadata: JSON.stringify({ trustId, vaultKind: item.kind }),
      },
      update: {
        status: "active",
        bridgedAt: new Date(),
        metadata: JSON.stringify({ trustId, vaultKind: item.kind }),
      },
    });

    return reply.send({
      success: true,
      bridgedAt: link.bridgedAt.toISOString(),
      bridgeId: link.id,
      targetBusinessId: link.targetBusinessId,
      targetModule: link.targetModule,
    });
  });
}
