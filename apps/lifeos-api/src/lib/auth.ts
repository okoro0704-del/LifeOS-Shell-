import type { FastifyRequest, FastifyReply } from "fastify";
import type { CookieSerializeOptions } from "@fastify/cookie";
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

export function sessionCookieOptions(expiresAt: Date): CookieSerializeOptions {
  return {
    path: "/",
    httpOnly: true,
    sameSite: config.cookieSameSite,
    secure: config.cookieSecure,
    expires: expiresAt,
    maxAge: Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  };
}

export function clearSessionCookie(reply: FastifyReply) {
  // Clear under common SameSite/Secure combos so a leftover cookie from a
  // prior COOKIE_SAMESITE setting (or Netlify→Railway proxy) cannot re-auth.
  const variants: CookieSerializeOptions[] = [
    { path: "/", httpOnly: true, sameSite: config.cookieSameSite, secure: config.cookieSecure },
    { path: "/", httpOnly: true, sameSite: "lax", secure: config.cookieSecure },
    { path: "/", httpOnly: true, sameSite: "none", secure: true },
    { path: "/api", httpOnly: true, sameSite: config.cookieSameSite, secure: config.cookieSecure },
  ];
  for (const opts of variants) {
    reply.clearCookie(config.sessionCookieName, opts);
  }
}

export function setSessionCookie(reply: FastifyReply, rawToken: string, expiresAt: Date) {
  reply.setCookie(config.sessionCookieName, rawToken, sessionCookieOptions(expiresAt));
}

/**
 * Prefer explicit client token (header / Bearer) over cookie.
 * The SPA stores the session in localStorage and sends X-LifeOS-Session; after
 * logout that header is gone — cookie must not silently win over a cleared client.
 */
export function extractSessionToken(req: FastifyRequest): string | undefined {
  const header = req.headers[config.sessionHeaderName];
  if (typeof header === "string" && header.trim()) return header.trim();

  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }

  const fromCookie = req.cookies[config.sessionCookieName];
  if (fromCookie) return fromCookie;

  return undefined;
}

function toSessionUser(user: {
  id: string;
  trustId: string;
  displayName: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  preferences: string;
  createdAt: Date;
  lastLoginAt: Date;
}): SessionUser {
  return {
    id: user.id,
    trustId: user.trustId,
    displayName: user.displayName,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    preferences: parsePreferences(user.preferences),
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

/**
 * Resolve auth. When `reply` is provided and the session is valid, slide expiry
 * forward by SESSION_TTL_HOURS (default 24h inactivity window).
 */
export async function resolveAuthStatus(
  req: FastifyRequest,
  reply?: FastifyReply,
): Promise<{
  status: AuthStatus;
  user?: SessionUser;
}> {
  const token = extractSessionToken(req);
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

  const ttlMs = config.sessionTtlHours * 3600_000;
  const expiresAt = new Date(Date.now() + ttlMs);
  // Slide only when less than half the window remains — cuts DB writes while still
  // enforcing ~24h inactivity.
  const remaining = session.expiresAt.getTime() - Date.now();
  if (remaining < ttlMs / 2) {
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt },
    });
    if (reply) {
      setSessionCookie(reply, token, expiresAt);
    }
  }

  return {
    status: "authenticated",
    user: toSessionUser(session.user),
  };
}

export async function requireSession(req: FastifyRequest, reply: FastifyReply) {
  const resolved = await resolveAuthStatus(req, reply);
  if (resolved.status === "authenticated" && resolved.user) {
    req.lifeosUser = resolved.user;
    return;
  }

  if (resolved.status === "session_expired") {
    clearSessionCookie(reply);
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
