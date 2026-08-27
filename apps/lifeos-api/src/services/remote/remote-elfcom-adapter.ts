import type {
  IMessagingProvider,
  MessagingSendInput,
  MessagingThreadSummary,
} from "@lifeos/shared";
import { httpJson } from "./http.js";

export class RemoteElfComMessagingAdapter implements IMessagingProvider {
  readonly primitiveId = "elfcom" as const;
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
      return { ok: h.ok !== false, service: h.service ?? "elfcom" };
    } catch {
      return { ok: false, service: "elfcom" };
    }
  }

  async listThreads(ownerTrustId: string): Promise<MessagingThreadSummary[]> {
    return httpJson<MessagingThreadSummary[]>(
      this.baseUrl,
      `/v1/threads?owner=${encodeURIComponent(ownerTrustId)}`,
    );
  }

  async sendMessage(input: MessagingSendInput): Promise<{ messageId: string }> {
    return httpJson<{ messageId: string }>(this.baseUrl, "/v1/messages", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
}

export class LocalElfComMessagingAdapter implements IMessagingProvider {
  readonly primitiveId = "elfcom" as const;
  readonly bound = true;

  async health() {
    return { ok: true, service: "elfcom-local" };
  }

  async listThreads() {
    return [];
  }

  async sendMessage(input: MessagingSendInput) {
    return { messageId: `local_msg_${input.threadId}` };
  }
}
