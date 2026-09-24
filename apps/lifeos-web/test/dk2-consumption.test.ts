import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContinuityCheckpoint, SavedResource } from "@lifeos/shared";
import type { MediaItem } from "../src/lib/personalCatalog";
import { TestDatabase } from "./fixtures/dk2MemoryDatabase";
import { appUser, audioBytes, checkpoint, grants, media, NOW, provider, reference, saved, scope, seedDirectory, spaceUser } from "./fixtures/dk2Fixtures";
import { SpaceDirectory } from "../src/lib/space-consumption/directory";
import { LocalResources, SavedResources } from "../src/lib/space-consumption/resources";
import { ContinuityStore } from "../src/lib/space-consumption/continuity";
import { spaceMediaCapability } from "../src/lib/space-consumption/consumption";
import { resourceKey, validCheckpoint, validSaved } from "../src/lib/space-consumption/validation";
import { createOnlineMediaCapability } from "../src/lib/onlineKernel";

beforeEach(() => { vi.stubGlobal("crypto", webcrypto); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("DK2 entitlement and domain-neutral discovery", () => {
  it("A-D: APP-only user and business remain valid as Apps without Space rights", async () => {
    const directory = await seedDirectory(new TestDatabase());
    expect((await directory.enter("APP", "space:app-only", appUser, "INTERNET")).state).toBe("COMPLETED_LOCAL");
    const online = createOnlineMediaCapability(async () => media, () => true);
    expect((await online.resolve({ contentId: media.id })).state).toBe("COMPLETED_SYNCED");
    expect(await directory.enter("SPACE", "space:app-only", spaceUser, "NO_ROUTE")).toMatchObject({ state: "DENIED", reason: { code: "SPACE_DISTRIBUTION_REQUIRED" } });
    expect(await directory.enter("SPACE", "space:creator", appUser, "NO_ROUTE")).toMatchObject({ state: "DENIED", reason: { code: "SPACE_ACCESS_REQUIRED" } });
  });
  it("B,E,H: discovers hotel metadata and enters its canonical runtime bootstrap", async () => {
    const directory = await seedDirectory(new TestDatabase());
    const hotels = await directory.search("hotel");
    expect(hotels.data?.map(p => p.spaceId)).toEqual(["space:hotel"]);
    const entry = await directory.enter("SPACE", hotels.data![0].spaceId, spaceUser, "NO_ROUTE");
    expect(entry).toMatchObject({ state: "COMPLETED_LOCAL", data: { spaceId: "space:hotel", consumptionOnly: true, runtime: { currentSpaceId: "space:hotel" } } });
    expect((await directory.enter("APP", "space:hotel", spaceUser, "INTERNET")).state).toBe("COMPLETED_LOCAL");
  });
  it("D,F,G: excludes app-only, unlisted, private, relationship-only and no-discovery providers", async () => {
    const directory = await seedDirectory(new TestDatabase());
    expect((await directory.search("")).data?.map(p => p.spaceId)).toEqual(["space:creator", "space:hotel"]);
    expect((await directory.enter("SPACE", "space:store", spaceUser, "NO_ROUTE")).state).toBe("COMPLETED_LOCAL");
    for (const id of ["private-business", "relationship"]) expect((await directory.enter("SPACE", `space:${id}`, spaceUser, "NO_ROUTE")).state).toBe("DENIED");
    expect((await directory.enter("SPACE", "space:no-discovery", spaceUser, "NO_ROUTE")).state).toBe("COMPLETED_LOCAL");
  });
  it("fails closed for expired, missing or mismatched entitlement projections", async () => {
    const db = new TestDatabase(); await seedDirectory(db);
    for (const entitlement of [undefined, { ...grants[0], validUntil: "2020-01-01" }, { ...grants[0], productId: "other" }]) {
      const d = new SpaceDirectory(db, () => entitlement, () => NOW);
      expect((await d.enter("SPACE", "space:creator", spaceUser, "NO_ROUTE")).state).toBe("DENIED");
    }
    const d = await seedDirectory(db);
    expect((await d.enter("SPACE", "space:creator", { ...spaceUser, validUntil: "invalid" }, "NO_ROUTE")).state).toBe("DENIED");
  });
  it("T: public consumption requires no identity and grants no owner/admin/financial authority", async () => {
    const d = await seedDirectory(new TestDatabase());
    await d.put({ ...provider("creator"), access: "PUBLIC" });
    const result = await d.enter("SPACE", "space:creator", { ...appUser, appAccess: false }, "NO_ROUTE");
    expect(result.state).toBe("COMPLETED_LOCAL");
    for (const key of ["owner", "admin", "authority", "financialAuthority", "trustId"]) expect(result.data).not.toHaveProperty(key);
    expect(result.data?.consumptionOnly).toBe(true);
  });
  it("keeps publication, app distribution and Space discovery independent", async () => {
    const db = new TestDatabase(); await seedDirectory(db);
    const d = new SpaceDirectory(db, id => { const grant = grants.find(g => g.providerId === id); return grant && { ...grant, appDistribution: false, spacePublish: false }; }, () => NOW);
    expect((await d.search("hotel")).data).toHaveLength(1);
    expect((await d.enter("SPACE", "space:hotel", spaceUser, "NO_ROUTE")).state).toBe("COMPLETED_LOCAL");
    expect((await d.enter("APP", "space:hotel", spaceUser, "INTERNET")).state).toBe("DENIED");
  });
  it("rejects stale/corrupt/unsupported providers and unavailable local bootstrap", async () => {
    const db = new TestDatabase(); const d = await seedDirectory(db);
    await d.put({ ...provider("hotel"), validUntil: "2020-01-01" });
    expect((await d.search("hotel")).data).toEqual([]);
    expect((await d.resolve("space:hotel")).reason?.code).toBe("STALE_PROVIDER_DESCRIPTOR");
    await db.write([{ store: "providers", key: "space:hotel", value: { ...provider("hotel"), schemaVersion: 9 } }]);
    expect((await d.resolve("space:hotel")).reason?.code).toBe("INVALID_PROVIDER_DESCRIPTOR");
    await d.put({ ...provider("hotel"), bootstrap: undefined });
    expect((await d.enter("SPACE", "space:hotel", spaceUser, "NO_ROUTE")).state).toBe("AWAITING_ROUTE");
  });
});

describe("DK2 Saved and local availability are independent", () => {
  it("I,J: saves valid metadata without downloading or claiming local bytes", async () => {
    const db = new TestDatabase(); const savedResources = new SavedResources(db); const local = new LocalResources(db, () => NOW);
    expect((await savedResources.save(saved)).state).toBe("COMPLETED_LOCAL");
    expect((await new SavedResources(db).list(scope)).data?.items).toEqual([saved]);
    expect((await local.inspect(reference)).state).toBe("NOT_PRESENT");
    expect((await db.entries("assets"))).toEqual([]);
  });
  it("K,L: local unsaved media resolves through frozen DK1 with NO_ROUTE and zero fetches", async () => {
    const db = new TestDatabase(); const local = new LocalResources(db, () => NOW); const d = await seedDirectory(db);
    const fetch = vi.fn().mockRejectedValue(new Error("Network disabled")); vi.stubGlobal("fetch", fetch);
    expect((await local.preloadMedia(scope, media, audioBytes(), "audio/wav")).state).toBe("COMPLETED_LOCAL");
    expect((await new SavedResources(db).list(scope)).data?.items).toEqual([]);
    expect((await local.inspect(reference)).state).toBe("AVAILABLE_LOCAL");
    const result = await spaceMediaCapability(d, local, scope, () => spaceUser, () => "NO_ROUTE").resolve({ contentId: media.id });
    expect(result).toMatchObject({ state: "COMPLETED_LOCAL", transport: "NO_ROUTE", data: { contentId: media.id, availability: "AVAILABLE_LOCAL" } });
    expect(result.data?.metadata.mediaUrl).toMatch(/^data:audio\/wav;base64,/);
    expect(fetch).not.toHaveBeenCalled();
    expect((await spaceMediaCapability(d, local, scope, () => appUser, () => "NO_ROUTE").resolve({ contentId: media.id })).state).toBe("DENIED");
  });
  it("M: missing media is truthful with and without internet; no implicit download", async () => {
    const local = new LocalResources(new TestDatabase());
    for (const route of ["NO_ROUTE", "INTERNET"] as const) {
      const result = await local.capability(scope, () => route).resolve({ contentId: "content:not-synchronized" });
      expect(result.state).toBe(route === "NO_ROUTE" ? "AWAITING_ROUTE" : "ONLINE_REQUIRED");
      expect(result).not.toHaveProperty("data");
    }
  });
  it.each(["missing", "partial", "corrupt", "stale", "wrong-identity", "wrong-version"])("N: detects %s local media instead of returning success", async fault => {
    const db = new TestDatabase(); const local = new LocalResources(db, () => NOW);
    await local.preloadMedia(scope, media, audioBytes(), "audio/wav", 1, fault === "stale" ? "2020-01-01" : undefined);
    const key = resourceKey(reference);
    const asset = await db.get("assets", key) as { resourceKey: string; version: number; media: MediaItem; bytes: ArrayBuffer };
    if (fault === "missing") await db.write([{ store: "assets", key, value: undefined }]);
    if (fault === "partial") await db.write([{ store: "assets", key, value: { ...asset, bytes: asset.bytes.slice(0, 10) } }]);
    if (fault === "corrupt") { new Uint8Array(asset.bytes)[0] ^= 255; }
    if (fault === "wrong-identity") asset.media = { ...media, id: "other" };
    if (fault === "wrong-version") asset.version = 2;
    const inspection = await local.inspect(reference);
    expect(inspection.state).toBe(fault === "missing" ? "NOT_PRESENT" : fault === "partial" ? "PARTIAL" : fault === "stale" ? "STALE" : "CORRUPT");
    const result = await local.capability(scope, () => "NO_ROUTE").resolve({ contentId: media.id });
    expect(result.state).not.toMatch(/^COMPLETED/); expect(result).not.toHaveProperty("data");
  });
  it("isolates corrupt saved rows, unknown resource types and unsupported versions", async () => {
    const db = new TestDatabase(); const resources = new SavedResources(db); await resources.save(saved);
    for (const [key, value] of [["bad", null], ["type", { ...saved, resourceType: "ALIEN" }], ["version", { ...saved, schemaVersion: 2 }]] as const) await db.write([{ store: "saved", key, value }]);
    expect((await resources.list(scope)).data).toEqual({ items: [saved], rejected: 3 });
    expect((await resources.list({ ...scope, subjectRef: "other" })).data?.items).toEqual([]);
    expect(validSaved({ ...saved, metadata: { ...media, id: "other" } })).toBe(false);
  });
  it("supports non-media saved references without playback fields", async () => {
    const db = new TestDatabase(); const ref = { ...reference, resourceType: "BUSINESS" as const, resourceId: "provider:hotel" };
    const business: SavedResource<MediaItem> = { ...saved, ...ref, metadata: { title: "Hotel", reference: "space:hotel" }, availabilityRef: resourceKey(ref) };
    expect((await new SavedResources(db).save(business)).state).toBe("COMPLETED_LOCAL");
    expect(business).not.toHaveProperty("playbackPosition");
  });
});

describe("DK2 continuity", () => {
  it("O-Q: restart and explicit PHONE -> TABLET -> LAPTOP -> TV transfers retain canonical identity", async () => {
    const phoneDb = new TestDatabase(); const phone = new ContinuityStore(phoneDb);
    await phone.write(checkpoint());
    expect((await new ContinuityStore(phoneDb).read(reference)).data?.state).toEqual({ playbackSeconds: 42 });
    const tablet = new ContinuityStore(new TestDatabase());
    const fromPhone = await phone.export(reference);
    expect((await tablet.import(fromPhone.data!, reference)).data?.state).toEqual({ playbackSeconds: 42 });
    expect((await tablet.write(checkpoint(73, 2, "TABLET", "WATCH"))).state).toBe("COMPLETED_LOCAL");
    const transferred = await tablet.export(reference);
    for (const experience of ["CINEMA", "TV"]) {
      const target = new ContinuityStore(new TestDatabase());
      const restored = await target.import(transferred.data!, reference);
      expect(restored.data?.resourceId).toBe(media.id);
      expect(restored.data?.state).toEqual({ playbackSeconds: 73 });
      expect(restored.data?.syncState).toBe("IMPORTED");
      expect((await target.write({ ...checkpoint(73, 3, experience, experience), reconciliation: { baseVersion: 2, correlationId: "fixture:continuity" } })).state).toBe("COMPLETED_LOCAL");
    }
  });
  it("R: deterministic version/base policy rejects stale/equal/concurrent histories", async () => {
    const store = new ContinuityStore(new TestDatabase()); await store.write(checkpoint());
    expect((await store.write(checkpoint())).state).toBe("COMPLETED_LOCAL");
    expect((await store.write(checkpoint(99))).state).toBe("CONFLICT");
    expect((await store.write(checkpoint(99, 3))).state).toBe("CONFLICT");
    expect((await store.write(checkpoint(73, 2))).state).toBe("COMPLETED_LOCAL");
    expect((await store.write(checkpoint())).state).toBe("CONFLICT");
    expect((await store.read(reference)).data?.state).toEqual({ playbackSeconds: 73 });
  });
  it("S: corrupt/unsupported checkpoints and transfer scope mismatch fail safely", async () => {
    const db = new TestDatabase(); const store = new ContinuityStore(db);
    expect((await store.import("{broken", reference)).state).toBe("FAILED");
    for (const value of [{ ...checkpoint(), schemaVersion: 2 }, { ...checkpoint(), resourceType: "ALIEN" }, { ...checkpoint(), state: { playbackSeconds: -1 } }]) {
      expect(validCheckpoint(value)).toBe(false);
      await db.write([{ store: "continuity", key: resourceKey(reference), value }]);
      expect((await store.read(reference)).reason?.code).toBe("CORRUPT_CHECKPOINT");
    }
    const good = JSON.stringify({ schemaVersion: 1, checkpoint: checkpoint() });
    expect((await store.import(good, { ...reference, subjectRef: "another-person" })).state).toBe("DENIED");
  });
  it("allows non-media cursor state without requiring playback position", () => {
    const c: ContinuityCheckpoint = { ...checkpoint(), resourceType: "ARTICLE", state: { cursor: "paragraph:4" } };
    expect(validCheckpoint(c)).toBe(true);
    // @ts-expect-error Non-media resources do not carry playback state.
    const invalid: ContinuityCheckpoint = { ...checkpoint(), resourceType: "FILE", state: { playbackSeconds: 42 } };
    expect(validCheckpoint(invalid)).toBe(false);
  });
  it("does not report local writes as globally synchronized", async () => {
    const db = new TestDatabase();
    expect((await new ContinuityStore(db).write({ ...checkpoint(), syncState: "SYNCED" })).reason?.code).toBe("SYNC_NOT_IMPLEMENTED");
    expect((await new SavedResources(db).save({ ...saved, syncState: "SYNCED" })).reason?.code).toBe("SYNC_NOT_IMPLEMENTED");
  });
});
