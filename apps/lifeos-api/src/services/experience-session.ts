import { createHash, randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import {
  AUDIT_EVENTS,
  EXPERIENCE_TOKEN_ISSUER,
  EXPERIENCE_TOKEN_TTL_SECONDS,
  type ExperiencePermission,
  type ExperienceSessionPublic,
  type ExperienceTokenClaims,
} from "@lifeos/shared";
import { prisma } from "../lib/prisma.js";
import { auditLog } from "./audit.js";
import { getSigningKeyProvider } from "./experience-keys.js";

export type IssuedExperienceSession = ExperienceSessionPublic & {
  /** Signed JWT — only returned from exchange, never logged. */
  token?: string;
};

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export interface ExperienceSessionIssuer {
  issue(opts: {
    userId: string;
    displayName: string;
    experienceId: string;
    businessId: string;
    experienceUrl: string;
    approvedOrigin: string;
    scopes: ExperiencePermission[];
    ttlSeconds?: number;
  }): Promise<ExperienceSessionPublic>;

  exchangeHandoff(opts: {
    handoff: string;
    expectedAudience: string;
  }): Promise<{ token: string; claims: ExperienceTokenClaims; sessionId: string }>;

  introspect(jti: string): Promise<{
    active: boolean;
    reason?: string;
    sessionId?: string;
    experienceId?: string;
    scopes?: ExperiencePermission[];
  }>;

  revokeSession(sessionId: string, userId?: string): Promise<void>;
  revokeForExperience(userId: string, experienceId: string): Promise<number>;
}

export class JwtExperienceSessionIssuer implements ExperienceSessionIssuer {
  async issue(opts: {
    userId: string;
    displayName: string;
    experienceId: string;
    businessId: string;
    experienceUrl: string;
    approvedOrigin: string;
    scopes: ExperiencePermission[];
    ttlSeconds?: number;
  }): Promise<ExperienceSessionPublic> {
    const ttl = opts.ttlSeconds ?? Number(process.env.EXPERIENCE_TOKEN_TTL_SECONDS ?? EXPERIENCE_TOKEN_TTL_SECONDS);
    const jti = randomBytes(16).toString("base64url");
    const handoff = `hof_${randomBytes(24).toString("base64url")}`;
    const now = Date.now();
    const expiresAt = new Date(now + ttl * 1000);

    const session = await prisma.experienceSession.create({
      data: {
        userId: opts.userId,
        experienceId: opts.experienceId,
        businessId: opts.businessId,
        scopes: JSON.stringify(opts.scopes),
        status: "active",
        jtiHash: hash(jti),
        handoffHash: hash(handoff),
        expiresAt,
      },
    });

    await auditLog(AUDIT_EVENTS.EXPERIENCE_SESSION_CREATED, {
      userId: opts.userId,
      detail: {
        sessionId: session.id,
        experienceId: opts.experienceId,
        scopes: opts.scopes,
        expiresAt: expiresAt.toISOString(),
      },
    });

    const base = new URL(opts.experienceUrl);
    const pathParts = base.pathname.split("/").filter(Boolean);
    const appRoot = pathParts[0] === "hos" ? "/hos" : "";
    const launch = new URL(`${appRoot}/auth/lifeos`, base.origin);
    launch.searchParams.set("handoff", handoff);
    launch.searchParams.set("experience_id", opts.experienceId);

    let returnPath = base.pathname || "/";
    if (appRoot && returnPath.startsWith(appRoot)) {
      returnPath = returnPath.slice(appRoot.length) || "/";
    }
    if (!returnPath.startsWith("/")) returnPath = `/${returnPath}`;
    if (returnPath !== "/") {
      launch.searchParams.set("return_path", returnPath);
    }

    return {
      sessionId: session.id,
      experienceId: opts.experienceId,
      grantedPermissions: opts.scopes,
      handoff,
      launchUrl: launch.toString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async exchangeHandoff(opts: { handoff: string; expectedAudience: string }) {
    const row = await prisma.experienceSession.findFirst({
      where: { handoffHash: hash(opts.handoff) },
      include: { user: true, experience: true },
    });

    if (!row) {
      await auditLog(AUDIT_EVENTS.EXPERIENCE_TOKEN_REJECTED, {
        detail: { reason: "unknown_handoff" },
      });
      const err = new Error("Invalid handoff");
      (err as Error & { code: string }).code = "invalid_token";
      throw err;
    }

    if (row.handoffConsumedAt) {
      await auditLog(AUDIT_EVENTS.EXPERIENCE_TOKEN_REPLAY, {
        userId: row.userId,
        detail: { sessionId: row.id },
      });
      const err = new Error("Handoff already used");
      (err as Error & { code: string }).code = "replay_detected";
      throw err;
    }

    if (row.status !== "active" || row.revokedAt) {
      await auditLog(AUDIT_EVENTS.EXPERIENCE_TOKEN_REJECTED, {
        userId: row.userId,
        detail: { sessionId: row.id, reason: "revoked" },
      });
      const err = new Error("Session revoked");
      (err as Error & { code: string }).code = "revoked";
      throw err;
    }

    if (row.expiresAt < new Date()) {
      await auditLog(AUDIT_EVENTS.EXPERIENCE_TOKEN_EXPIRED, {
        userId: row.userId,
        detail: { sessionId: row.id },
      });
      const err = new Error("Session expired");
      (err as Error & { code: string }).code = "token_expired";
      throw err;
    }

    if (row.experienceId !== opts.expectedAudience) {
      await auditLog(AUDIT_EVENTS.EXPERIENCE_TOKEN_REJECTED, {
        userId: row.userId,
        detail: { sessionId: row.id, reason: "audience_mismatch" },
      });
      const err = new Error("Wrong audience");
      (err as Error & { code: string }).code = "wrong_audience";
      throw err;
    }

    const scopes = JSON.parse(row.scopes) as ExperiencePermission[];
    const jti = randomBytes(16).toString("base64url");
    // Rotate jti at exchange time so the signed token id is fresh; keep session id.
    // Keep handoffHash so a second exchange of the same code hits replay_detected
    // (nulling the hash would collapse replay into unknown_handoff).
    await prisma.experienceSession.update({
      where: { id: row.id },
      data: {
        handoffConsumedAt: new Date(),
        jtiHash: hash(jti),
      },
    });

    const key = await getSigningKeyProvider().getActiveSigningKey();
    const now = Math.floor(Date.now() / 1000);
    const exp = Math.floor(row.expiresAt.getTime() / 1000);

    const payload: ExperienceTokenClaims = {
      iss: EXPERIENCE_TOKEN_ISSUER,
      sub: row.userId,
      aud: row.experienceId,
      sid: row.id,
      exp,
      iat: now,
      jti,
      experience_id: row.experienceId,
      business_id: row.businessId,
      scopes,
    };
    if (scopes.includes("profile.basic")) {
      payload.display_name = row.user.displayName;
    }

    const token = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "EdDSA", kid: key.kid, typ: "JWT" })
      .setIssuer(EXPERIENCE_TOKEN_ISSUER)
      .setAudience(row.experienceId)
      .setSubject(row.userId)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setJti(jti)
      .sign(key.privateKey);

    await auditLog(AUDIT_EVENTS.EXPERIENCE_SESSION_VERIFIED, {
      userId: row.userId,
      detail: { sessionId: row.id, experienceId: row.experienceId },
    });

    return { token, claims: payload, sessionId: row.id };
  }

  async introspect(jti: string) {
    const row = await prisma.experienceSession.findUnique({
      where: { jtiHash: hash(jti) },
    });
    if (!row) return { active: false, reason: "unknown" };
    if (row.revokedAt || row.status !== "active") {
      return { active: false, reason: "revoked", sessionId: row.id };
    }
    if (row.expiresAt < new Date()) {
      return { active: false, reason: "expired", sessionId: row.id };
    }
    return {
      active: true,
      sessionId: row.id,
      experienceId: row.experienceId,
      scopes: JSON.parse(row.scopes) as ExperiencePermission[],
    };
  }

  async revokeSession(sessionId: string, userId?: string) {
    const row = await prisma.experienceSession.findFirst({
      where: { id: sessionId, ...(userId ? { userId } : {}) },
    });
    if (!row) return;
    await prisma.experienceSession.update({
      where: { id: row.id },
      data: { status: "revoked", revokedAt: new Date() },
    });
    await auditLog(AUDIT_EVENTS.EXPERIENCE_SESSION_REVOKED, {
      userId: row.userId,
      detail: { sessionId: row.id, experienceId: row.experienceId },
    });
  }

  async revokeForExperience(userId: string, experienceId: string) {
    const result = await prisma.experienceSession.updateMany({
      where: {
        userId,
        experienceId,
        status: "active",
        revokedAt: null,
      },
      data: { status: "revoked", revokedAt: new Date() },
    });
    if (result.count > 0) {
      await auditLog(AUDIT_EVENTS.EXPERIENCE_SESSION_REVOKED, {
        userId,
        detail: { experienceId, count: result.count },
      });
    }
    return result.count;
  }
}

let issuer: ExperienceSessionIssuer | null = null;

export function getExperienceSessionIssuer(): ExperienceSessionIssuer {
  if (!issuer) issuer = new JwtExperienceSessionIssuer();
  return issuer;
}

export function setExperienceSessionIssuer(next: ExperienceSessionIssuer | null) {
  issuer = next;
}

export { hash as hashSecretValue };
