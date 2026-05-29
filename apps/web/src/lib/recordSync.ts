/**
 * recordSync — client side of the typed per-record Act transport
 * (ADR 7 Phase 1 — wiki/decisions/2026-05-29-atlas-spec-act-map-first-surface.md).
 *
 * Where blobSync pushes a whole store slice as ONE opaque blob keyed by
 * (projectServerId, storeKey), recordSync pushes ONE typed record keyed by
 * (projectServerId, storeKey, recordId). Each record carries its own monotonic
 * `rev` + denormalised tier hints (observedAt / sourceType / cycleId /
 * taskType), so the 5-tier queue (Phase 2) can tier by semantics instead of
 * erasing them inside a per-project blob.
 *
 * The conflict contract is identical to blobSync, per record:
 *  - On success the server returns the bumped `rev`; the caller persists it
 *    as the new per-record `baseRev` for the next push.
 *  - On `409` the write was stale. We do NOT clobber and we do NOT swallow:
 *    the authoritative `{ serverRev, serverPayload }` is returned so the caller
 *    surfaces the conflict (the never-clobber envelope).
 *  - Any other failure re-throws so the IndexedDB retry queue backs off.
 */

import { api } from './apiClient.js';
import type { UpsertSyncedRecordInput } from '@ogden/shared';
import type { SyncedRecordMeta } from './syncManifest.js';

/**
 * Stable queue/local key for ONE record. Three-part (vs blobLocalId's two) so
 * each record coalesces independently in the queue and tracks its own baseRev.
 * `recordId` is the array element's `id`, or the keyed-map key (the domainId
 * for observe-cycles).
 */
export function recordLocalId(
  storeKey: string,
  projectId: string,
  recordId: string,
): string {
  return `${storeKey}:${projectId}:${recordId}`;
}

/**
 * Build the exact server upsert envelope (pinned `envelopeSchema: 1`). The
 * denormalised tier hints are sent explicitly as `null` when absent so the
 * server clears a previously-set column rather than leaving a stale value.
 */
export function buildRecordEnvelope(
  schemaVersion: number,
  baseRev: number,
  payload: unknown,
  meta?: SyncedRecordMeta,
): UpsertSyncedRecordInput {
  return {
    envelopeSchema: 1,
    schemaVersion,
    baseRev,
    payload,
    observedAt: meta?.observedAt ?? null,
    sourceType: meta?.sourceType ?? null,
    cycleId: meta?.cycleId ?? null,
    taskType: meta?.taskType ?? null,
  };
}

export type RecordPushResult =
  | { status: 'ok'; rev: number }
  | { status: 'conflict'; serverRev: number | null; serverPayload: unknown };

/**
 * Push one record. Resolves to `ok` (with the new rev) or `conflict` (with
 * authoritative server state). Re-throws transport errors so the queue backs
 * off. Mirrors `pushProjectStateBlob` exactly, per record.
 */
export async function pushSyncedRecord(
  projectServerId: string,
  storeKey: string,
  recordId: string,
  envelope: UpsertSyncedRecordInput,
): Promise<RecordPushResult> {
  try {
    const { data } = await api.actRecords.upsert(
      projectServerId,
      storeKey,
      recordId,
      envelope,
    );
    return { status: 'ok', rev: data.rev };
  } catch (err) {
    // Duck-type the conflict contract on `status`, not class identity: the
    // 409 status is the contract, and module mocks can split the ApiError
    // class identity so `instanceof` is unreliable under test.
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
