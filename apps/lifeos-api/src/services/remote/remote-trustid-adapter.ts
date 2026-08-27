import type { ITrustIdProvider, TrustIdSessionProof } from "@lifeos/shared";
import { httpJson } from "./http.js";

export class RemoteTrustIdAdapter implements ITrustIdProvider {
  readonly primitiveId = "trust-id" as const;
  readonly bound = true;
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async health() {
    try {
      const h = await httpJson<{ ok?: boolean; service?: string }>(
        this.baseUrl,
        "/health",
      );
      return { ok: h.ok !== false, service: h.service ?? "trustid" };
    } catch {
      return { ok: false, service: "trustid" };
    }
  }

  async resolveSession(sessionToken: string): Promise<TrustIdSessionProof | null> {
    try {
      return await httpJson<TrustIdSessionProof>(this.baseUrl, "/auth/me", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
    } catch {
      return null;
    }
  }
}

export class LocalTrustIdAdapter implements ITrustIdProvider {
  readonly primitiveId = "trust-id" as const;
  readonly bound = true;

  async health() {
    return { ok: true, service: "trustid-local" };
  }

  async resolveSession(sessionToken: string): Promise<TrustIdSessionProof | null> {
    if (!sessionToken) return null;
    return { trustId: "TD-LOCAL", sessionToken, trustTier: 1, verified: true };
  }
}
