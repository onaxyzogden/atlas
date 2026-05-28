// @vitest-environment happy-dom
/**
 * proof_photo_upload — POST against the project's SERVER id, not the local id.
 *
 * The route's auth chain (`resolveProjectRole` → `requireRole('owner','designer')`)
 * looks up the project by id in the server's `projects` table. The server row
 * lives under `serverId` (assigned when the prior `project_create` sync op
 * drained); a stale POST with the local UUID 401s/404s and the queue
 * exhausts.
 *
 * Pins three things:
 *   1. serverId present → upload called with `serverId` (NOT local id).
 *   2. serverId missing → throws so the queue retries with backoff
 *      (project_create normally drains first, but a transient failure can
 *      invert order — the retry contract handles either path).
 *   3. successful drain swaps the proofItem's `idb://` URI for the canonical
 *      `storage://` URI and flips `fileSyncStatus` to `'uploaded'`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QueuedOperation } from '../syncQueue.js';

const { proofPhotoUpload } = vi.hoisted(() => ({
  proofPhotoUpload: vi.fn(),
}));
vi.mock('../apiClient.js', async (orig) => {
  const actual = await orig<typeof import('../apiClient.js')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      proofPhoto: { upload: proofPhotoUpload },
    },
  };
});

const { getBlob } = vi.hoisted(() => ({ getBlob: vi.fn() }));
vi.mock('../proofPhotoStore.js', async (orig) => {
  const actual = await orig<typeof import('../proofPhotoStore.js')>();
  return {
    ...actual,
    proofPhotoStore: { ...actual.proofPhotoStore, getBlob },
  };
});

import { useProjectStore } from '../../store/projectStore.js';
import { useFieldActionStore } from '../../store/fieldActionStore.js';
import { executeQueuedOp } from '../syncService.js';

const LOCAL_ID = 'local-proj-1';
const SERVER_ID = 'srv-proj-1';
const ACTION_ID = 'action-1';
const SLOT_ID = 'photo-before';
const PROOF_ITEM_ID = 'proof-1';

function seedProject(serverId: string | undefined) {
  useProjectStore.setState({
    projects: [
      { id: LOCAL_ID, serverId, attachments: [] } as never,
    ],
    activeProjectId: LOCAL_ID,
  });
}

function seedFieldAction() {
  useFieldActionStore.setState({
    byProject: {
      [LOCAL_ID]: [
        {
          id: ACTION_ID,
          projectId: LOCAL_ID,
          proofItems: [
            {
              id: PROOF_ITEM_ID,
              slotId: SLOT_ID,
              fileUri: `idb://${ACTION_ID}/${SLOT_ID}`,
              fileSyncStatus: 'local',
            },
          ],
        } as never,
      ],
    },
  });
}

function op(): QueuedOperation {
  return {
    id: `proof_photo_upload:${ACTION_ID}:${SLOT_ID}`,
    timestamp: 0,
    storeType: 'proof_photo_upload',
    action: 'create',
    localId: ACTION_ID,
    payload: {
      projectId: LOCAL_ID,
      actionId: ACTION_ID,
      slotId: SLOT_ID,
      proofItemId: PROOF_ITEM_ID,
      fileName: 'before.jpg',
      fileMime: 'image/jpeg',
    },
    retryCount: 0,
  } as never as QueuedOperation;
}

beforeEach(() => {
  proofPhotoUpload.mockReset();
  getBlob.mockReset();
  getBlob.mockResolvedValue(new Blob(['fake-pixels'], { type: 'image/jpeg' }));
  useProjectStore.setState({ projects: [], activeProjectId: null });
  useFieldActionStore.setState({ byProject: {} });
});

describe('proof_photo_upload: serverId resolution', () => {
  it('POSTs against the project serverId, not the local id', async () => {
    seedProject(SERVER_ID);
    seedFieldAction();
    proofPhotoUpload.mockResolvedValue({
      data: { assetUri: 'storage://srv-proj-1/action-1/photo-before.jpg' },
    });

    await executeQueuedOp(op());

    expect(proofPhotoUpload).toHaveBeenCalledTimes(1);
    const call = proofPhotoUpload.mock.calls[0];
    expect(call).toBeDefined();
    const [calledProjectId, args] = call!;
    expect(calledProjectId).toBe(SERVER_ID);
    expect(calledProjectId).not.toBe(LOCAL_ID);
    expect(args.actionId).toBe(ACTION_ID);
    expect(args.slotId).toBe(SLOT_ID);
    expect(args.fileName).toBe('before.jpg');
    expect(args.fileMime).toBe('image/jpeg');
    expect(args.blob).toBeInstanceOf(Blob);
  });

  it('throws (queue retries with backoff) when serverId is missing', async () => {
    seedProject(undefined);
    seedFieldAction();

    await expect(executeQueuedOp(op())).rejects.toThrow(
      /no serverId yet; deferring/i,
    );
    expect(proofPhotoUpload).not.toHaveBeenCalled();
  });

  it('swaps the proof item URI and flips fileSyncStatus on successful drain', async () => {
    seedProject(SERVER_ID);
    seedFieldAction();
    const newAssetUri = 'storage://srv-proj-1/action-1/photo-before.jpg';
    proofPhotoUpload.mockResolvedValue({ data: { assetUri: newAssetUri } });

    await executeQueuedOp(op());

    const action = useFieldActionStore
      .getState()
      .getById(LOCAL_ID, ACTION_ID);
    expect(action).toBeDefined();
    const proof = action!.proofItems.find((p) => p.id === PROOF_ITEM_ID);
    expect(proof).toBeDefined();
    expect(proof!.fileUri).toBe(newAssetUri);
    expect(proof!.fileSyncStatus).toBe('uploaded');
  });
});
