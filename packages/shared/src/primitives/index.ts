export type { ITrustIdProvider, TrustIdSessionProof } from "./trust-id.interface.js";
export type {
  IMessagingProvider,
  MessagingThreadSummary,
  MessagingSendInput,
} from "./messaging.interface.js";
export type { IStorageProvider, StorageObjectRef } from "./storage.interface.js";
export type {
  IJobDispatcher,
  JobEnqueueInput,
  JobEnqueueResult,
} from "./jobs.interface.js";
export type {
  IMasterDistributorClient,
  DeployRequest,
  DeployResult,
} from "./distributor.interface.js";
export type {
  IFundzManWalletProvider,
  InitiatePaymentPayload,
  PaymentResult,
  WalletBalanceSummary,
  BillPaymentPayload,
} from "./wallet.interface.js";

/** Canonical LifeOS Core Shell primitive ids (Phase F — 6 engines). */
export const LIFEOS_PRIMITIVE_IDS = [
  "trust-id",
  "elfcom",
  "sovereign-drive",
  "platform-jobs",
  "master-distributor",
  "fundzman",
] as const;

export type LifeOsPrimitiveId = (typeof LIFEOS_PRIMITIVE_IDS)[number];
