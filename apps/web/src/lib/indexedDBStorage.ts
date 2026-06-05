/**
 * indexedDBStorage — a zustand `persist` storage backend on IndexedDB.
 *
 * Why this exists: every project-scoped `persist` store (see syncManifest's
 * SYNCED_STORES) historically defaulted to `localStorage`. For this product the
 * field device is offline for whole days at a time, accumulating many Act
 * records plus cached map/geodata — and the per-origin `localStorage` budget
 * (~5–10 MB) silently starts failing writes / evicting state once it fills. The
 * offline WRITE queue already lives in IndexedDB (see syncQueue.ts); this moves
 * the cached DOMAIN STATE to the same durable, much-larger backend.
 *
 * Two consequences callers must respect:
 *
 *  1. Rehydration becomes ASYNC. With sync `localStorage`, zustand hydrates a
 *     store the instant it is created, so code that read `getState()` right
 *     after store creation saw hydrated data. IndexedDB reads are promises, so
 *     hydration now resolves on a later microtask. Any post-rehydrate side
 *     effect (e.g. a one-time migration) must run AFTER hydration settles — use
 *     the `onHydrated` hook on `rehydrateWithLogging`, not a bare synchronous
 *     `getState()` call. React components are unaffected (the hook re-renders on
 *     hydration); only non-reactive boot-time reads need care.
 *
 *  2. Existing users have data under the old `localStorage` keys. `getItem`
 *     performs a LAZY one-time migration: on the first read of a key that is
 *     absent from IndexedDB, it falls back to `localStorage`, writes that value
 *     through to IndexedDB, and returns it. No migration script, no data loss.
 *     The `localStorage` read-fallback is kept for one release, then removed.
 *
 * The raw IndexedDB access mirrors syncQueue.ts / geodataCache.ts so the three
 * KV-on-IDB modules stay structurally identical. Per repo convention raw-IDB
 * behaviour is verified in-browser (DevTools → Application → IndexedDB); pure
 * decision logic is the unit-tested part.
 */

import { createJSONStorage, type StateStorage } from 'zustand/middleware';

const DB_NAME = 'ogden-state';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

/**
 * Is a usable IndexedDB present? Node (the default vitest environment) and some
 * locked-down/SSR contexts have none. When absent we transparently fall back to
 * a `localStorage`-backed StateStorage so stores still work (just without the
 * larger IDB budget) instead of throwing at boot.
 */
function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

/** Is `localStorage` reachable (for the lazy migration fallback + degraded mode)? */
function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    // Accessing localStorage can throw under strict privacy settings.
    return false;
  }
}

// ─── IndexedDB helpers (same pattern as syncQueue.ts / geodataCache.ts) ───────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Values are persist JSON strings keyed by the persist `name`; the key
        // is passed explicitly to put/get, so no keyPath/autoIncrement.
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, mode);
  transaction.oncomplete = () => db.close();
  transaction.onerror = () => db.close();
  return transaction.objectStore(STORE_NAME);
}

function idbGet(key: string): Promise<string | null> {
  return tx('readonly').then(
    (store) =>
      new Promise<string | null>((resolve, reject) => {
        const req = store.get(key);
        req.onsuccess = () => {
          const v = req.result;
          resolve(typeof v === 'string' ? v : null);
        };
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbSet(key: string, value: string): Promise<void> {
  return tx('readwrite').then(
    (store) =>
      new Promise<void>((resolve, reject) => {
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbDelete(key: string): Promise<void> {
  return tx('readwrite').then(
    (store) =>
      new Promise<void>((resolve, reject) => {
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}

// ─── StateStorage backed by IndexedDB, with lazy localStorage migration ───────

/**
 * The IndexedDB-backed `StateStorage` (the string-in/string-out shape zustand's
 * `createJSONStorage` wraps). Exported for direct use/testing; most callers want
 * `idbPersistStorage` below.
 */
export const indexedDBStateStorage: StateStorage = {
  async getItem(name: string): Promise<string | null> {
    if (!hasIndexedDB()) {
      // Degraded mode: behave like the old default so the app still runs.
      return hasLocalStorage() ? localStorage.getItem(name) : null;
    }

    const fromIdb = await idbGet(name);
    if (fromIdb !== null) return fromIdb;

    // Lazy one-time migration: pull a pre-existing localStorage value into IDB
    // on first read so existing users keep their data with no migration script.
    if (hasLocalStorage()) {
      const legacy = localStorage.getItem(name);
      if (legacy !== null) {
        try {
          await idbSet(name, legacy);
        } catch {
          // If the write-through fails we still return the value — the next
          // read retries the migration. Never lose data to a transient IDB error.
        }
        return legacy;
      }
    }
    return null;
  },

  async setItem(name: string, value: string): Promise<void> {
    if (!hasIndexedDB()) {
      if (hasLocalStorage()) localStorage.setItem(name, value);
      return;
    }
    await idbSet(name, value);
  },

  async removeItem(name: string): Promise<void> {
    if (!hasIndexedDB()) {
      if (hasLocalStorage()) localStorage.removeItem(name);
      return;
    }
    await idbDelete(name);
    // Also clear any lingering legacy copy so a removed store cannot resurrect
    // from localStorage on the next migration read.
    if (hasLocalStorage()) {
      try {
        localStorage.removeItem(name);
      } catch {
        /* best-effort */
      }
    }
  },
};

/**
 * Drop-in `persist` storage option. Each synced store adds
 * `storage: idbPersistStorage` to its persist config to move off localStorage.
 * A shared singleton keeps every store pointed at one IndexedDB database.
 */
export const idbPersistStorage = createJSONStorage(() => indexedDBStateStorage);
