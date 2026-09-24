import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryLastValidStore } from "@digiconomy/offline-kernel";
import { api, ApiError } from "../src/lib/api";
import { createDualKernelMedia } from "../src/lib/dualKernelMedia";
import { createOfflineMediaCapability } from "../src/lib/offlineKernelRuntime";
import { createOnlineMediaCapability } from "../src/lib/onlineKernel";
import { fetchLifeOsPublicationFeed } from "../src/lib/mybrandPublicFeed";
import type { MediaItem } from "../src/lib/personalCatalog";
import { dk1LocalStore, dk1Media } from "./fixtures/dk1Media";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("DK1 media capability", () => {
  it("A-D: APP resolves online; SPACE retains the same real local media with NO_ROUTE and zero network requests", async () => {
    let connected = true;
    const network = vi.fn(async () => jsonResponse(dk1Media));
    vi.stubGlobal("fetch", network);
    const xhr = vi.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => { throw new Error("Network forbidden"); });
    // Test-only source uses the existing API client. Production composition defaults
    // to the existing publication reader, separately exercised below.
    const onlineRead = vi.fn((id: string) => api<MediaItem>(`/__test__/dk1/media/${encodeURIComponent(id)}`));
    const store = await dk1LocalStore();
    expect((await store.load(dk1Media.id))?.value).toEqual(dk1Media);
    const media = createDualKernelMedia(store, { onlineRead, connected: () => connected });
    const app = await media("APP").resolve({ contentId: dk1Media.id });
    expect(app).toMatchObject({ state: "COMPLETED_SYNCED", transport: "INTERNET", data: { contentId: dk1Media.id, metadata: dk1Media, source: "ONLINE_API", availability: "AVAILABLE_REMOTE" } });
    expect(network).toHaveBeenCalledTimes(1);
    expect(onlineRead).toHaveBeenCalledWith(dk1Media.id);
    const spaceOnline = await media("SPACE").resolve({ contentId: dk1Media.id });
    expect(spaceOnline.state).toBe("COMPLETED_LOCAL");
    expect(network).toHaveBeenCalledTimes(1);

    connected = false;
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    network.mockClear();
    network.mockRejectedValue(new TypeError("Network disabled"));
    onlineRead.mockClear();
    const space = await media("SPACE").resolve({ contentId: dk1Media.id });
    expect(space).toMatchObject({ state: "COMPLETED_LOCAL", transport: "NO_ROUTE", data: { contentId: dk1Media.id, metadata: dk1Media, source: "LOCAL_PROJECTION", availability: "AVAILABLE_LOCAL" } });
    const base64 = space.data!.metadata.mediaUrl!.split(",")[1];
    expect(Array.from(atob(base64).slice(0, 8), c => c.charCodeAt(0))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(space.data!.contentId).toBe(app.data!.contentId);
    const absent = await media("SPACE").resolve({ contentId: "content:not-synchronized" });
    expect(absent).toMatchObject({ state: "AWAITING_ROUTE", transport: "NO_ROUTE", reason: { code: "MEDIA_NOT_LOCAL" } });
    expect(absent).not.toHaveProperty("data");
    expect(await media("APP").resolve({ contentId: dk1Media.id })).toMatchObject({ state: "AWAITING_ROUTE", transport: "NO_ROUTE" });
    expect(network).not.toHaveBeenCalled();
    expect(xhr).not.toHaveBeenCalled();
    expect(onlineRead).not.toHaveBeenCalled();
  });

  it("default APP composition calls the existing publication API and preserves its canonical mapping", async () => {
    const network = vi.fn(async () => jsonResponse({ items: [{ originApplicationId: "mybrandos", originPublicationId: "post-001", publicationType: "PHOTO", title: "Existing projection", caption: "Existing API", authorSlug: "creator", mediaUrl: "https://example.test/media.png", mediaStatus: "ready", publishedAt: "2026-01-01T00:00:00Z" }], count: 1 }));
    vi.stubGlobal("fetch", network);
    const media = createDualKernelMedia(new MemoryLastValidStore<MediaItem>(), { connected: () => true });
    expect(await media("APP").resolve({ contentId: "eco:mybrandos:post-001" })).toMatchObject({ state: "COMPLETED_SYNCED", data: { contentId: "eco:mybrandos:post-001", metadata: { id: "eco:mybrandos:post-001", kind: "picture", title: "Existing projection" } } });
    expect(network).toHaveBeenCalledWith(expect.stringContaining("/v1/publications/feed"), expect.objectContaining({ credentials: "include" }));
  });

  it("APP distinguishes an actual network failure from content absence", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network disabled")));
    const media = createOnlineMediaCapability(undefined, () => true);
    expect(await media.resolve({ contentId: dk1Media.id })).toMatchObject({ state: "AWAITING_ROUTE", transport: "NO_ROUTE" });
    // Existing feed callers retain their original empty-on-error behavior.
    expect(await fetchLifeOsPublicationFeed()).toEqual({ items: [], nextCursor: null });
  });

  it.each([401, 403, 503])("APP translates API %i without claiming completion", async status => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ message: "Unavailable" }, status)));
    const result = await createOnlineMediaCapability(undefined, () => true).resolve({ contentId: dk1Media.id });
    expect(result.state).toBe(status === 401 ? "STEP_UP_REQUIRED" : status === 403 ? "DENIED" : "FAILED");
    expect(result).not.toHaveProperty("data");
  });

  it("APP distinguishes not-found, identity mismatch, and reader failure", async () => {
    for (const [read, code] of [
      [async () => undefined, "CONTENT_NOT_FOUND"],
      [async () => ({ ...dk1Media, id: "other" }), "CONTENT_ID_MISMATCH"],
      [async () => { throw new ApiError("Unavailable", 500); }, "ONLINE_READ_FAILED"],
    ] as const) {
      expect(await createOnlineMediaCapability(read, () => true).resolve({ contentId: dk1Media.id })).toMatchObject({ state: "FAILED", reason: { code } });
    }
  });

  it.each([undefined, "https://example.test/remote.png", "blob:revoked", "data:image/png;base64,", "data:image/png;base64,?"])("SPACE rejects metadata without local bytes (%s), even when owned", async mediaUrl => {
    const store = await dk1LocalStore({ ...dk1Media, mediaUrl });
    const network = vi.fn().mockRejectedValue(new Error("Must not fetch"));
    vi.stubGlobal("fetch", network);
    const result = await createOfflineMediaCapability(store, () => "NO_ROUTE").resolve({ contentId: dk1Media.id });
    expect(result).toMatchObject({ state: "AWAITING_ROUTE", reason: { code: "MEDIA_NOT_LOCAL" } });
    expect(result).not.toHaveProperty("data");
    expect(network).not.toHaveBeenCalled();
  });

  it("SPACE does not fall through to APP for a local miss even with internet", async () => {
    const onlineRead = vi.fn(async () => dk1Media);
    const media = createDualKernelMedia(new MemoryLastValidStore<MediaItem>(), { onlineRead, connected: () => true });
    expect(await media("SPACE").resolve({ contentId: dk1Media.id })).toMatchObject({ state: "ONLINE_REQUIRED", transport: "INTERNET" });
    expect(onlineRead).not.toHaveBeenCalled();
  });

  it("SPACE rejects corrupt identity and reports storage failure", async () => {
    const store = await dk1LocalStore();
    await store.save("wrong-key", { version: 1, updatedAt: "2026-01-01T00:00:00Z", value: dk1Media });
    expect(await createOfflineMediaCapability(store, () => "NO_ROUTE").resolve({ contentId: "wrong-key" })).toMatchObject({ state: "FAILED", reason: { code: "INVALID_LOCAL_PROJECTION" } });
    vi.spyOn(store, "load").mockRejectedValue(new Error("Storage unavailable"));
    expect(await createOfflineMediaCapability(store, () => "NO_ROUTE").resolve({ contentId: dk1Media.id })).toMatchObject({ state: "FAILED", reason: { code: "LOCAL_STORE_UNAVAILABLE" } });
  });
});
