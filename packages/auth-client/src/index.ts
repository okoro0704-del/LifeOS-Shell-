export type TrustIdUserInfo = {
  sub: string;
  trustId: string;
  status?: string;
  profile?: { firstName: string; lastName: string; name: string };
  contacts?: { type: string; value: string }[];
};

export type AuthClientConfig = {
  trustIdApi: string;
  clientId: string;
  redirectUri: string;
  scopes: string;
  storageKey?: string;
};

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

  return {
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
      url.searchParams.set("scope", config.scopes);
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

    async exchangeCode(code: string, state: string) {
      const raw = readPkce(storageKey);
      if (!raw) {
        throw new Error(
          "Missing PKCE state. Start again from LifeOS (same browser).",
        );
      }
      const saved = JSON.parse(raw) as { verifier: string; state: string };
      if (saved.state !== state) throw new Error("State mismatch. Start login again from LifeOS.");

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Token exchange failed");
      clearPkce(storageKey);
      return data as { access_token: string; scope: string; expires_in?: number };
    },

    async fetchUserInfo(accessToken: string): Promise<TrustIdUserInfo> {
      const res = await fetch(`${config.trustIdApi}/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "userinfo failed");
      return data as TrustIdUserInfo;
    },
  };
}

export type AuthClient = ReturnType<typeof createAuthClient>;
