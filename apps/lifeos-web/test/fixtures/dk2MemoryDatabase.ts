import type { LocalStore, LocalWrite, SpaceLocalDatabase } from "../../src/lib/space-consumption/database";
/** Unit-test double only. Durable persistence is tested against real Chromium IndexedDB. */
export class TestDatabase implements SpaceLocalDatabase {
  private values = new Map<string, unknown>();
  private key(store: LocalStore, key: string) { return JSON.stringify([store, key]); }
  async get(store: LocalStore, key: string) { return this.values.get(this.key(store, key)); }
  async entries(store: LocalStore) {
    return [...this.values].flatMap(([key, value]) => { const [bucket, id] = JSON.parse(key); return bucket === store ? [{ key: id as string, value }] : []; });
  }
  async write(entries: LocalWrite[]) { for (const e of entries) this.values.set(this.key(e.store, e.key), e.value); }
  async update(store: LocalStore, key: string, decide: (current: unknown) => unknown) {
    const next = decide(this.values.get(this.key(store, key)));
    if (next !== undefined) this.values.set(this.key(store, key), next);
  }
  close() {}
}
