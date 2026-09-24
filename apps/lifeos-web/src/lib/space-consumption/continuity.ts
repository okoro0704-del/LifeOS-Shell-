import type { ContinuityCheckpoint, ExecutionResult, ResourceReference } from "@lifeos/shared";
import type { SpaceLocalDatabase } from "./database";
import { completed, failure } from "./resources";
import { record, resourceKey, validCheckpoint, validReference } from "./validation";

export class ContinuityStore {
  constructor(private db: SpaceLocalDatabase) {}
  async read(reference: ResourceReference): Promise<ExecutionResult<ContinuityCheckpoint>> {
    if (!validReference(reference)) return failure("INVALID_RESOURCE_REFERENCE");
    try {
      const value = await this.db.get("continuity", resourceKey(reference));
      if (value === undefined) return failure("CHECKPOINT_NOT_PRESENT", "NO_ROUTE", "AWAITING_ROUTE");
      return validCheckpoint(value) && resourceKey(value) === resourceKey(reference) ? completed(value) : failure("CORRUPT_CHECKPOINT");
    } catch { return failure("LOCAL_STORAGE_UNAVAILABLE"); }
  }
  async write(checkpoint: ContinuityCheckpoint): Promise<ExecutionResult<ContinuityCheckpoint>> {
    if (!validCheckpoint(checkpoint)) return failure("INVALID_CHECKPOINT");
    if (checkpoint.syncState === "SYNCED") return failure("SYNC_NOT_IMPLEMENTED");
    let outcome: ExecutionResult<ContinuityCheckpoint> = failure("CHECKPOINT_WRITE_FAILED");
    try {
      await this.db.update("continuity", resourceKey(checkpoint), current => {
        if (current !== undefined && (!validCheckpoint(current) || resourceKey(current) !== resourceKey(checkpoint))) {
          outcome = failure("CORRUPT_CHECKPOINT"); return undefined;
        }
        if (validCheckpoint(current)) {
          const same = JSON.stringify(current) === JSON.stringify(checkpoint);
          if (same) { outcome = completed(current); return undefined; }
          // Version wins only if its declared base matches the retained version.
          if (checkpoint.version <= current.version || checkpoint.reconciliation?.baseVersion !== current.version) {
            outcome = failure("CHECKPOINT_VERSION_CONFLICT", "NO_ROUTE", "CONFLICT"); return undefined;
          }
        }
        outcome = completed(checkpoint); return checkpoint;
      });
      return outcome;
    } catch { return failure("LOCAL_STORAGE_UNAVAILABLE"); }
  }
  async export(reference: ResourceReference): Promise<ExecutionResult<string>> {
    const result = await this.read(reference);
    return result.data ? completed(JSON.stringify({ schemaVersion: 1, checkpoint: result.data })) : result as ExecutionResult<string>;
  }
  async import(serialized: string, target: ResourceReference): Promise<ExecutionResult<ContinuityCheckpoint>> {
    try {
      const envelope: unknown = JSON.parse(serialized);
      if (!validReference(target) || !record(envelope) || envelope.schemaVersion !== 1 || !validCheckpoint(envelope.checkpoint)) return failure("INVALID_CHECKPOINT_TRANSFER");
      if (resourceKey(envelope.checkpoint) !== resourceKey(target)) return failure("CHECKPOINT_SCOPE_MISMATCH", "NO_ROUTE", "DENIED");
      return this.write({ ...envelope.checkpoint, syncState: "IMPORTED" });
    } catch { return failure("INVALID_CHECKPOINT_TRANSFER"); }
  }
}
