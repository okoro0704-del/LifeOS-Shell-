import type { ExecutionMode, ExecutionResult, KernelTransport, ProviderEntitlements, SpaceProvider, UserAccessEntitlements } from "@lifeos/shared";
import { createSpaceRuntime, type SpaceRuntime } from "../space-runtime";
import type { SpaceLocalDatabase } from "./database";
import { completed, failure } from "./resources";
import { date, text, validProvider } from "./validation";

type Entry = { spaceId: string; productId: string; consumptionOnly: true; runtime?: SpaceRuntime };
/** Host supplies entitlement projections separately; descriptors cannot grant commercial rights. */
export class SpaceDirectory {
  constructor(private db: SpaceLocalDatabase, private entitlements: (providerId: string) => ProviderEntitlements | undefined, private now: () => number = Date.now) {}
  private eligible(p: SpaceProvider): ProviderEntitlements | undefined {
    try {
      const e = this.entitlements(p.providerId);
      return e && e.providerId === p.providerId && e.productId === p.productId && e.sourceRef === p.distributionRef && date(e.validUntil) && Date.parse(e.validUntil) > this.now() ? e : undefined;
    } catch { return undefined; }
  }
  async put(provider: SpaceProvider): Promise<ExecutionResult<SpaceProvider>> {
    if (!validProvider(provider)) return failure("INVALID_PROVIDER_DESCRIPTOR");
    try { await this.db.write([{ store: "providers", key: provider.spaceId, value: provider }]); return completed(provider); }
    catch { return failure("LOCAL_STORAGE_UNAVAILABLE"); }
  }
  async search(query: string): Promise<ExecutionResult<SpaceProvider[]>> {
    try {
      const q = query.trim().toLowerCase();
      const providers = (await this.db.entries("providers")).flatMap(({ key, value }) => {
        if (!validProvider(value) || key !== value.spaceId || Date.parse(value.validUntil) <= this.now() || value.visibility !== "PUBLIC") return [];
        const e = this.eligible(value);
        if (e?.spaceDistribution !== true || e.spaceDiscovery !== true) return [];
        return `${value.displayName} ${value.description} ${value.capabilities.join(" ")}`.toLowerCase().includes(q) ? [value] : [];
      });
      return completed(providers.sort((a, b) => a.spaceId.localeCompare(b.spaceId)));
    } catch { return failure("LOCAL_STORAGE_UNAVAILABLE"); }
  }
  /** Exact canonical ID lookup; alias/identity registry ownership is unchanged. */
  async resolve(spaceId: string): Promise<ExecutionResult<SpaceProvider>> {
    try {
      const p = await this.db.get("providers", spaceId);
      if (p === undefined) return failure("SPACE_NOT_FOUND");
      if (!validProvider(p) || p.spaceId !== spaceId) return failure("INVALID_PROVIDER_DESCRIPTOR");
      if (Date.parse(p.validUntil) <= this.now()) return failure("STALE_PROVIDER_DESCRIPTOR");
      return completed(p);
    } catch { return failure("LOCAL_STORAGE_UNAVAILABLE"); }
  }
  async enter(mode: ExecutionMode, spaceId: string, user: UserAccessEntitlements, transport: KernelTransport): Promise<ExecutionResult<Entry>> {
    const resolved = await this.resolve(spaceId);
    if (!resolved.data) return { ...resolved, transport } as ExecutionResult<Entry>;
    const p = resolved.data;
    const e = this.eligible(p);
    const denied = (code: string) => failure<Entry>(code, transport, "DENIED");
    if (!e || (mode === "APP" ? e.appDistribution !== true : e.spaceDistribution !== true)) return denied(mode === "APP" ? "APP_DISTRIBUTION_REQUIRED" : "SPACE_DISTRIBUTION_REQUIRED");
    const validUser = user && text(user.sourceRef) && date(user.validUntil) && Date.parse(user.validUntil) > this.now();
    if (mode === "APP") {
      if (!validUser || user.appAccess !== true) return denied("APP_ACCESS_REQUIRED");
      // Commercial access only. The existing product API still owns online authorization.
      return { state: "COMPLETED_LOCAL", transport, data: { spaceId, productId: p.productId, consumptionOnly: true } };
    }
    if (p.visibility === "PRIVATE") return denied("PRIVATE_AUTHORIZATION_REQUIRED");
    if (p.visibility === "RELATIONSHIP_ONLY") return denied("RELATIONSHIP_AUTHORIZATION_REQUIRED");
    if (p.access === "SUBSCRIBER" && (!validUser || user.spaceAccess !== true)) return denied("SPACE_ACCESS_REQUIRED");
    if (!p.bootstrap || p.bootstrap.version !== p.version) return failure("SPACE_BOOTSTRAP_NOT_LOCAL", transport, transport === "NO_ROUTE" ? "AWAITING_ROUTE" : "ONLINE_REQUIRED");
    const runtime = createSpaceRuntime({ id: p.spaceId, owner: p.publisherRef, defaultExperienceId: p.bootstrap.defaultExperienceId, experiences: p.experiences.map(id => ({ id, title: id, type: id, lifecyclePolicy: "retained", offlinePolicy: "cached" })) });
    return { state: "COMPLETED_LOCAL", transport, data: { spaceId, productId: p.productId, consumptionOnly: true, runtime } };
  }
}
