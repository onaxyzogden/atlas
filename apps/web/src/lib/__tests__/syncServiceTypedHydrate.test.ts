// @vitest-environment happy-dom
/**
 * P3-c4 — device-B hydration for the typed-table stores (vegetation +
 * succession). `hydrateTypedTables(project)` is the other half of P0-1 for
 * the typed-table class: it makes a fresh device restore the full
 * vegetation/succession surface.
 *
 * Contract (mirrors mergeDesignFeatures, NOT the blob path):
 *   - no project.serverId → no-op (project not bootstrapped yet);
 *   - GET the project's vegetation + succession collections;
 *   - server-wins per id: an incoming record updates the matching local
 *     record by id, or is added if absent (no cross-project clobber);
 *   - a local record for this project that the server has never seen is
 *     pushed up (syncVegetationCreate / syncSuccessionCreate), so a
 *     device that created records offline does not lose them;
 *   - runs inside initialSync's isSyncing window — assertions only pin the
 *     store + API effects, not the guard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { vegList, vegCreate, succList, succCreate } = vi.hoisted(() => ({
  vegList: vi.fn(),
  vegCreate: vi.fn(),
  succList: vi.fn(),
  succCreate: vi.fn(),
}));
vi.mock('../apiClient.js', async (orig) => {
  const actual = await orig<typeof import('../apiClient.js')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      vegetation: { create: vegCreate, update: vi.fn(), delete: vi.fn(), list: vegList },
      succession: { create: succCreate, update: vi.fn(), delete: vi.fn(), list: succList },
    },
  };
});

vi.mock('../syncQueue.js', async (orig) => {
  const actual = await orig<typeof import('../syncQueue.js')>();
  return {
    ...actual,
    syncQueue: { ...actual.syncQueue, enqueue: vi.fn(), dequeueByLocalId: vi.fn() },
  };
});

import { useProjectStore } from '../../store/projectStore.js';
import { useVegetationStore } from '../../store/vegetationStore.js';
import { useSuccessionStore } from '../../store/successionStore.js';
import { hydrateTypedTables } from '../syncService.js';

const PROJECT = { id: 'local-1', serverId: 'srv-1', name: 'P', attachments: [] } as never;

const SERVER_VEG = {
  id: 'veg-server',
  projectId: 'local-1',
  geometry: { type: 'Polygon', coordinates: [] },
  successionStage: 'climax',
  groundCover: 'forest',
  createdAt: '2026-01-01T00:00:00.000Z',
} as never;

const SERVER_MS = {
  id: 'sm-server',
  projectId: 'local-1',
  year: 2030,
  phase: 'mid',
  observation: 'Canopy closing.',
} as never;

beforeEach(() => {
  vegList.mockReset();
  vegCreate.mockReset();
  succList.mockReset();
  succCreate.mockReset();
  vegCreate.mockResolvedValue({ data: {} });
  succCreate.mockResolvedValue({ data: {} });
  useProjectStore.setState({ projects: [PROJECT], activeProjectId: 'local-1' });
  useVegetationStore.setState({ patches: [] });
  useSuccessionStore.setState({ milestones: [] });
});

describe('hydrateTypedTables', () => {
  it('no-ops when the project has no serverId', async () => {
    await hydrateTypedTables({ id: 'local-1', name: 'P', attachments: [] } as never);
    expect(vegList).not.toHaveBeenCalled();
    expect(succList).not.toHaveBeenCalled();
  });

  it('adds server vegetation + succession records not present locally', async () => {
    vegList.mockResolvedValue({ data: [SERVER_VEG] });
    succList.mockResolvedValue({ data: [SERVER_MS] });
    await hydrateTypedTables(PROJECT);
    expect(vegList).toHaveBeenCalledWith('srv-1');
    expect(succList).toHaveBeenCalledWith('srv-1');
    expect(useVegetationStore.getState().patches).toEqual([SERVER_VEG]);
    expect(useSuccessionStore.getState().milestones).toEqual([SERVER_MS]);
  });

  it('server wins by id over a divergent local copy', async () => {
    useVegetationStore.setState({
      patches: [{ ...SERVER_VEG, successionStage: 'pioneer', groundCover: 'bare-soil' }],
    });
    vegList.mockResolvedValue({ data: [SERVER_VEG] });
    succList.mockResolvedValue({ data: [] });
    await hydrateTypedTables(PROJECT);
    expect(useVegetationStore.getState().patches).toEqual([SERVER_VEG]);
  });

  it('does not clobber a local record from another project', async () => {
    const otherProjVeg = { ...SERVER_VEG, id: 'veg-other', projectId: 'local-2' } as never;
    useVegetationStore.setState({ patches: [otherProjVeg] });
    vegList.mockResolvedValue({ data: [SERVER_VEG] });
    succList.mockResolvedValue({ data: [] });
    await hydrateTypedTables(PROJECT);
    const ids = useVegetationStore.getState().patches.map((p) => p.id).sort();
    expect(ids).toEqual(['veg-other', 'veg-server']);
  });

  it('pushes a local-only record for this project up to the server', async () => {
    const localOnly = { ...SERVER_VEG, id: 'veg-local-only' } as never;
    useVegetationStore.setState({ patches: [localOnly] });
    vegList.mockResolvedValue({ data: [] });
    succList.mockResolvedValue({ data: [] });
    await hydrateTypedTables(PROJECT);
    expect(vegCreate).toHaveBeenCalledWith('srv-1', localOnly);
  });
});
