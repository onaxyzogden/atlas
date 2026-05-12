/**
 * customModelStore — user-uploaded GLB catalog.
 *
 * Per ADR 2026-05-11 Phase 6. Stores model blobs in IndexedDB and a lean
 * metadata catalog in this Zustand store. On hydration the store rebuilds
 * `URL.createObjectURL` blob URLs from each persisted blob.
 *
 * Why two stores (Zustand + IDB) rather than one persisted store: blobs
 * cannot live in JSON-serialised localStorage, and the catalog needs
 * reactive subscribers (palette + scenegraph layer). Splitting keeps the
 * reactive surface tiny and the blob payloads in their native binary form.
 */

import { create } from 'zustand';

const DB_NAME = 'ogden-custom-models';
const STORE_NAME = 'blobs';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_NAME, 'readwrite');
    t.oncomplete = () => {
      db.close();
      resolve();
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
    t.objectStore(STORE_NAME).put(blob, id);
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_NAME, 'readwrite');
    t.oncomplete = () => {
      db.close();
      resolve();
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
    t.objectStore(STORE_NAME).delete(id);
  });
}

async function idbList(): Promise<{ id: string; blob: Blob }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_NAME, 'readonly');
    const store = t.objectStore(STORE_NAME);
    const out: { id: string; blob: Blob }[] = [];
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const c = cursorReq.result;
      if (c) {
        out.push({ id: String(c.key), blob: c.value as Blob });
        c.continue();
      } else {
        db.close();
        resolve(out);
      }
    };
    cursorReq.onerror = () => {
      db.close();
      reject(cursorReq.error);
    };
  });
}

export interface CustomModelEntry {
  id: string;
  label: string;
  sha256: string;
  sizeBytes: number;
  addedAt: number;
  /** Object-URL pointing at the blob. Regenerated on every hydrate. */
  modelUrl: string;
}

interface CustomModelState {
  hydrated: boolean;
  entries: Record<string, CustomModelEntry>;
  hydrate: () => Promise<void>;
  add: (label: string, blob: Blob, sha256: string) => Promise<CustomModelEntry>;
  remove: (id: string) => Promise<void>;
}

const CATALOG_KEY = 'ogden:custom-models:catalog';

interface CatalogRow {
  id: string;
  label: string;
  sha256: string;
  sizeBytes: number;
  addedAt: number;
}

function readCatalog(): CatalogRow[] {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CatalogRow[]) : [];
  } catch {
    return [];
  }
}

function writeCatalog(rows: CatalogRow[]): void {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(rows));
}

export const useCustomModelStore = create<CustomModelState>((set, get) => ({
  hydrated: false,
  entries: {},

  async hydrate() {
    if (get().hydrated) return;
    const catalog = readCatalog();
    const blobs = await idbList().catch(() => []);
    const blobMap = new Map(blobs.map((b) => [b.id, b.blob]));
    const entries: Record<string, CustomModelEntry> = {};
    for (const row of catalog) {
      const blob = blobMap.get(row.id);
      if (!blob) continue;
      entries[row.id] = {
        id: row.id,
        label: row.label,
        sha256: row.sha256,
        sizeBytes: row.sizeBytes,
        addedAt: row.addedAt,
        modelUrl: URL.createObjectURL(blob),
      };
    }
    set({ entries, hydrated: true });
  },

  async add(label, blob, sha256) {
    const id =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `cm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await idbPut(id, blob);
    const entry: CustomModelEntry = {
      id,
      label,
      sha256,
      sizeBytes: blob.size,
      addedAt: Date.now(),
      modelUrl: URL.createObjectURL(blob),
    };
    const next = { ...get().entries, [id]: entry };
    const catalog: CatalogRow[] = Object.values(next).map((e) => ({
      id: e.id,
      label: e.label,
      sha256: e.sha256,
      sizeBytes: e.sizeBytes,
      addedAt: e.addedAt,
    }));
    writeCatalog(catalog);
    set({ entries: next });
    return entry;
  },

  async remove(id) {
    const cur = get().entries[id];
    if (cur) URL.revokeObjectURL(cur.modelUrl);
    await idbDelete(id);
    const next = { ...get().entries };
    delete next[id];
    const catalog: CatalogRow[] = Object.values(next).map((e) => ({
      id: e.id,
      label: e.label,
      sha256: e.sha256,
      sizeBytes: e.sizeBytes,
      addedAt: e.addedAt,
    }));
    writeCatalog(catalog);
    set({ entries: next });
  },
}));

/** Resolve a model URL by id without subscribing to React. */
export function getCustomModelUrl(id: string): string | undefined {
  return useCustomModelStore.getState().entries[id]?.modelUrl;
}
