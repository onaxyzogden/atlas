// @vitest-environment happy-dom
/**
 * zoneStore.clearSeededZones — bulk-removes only the `ring-seed` drafts
 * for one project. Hand-drawn zones and other projects' seeds survive,
 * and the no-op case (nothing seeded) must not push an undo step.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useZoneStore } from '../zoneStore.js';
import type { LandZone } from '../zoneStore.js';

const zone = (
  id: string,
  projectId: string,
  seeded: boolean,
): LandZone => ({
  id,
  projectId,
  name: id,
  category: 'food_production',
  color: '#123456',
  primaryUse: '',
  secondaryUse: '',
  notes: '',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [0.001, 0],
        [0.001, 0.001],
        [0, 0.001],
        [0, 0],
      ],
    ],
  },
  areaM2: 1,
  permacultureZone: 2,
  ...(seeded ? { seedProvenance: 'ring-seed' as const } : {}),
  createdAt: 'x',
  updatedAt: 'x',
});

describe('zoneStore.clearSeededZones', () => {
  beforeEach(() => {
    useZoneStore.setState({ zones: [] });
    useZoneStore.temporal.getState().clear();
  });

  it('removes only ring-seed zones for the target project', () => {
    useZoneStore.setState({
      zones: [
        zone('seed-a', 'p1', true),
        zone('seed-b', 'p1', true),
        zone('manual', 'p1', false),
        zone('seed-other', 'p2', true),
      ],
    });

    const removed = useZoneStore.getState().clearSeededZones('p1');

    expect(removed).toBe(2);
    const ids = useZoneStore
      .getState()
      .zones.map((z) => z.id)
      .sort();
    expect(ids).toEqual(['manual', 'seed-other']);
  });

  it('returns 0 and does not push an undo step when nothing is seeded', () => {
    useZoneStore.setState({ zones: [zone('manual', 'p1', false)] });
    useZoneStore.temporal.getState().clear();

    const removed = useZoneStore.getState().clearSeededZones('p1');

    expect(removed).toBe(0);
    expect(useZoneStore.getState().zones).toHaveLength(1);
    expect(useZoneStore.temporal.getState().pastStates).toHaveLength(0);
  });
});
