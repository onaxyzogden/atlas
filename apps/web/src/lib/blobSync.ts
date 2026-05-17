/**
 * blobSync — client side of the generic versioned-blob transport
 * (Phase 2 of Full syncService Coverage, the durable P0-1 fix).
 *
 * Every store classified `versioned-blob` in syncManifest.ts is pushed
 * through here as an opaque payload keyed by (projectServerId, storeKey).
 * The only domain logic this module owns is the conflict contract:
 *
 *  - On success the server returns the bumped `rev`; the caller persists it
 *    as the new `baseRev` for the next push.
 *  - On `409` the write was stale. We do NOT clobber and we do NOT swallow:
 *    the authoritative `{ serverRev, serverPayload }` is returned so the
 *    caller (Phase 4 conflict surface) can reconcile visibly.
 *  - Any other failure re-throws so the IndexedDB retry queue backs off.
 */

import { api } from './apiClient.js';
import type { UpsertProjectStateInput } from '@ogden/shared';

/** Stable queue/local key for one project-scoped store slice. */
export function blobLocalId(storeKey: string, projectId: string): string {
  return `${storeKey}:${projectId}`;
}

/** Build the exact server upsert envelope (pinned `envelopeSchema: 1`). */
export function buildBlobEnvelope(
  schemaVersion: number,
  baseRev: number,
  payload: unknown,
): UpsertProjectStateInput {
  return { envelopeSchema: 1, schemaVersion, baseRev, payload };
}

export type BlobPushResult =
  | { status: 'ok'; rev: number }
  | { status: 'conflict'; serverRev: number | null; serverPayload: unknown };

/**
 * Push one store slice. Resolves to `ok` (with the new rev) or `conflict`
 * (with authoritative server state). Re-throws transport errors.
 */
export async function pushProjectStateBlob(
  projectServerId: string,
  storeKey: string,
  envelope: UpsertProjectStateInput,
): Promise<BlobPushResult> {
  try {
    const { data } = await api.projectState.upsert(projectServerId, storeKey, envelope);
    return { status: 'ok', rev: data.rev };
  } catch (err) {
    // Duck-type the conflict contract on `status`, not class identity:
    // the 409 status is the contract, and module mocks can split the
    // ApiError class identity so `instanceof` is unreliable under test.
    if (
      typeof err === 'object' &&
      err !== null &&
      (err as { status?: unknown }).status === 409
    ) {
      const d = ((err as { details?: unknown }).details ?? {}) as {
        serverRev?: number | null;
        serverPayload?: unknown;
      };
      return {
        status: 'conflict',
        serverRev: d.serverRev ?? null,
        serverPayload: d.serverPayload ?? null,
      };
    }
    throw err;
  }
}
