import { getStoredSessionToken } from "../lib/api";

const TRUST_ACCESS_TOKEN_KEY = "lifeos.trustid.access_token";

/** Persist TrustID OAuth access token for Digiconomy Core / personal bridges. */
export function storeTrustIdToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TRUST_ACCESS_TOKEN_KEY, token);
    else localStorage.removeItem(TRUST_ACCESS_TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

export function clearTrustIdToken() {
  storeTrustIdToken(null);
}

/** TrustID OAuth access token only (may be empty before first login in this browser). */
export async function getTrustIdToken(): Promise<string> {
  try {
    return localStorage.getItem(TRUST_ACCESS_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Prefer TrustID token, else LifeOS session — for Authorization when calling a BFF. */
export async function getPersonalApiBearer(): Promise<string> {
  const trust = await getTrustIdToken();
  if (trust) return trust;
  return getStoredSessionToken() ?? "";
}
