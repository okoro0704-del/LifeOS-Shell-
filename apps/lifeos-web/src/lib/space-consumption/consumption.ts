import type { KernelTransport, MediaCapability, ResourceScope, UserAccessEntitlements } from "@lifeos/shared";
import type { MediaItem } from "../personalCatalog";
import type { SpaceDirectory } from "./directory";
import { failure, type LocalResources } from "./resources";

/** DK2 consumption gate. Entitlements do not modify the frozen DK1 implementation. */
export function spaceMediaCapability(directory: SpaceDirectory, local: LocalResources, scope: ResourceScope, user: () => UserAccessEntitlements, transport: () => KernelTransport): MediaCapability<MediaItem> {
  return {
    mode: "SPACE",
    async resolve(request) {
      const route = transport();
      const entry = await directory.enter("SPACE", scope.spaceId, user(), route);
      if (!entry.data) return failure(entry.reason?.code ?? "SPACE_ENTRY_FAILED", route, entry.state === "DENIED" ? "DENIED" : entry.state === "AWAITING_ROUTE" ? "AWAITING_ROUTE" : entry.state === "ONLINE_REQUIRED" ? "ONLINE_REQUIRED" : "FAILED");
      const descriptor = await directory.resolve(scope.spaceId);
      if (!descriptor.data || descriptor.data.productId !== scope.productId || descriptor.data.providerId !== scope.providerId) return failure("PROVIDER_SCOPE_MISMATCH", route, "DENIED");
      if (!descriptor.data.capabilities.includes("space.media")) return failure("CAPABILITY_UNSUPPORTED", route, "DENIED");
      return local.capability(scope, transport).resolve(request);
    },
  };
}
