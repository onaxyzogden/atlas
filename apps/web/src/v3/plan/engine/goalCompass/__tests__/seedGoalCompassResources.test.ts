// @vitest-environment happy-dom
/**
 * seedGoalCompassResources — intervention-catalog → WorkItem-resource
 * seeding (Sub-project D2). Hours/cost are never read or emitted.
 */

import { describe, it, expect } from 'vitest';
import type { WorkItem } from '@ogden/shared';
import { seedGoalCompassResources } from '../goalCompassSpineSync.js';

function gc(id: string, intervention?: string): WorkItem {
  return {
    id,
    projectId: 'p1',
    source: 'goal-compass',
    overridden: false,
    createdAt: 'c',
    updatedAt: 'u',
    title: id,
    phaseId: null,
    status: 'todo',
    dependsOn: [],
    dependsOnAuto: [],
    precedesAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    generatedFromInterventionId: intervention,
  } as WorkItem;
}

const CATALOG = [
  {
    id: 'swale',
    materials: [{ label: 'Mulch', unit: 'm3', quantityPerAcre: 2 }],
    maintenanceSchedule: {
      materialsPerOccurrence: [
        { label: 'Mulch', unit: 'm3' }, // dup label+unit → deduped
        { label: 'Compost', unit: 'kg' },
      ],
      equipmentRequired: ['excavator', 'excavator', 'shovel'],
    },
  },
  { id: 'bare', materials: [] },
];

describe('seedGoalCompassResources', () => {
  it('merges base + maintenance materials (label+unit deduped) and equipment', () => {
    const map = seedGoalCompassResources([gc('a', 'swale')], CATALOG);
    const r = map.get('a')!;
    expect(r.materials.map((m) => m.label)).toEqual(['Mulch', 'Compost']);
    expect(r.equipment).toEqual(['excavator', 'shovel']);
  });

  it('skips items with no intervention, unknown intervention, or no resources', () => {
    const map = seedGoalCompassResources(
      [gc('none'), gc('ghost', 'missing'), gc('empty', 'bare')],
      CATALOG,
    );
    expect(map.size).toBe(0);
  });

  it('emits no cost/hours fields (D2 covenant — operational only)', () => {
    const map = seedGoalCompassResources([gc('a', 'swale')], CATALOG);
    const json = JSON.stringify([...map.values()]);
    expect(json).not.toMatch(/cost|usd|price|wage|rate|hrs|hours/i);
  });
});
