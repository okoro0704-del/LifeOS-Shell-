import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { ExperiencePermission, ExperienceRecord, ExperienceTokenClaims } from "@lifeos/shared";
import { EXPERIENCE_TOKEN_ISSUER } from "@lifeos/shared";

export type ExperienceLoadConfig = {
  businessId: string;
  osType: string;
  experienceUrl: string;
  displayName: string;
  permissions: string[];
  approvedOrigin: string;
};

/** Extract origin (scheme + host + port) from a URL string. */
export function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    throw new Error("Invalid experience URL");
  }
}

/**
 * V1 allowlist check: experience URL origin must exactly match approved_origin.
 * Never load arbitrary user-supplied URLs.
 */
export function validateExperienceOrigin(
  experienceUrl: string,
  approvedOrigin: string,
): { ok: true; origin: string } | { ok: false; reason: string } {
  let origin: string;
  try {
    origin = getOrigin(experienceUrl);
  } catch {
    return { ok: false, reason: "Invalid experience URL" };
  }
  if (!approvedOrigin) {
    return { ok: false, reason: "Missing approved origin" };
  }
  if (origin !== approvedOrigin) {
    return {
      ok: false,
      reason: `Origin mismatch: ${origin} is not allowlisted (${approvedOrigin})`,
    };
  }
  return { ok: true, origin };
}

export function toLoadConfig(record: ExperienceRecord): ExperienceLoadConfig {
  const check = validateExperienceOrigin(record.experienceUrl, record.approvedOrigin);
  if (!check.ok) {
    throw new Error(check.reason);
  }
  if (record.status !== "active") {
    throw new Error(`Experience is not active (${record.status})`);
  }
  return {
    businessId: record.businessId,
    osType: record.osType,
    experienceUrl: record.experienceUrl,
    displayName: record.displayName,
    permissions: record.permissions,
    approvedOrigin: record.approvedOrigin,
  };
}

export function canLoadExperience(record: ExperienceRecord): boolean {
  if (record.status !== "active") return false;
  return validateExperienceOrigin(record.experienceUrl, record.approvedOrigin).ok;
}

/** Launch URL carries only a one-time handoff code — not identity claims. */
export function buildSecureLaunchUrl(
  launchUrlFromSession: string,
  opts?: { returnUrl?: string },
): string {
  const url = new URL(launchUrlFromSession);
  if (opts?.returnUrl) url.searchParams.set("returnUrl", opts.returnUrl);
  return url.toString();
}

export type VerifyExperienceTokenOptions = {
  token: string;
  /** LifeOS API base that serves /.well-known/experience-keys */
  jwksUrl: string;
  expectedAudience: string;
  expectedIssuer?: string;
  requiredScopes?: ExperiencePermission[];
};

export type VerifyExperienceTokenResult =
  | { ok: true; claims: ExperienceTokenClaims }
  | { ok: false; code: string; message: string };

export async function verifyExperienceToken(
  opts: VerifyExperienceTokenOptions,
): Promise<VerifyExperienceTokenResult> {
  try {
    const JWKS = createRemoteJWKSet(new URL(opts.jwksUrl));
    const { payload } = await jwtVerify(opts.token, JWKS, {
      issuer: opts.expectedIssuer ?? EXPERIENCE_TOKEN_ISSUER,
      audience: opts.expectedAudience,
      algorithms: ["EdDSA"],
    });

    const claims = normalizeClaims(payload);
    if (!claims) {
      return { ok: false, code: "invalid_token", message: "Missing required claims" };
    }

    if (opts.requiredScopes?.length) {
      const missing = opts.requiredScopes.filter((s) => !claims.scopes.includes(s));
      if (missing.length) {
        return {
          ok: false,
          code: "permission_denied",
          message: `Missing scopes: ${missing.join(", ")}`,
        };
      }
    }

    return { ok: true, claims };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    const message = err instanceof Error ? err.message : "Verification failed";
    if (name === "JWTExpired" || /exp/i.test(message)) {
      return {
        ok: false,
        code: "token_expired",
        message: "This experience session has expired. Reopen the experience.",
      };
    }
    if (/audience/i.test(message)) {
      return {
        ok: false,
        code: "wrong_audience",
        message: "This experience cannot use this session.",
      };
    }
    return {
      ok: false,
      code: "invalid_token",
      message: "We couldn't securely connect to this experience.",
    };
  }
}

function normalizeClaims(payload: JWTPayload): ExperienceTokenClaims | null {
  const scopes = payload.scopes;
  if (
    typeof payload.sub !== "string" ||
    typeof payload.aud !== "string" ||
    typeof payload.sid !== "string" ||
    typeof payload.jti !== "string" ||
    typeof payload.experience_id !== "string" ||
    typeof payload.business_id !== "string" ||
    !Array.isArray(scopes)
  ) {
    return null;
  }
  return {
    iss: String(payload.iss ?? EXPERIENCE_TOKEN_ISSUER),
    sub: payload.sub,
    aud: Array.isArray(payload.aud) ? payload.aud[0] : payload.aud,
    sid: payload.sid as string,
    exp: Number(payload.exp),
    iat: Number(payload.iat),
    jti: payload.jti,
    experience_id: payload.experience_id as string,
    business_id: payload.business_id as string,
    scopes: scopes as ExperiencePermission[],
    display_name:
      typeof payload.display_name === "string" ? payload.display_name : undefined,
  };
}

/** postMessage bridge — origin must match approved experience origin. */
export type BridgeMessage =
  | { type: "lifeos.ready" }
  | { type: "lifeos.close" }
  | { type: "lifeos.navigate"; path: string }
  | { type: "experience.ready" }
  | { type: "experience.error"; code: string; message: string }
  | {
      type: "experience.request_permission";
      permissions: ExperiencePermission[];
    };

export function createExperienceBridge(opts: {
  targetOrigin: string;
  targetWindow?: Window | null;
  onMessage?: (msg: BridgeMessage, event: MessageEvent) => void;
}) {
  function isTrusted(origin: string) {
    return origin === opts.targetOrigin;
  }

  function post(message: BridgeMessage) {
    opts.targetWindow?.postMessage(message, opts.targetOrigin);
  }

  function onEvent(event: MessageEvent) {
    if (!isTrusted(event.origin)) return;
    const data = event.data as BridgeMessage;
    if (!data || typeof data !== "object" || typeof (data as { type?: string }).type !== "string") {
      return;
    }
    opts.onMessage?.(data, event);
  }

  if (typeof window !== "undefined") {
    window.addEventListener("message", onEvent);
  }

  return {
    post,
    destroy() {
      if (typeof window !== "undefined") {
        window.removeEventListener("message", onEvent);
      }
    },
    isTrustedOrigin: isTrusted,
  };
}

export type ExperienceBridge = ReturnType<typeof createExperienceBridge>;
