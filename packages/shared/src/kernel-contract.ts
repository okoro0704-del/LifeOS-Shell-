/** Execution provider selection only; presentation belongs to the host. */
export const EXECUTION_MODES = ["APP", "SPACE"] as const;
export type ExecutionMode = (typeof EXECUTION_MODES)[number];

/** Vocabulary only: declaring a transport does not implement it. */
export const KERNEL_TRANSPORTS = ["INTERNET", "LOCAL_NETWORK", "NEARBY", "EDGE", "RELAY", "PRELOADED", "NO_ROUTE"] as const;
export type KernelTransport = (typeof KERNEL_TRANSPORTS)[number];
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { [key: string]: JsonValue | undefined };
export type ExecutionReason = { code: string; message: string };
export type ExecutionMetadata = {
  transport: KernelTransport;
  reason?: ExecutionReason;
  retry?: { afterMs?: number; when: "ROUTE_AVAILABLE" | "USER_ACTION" | "LATER" };
  reconciliation?: { correlationId: string; revision?: string };
};

/** Only completed operations carry data. QUEUED never means remote completion. */
export type ExecutionResult<T extends JsonValue> = ExecutionMetadata & (
  | { state: "COMPLETED_LOCAL"; data: T }
  | { state: "COMPLETED_SYNCED"; data: T }
  | { state: "QUEUED"; operationId: string; reason: ExecutionReason; data?: never }
  | { state: "AWAITING_ROUTE" | "ONLINE_REQUIRED" | "STEP_UP_REQUIRED" | "CONFLICT" | "DENIED" | "FAILED";
      reason: ExecutionReason; data?: never }
);

export type MediaRequest = { contentId: string };
/** T is the product's existing metadata type, not a second media domain model. */
export type MediaResolution<T extends JsonValue> = {
  contentId: string;
  metadata: T;
} & (
  | { availability: "AVAILABLE_LOCAL"; source: "LOCAL_PROJECTION" }
  | { availability: "AVAILABLE_REMOTE"; source: "ONLINE_API" }
);
export interface MediaCapability<T extends JsonValue> {
  readonly mode: ExecutionMode;
  resolve(request: MediaRequest): Promise<ExecutionResult<MediaResolution<T>>>;
}
