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

export function createAuthClient(config: AuthClientConfig) {
  const storageKey = config.storageKey ?? DEFAULT_STORAGE;

  return {
    async beginLogin() {
      const verifier = randomString(64);
      const challenge = b64url(await sha256(verifier));
      const state = randomString(24);
      sessionStorage.setItem(storageKey, JSON.stringify({ verifier, state }));

      const url = new URL(`${config.trustIdApi}/oauth/authorize`);
      url.searchParams.set("client_id", config.clientId);
      url.searchParams.set("redirect_uri", config.redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", config.scopes);
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");
      window.location.href = url.toString();
    },

    async exchangeCode(code: string, state: string) {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) throw new Error("Missing PKCE state");
      const saved = JSON.parse(raw) as { verifier: string; state: string };
      if (saved.state !== state) throw new Error("State mismatch");

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
      sessionStorage.removeItem(storageKey);
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
