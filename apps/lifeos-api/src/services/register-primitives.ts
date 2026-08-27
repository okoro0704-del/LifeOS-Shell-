import type {
  IFundzManWalletProvider,
  IJobDispatcher,
  IMasterDistributorClient,
  IMessagingProvider,
  IStorageProvider,
  ITrustIdProvider,
} from "@lifeos/shared";
import { LocalElfComMessagingAdapter, RemoteElfComMessagingAdapter } from "./remote/remote-elfcom-adapter.js";
import {
  LocalMasterDistributorClient,
  MasterDistributorClient,
} from "./remote/remote-distributor-adapter.js";
import { LocalFundzManAdapter, RemoteFundzManAdapter } from "./remote/remote-fundzman-adapter.js";
import { LocalJobDispatcherAdapter, RemoteJobDispatcherAdapter } from "./remote/remote-jobs-adapter.js";
import {
  LocalSovereignDriveAdapter,
  RemoteSovereignDriveAdapter,
} from "./remote/remote-sovereign-drive-adapter.js";
import { LocalTrustIdAdapter, RemoteTrustIdAdapter } from "./remote/remote-trustid-adapter.js";

export interface PrimitiveContainer {
  trustId: ITrustIdProvider;
  messaging: IMessagingProvider;
  storage: IStorageProvider;
  jobs: IJobDispatcher;
  distributor: IMasterDistributorClient;
  wallet: IFundzManWalletProvider;
}

function requiredUrl(name: string, value: string | undefined): string {
  const v = (value ?? "").trim();
  if (!v) {
    throw new Error(`Missing env ${name} for PRIMITIVES_MODE=remote`);
  }
  return v;
}

/**
 * LifeOS Core Shell — register all 6 independent primitives.
 * PRIMITIVES_MODE=remote uses HTTP adapters; local uses in-process stubs.
 */
export function registerPrimitives(env: NodeJS.ProcessEnv = process.env): PrimitiveContainer {
  const mode = (env.PRIMITIVES_MODE ?? "local").toLowerCase();

  if (mode === "remote") {
    return {
      trustId: new RemoteTrustIdAdapter(
        requiredUrl("TRUSTID_URL", env.TRUSTID_URL ?? env.TRUSTID_API),
      ),
      messaging: new RemoteElfComMessagingAdapter(
        requiredUrl("ELFCOM_URL", env.ELFCOM_URL ?? env.ELFCOM_BASE_URL),
      ),
      storage: new RemoteSovereignDriveAdapter(
        requiredUrl("SOVEREIGN_DRIVE_URL", env.SOVEREIGN_DRIVE_URL),
      ),
      jobs: new RemoteJobDispatcherAdapter(requiredUrl("JOBS_ENGINE_URL", env.JOBS_ENGINE_URL)),
      distributor: new MasterDistributorClient(
        requiredUrl("DISTRIBUTOR_URL", env.DISTRIBUTOR_URL),
      ),
      wallet: new RemoteFundzManAdapter(requiredUrl("FUNDZMAN_URL", env.FUNDZMAN_URL)),
    };
  }

  return {
    trustId: new LocalTrustIdAdapter(),
    messaging: new LocalElfComMessagingAdapter(),
    storage: new LocalSovereignDriveAdapter(),
    jobs: new LocalJobDispatcherAdapter(),
    distributor: new LocalMasterDistributorClient(),
    wallet: new LocalFundzManAdapter(),
  };
}

/** Snapshot for health / E2E — confirms all 6 slots are present and bound. */
export async function assertPrimitivesReady(container: PrimitiveContainer) {
  const entries: Array<[keyof PrimitiveContainer, { bound: boolean; primitiveId: string }]> = [
    ["trustId", container.trustId],
    ["messaging", container.messaging],
    ["storage", container.storage],
    ["jobs", container.jobs],
    ["distributor", container.distributor],
    ["wallet", container.wallet],
  ];
  const missing = entries.filter(([, p]) => !p.bound).map(([k]) => k);
  if (missing.length) {
    throw new Error(`Primitives not bound: ${missing.join(", ")}`);
  }
  return {
    ok: true as const,
    count: 6 as const,
    ids: entries.map(([, p]) => p.primitiveId),
  };
}
