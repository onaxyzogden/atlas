/**
 * resourcingConflicts — pure D2 engine unit tests. Hours only, no cost,
 * never mutates input.
 */

import { describe, it, expect } from 'vitest';
import type { WorkItem } from '../schemas/workItem.schema.js';
import type { CrewMember } from '../schemas/crewMember.schema.js';
import {
  effectiveEquipment,
  rollUpBom,
  equipmentConflicts,
  isoWeekKey,
  assigneeWeeklyLoad,
  analyzeResourcing,
} from '../lib/resourcingConflicts.js';

function wi(p: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'goal-compass',
    overridden: false,
    createdAt: 'c',
    updatedAt: 'u',
    title: p.id,
    phaseId: null,
    status: 'todo',
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    ...p,
  } as WorkItem;
}

const cm = (id: string, cap: number): CrewMember =>
  ({
    id,
    projectId: 'p1',
    name: id,
    skillLevel: 'general',
    weeklyHoursCap: cap,
    createdAt: 'c',
    updatedAt: 'u',
  }) as CrewMember;

describe('effectiveEquipment', () => {
  it('unions manual + auto, deduped', () => {
    expect(
      effectiveEquipment(
        wi({ id: 'a', equipmentRequired: ['x'], equipmentRequiredAuto: ['x', 'y'] }),
      ),
    ).toEqual(['x', 'y']);
  });
});

describe('equipmentConflicts', () => {
  it('flags overlapping spans sharing equipment', () => {
    const c = equipmentConflicts([
      wi({
        id: 'a',
        equipmentRequired: ['tractor'],
        scheduledStart: '2026-06-01',
        scheduledEnd: '2026-06-10',
      }),
      wi({
        id: 'b',
        equipmentRequiredAuto: ['tractor'],
        scheduledStart: '2026-06-05',
        scheduledEnd: '2026-06-15',
      }),
    ]);
    expect(c).toHaveLength(1);
    expect(c[0]!.equipmentId).toBe('tractor');
  });

  it('does not flag non-overlapping spans', () => {
    const c = equipmentConflicts([
      wi({
        id: 'a',
        equipmentRequired: ['tractor'],
        scheduledStart: '2026-06-01',
        scheduledEnd: '2026-06-05',
      }),
      wi({
        id: 'b',
        equipmentRequired: ['tractor'],
        scheduledStart: '2026-06-10',
        scheduledEnd: '2026-06-15',
      }),
    ]);
    expect(c).toHaveLength(0);
  });

  it('skips items missing either schedule date', () => {
    const c = equipmentConflicts([
      wi({ id: 'a', equipmentRequired: ['t'], scheduledStart: '2026-06-01' }),
      wi({ id: 'b', equipmentRequired: ['t'], scheduledEnd: '2026-06-02' }),
    ]);
    expect(c).toHaveLength(0);
  });
});

describe('isoWeekKey', () => {
  it('computes ISO week', () => {
    // 2026-01-01 is a Thursday → ISO week 2026-W01
    expect(isoWeekKey(Date.parse('2026-01-01'))).toBe('2026-W01');
  });
});

describe('assigneeWeeklyLoad', () => {
  const crew = [cm('m1', 40)];

  it('flags a week over the soft cap', () => {
    const c = assigneeWeeklyLoad(
      [
        wi({ id: 'a', assigneeId: 'm1', laborHrs: 30, scheduledStart: '2026-06-01' }),
        wi({ id: 'b', assigneeId: 'm1', laborHrs: 20, scheduledStart: '2026-06-02' }),
      ],
      crew,
    );
    expect(c).toHaveLength(1);
    expect(c[0]!.hours).toBe(50);
    expect(c[0]!.cap).toBe(40);
  });

  it('does not flag at or under the cap', () => {
    expect(
      assigneeWeeklyLoad(
        [wi({ id: 'a', assigneeId: 'm1', laborHrs: 40, scheduledStart: '2026-06-01' })],
        crew,
      ),
    ).toHaveLength(0);
  });

  it('ignores unassigned / no-hours / no-date items', () => {
    expect(
      assigneeWeeklyLoad(
        [
          wi({ id: 'a', laborHrs: 99, scheduledStart: '2026-06-01' }),
          wi({ id: 'b', assigneeId: 'm1', scheduledStart: '2026-06-01' }),
          wi({ id: 'c', assigneeId: 'm1', laborHrs: 99 }),
        ],
        crew,
      ),
    ).toHaveLength(0);
  });
});

describe('rollUpBom', () => {
  it('merges manual + auto by label+unit, sums quantities, keeps provenance', () => {
    const bom = rollUpBom([
      wi({
        id: 'a',
        materials: [{ label: 'Mulch', unit: 'm3', quantityPerAcre: 2 }],
        materialsAuto: [{ label: 'Mulch', unit: 'm3', quantityPerAcre: 3 }],
      }),
      wi({ id: 'b', materialsAuto: [{ label: 'Compost', unit: 'kg' }] }),
    ]);
    const mulch = bom.find((b) => b.label === 'Mulch')!;
    expect(mulch.quantityPerAcre).toBe(5);
    expect(mulch.fromManual).toBe(true);
    expect(mulch.fromAuto).toBe(true);
    const compost = bom.find((b) => b.label === 'Compost')!;
    expect(compost.fromManual).toBe(false);
    expect(compost.fromAuto).toBe(true);
  });
});

describe('analyzeResourcing', () => {
  it('combines passes and never emits cost', () => {
    const r = analyzeResourcing(
      [
        wi({
          id: 'a',
          equipmentRequired: ['t'],
          scheduledStart: '2026-06-01',
          scheduledEnd: '2026-06-10',
        }),
        wi({
          id: 'b',
          equipmentRequired: ['t'],
          scheduledStart: '2026-06-05',
          scheduledEnd: '2026-06-12',
        }),
      ],
      [],
    );
    expect(r.byItemId.get('a')!.equipmentConflict).toBe(true);
    expect(r.byItemId.get('b')!.equipmentConflict).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/cost|usd|price|wage/i);
  });
});
