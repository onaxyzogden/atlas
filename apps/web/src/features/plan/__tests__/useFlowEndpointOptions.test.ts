// @vitest-environment happy-dom
/**
 * useFlowEndpointOptions — #59 broadened endpoint picker.
 *
 * Verifies the shared hook now surfaces livestock paddocks, water-system
 * earthworks/storage, and plant guilds (the endpoints a regenerative
 * closed loop actually routes between) in addition to the original
 * zones/structures/crops/fertility set, all filtered by projectId.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlowEndpointOptions } from '../useFlowEndpointOptions.js';
import { useClosedLoopStore } from '../../../store/closedLoopStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useWaterSystemsStore } from '../../../store/waterSystemsStore.js';
import { usePolycultureStore } from '../../../store/polycultureStore.js';

const PID = 'p-1';

beforeEach(() => {
  useClosedLoopStore.setState({ fertilityInfra: [] });
  useLivestockStore.setState({ paddocks: [] });
  useWaterSystemsStore.setState({ earthworks: [], storageInfra: [] });
  usePolycultureStore.setState({ guilds: [] });
});

describe('useFlowEndpointOptions', () => {
  it('includes livestock / water / guild endpoints, filtered by projectId', () => {
    useClosedLoopStore.setState({
      fertilityInfra: [
        { id: 'fi-1', projectId: PID, type: 'composter', center: [-75, 45], createdAt: '2026-01-01' },
      ],
    });
    useLivestockStore.setState({
      paddocks: [
        { id: 'pad-1', projectId: PID, name: 'North paddock', color: '#fff', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }, areaM2: 100, grazingCellGroup: null, species: [], stockingDensity: null, fencing: 'none', guestSafeBuffer: false, waterPointNote: '', shelterNote: '', phase: '', notes: '', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        { id: 'pad-x', projectId: 'other', name: 'Foreign', color: '#fff', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }, areaM2: 100, grazingCellGroup: null, species: [], stockingDensity: null, fencing: 'none', guestSafeBuffer: false, waterPointNote: '', shelterNote: '', phase: '', notes: '', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      ],
    });
    useWaterSystemsStore.setState({
      earthworks: [
        { id: 'ew-1', projectId: PID, type: 'swale', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, lengthM: 50, createdAt: '2026-01-01' },
      ],
      storageInfra: [
        { id: 'st-1', projectId: PID, type: 'pond', center: [-75, 45], createdAt: '2026-01-01' },
      ],
    });
    usePolycultureStore.setState({
      guilds: [
        { id: 'g-1', projectId: PID, name: 'Apple guild', anchorSpeciesId: 'malus', members: [], createdAt: '2026-01-01' },
      ],
    });

    const { result } = renderHook(() => useFlowEndpointOptions(PID));
    const byKind = (k: string) => result.current.filter((o) => o.kind === k).map((o) => o.id);

    expect(byKind('fertility')).toContain('fi-1');
    expect(byKind('paddock')).toEqual(['pad-1']); // foreign project filtered out
    expect(byKind('water').sort()).toEqual(['ew-1', 'st-1']);
    expect(byKind('guild')).toContain('g-1');
  });

  it('returns empty when nothing matches the project', () => {
    const { result } = renderHook(() => useFlowEndpointOptions(PID));
    expect(result.current).toEqual([]);
  });
});
