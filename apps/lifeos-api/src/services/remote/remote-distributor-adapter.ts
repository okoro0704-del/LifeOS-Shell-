import type {
  DeployRequest,
  DeployResult,
  IMasterDistributorClient,
} from "@lifeos/shared";
import { httpJson } from "./http.js";

export class MasterDistributorClient implements IMasterDistributorClient {
  readonly primitiveId = "master-distributor" as const;
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
      return { ok: h.ok !== false, service: h.service ?? "master-distributor" };
    } catch {
      return { ok: false, service: "master-distributor" };
    }
  }

  async requestDeploy(input: DeployRequest): Promise<DeployResult> {
    return httpJson<DeployResult>(this.baseUrl, "/v1/deployments", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getDeployment(deploymentId: string): Promise<DeployResult> {
    return httpJson<DeployResult>(
      this.baseUrl,
      `/v1/deployments/${encodeURIComponent(deploymentId)}`,
    );
  }
}

export class LocalMasterDistributorClient implements IMasterDistributorClient {
  readonly primitiveId = "master-distributor" as const;
  readonly bound = true;
  private seq = 0;

  async health() {
    return { ok: true, service: "master-distributor-local" };
  }

  async requestDeploy(input: DeployRequest) {
    this.seq += 1;
    return {
      deploymentId: `local_dep_${this.seq}`,
      status: "accepted" as const,
      url: `https://local.dev/${input.shellId}`,
    };
  }

  async getDeployment(deploymentId: string) {
    return { deploymentId, status: "accepted" as const };
  }
}
