/**
 * Local-first blob store for field-action proof photos and documents.
 *
 * Photos and documents captured in the field are stored as Blobs in a
 * dedicated IndexedDB store. The proof item's `fileUri` is rewritten from
 * the local `idb://{actionId}/{slotId}` URI to a canonical `storage://...`
 * URI by the sync queue once the upload completes (see
 * `executeQueuedOp` `case 'proof_photo_upload'` in syncService.ts).
 *
 * This makes the Act Command Centre fully offline: captures land in IDB
 * immediately, render from `URL.createObjectURL(blob)` for thumbnails,
 * and drain through the sync queue when connectivity returns.
 *
 * Raw IndexedDB (same pattern as syncQueue.ts / geodataCache.ts); the
 * `idb` library is not in apps/web dependencies and Slice 3.4 should not
 * add one for a 50-line wrapper.
 */

const DB_NAME = 'ogden-proof-photos';
const STORE_NAME = 'proofPhotos';
const DB_VERSION = 1;

export const PROOF_BLOB_PROTOCOL = 'idb://';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
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

function blobKey(actionId: string, slotId: string): string {
  return `${actionId}:${slotId}`;
}

export function blobUri(actionId: string, slotId: string): string {
  return `${PROOF_BLOB_PROTOCOL}${actionId}/${slotId}`;
}

export function isBlobUri(uri: string | undefined | null): boolean {
  return typeof uri === 'string' && uri.startsWith(PROOF_BLOB_PROTOCOL);
}

export function parseBlobUri(
  uri: string,
): { actionId: string; slotId: string } | null {
  if (!isBlobUri(uri)) return null;
  const rest = uri.slice(PROOF_BLOB_PROTOCOL.length);
  const slash = rest.indexOf('/');
  if (slash < 0) return null;
  const actionId = rest.slice(0, slash);
  const slotId = rest.slice(slash + 1);
  if (!actionId || !slotId) return null;
  return { actionId, slotId };
}

export const proofPhotoStore = {
  async putBlob(actionId: string, slotId: string, blob: Blob): Promise<string> {
    const store = await tx('readwrite');
    const key = blobKey(actionId, slotId);
    return new Promise((resolve, reject) => {
      const req = store.put(blob, key);
      req.onsuccess = () => resolve(blobUri(actionId, slotId));
      req.onerror = () => reject(req.error);
    });
  },

  async getBlob(actionId: string, slotId: string): Promise<Blob | undefined> {
    const store = await tx('readonly');
    const key = blobKey(actionId, slotId);
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as Blob | undefined);
      req.onerror = () => reject(req.error);
    });
  },

  async getBlobUrl(actionId: string, slotId: string): Promise<string | null> {
    const blob = await this.getBlob(actionId, slotId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  },

  async deleteBlob(actionId: string, slotId: string): Promise<void> {
    const store = await tx('readwrite');
    const key = blobKey(actionId, slotId);
    return new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
};
