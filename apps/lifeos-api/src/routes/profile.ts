import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DEFAULT_PREFERENCES, LIFEOS_VERSION, type LifeOsPreferences } from "@lifeos/shared";
import { requireSession, toPublicUser } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { getExperienceProvider, parsePerms } from "../services/experience.js";

function parsePreferences(raw: string): LifeOsPreferences {
  try {
    const parsed = JSON.parse(raw) as Partial<LifeOsPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      quickAccess: {
        ...DEFAULT_PREFERENCES.quickAccess,
        ...(parsed.quickAccess ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

const prefsBody = z.object({
  notificationsEnabled: z.boolean().optional(),
  marketingTips: z.boolean().optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
  language: z.string().min(2).max(12).optional(),
  tokenDisplay: z.string().min(1).max(12).optional(),
  openExperiencesIn: z.enum(["embed", "external"]).optional(),
  avatarUrl: z.union([z.string().max(900_000), z.null()]).optional(),
});

export async function profileRoutes(app: FastifyInstance) {
  app.get("/profile", { preHandler: requireSession }, async (req) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.lifeosUser!.id } });
    const connections = await getExperienceProvider().listConnections(req.lifeosUser!.id);
    const connected = connections
      .filter((c) => c.status === "connected")
      .map((c) => ({
        id: c.id,
        experienceId: c.experienceId,
        displayName: c.experience.displayName,
        osType: c.experience.osType,
        businessName: c.experience.businessName,
        permissions: parsePerms(c.grantedPermissions),
      }));
    return {
      user: toPublicUser(user),
      trustId: {
        connected: true,
        trustId: user.trustId,
        manageUrl: "http://localhost:5173",
      },
      connectedExperiences: connected,
      about: {
        version: LIFEOS_VERSION,
        termsUrl: "#",
        privacyUrl: "#",
        supportUrl: "#",
      },
    };
  });

  app.get("/preferences", { preHandler: requireSession }, async (req) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.lifeosUser!.id } });
    return { preferences: parsePreferences(user.preferences) };
  });

  app.patch("/preferences", { preHandler: requireSession }, async (req) => {
    const body = prefsBody.parse(req.body ?? {});
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.lifeosUser!.id } });
    const preferences = { ...parsePreferences(user.preferences), ...body };
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { preferences: JSON.stringify(preferences) },
    });
    return { preferences: parsePreferences(updated.preferences), user: toPublicUser(updated) };
  });

  app.patch("/profile", { preHandler: requireSession }, async (req) => {
    const body = z.object({ preferences: prefsBody.optional() }).parse(req.body ?? {});
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.lifeosUser!.id } });
    let preferences = parsePreferences(user.preferences);
    if (body.preferences) preferences = { ...preferences, ...body.preferences };
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { preferences: JSON.stringify(preferences) },
    });
    return { user: toPublicUser(updated) };
  });
}
