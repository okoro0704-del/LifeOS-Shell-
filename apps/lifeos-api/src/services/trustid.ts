import { config } from "../lib/config.js";

export type TrustIdUserInfo = {
  sub: string;
  trustId: string;
  status?: string;
  profile?: { firstName: string; lastName: string; name: string };
  contacts?: { type: string; value: string }[];
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
 * Do not trust client-supplied TrustID strings alone.
 */
export async function fetchTrustIdUserInfo(accessToken: string): Promise<TrustIdUserInfo> {
  let res: Response;
  try {
    res = await fetch(`${config.trustIdApi}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new TrustIdError("TrustID is temporarily unavailable.", "trustid_unavailable");
  }

  const data = (await res.json().catch(() => ({}))) as TrustIdUserInfo & { error?: string };

  if (res.status === 401 || res.status === 403) {
    throw new TrustIdError(
      "TrustID authorization was denied or revoked.",
      "authorization_revoked",
    );
  }

  if (!res.ok) {
    throw new TrustIdError(data.error || "TrustID token validation failed", "invalid_token");
  }

  if (!data.trustId && !data.sub) {
    throw new TrustIdError("TrustID userinfo missing subject", "invalid_token");
  }

  return {
    ...data,
    trustId: data.trustId || data.sub,
    sub: data.sub || data.trustId,
  };
}
