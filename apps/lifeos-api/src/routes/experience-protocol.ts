import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getSigningKeyProvider } from "../services/experience-keys.js";
import { getExperienceSessionIssuer } from "../services/experience-session.js";

export async function experienceProtocolRoutes(app: FastifyInstance) {
  /** Public JWKS — never includes private keys. */
  app.get("/.well-known/experience-keys", async () => {
    const keys = await getSigningKeyProvider().getPublicKeys();
    return {
      keys: keys.map((k) => k.publicJwk),
      issuer: "lifeos",
      alg: "EdDSA",
    };
  });

  const exchangeBody = z.object({
    handoff: z.string().min(16),
    experienceId: z.string().min(1),
  });

  /**
   * Business OS exchanges a one-time handoff for a signed experience JWT.
   * No LifeOS cookie required — handoff proves possession.
   */
  app.post("/experience-sessions/exchange", async (req, reply) => {
    const body = exchangeBody.parse(req.body);
    try {
      const result = await getExperienceSessionIssuer().exchangeHandoff({
        handoff: body.handoff,
        expectedAudience: body.experienceId,
      });
      return {
        token: result.token,
        token_type: "Bearer",
        expires_at: new Date(result.claims.exp * 1000).toISOString(),
        session_id: result.sessionId,
        scopes: result.claims.scopes,
      };
    } catch (err) {
      const code = (err as Error & { code?: string }).code ?? "invalid_token";
      const status =
        code === "token_expired" ? 401 : code === "replay_detected" ? 401 : code === "wrong_audience" ? 403 : 401;
      return reply.code(status).send({
        error: code,
        message: userMessage(code),
      });
    }
  });

  const introspectBody = z.object({
    jti: z.string().min(8),
  });

  app.post("/experience-sessions/introspect", async (req) => {
    const body = introspectBody.parse(req.body);
    return getExperienceSessionIssuer().introspect(body.jti);
  });
}

function userMessage(code: string) {
  switch (code) {
    case "token_expired":
      return "This experience session has expired. Reopen the experience.";
    case "wrong_audience":
      return "This experience cannot use this session.";
    case "revoked":
      return "This experience session is no longer valid.";
    case "replay_detected":
      return "We couldn't securely connect to this experience.";
    case "permission_denied":
      return "This experience doesn't have the required permission.";
    default:
      return "We couldn't securely connect to this experience.";
  }
}
