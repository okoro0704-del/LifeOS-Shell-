import type { IJobDispatcher, JobEnqueueInput, JobEnqueueResult } from "@lifeos/shared";
import { httpJson } from "./http.js";

export class RemoteJobDispatcherAdapter implements IJobDispatcher {
  readonly primitiveId = "platform-jobs" as const;
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
      return { ok: h.ok !== false, service: h.service ?? "platform-jobs" };
    } catch {
      return { ok: false, service: "platform-jobs" };
    }
  }

  async enqueue(input: JobEnqueueInput): Promise<JobEnqueueResult> {
    return httpJson<JobEnqueueResult>(this.baseUrl, "/v1/jobs", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getStatus(jobId: string): Promise<{ jobId: string; status: string }> {
    return httpJson<{ jobId: string; status: string }>(
      this.baseUrl,
      `/v1/jobs/${encodeURIComponent(jobId)}`,
    );
  }
}

export class LocalJobDispatcherAdapter implements IJobDispatcher {
  readonly primitiveId = "platform-jobs" as const;
  readonly bound = true;
  private seq = 0;
  private readonly jobs = new Map<string, string>();

  async health() {
    return { ok: true, service: "platform-jobs-local" };
  }

  async enqueue(input: JobEnqueueInput) {
    this.seq += 1;
    const jobId = `local_job_${this.seq}`;
    this.jobs.set(jobId, input.delayMs ? "scheduled" : "queued");
    return {
      jobId,
      status: (input.delayMs ? "scheduled" : "queued") as "queued" | "scheduled",
    };
  }

  async getStatus(jobId: string) {
    return { jobId, status: this.jobs.get(jobId) ?? "unknown" };
  }
}
