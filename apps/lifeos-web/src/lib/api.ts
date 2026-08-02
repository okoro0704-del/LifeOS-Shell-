import { createAuthClient } from "@lifeos/auth-client";

export const trustIdWeb = import.meta.env.VITE_TRUSTID_WEB ?? "http://localhost:5173";
export const trustIdApi = import.meta.env.VITE_TRUSTID_API ?? "http://localhost:8787";
export const lifeosApiBase = import.meta.env.VITE_LIFEOS_API ?? "/api";

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
  let res: Response;
  try {
    res = await fetch(`${lifeosApiBase}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch {
    throw new ApiError("We couldn't load your LifeOS data.", 0, "lifeos_unavailable");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const raw = (data as { error?: string }).error;
    const message =
      (data as { message?: string }).message ||
      userFacingMessage(new ApiError("Request failed", res.status, mapErrorCode(res.status, raw)));
    throw new ApiError(message, res.status, mapErrorCode(res.status, raw));
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
