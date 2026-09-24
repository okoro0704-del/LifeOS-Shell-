import { openSpaceLocalDatabase } from "../../src/lib/space-consumption/database";
import { LocalResources, SavedResources } from "../../src/lib/space-consumption/resources";
import { ContinuityStore } from "../../src/lib/space-consumption/continuity";
import { spaceMediaCapability } from "../../src/lib/space-consumption/consumption";
import { SpaceDirectory } from "../../src/lib/space-consumption/directory";
import { resourceKey } from "../../src/lib/space-consumption/validation";
import { appUser, audioBytes, checkpoint, grants, media, NOW, reference, saved, scope, seedDirectory, spaceUser } from "./dk2Fixtures";

if (!import.meta.env.DEV) throw new Error("DK2 proof is development-only");
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const databaseName = "lifeos-dk2-browser-proof";
function directory(db: Awaited<ReturnType<typeof openSpaceLocalDatabase>>) {
  return new SpaceDirectory(db, id => grants.find(g => g.providerId === id), () => NOW);
}
async function play(url: string, position: number) {
  const player = document.createElement("audio");
  player.muted = true;
  document.body.appendChild(player);
  try {
    await new Promise<void>((resolve, reject) => {
      player.onloadedmetadata = () => resolve(); player.onerror = () => reject(new Error("Local audio failed to decode")); player.src = url;
    });
    check(player.duration === 80, "Persisted WAV must decode to 80 seconds");
    await player.play(); player.pause();
    await new Promise<void>(resolve => { player.onseeked = () => resolve(); player.currentTime = position; });
    check(Math.abs(player.currentTime - position) < 0.1, "Playback position must restore");
    return player.currentTime;
  } finally { player.pause(); player.removeAttribute("src"); player.load(); player.remove(); }
}

export async function seedAndPlay() {
  const db = await openSpaceLocalDatabase(databaseName);
  try {
    const d = await seedDirectory(db);
    check((await d.enter("APP", "space:app-only", appUser, "INTERNET")).state === "COMPLETED_LOCAL", "APP-only product access");
    check((await d.enter("SPACE", "space:hotel", appUser, "NO_ROUTE")).state === "DENIED", "Space entitlement denial");
    const discovered = await d.search("hotel");
    check(discovered.data?.[0].spaceId === "space:hotel", "Hotel discovery");
    check((await d.enter("SPACE", "space:hotel", spaceUser, "NO_ROUTE")).data?.runtime?.currentSpaceId === "space:hotel", "Hotel bootstrap");
    const local = new LocalResources(db, () => NOW);
    const library = new SavedResources(db);
    check((await library.save(saved)).state === "COMPLETED_LOCAL", "Saved metadata persisted");
    check((await local.inspect(reference)).state === "NOT_PRESENT", "Saved does not mean downloaded");
    check((await local.preloadMedia(scope, media, audioBytes(), "audio/wav")).state === "COMPLETED_LOCAL", "Binary persisted");
    const resolved = await spaceMediaCapability(d, local, scope, () => spaceUser, () => "NO_ROUTE").resolve({ contentId: media.id });
    check(resolved.state === "COMPLETED_LOCAL", "Local read");
    const position = await play(resolved.data!.metadata.mediaUrl!, 42);
    check((await new ContinuityStore(db).write(checkpoint(position))).state === "COMPLETED_LOCAL", "Checkpoint persisted");
    return { checks: ["APP-only access", "Space denial", "hotel discovery/bootstrap", "saved is not downloaded", "real PCM playback", "checkpoint at 42"], contentId: media.id, position };
  } finally { db.close(); }
}

