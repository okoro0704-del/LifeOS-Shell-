import type { ExperienceTokenClaims } from "@lifeos/shared";
import { verifyExperienceToken } from "@lifeos/experience-sdk";

/** Same-origin /api on Netlify; absolute API in local multi-port dev. */
const LIFEOS_API = import.meta.env.VITE_LIFEOS_API ?? "http://localhost:8790";
const EXPERIENCE_ID = import.meta.env.VITE_EXPERIENCE_ID ?? "exp_sunrise_hotel";
const SESSION_KEY = "hos.session";

export type HosSession = {
  sessionId: string;
  jti: string;
  lifeosUserId: string;
  displayName: string;
  scopes: string[];
  experienceId: string;
  expiresAt: string;
  returnUrl: string;
};

export async function exchangeHandoff(handoff: string, experienceId = EXPERIENCE_ID) {
  const res = await fetch(`${LIFEOS_API}/experience-sessions/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handoff, experienceId }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || "Exchange failed");
    (err as Error & { code: string }).code = data.error || "invalid_token";
    throw err;
  }

  const verified = await verifyExperienceToken({
    token: data.token as string,
    jwksUrl: `${LIFEOS_API}/.well-known/experience-keys`,
    expectedAudience: experienceId,
  });
  if (!verified.ok) {
    const err = new Error(verified.message);
    (err as Error & { code: string }).code = verified.code;
    throw err;
  }

  // Confirm session still active (revocation check).
  const intro = await fetch(`${LIFEOS_API}/experience-sessions/introspect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jti: verified.claims.jti }),
  });
  const introBody = (await intro.json()) as { active: boolean; reason?: string };
  if (!introBody.active) {
    const err = new Error(
      introBody.reason === "revoked"
        ? "This experience session is no longer valid."
        : "This experience session has expired. Reopen the experience.",
    );
    (err as Error & { code: string }).code =
      introBody.reason === "revoked" ? "revoked" : "token_expired";
    throw err;
  }

  return { token: data.token as string, claims: verified.claims };
}

export function createLocalSession(
  claims: ExperienceTokenClaims,
  returnUrl: string,
): HosSession {
  const session: HosSession = {
    sessionId: claims.sid,
    jti: claims.jti,
    lifeosUserId: claims.sub,
    displayName: claims.display_name ?? "Guest",
    scopes: claims.scopes,
    experienceId: claims.experience_id,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
    returnUrl,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getLocalSession(): HosSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as HosSession;
    if (new Date(session.expiresAt) < new Date()) {
      clearLocalSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function assertSessionActive(): Promise<HosSession | null> {
  const session = getLocalSession();
  if (!session) return null;
  try {
    const intro = await fetch(`${LIFEOS_API}/experience-sessions/introspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jti: session.jti }),
    });
    const body = (await intro.json()) as { active: boolean };
    if (!body.active) {
      clearLocalSession();
      return null;
    }
  } catch {
    /* offline — keep local until expiry */
  }
  return session;
}

export function clearLocalSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

/** Query params must never authenticate. */
export function rejectQueryAuth() {
  const params = new URLSearchParams(window.location.search);
  return Boolean(params.get("user") || params.get("trustId") || params.get("permissions"));
}
