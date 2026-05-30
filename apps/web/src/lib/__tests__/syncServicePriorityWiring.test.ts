// @vitest-environment happy-dom
/**
 * ADR 7 Phase 2 — enqueueTypedRecord stamps the derived 5-tier priority.
 *
 * The queue only drains divergence-first if the priority actually rides on the
 * enqueued op. This pins the wiring seam: enqueueTypedRecord must derive the
 * tier from the record's own fields (divergenceFlag / taskType / cycleId — the
 * ADR 2 taxonomy) and pass it to syncQueue.enqueue. derivePriority's tier logic
 * is proven exhaustively in syncQueuePriority.test.ts; here we only prove the
 * derived value reaches the queue, and that the no-serverId skip is preserved.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { enqueue } = vi.hoisted(() => ({ enqueue: vi.fn() }));
vi.mock('../syncQueue.js', async (orig) => {
  // Keep the real module (derivePriority/compareQueuedOps stay real); stub only
  // the enqueue sink so we can assert what enqueueTypedRecord hands the queue.
  const actual = await orig<typeof import('../syncQueue.js')>();
  return { ...actual, syncQueue: { ...actual.syncQueue, enqueue } };
});

import { useProjectStore } from '../../store/projectStore.js';
import { enqueueTypedRecord } from '../syncService.js';

type Desc = Parameters<typeof enqueueTypedRecord>[0];
const DESC = { storeKey: 'ogden-field-actions', schemaVersion: 2 } as unknown as Desc;

beforeEach(() => {
  enqueue.mockReset();
  useProjectStore.setState({
    activeProjectId: 'local-1',
    projects: [{ id: 'local-1', serverId: 'srv-1', attachments: [] } as never],
  });
});

describe('enqueueTypedRecord — stamps the derived priority (ADR 7 P2 wiring)', () => {
  it('tier 1: a diverged record enqueues at priority 1 (beats its survey tier)', async () => {
    await enqueueTypedRecord(DESC, 'rec-div', {
      id: 'rec-div',
      divergenceFlag: { id: 'd1', type: 'site_condition' },
      taskType: 'field_survey',
      cycleId: 'baseline',
    });
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ priority: 1 }));
  });

  it('tier 2: a baseline field survey enqueues at priority 2', async () => {
    await enqueueTypedRecord(DESC, 'rec-bl', {
      id: 'rec-bl',
      taskType: 'field_survey',
      cycleId: 'baseline',
    });
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ priority: 2 }));
  });

  it('tier 5: an implementation task enqueues at priority 5', async () => {
    await enqueueTypedRecord(DESC, 'rec-impl', {
      id: 'rec-impl',
      taskType: 'implementation_task',
      cycleId: 1,
    });
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ priority: 5 }));
  });

  it('also carries the typed-record storeType + 3-part localId alongside the priority', async () => {
    await enqueueTypedRecord(DESC, 'rec-bl2', {
      id: 'rec-bl2',
      taskType: 'field_survey',
      cycleId: 'baseline',
    });
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        storeType: 'typed-record',
        action: 'update',
        localId: 'ogden-field-actions:local-1:rec-bl2',
        priority: 2,
      }),
    );
  });

  it('skips entirely (no enqueue) when the active project has no serverId', async () => {
    useProjectStore.setState({
      activeProjectId: 'local-2',
      projects: [{ id: 'local-2', attachments: [] } as never],
    });
    await enqueueTypedRecord(DESC, 'rec-x', {
      id: 'rec-x',
      taskType: 'field_survey',
      cycleId: 'baseline',
    });
    expect(enqueue).not.toHaveBeenCalled();
  });
});