export async function restoreOffline() {
  check(navigator.onLine === false, "Browser must actually be offline");
  let calls = 0;
  const originalFetch = window.fetch;
  const originalOpen = XMLHttpRequest.prototype.open;
  window.fetch = async () => { calls++; throw new Error("Network disabled"); };
  XMLHttpRequest.prototype.open = function () { calls++; throw new Error("Network disabled"); };
  let db = await openSpaceLocalDatabase(databaseName);
  try {
    const library = await new SavedResources(db).list(scope);
    check(library.data?.items[0].resourceId === media.id, "Saved metadata survived browser restart");
    check((await directory(db).search("hotel")).data?.length === 1, "Provider state survived restart");
    const restored = await new ContinuityStore(db).read(reference);
    check(restored.data?.state && "playbackSeconds" in restored.data.state && restored.data.state.playbackSeconds === 42, "Checkpoint survived restart");
    const local = new LocalResources(db, () => NOW);
    check((await local.inspect(reference)).state === "AVAILABLE_LOCAL", "Hash/length/identity verified after restart");
    const capability = spaceMediaCapability(directory(db), local, scope, () => spaceUser, () => "NO_ROUTE");
    const result = await capability.resolve({ contentId: media.id });
    check(result.state === "COMPLETED_LOCAL", "Offline capability usable");
    await play(result.data!.metadata.mediaUrl!, 42);
    check((await capability.resolve({ contentId: "content:not-synchronized" })).state === "AWAITING_ROUTE", "Missing content truthful");
    // Close and recreate runtime/database handles while the browser stays offline.
    db.close(); db = await openSpaceLocalDatabase(databaseName);
    check((await new ContinuityStore(db).read(reference)).data?.resourceId === media.id, "NO_ROUTE runtime restart");
    check(calls === 0, "Local consumption made network calls");
    return { checks: ["browser restart saved metadata", "browser restart provider directory", "browser restart continuity", "offline real PCM playback at 42", "missing media awaits route", "NO_ROUTE runtime restart", "zero network calls"], calls, contentId: media.id, position: 42 };
  } finally { db.close(); window.fetch = originalFetch; XMLHttpRequest.prototype.open = originalOpen; }
}

export async function transferAndRecovery() {
  const phone = await openSpaceLocalDatabase(databaseName);
  const tablet = await openSpaceLocalDatabase(`${databaseName}-tablet`);
  const laptop = await openSpaceLocalDatabase(`${databaseName}-laptop`);
  try {
    const fromPhone = await new ContinuityStore(phone).export(reference);
    const tabletStore = new ContinuityStore(tablet);
    check((await tabletStore.import(fromPhone.data!, reference)).data?.resourceId === media.id, "PHONE -> TABLET identity");
    check((await tabletStore.write(checkpoint(73, 2, "TABLET", "WATCH"))).state === "COMPLETED_LOCAL", "TABLET at 73");
    const fromTablet = await tabletStore.export(reference);
    const laptopStore = new ContinuityStore(laptop);
    const imported = await laptopStore.import(fromTablet.data!, reference);
    check(imported.data?.state && "playbackSeconds" in imported.data.state && imported.data.state.playbackSeconds === 73, "LAPTOP restores 73");
    const race = await Promise.all([laptopStore.write(checkpoint(74, 3, "LAPTOP", "CINEMA")), laptopStore.write(checkpoint(75, 3, "TV", "TV"))]);
    check(race.filter(r => r.state === "COMPLETED_LOCAL").length === 1 && race.filter(r => r.state === "CONFLICT").length === 1, "Atomic version arbitration");
    await laptop.write([{ store: "saved", key: "corrupt-fixture", value: { schemaVersion: 99 } }]);
    check((await new SavedResources(laptop).list(scope)).data?.rejected === 1, "Corrupt saved row isolated");
    await laptop.write([{ store: "continuity", key: resourceKey(reference), value: "corrupt" }]);
    check((await laptopStore.read(reference)).reason?.code === "CORRUPT_CHECKPOINT", "Corrupt checkpoint safe");
    const key = resourceKey(reference);
    const asset = await phone.get("assets", key) as { bytes: ArrayBuffer };
    new Uint8Array(asset.bytes)[0] ^= 255;
    await phone.write([{ store: "assets", key, value: asset }]);
    const corrupt = await new LocalResources(phone, () => NOW).capability(scope, () => "NO_ROUTE").resolve({ contentId: media.id });
    check(corrupt.state === "FAILED" && corrupt.reason?.code === "LOCAL_MEDIA_CORRUPT", "Corrupt bytes cannot play");
    // Structured-clone failure must abort the entire write, not commit its first row.
    let aborted = false;
    try { await laptop.write([{ store: "saved", key: "atomic-test", value: saved }, { store: "assets", key: "uncloneable", value: () => {} }]); } catch { aborted = true; }
    check(aborted && await laptop.get("saved", "atomic-test") === undefined, "Atomic rollback");
    laptop.close();
    check((await new SavedResources(laptop).save(saved)).state === "FAILED", "Closed storage is truthful failure");
    return { checks: ["PHONE FEED 42 -> TABLET WATCH 42", "TABLET 73 -> LAPTOP CINEMA 73", "atomic concurrent checkpoint conflict", "corrupt saved row isolation", "corrupt checkpoint rejected", "corrupt media rejected", "atomic storage rollback", "closed storage failure"], contentId: media.id, position: 73, transport: "EXPLICIT_TEST_TRANSFER" };
  } finally { phone.close(); tablet.close(); laptop.close(); }
}
