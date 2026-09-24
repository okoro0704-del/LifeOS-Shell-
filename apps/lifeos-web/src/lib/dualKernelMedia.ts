import type { ExecutionMode, MediaCapability } from "@lifeos/shared";
import type { LastValidStore } from "@digiconomy/offline-kernel";
import type { MediaItem } from "./personalCatalog";
import { createOnlineMediaCapability } from "./onlineKernel";
import { createOfflineMediaCapability } from "./offlineKernelRuntime";

/** Host composition, not another registry/bridge. Presentation is not an input. */
export function createDualKernelMedia(
  localMedia: LastValidStore<MediaItem>,
  options: {
    onlineRead?: (contentId: string) => Promise<MediaItem | undefined>;
    connected?: () => boolean;
  } = {},
): (mode: ExecutionMode) => MediaCapability<MediaItem> {
  const connected = options.connected ?? (() => typeof navigator === "undefined" || navigator.onLine);
  const providers = {
    APP: createOnlineMediaCapability(options.onlineRead, connected),
    SPACE: createOfflineMediaCapability(localMedia, () => connected() ? "INTERNET" : "NO_ROUTE"),
  };
  return (mode) => providers[mode];
}
