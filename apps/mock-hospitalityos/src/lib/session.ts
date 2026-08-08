import type { ExperienceTokenClaims } from "@lifeos/shared";
import { verifyExperienceToken } from "@lifeos/experience-sdk";

/**
 * Resolve LifeOS API base to an absolute URL.
 * Relative `/api` works for fetch, but jose JWKS requires an absolute URL.
 */
export function lifeosApiBase(): string {
  const raw = (import.meta.env.VITE_LIFEOS_API ?? "http://localhost:8790").replace(/\/$/, "");
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}

const EXPERIENCE_ID = import.meta.env.VITE_EXPERIENCE_ID ?? "exp_sunrise_hotel";
const SESSION_KEY = "hos.session";
const TOKEN_KEY = "hos.accessToken";

export type HosSession = {
  sessionId: string;
  jti: string;
  lifeosUserId: string;
  displayName: string;
  scopes: string[];
  experienceId: string;
  businessId: string;
  expiresAt: string;
  returnUrl: string;
};

export async function exchangeHandoff(handoff: string, experienceId = EXPERIENCE_ID) {
  const api = lifeosApiBase();
  const res = await fetch(`${api}/experience-sessions/exchange`, {
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
    jwksUrl: `${api}/.well-known/experience-keys`,
    expectedAudience: experienceId,
  });
  if (!verified.ok) {
    const err = new Error(verified.message);
    (err as Error & { code: string }).code = verified.code;
    throw err;
  }

  const intro = await fetch(`${api}/experience-sessions/introspect`, {
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
  accessToken: string,
): HosSession {
  const session: HosSession = {
    sessionId: claims.sid,
    jti: claims.jti,
    lifeosUserId: claims.sub,
    displayName: claims.display_name ?? "Guest",
    scopes: claims.scopes,
    experienceId: claims.experience_id,
    businessId: claims.business_id,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
    returnUrl,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  sessionStorage.setItem(TOKEN_KEY, accessToken);
  return session;
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
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
  if (!session || !getAccessToken()) return null;
  try {
    const intro = await fetch(`${lifeosApiBase()}/experience-sessions/introspect`, {
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
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Query params must never authenticate. */
export function rejectQueryAuth() {
  const params = new URLSearchParams(window.location.search);
  return Boolean(params.get("user") || params.get("trustId") || params.get("permissions"));
}

export async function experienceFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("Missing experience session. Reopen from LifeOS.");
  const res = await fetch(`${lifeosApiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || "Request failed");
    (err as Error & { code: string }).code = data.error || "request_failed";
    throw err;
  }
  return data as T;
}
