/**
 * blobSync — client side of the generic versioned-blob transport
 * (Phase 2 of Full syncService Coverage).
 *
 * These pin the two behaviours the conflict model depends on:
 *  - the wire envelope is exactly { envelopeSchema:1, schemaVersion,
 *    baseRev, payload } (server's UpsertProjectStateInput);
 *  - a 409 is turned into a structured conflict result carrying the
 *    authoritative server state — never swallowed, never auto-clobbered.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { api, ApiError } from '../apiClient.js';
import {
  blobLocalId,
  buildBlobEnvelope,
  pushProjectStateBlob,
} from '../blobSync.js';

// Spy on the real `api` object blobSync imports — a vi.mock factory with
// importActual + a wrapper indirection makes vitest double-track the mock's
// thrown error and fail the test even though pushProjectStateBlob handles it.
const makeSpy = () => vi.spyOn(api.projectState, 'upsert');
let upsert: ReturnType<typeof makeSpy>;
beforeEach(() => {
  upsert = makeSpy();
});
afterEach(() => upsert.mockRestore());

describe('blobLocalId', () => {
  it('keys a queued op by storeKey:projectId', () => {
    expect(blobLocalId('ogden-vision', 'proj-1')).toBe('ogden-vision:proj-1');
  });
});

describe('buildBlobEnvelope', () => {
  it('produces the exact server envelope shape', () => {
    expect(buildBlobEnvelope(3, 7, { a: 1 })).toEqual({
      envelopeSchema: 1,
      schemaVersion: 3,
      baseRev: 7,
      payload: { a: 1 },
    });
  });
});

describe('pushProjectStateBlob', () => {
  it('returns the bumped rev on success', async () => {
    upsert.mockResolvedValue({ data: { rev: 8 }, error: null } as never);
    const r = await pushProjectStateBlob('proj-1', 'ogden-vision', buildBlobEnvelope(2, 7, {}));
    expect(r).toEqual({ status: 'ok', rev: 8 });
    expect(upsert).toHaveBeenCalledWith('proj-1', 'ogden-vision', {
      envelopeSchema: 1,
      schemaVersion: 2,
      baseRev: 7,
      payload: {},
    });
  });

  it('maps a 409 into a structured conflict with the authoritative state', async () => {
    upsert.mockRejectedValue(
      new ApiError('CONFLICT', 'stale', 409, { serverRev: 12, serverPayload: { x: 1 } }),
    );
    const r = await pushProjectStateBlob('proj-1', 'ogden-vision', buildBlobEnvelope(2, 3, {}));
    expect(r).toEqual({ status: 'conflict', serverRev: 12, serverPayload: { x: 1 } });
  });

  it('re-throws non-409 errors so the retry queue can back off', async () => {
    upsert.mockRejectedValue(new ApiError('UNKNOWN', 'boom', 500));
    await expect(
      pushProjectStateBlob('proj-1', 'ogden-vision', buildBlobEnvelope(2, 3, {})),
    ).rejects.toThrow('boom');
  });
});
