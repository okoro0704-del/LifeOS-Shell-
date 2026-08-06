import { createAuthClient } from "@lifeos/auth-client";

export const trustIdWeb = import.meta.env.VITE_TRUSTID_WEB ?? "http://localhost:5173";
export const trustIdApi = import.meta.env.VITE_TRUSTID_API ?? "http://localhost:8787";
export const lifeosApiBase = import.meta.env.VITE_LIFEOS_API ?? "/api";

const SESSION_STORAGE_KEY = "lifeos.session.token";

export const authClient = createAuthClient({
  trustIdApi,
  clientId: import.meta.env.VITE_TRUSTID_CLIENT_ID ?? "lifeos_mock_public",
  redirectUri: import.meta.env.VITE_TRUSTID_REDIRECT_URI ?? "http://localhost:5174/callback",
  scopes:
    import.meta.env.VITE_TRUSTID_SCOPES ??
    "openid identity.basic identity.profile identity.email",
});

export type ApiErrorCode =
  | "unauthorized"
  | "session_expired"
  | "invalid_token"
  | "authorization_revoked"
  | "trustid_unavailable"
  | "wallet_unavailable"
  | "lifeos_unavailable"
  | "experience_unavailable"
  | "not_found"
  | "unknown";

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;

  constructor(message: string, status: number, code: ApiErrorCode = "unknown") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function getStoredSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeSessionToken(token: string | null) {
  try {
    if (token) localStorage.setItem(SESSION_STORAGE_KEY, token);
    else localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

function mapErrorCode(status: number, raw?: string): ApiErrorCode {
  if (raw === "session_expired") return "session_expired";
  if (raw === "authorization_revoked") return "authorization_revoked";
  if (raw === "invalid_token") return "invalid_token";
  if (raw === "trustid_unavailable") return "trustid_unavailable";
  if (raw === "wallet_unavailable") return "wallet_unavailable";
  if (raw === "experience_not_loadable") return "experience_unavailable";
  if (raw === "not_found") return "not_found";
  if (status === 401) return "unauthorized";
  if (status === 503) return "lifeos_unavailable";
  return "unknown";
}

export function userFacingMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "session_expired":
        return "Your LifeOS session has expired. Continue with TrustID.";
      case "authorization_revoked":
        return "TrustID authorization was revoked. Continue with TrustID to reconnect.";
      case "trustid_unavailable":
        return "TrustID is temporarily unavailable.";
      case "wallet_unavailable":
        return "Wallet unavailable.";
      case "lifeos_unavailable":
        return "We couldn't load your LifeOS data.";
      case "experience_unavailable":
        return "This experience is temporarily unavailable.";
      case "unauthorized":
        return "Please continue with TrustID to sign in.";
      default:
        return err.message || "Something went wrong.";
    }
  }
  if (err instanceof TypeError) {
    return "We couldn't load your LifeOS data.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const sessionToken = getStoredSessionToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (sessionToken) {
    headers["X-LifeOS-Session"] = sessionToken;
  }

  let res: Response;
  try {
    res = await fetch(`${lifeosApiBase}${path}`, {
      ...init,
      credentials: "include",
      headers,
    });
  } catch {
    throw new ApiError("We couldn't load your LifeOS data.", 0, "lifeos_unavailable");
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      "We couldn't reach the LifeOS API. Please try again in a moment.",
      res.status || 502,
      "lifeos_unavailable",
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const raw = (data as { error?: string }).error;
    const code = mapErrorCode(res.status, raw);
    if (code === "unauthorized" || code === "session_expired") {
      storeSessionToken(null);
    }
    const message =
      (data as { message?: string }).message ||
      userFacingMessage(new ApiError("Request failed", res.status, code));
    throw new ApiError(message, res.status, code);
  }
  return data as T;
}

export async function checkTrustIdReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${trustIdApi}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
