import type { ZkClaimBundle, ZkVerifyErrorCode } from "@lifeos/shared";
import { LIFEOS_AUTH_SCOPES } from "@lifeos/shared";

export type { ZkClaimBundle, ZkVerifyErrorCode };

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
  /** Legacy break-glass only — LifeOS must not persist these. */
  profile?: { firstName?: string; lastName?: string; name?: string } | null;
  contacts?: { type: string; value: string }[] | null;
  profileNote?: string;
  contactsNote?: string;
};

export type AuthClientConfig = {
  trustIdApi: string;
  clientId: string;
  redirectUri: string;
  scopes: string;
  storageKey?: string;
};

export type TokenResponse = {
  access_token: string;
  scope: string;
  expires_in?: number;
  token_type?: string;
};

export type ZkProveRequest = {
  claimTypes: string[];
  audience?: string;
};

export type ZkProveResponse = {
  claims: ZkClaimBundle[];
  error?: string;
  code?: ZkVerifyErrorCode;
};

export class AuthClientError extends Error {
  constructor(
    message: string,
    readonly code: ZkVerifyErrorCode | "token_exchange_failed" | "userinfo_failed" | "pkce_missing" | "state_mismatch",
  ) {
    super(message);
    this.name = "AuthClientError";
  }
}

const DEFAULT_STORAGE = "lifeos.oauth";

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(length = 64) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return b64url(bytes);
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  return crypto.subtle.digest("SHA-256", data);
}

function writePkce(storageKey: string, value: string) {
  // localStorage survives better across long OAuth redirects than sessionStorage alone
  localStorage.setItem(storageKey, value);
  sessionStorage.setItem(storageKey, value);
}

function readPkce(storageKey: string): string | null {
  return sessionStorage.getItem(storageKey) ?? localStorage.getItem(storageKey);
}

function clearPkce(storageKey: string) {
  sessionStorage.removeItem(storageKey);
  localStorage.removeItem(storageKey);
}

export function createAuthClient(config: AuthClientConfig) {
  const storageKey = config.storageKey ?? DEFAULT_STORAGE;
  const scopes = config.scopes || LIFEOS_AUTH_SCOPES;

  return {
    scopes,

    async beginLogin(opts?: {
      /** Pre-fill identity (email / LifeOS ID). */
      loginHint?: string;
      /** OIDC prompt — use "login" when switching accounts. */
      prompt?: string;
      /** Prefer passkey path on the LifeOS Gateway when supported. */
      preferPasskey?: boolean;
      phone?: string | null;
      deviceName?: string | null;
    }) {
      const verifier = randomString(64);
      const challenge = b64url(await sha256(verifier));
      const state = randomString(24);
      writePkce(
        storageKey,
        JSON.stringify({ verifier, state, createdAt: Date.now() }),
      );

      const url = new URL(`${config.trustIdApi}/oauth/authorize`);
      url.searchParams.set("client_id", config.clientId);
      url.searchParams.set("redirect_uri", config.redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", scopes);
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");
      if (opts?.loginHint) url.searchParams.set("login_hint", opts.loginHint);
      if (opts?.prompt) url.searchParams.set("prompt", opts.prompt);
      if (opts?.preferPasskey) {
        url.searchParams.set("auth_mode", "passkey");
        url.searchParams.set("lifeos_returning", "1");
      }
      if (opts?.phone) url.searchParams.set("phone_hint", opts.phone);
      if (opts?.deviceName) url.searchParams.set("device_name", opts.deviceName);
      window.location.href = url.toString();
    },

    async exchangeCode(code: string, state: string): Promise<TokenResponse> {
      const raw = readPkce(storageKey);
      if (!raw) {
        throw new AuthClientError(
          "Missing PKCE state. Start again from LifeOS (same browser).",
          "pkce_missing",
        );
      }
      const saved = JSON.parse(raw) as { verifier: string; state: string };
      if (saved.state !== state) {
        throw new AuthClientError("State mismatch. Start login again from LifeOS.", "state_mismatch");
      }

      const res = await fetch(`${config.trustIdApi}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: config.redirectUri,
          client_id: config.clientId,
          code_verifier: saved.verifier,
        }),
      });
      const data = (await res.json()) as TokenResponse & { error?: string; code?: string };
      if (!res.ok) {
        throw new AuthClientError(data.error || "Token exchange failed", "token_exchange_failed");
      }
      clearPkce(storageKey);
      return data;
    },

    async fetchUserInfo(accessToken: string): Promise<TrustIdUserInfo> {
      const res = await fetch(`${config.trustIdApi}/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await res.json()) as TrustIdUserInfo & { error?: string };
      if (!res.ok) {
        throw new AuthClientError(data.error || "userinfo failed", "userinfo_failed");
      }
      return {
        ...data,
        trustId: data.trustId || data.sub,
        sub: data.sub || data.trustId,
      };
    },

    /** Fetch Groth16 verification key published by TrustID. */
    async fetchVerificationKey(path = "/zk/verification-key"): Promise<unknown> {
      const res = await fetch(`${config.trustIdApi}${path}`);
      if (!res.ok) {
        throw new AuthClientError("ZK verification key unavailable", "zk_unavailable");
      }
      return res.json();
    },

    /**
     * Request ZK claim proofs from TrustID (no raw PII).
     * Falls back to empty claims when the gateway has not enabled prove yet.
     */
    async proveZkClaims(
      accessToken: string,
      body: ZkProveRequest,
      provePath = "/zk/prove",
    ): Promise<ZkProveResponse> {
      const res = await fetch(`${config.trustIdApi}${provePath}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as ZkProveResponse & {
        error?: string;
        code?: ZkVerifyErrorCode;
        message?: string;
      };
      if (res.status === 404) {
        return { claims: [] };
      }
      if (!res.ok) {
        throw new AuthClientError(
          data.message || data.error || "ZK prove failed",
          data.code || "zk_invalid",
        );
      }
      return { claims: data.claims ?? [] };
    },

    /**
     * Build the LifeOS session handshake payload: access token + optional ZK claims.
     * Never includes raw contacts for persistence — callers may attach ephemeralPresentation separately.
     */
    async buildSessionHandshake(accessToken: string, opts?: { audience?: string }) {
      const userInfo = await this.fetchUserInfo(accessToken);
      let zkClaims: ZkClaimBundle[] = [];
      if (userInfo.zk?.available) {
        try {
          const proved = await this.proveZkClaims(
            accessToken,
            {
              claimTypes: ["compliance_tier", "uniqueness", "authorization"],
              audience: opts?.audience ?? config.clientId,
            },
            userInfo.zk.provePath,
          );
          zkClaims = proved.claims;
        } catch (err) {
          if (err instanceof AuthClientError && err.code === "zk_unavailable") {
            zkClaims = [];
          } else {
            throw err;
          }
        }
      }
      return { accessToken, zkClaims, userInfo };
    },
  };
}

export type AuthClient = ReturnType<typeof createAuthClient>;
