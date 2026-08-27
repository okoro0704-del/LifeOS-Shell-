import type { IStorageProvider, StorageObjectRef } from "@lifeos/shared";
import { httpJson } from "./http.js";

export class RemoteSovereignDriveAdapter implements IStorageProvider {
  readonly primitiveId = "sovereign-drive" as const;
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
      return { ok: h.ok !== false, service: h.service ?? "sovereign-drive" };
    } catch {
      return { ok: false, service: "sovereign-drive" };
    }
  }

  async put(input: {
    namespace: string;
    key: string;
    body: Uint8Array | string;
    contentType?: string;
  }): Promise<StorageObjectRef> {
    const body =
      typeof input.body === "string"
        ? input.body
        : Buffer.from(input.body).toString("base64");
    return httpJson(this.baseUrl, "/v1/objects", {
      method: "POST",
      body: JSON.stringify({
        namespace: input.namespace,
        key: input.key,
        body,
        encoding: typeof input.body === "string" ? "utf8" : "base64",
        contentType: input.contentType,
      }),
    });
  }

  async get(input: { namespace: string; key: string }) {
    try {
      const row = await httpJson<{
        body: string;
        encoding?: string;
        contentType?: string;
      }>(
        this.baseUrl,
        `/v1/objects/${encodeURIComponent(input.namespace)}/${encodeURIComponent(input.key)}`,
      );
      const raw =
        row.encoding === "base64"
          ? Buffer.from(row.body, "base64")
          : Buffer.from(row.body, "utf8");
      return { body: new Uint8Array(raw), contentType: row.contentType };
    } catch {
      return null;
    }
  }
}

export class LocalSovereignDriveAdapter implements IStorageProvider {
  readonly primitiveId = "sovereign-drive" as const;
  readonly bound = true;
  private readonly store = new Map<string, { body: Uint8Array; contentType?: string }>();

  private k(ns: string, key: string) {
    return `${ns}::${key}`;
  }

  async health() {
    return { ok: true, service: "sovereign-drive-local" };
  }

  async put(input: {
    namespace: string;
    key: string;
    body: Uint8Array | string;
    contentType?: string;
  }): Promise<StorageObjectRef> {
    const body =
      typeof input.body === "string"
        ? new TextEncoder().encode(input.body)
        : input.body;
    this.store.set(this.k(input.namespace, input.key), {
      body,
      contentType: input.contentType,
    });
    return {
      namespace: input.namespace,
      key: input.key,
      contentType: input.contentType,
      sizeBytes: body.byteLength,
    };
  }

  async get(input: { namespace: string; key: string }) {
    return this.store.get(this.k(input.namespace, input.key)) ?? null;
  }
}
