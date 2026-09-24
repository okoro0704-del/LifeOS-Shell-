import { MemoryLastValidStore } from "@digiconomy/offline-kernel";
import type { MediaItem } from "../../src/lib/personalCatalog";

/** Actual embedded 1x1 PNG bytes, not an ownership flag or a remote URL. */
export const dk1Media: MediaItem = {
  id: "content:test-media-001",
  title: "DK1 local media proof",
  kind: "picture",
  detail: "Deterministic preloaded PNG",
  free: true,
  ownedOrConsumed: true,
  premiumRequired: false,
  mediaUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH1cAAAAASUVORK5CYII=",
};

export async function dk1LocalStore(item = dk1Media) {
  const store = new MemoryLastValidStore<MediaItem>();
  await store.save(item.id, {
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    value: { ...item },
  });
  return store;
}
