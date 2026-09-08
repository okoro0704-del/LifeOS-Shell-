import { getPersonalApiBearer, getTrustIdToken } from "../auth/trustId";
import { getLifeOsApiBase, getStoredSessionToken } from "../lib/api";

/**
 * Digiconomy Core / personal BFF base.
 * Default: LifeOS API which exposes `/v1/personal/*` and optionally bridges Digiconomy.
 * Set VITE_DIGICONOMY_API_URL to hit Digiconomy Core or a custom gateway directly.
 */
export function getDigiconomyApiBase(): string {
  const fromEnv = (import.meta.env.VITE_DIGICONOMY_API_URL ?? "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return getLifeOsApiBase();
}

/** @deprecated Prefer getDigiconomyApiBase() */
export const digiconomyApiBase = "/api";

export class DigiconomyApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DigiconomyApiError";
    this.status = status;
  }
}

export async function fetchDigiconomyApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const trustToken = await getTrustIdToken();
  const lifeosSession = getStoredSessionToken();
  const bearer = await getPersonalApiBearer();
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (trustToken) headers["X-TrustID-Session"] = trustToken;
  if (lifeosSession) headers["X-LifeOS-Session"] = lifeosSession;

  const response = await fetch(`${getDigiconomyApiBase()}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail =
      (body as { message?: string; error?: string }).message ||
      (body as { error?: string }).error ||
      response.statusText;
    throw new DigiconomyApiError(
      `Digiconomy API Error [${response.status}]: ${detail}`,
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/* —— Personal domain DTOs —— */

export type VaultItemKind = "document" | "key" | "asset" | "media" | "secret";

export type PersonalVaultItem = {
  id: string;
  title: string;
  kind: VaultItemKind;
  mimeType?: string | null;
  sizeBytes?: number | null;
  previewHint?: string | null;
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PersonalDiscoveryItem = {
  id: string;
  title: string;
  kind: string;
  summary?: string | null;
  source?: string | null;
  previewUrl?: string | null;
  createdAt: string;
};

export type PersonalFinanceTxn = {
  id: string;
  label: string;
  amount: number;
  currency: string;
  direction: "in" | "out";
  at: string;
};

export type PersonalFinanceSummary = {
  netWorth: number;
  currency: string;
  available: number;
  ledgerLabel: string;
  source: "digiconomy" | "lifeos" | "demo";
  transactions: PersonalFinanceTxn[];
};

export const personalApi = {
  vault: {
    list: () =>
      fetchDigiconomyApi<{ items: PersonalVaultItem[] }>("/v1/personal/vault"),
    create: (input: {
      title: string;
      kind?: VaultItemKind;
      mimeType?: string;
      sizeBytes?: number;
      previewHint?: string;
    }) =>
      fetchDigiconomyApi<{ item: PersonalVaultItem }>("/v1/personal/vault", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
  discovery: {
    list: () =>
      fetchDigiconomyApi<{ items: PersonalDiscoveryItem[] }>("/v1/personal/discovery"),
  },
  finance: {
    summary: () =>
      fetchDigiconomyApi<PersonalFinanceSummary>("/v1/personal/finance/summary"),
  },
};
