/**
 * @vitest-environment happy-dom
 *
 * actTaskStore - assignment substrate (2026-05-29).
 * Covers the read primitive (listForAssignee) and the serverId-resolved sync
 * verbs (pullAll / pushOne) that wire cross-user assignment through the
 * olos_act_tasks API. The store is keyed by LOCAL project id; only the API
 * speaks serverId.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ActTask } from '@ogden/shared';

const h = vi.hoisted(() => ({
  listResp: [] as ActTask[],
  createResp: null as ActTask | null,
  updateResp: null as ActTask | null,
  listCalls: [] as string[],
  createCalls: [] as Array<{ projectId: string; input: unknown }>,
  updateCalls: [] as Array<{ projectId: string; taskId: string; patch: unknown }>,
}));

// Resolves to apps/web/src/lib/apiClient.ts - the same module the store imports
// as '../../lib/apiClient.js' (vi.mock matches by resolved absolute path).
vi.mock('../../../lib/apiClient.js', () => ({
  api: {
    olos: {
      tasks: {
        list: vi.fn(async (projectId: string) => {
          h.listCalls.push(projectId);
          return { data: h.listResp, error: null };
        }),
        create: vi.fn(async (projectId: string, input: unknown) => {
          h.createCalls.push({ projectId, input });
          return { data: h.createResp, error: null };
        }),
        update: vi.fn(
          async (projectId: string, taskId: string, patch: unknown) => {
            h.updateCalls.push({ projectId, taskId, patch });
            return { data: h.updateResp, error: null };
          },
        ),
      },
    },
  },
}));

import { useActTaskStore } from '../actTaskStore';

function task(
  p: Partial<ActTask> & { id: string; projectId: string },
): ActTask {
  return {
    objectiveId: 'obj-1',
    handoffPackageId: 'pkg-1',
    title: p.id,
    description: '',
    priority: 'normal',
    status: 'ready',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...p,
  } as ActTask;
}

beforeEach(() => {
  localStorage.clear();
  useActTaskStore.setState({ byProject: {}, syncByProject: {} });
  h.listResp = [];
  h.createResp = null;
  h.updateResp = null;
  h.listCalls = [];
  h.createCalls = [];
  h.updateCalls = [];
});

describe('actTaskStore.listForAssignee', () => {
  it('returns only the tasks whose assigneeId matches', () => {
    useActTaskStore.setState({
      byProject: {
        'local-1': {
          a: task({ id: 'a', projectId: 'local-1', assigneeId: 'u-me' }),
          b: task({ id: 'b', projectId: 'local-1', assigneeId: 'u-other' }),
          c: task({ id: 'c', projectId: 'local-1', assigneeId: 'u-me' }),
        },
      },
    });
    const mine = useActTaskStore
      .getState()
      .listForAssignee('local-1', 'u-me');
    expect(mine.map((t) => t.id).sort()).toEqual(['a', 'c']);
  });

  it('returns an empty array for an unknown project', () => {
    expect(
      useActTaskStore.getState().listForAssignee('nope', 'u-me'),
    ).toEqual([]);
  });
});

describe('actTaskStore.pullAll', () => {
  it('fetches by serverId and stores under the LOCAL projectId, normalising each record', async () => {
    h.listResp = [task({ id: 'uuid-a', projectId: 'srv-1', assigneeId: 'u-me' })];

    await useActTaskStore.getState().pullAll('local-1', 'srv-1');

    expect(h.listCalls).toEqual(['srv-1']); // addressed by serverId, not local id
    const stored = useActTaskStore.getState().byProject['local-1'] ?? {};
    expect(stored['uuid-a']?.projectId).toBe('local-1'); // normalised to local
    expect(stored['uuid-a']?.assigneeId).toBe('u-me');
  });
});
