import type { FastifyRequest, FastifyReply } from "fastify";
import { DEFAULT_PREFERENCES, type LifeOsPreferences, type LifeOsUserPublic } from "@lifeos/shared";
import { config } from "./config.js";
import { hashSecret } from "./crypto.js";
import { prisma } from "./prisma.js";

export type SessionUser = {
  id: string;
  trustId: string;
  displayName: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  preferences: LifeOsPreferences;
  createdAt: Date;
  lastLoginAt: Date;
};

export type AuthStatus =
  | "authenticated"
  | "unauthenticated"
  | "session_expired";

declare module "fastify" {
  interface FastifyRequest {
    lifeosUser?: SessionUser;
  }
}

function parsePreferences(raw: string): LifeOsPreferences {
  try {
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<LifeOsPreferences>) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function toPublicUser(user: {
  id: string;
  trustId: string;
  displayName: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  preferences: string;
  createdAt: Date;
  lastLoginAt: Date;
}): LifeOsUserPublic {
  return {
    id: user.id,
    trustId: user.trustId,
    displayName: user.displayName,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    preferences: parsePreferences(user.preferences),
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt.toISOString(),
  };
}

export async function resolveAuthStatus(req: FastifyRequest): Promise<{
  status: AuthStatus;
  user?: SessionUser;
}> {
  const token = req.cookies[config.sessionCookieName];
  if (!token) {
    return { status: "unauthenticated" };
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSecret(token) },
    include: { user: true },
  });

  if (!session) {
    return { status: "unauthenticated" };
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return { status: "session_expired" };
  }

  return {
    status: "authenticated",
    user: {
      id: session.user.id,
      trustId: session.user.trustId,
      displayName: session.user.displayName,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      preferences: parsePreferences(session.user.preferences),
      createdAt: session.user.createdAt,
      lastLoginAt: session.user.lastLoginAt,
    },
  };
}

export async function requireSession(req: FastifyRequest, reply: FastifyReply) {
  const resolved = await resolveAuthStatus(req);
  if (resolved.status === "authenticated" && resolved.user) {
    req.lifeosUser = resolved.user;
    return;
  }

  if (resolved.status === "session_expired") {
    reply.clearCookie(config.sessionCookieName, { path: "/" });
    return reply.code(401).send({
      error: "session_expired",
      message: "Your LifeOS session has expired. Continue with TrustID.",
    });
  }

  return reply.code(401).send({
    error: "unauthorized",
    message: "Not authenticated",
  });
}
