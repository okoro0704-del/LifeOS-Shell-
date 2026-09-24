export const LOCAL_STORES = ["providers", "saved", "availability", "assets", "continuity"] as const;
export type LocalStore = (typeof LOCAL_STORES)[number];
export type LocalWrite = { store: LocalStore; key: string; value: unknown };
export interface SpaceLocalDatabase {
  get(store: LocalStore, key: string): Promise<unknown>;
  entries(store: LocalStore): Promise<Array<{ key: string; value: unknown }>>;
  write(entries: LocalWrite[]): Promise<void>;
  /** Synchronous decision inside one transaction, for deterministic checkpoint arbitration. */
  update(store: LocalStore, key: string, decide: (current: unknown) => unknown): Promise<void>;
  close(): void;
}

/** Device-local state only. No remote database, account, identity or network implementation. */
export async function openSpaceLocalDatabase(name = "lifeos-space-consumption-v1"): Promise<SpaceLocalDatabase> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => { for (const store of LOCAL_STORES) if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("LOCAL_DATABASE_BLOCKED"));
  });
  db.onversionchange = () => db.close();
  function transaction<T>(stores: LocalStore[], mode: IDBTransactionMode, run: (tx: IDBTransaction, done: (value: T) => void) => void): Promise<T> {
    return new Promise((resolve, reject) => {
      let tx: IDBTransaction | undefined;
      let value: T;
      try {
        tx = db.transaction(stores, mode);
        tx.oncomplete = () => resolve(value);
        tx.onerror = () => reject(tx?.error ?? new Error("LOCAL_DATABASE_ERROR"));
        tx.onabort = () => reject(tx?.error ?? new Error("LOCAL_DATABASE_ABORTED"));
        run(tx, next => { value = next; });
      } catch (error) { try { tx?.abort(); } catch { /* Already completed. */ } reject(error); }
    });
  }
  return {
    get: (store, key) => transaction([store], "readonly", (tx, done) => {
      const request = tx.objectStore(store).get(key);
      request.onsuccess = () => done(request.result);
    }),
    entries: store => transaction([store], "readonly", (tx, done) => {
      const values: Array<{ key: string; value: unknown }> = [];
      const request = tx.objectStore(store).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) { done(values); return; }
        values.push({ key: String(cursor.key), value: cursor.value });
        cursor.continue();
      };
    }),
    write: entries => entries.length === 0 ? Promise.resolve() : transaction([...new Set(entries.map(e => e.store))], "readwrite", (tx, done) => {
      for (const entry of entries) tx.objectStore(entry.store).put(entry.value, entry.key);
      done(undefined);
    }),
    update: (store, key, decide) => transaction([store], "readwrite", (tx, done) => {
      const objectStore = tx.objectStore(store);
      const request = objectStore.get(key);
      request.onsuccess = () => {
        try {
          const next = decide(request.result);
          if (next !== undefined) objectStore.put(next, key);
          done(undefined);
        } catch { tx.abort(); }
      };
    }),
    close: () => db.close(),
  };
}
