import { config } from "../lib/config.js";

export type TrustIdZkMeta = {
  available: boolean;
  provePath: string;
  verifyPath: string;
  verificationKeyPath: string;
};

export type TrustIdUserInfo = {
  sub: string;
  trustId: string;
  status?: string;
  identityStatus?: string;
  verificationLevel?: string;
  isVerifiedIdentity?: boolean;
  trustLevel?: { tier?: number; stars?: number; label?: string };
  zk?: TrustIdZkMeta;
  /** Legacy break-glass only — never persist. */
  profile?: { firstName?: string; lastName?: string; name?: string } | null;
  contacts?: { type: string; value: string }[] | null;
};

export class TrustIdError extends Error {
  constructor(
    message: string,
    readonly code: "trustid_unavailable" | "invalid_token" | "authorization_revoked",
  ) {
    super(message);
    this.name = "TrustIdError";
  }
}

/** Lightweight reachability check — does not log secrets. */
export async function checkTrustIdAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${config.trustIdApi}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Validate a TrustID access token by calling the identity authority.
 * Prefer ZK claim fields (trustLevel / identityStatus). Do not trust client-supplied TrustID strings alone.
 * Zero-PII: ignore profile/contacts for persistence even if break-glass returns them.
 */
export async function fetchTrustIdUserInfo(accessToken: string): Promise<TrustIdUserInfo> {
  let res: Response;
  try {
    res = await fetch(`${config.trustIdApi}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new TrustIdError("LifeOS Gateway is temporarily unavailable.", "trustid_unavailable");
  }

  const data = (await res.json().catch(() => ({}))) as TrustIdUserInfo & { error?: string };

  if (res.status === 401 || res.status === 403) {
    throw new TrustIdError(
      "Authorization was denied or revoked.",
      "authorization_revoked",
    );
  }

  if (!res.ok) {
    throw new TrustIdError(data.error || "Token validation failed", "invalid_token");
  }

  if (!data.trustId && !data.sub) {
    throw new TrustIdError("Identity subject missing from userinfo", "invalid_token");
  }

  return {
    ...data,
    trustId: data.trustId || data.sub,
    sub: data.sub || data.trustId,
  };
}

/** Non-PII public label derived from TrustID. */
export function publicDisplayName(trustId: string): string {
  const short = trustId.replace(/^TD-?/i, "").slice(-6).toUpperCase() || "MEMBER";
  return `LifeOS · ${short}`;
}
