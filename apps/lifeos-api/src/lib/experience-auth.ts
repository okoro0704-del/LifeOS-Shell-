import type { FastifyReply, FastifyRequest } from "fastify";
import { jwtVerify } from "jose";
import {
  EXPERIENCE_TOKEN_ISSUER,
  type ExperiencePermission,
  type ExperienceTokenClaims,
} from "@lifeos/shared";
import { getSigningKeyProvider } from "../services/experience-keys.js";
import { getExperienceSessionIssuer } from "../services/experience-session.js";

export type ExperienceAuth = {
  userId: string;
  experienceId: string;
  businessId: string;
  sessionId: string;
  jti: string;
  scopes: ExperiencePermission[];
  displayName?: string;
  claims: ExperienceTokenClaims;
};

declare module "fastify" {
  interface FastifyRequest {
    experienceAuth?: ExperienceAuth;
  }
}

/**
 * Authenticate business PWA requests with a signed experience JWT (Bearer).
 * Never accepts LifeOS session cookies here — experiences stay credential-isolated.
 */
export async function requireExperienceToken(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({
      error: "unauthorized",
      message: "Experience session token required",
    });
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    const key = await getSigningKeyProvider().getActiveSigningKey();
    const { payload } = await jwtVerify(token, key.publicKey, {
      issuer: EXPERIENCE_TOKEN_ISSUER,
      algorithms: ["EdDSA"],
    });

    const scopes = payload.scopes;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string" ||
      typeof payload.jti !== "string" ||
      typeof payload.experience_id !== "string" ||
      typeof payload.business_id !== "string" ||
      !Array.isArray(scopes)
    ) {
      return reply.code(401).send({ error: "invalid_token", message: "Invalid experience token" });
    }

    const intro = await getExperienceSessionIssuer().introspect(payload.jti);
    if (!intro.active) {
      return reply.code(401).send({
        error: intro.reason === "revoked" ? "revoked" : "token_expired",
        message:
          intro.reason === "revoked"
            ? "This experience session is no longer valid."
            : "This experience session has expired. Reopen the experience.",
      });
    }

    const aud = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
    req.experienceAuth = {
      userId: payload.sub,
      experienceId: payload.experience_id as string,
      businessId: payload.business_id as string,
      sessionId: payload.sid as string,
      jti: payload.jti,
      scopes: scopes as ExperiencePermission[],
      displayName: typeof payload.display_name === "string" ? payload.display_name : undefined,
      claims: {
        iss: String(payload.iss ?? EXPERIENCE_TOKEN_ISSUER),
        sub: payload.sub,
        aud: String(aud ?? payload.experience_id),
        sid: payload.sid as string,
        exp: Number(payload.exp),
        iat: Number(payload.iat),
        jti: payload.jti,
        experience_id: payload.experience_id as string,
        business_id: payload.business_id as string,
        scopes: scopes as ExperiencePermission[],
        display_name:
          typeof payload.display_name === "string" ? payload.display_name : undefined,
      },
    };
  } catch {
    return reply.code(401).send({
      error: "invalid_token",
      message: "We couldn't verify this experience session.",
    });
  }
}
