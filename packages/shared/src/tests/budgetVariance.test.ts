/**
 * budgetVariance — pure D3 engine unit tests. Project cost/budget tracking
 * only: effective planned band (manual point estimate wins over auto), band-
 * wise variance, per-phase / project rollup, render-only drift flag. Never
 * reads or writes `WorkItem.status`. Covenant: no financing/capital framing.
 */

import { describe, it, expect } from 'vitest';
import type { WorkItem } from '../schemas/workItem.schema.js';
import type { CostRange } from '../schemas/costRange.schema.js';
import {
  addRange,
  varianceBands,
  effectivePlanned,
  budgetDrift,
  analyzeBudget,
  type RecordedActual,
} from '../lib/budgetVariance.js';

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

const cr = (low: number, mid: number, high: number): CostRange => ({
  low,
  mid,
  high,
});

describe('budgetVariance — pure D3 engine', () => {
  it('addRange / varianceBands are band-wise', () => {
    expect(addRange(cr(1, 2, 3), cr(10, 20, 30))).toEqual(cr(11, 22, 33));
    expect(varianceBands(cr(100, 200, 300), cr(120, 180, 360))).toEqual(
      cr(20, -20, 60),
    );
  });

  it('effectivePlanned: manual costUSD point wins over costRangeAuto', () => {
    expect(
      effectivePlanned(wi({ id: 'a', costUSD: 500, costRangeAuto: cr(1, 2, 3) })),
    ).toEqual(cr(500, 500, 500));
  });

  it('effectivePlanned: falls back to costRangeAuto, then zero band', () => {
    expect(effectivePlanned(wi({ id: 'b', costRangeAuto: cr(10, 20, 40) }))).toEqual(
      cr(10, 20, 40),
    );
    expect(effectivePlanned(wi({ id: 'c' }))).toEqual(cr(0, 0, 0));
  });

  it('budgetDrift: actual midpoint over the planned ceiling (under/at/over)', () => {
    expect(budgetDrift(cr(0, 0, 100), cr(0, 90, 0))).toBe(false); // under
    expect(budgetDrift(cr(0, 0, 100), cr(0, 100, 0))).toBe(false); // at ceiling
    expect(budgetDrift(cr(0, 0, 100), cr(0, 101, 0))).toBe(true); // over
  });

  it('analyzeBudget: per-item / per-phase / project band-wise rollup', () => {
    const items = [
      wi({ id: 'i1', phaseId: 'ph1', costUSD: 100 }),
      wi({ id: 'i2', phaseId: 'ph1', costRangeAuto: cr(50, 75, 100) }),
      wi({ id: 'i3', phaseId: null, costRangeAuto: cr(10, 10, 10) }),
    ];
    const actuals = new Map<string, RecordedActual>([
      ['i1', { actual: cr(110, 110, 110), actualHrs: 8 }],
      ['i2', { actual: cr(40, 80, 130), actualHrs: 4 }],
      // i3 has no recorded actual ⇒ zero band
    ]);

    const a = analyzeBudget(items, actuals);

    expect(a.byItemId.get('i1')!.planned).toEqual(cr(100, 100, 100));
    expect(a.byItemId.get('i1')!.variance).toEqual(cr(10, 10, 10));
    expect(a.byItemId.get('i1')!.drift).toBe(true); // 110 > 100 ceiling
    expect(a.byItemId.get('i3')!.actual).toEqual(cr(0, 0, 0));

    // ph1 = i1 + i2 planned/actual band-wise
    const ph1 = a.byPhase.get('ph1')!;
    expect(ph1.planned).toEqual(cr(150, 175, 200));
    expect(ph1.actual).toEqual(cr(150, 190, 240));
    expect(ph1.actualHrs).toBe(12);

    // phase-less items collect under the '' bucket
    expect(a.byPhase.get('')!.planned).toEqual(cr(10, 10, 10));

    // project total
    expect(a.total.planned).toEqual(cr(160, 185, 210));
    expect(a.total.actual).toEqual(cr(150, 190, 240));
    expect(a.total.actualHrs).toBe(12);
  });

  it('never reads or writes WorkItem.status (derived-only spine discipline)', () => {
    const items = [wi({ id: 's1', status: 'todo', costUSD: 10 })];
    const before = JSON.parse(JSON.stringify(items));
    const a = analyzeBudget(
      items,
      new Map([['s1', { actual: cr(20, 20, 20) }]]),
    );
    // input untouched
    expect(items).toEqual(before);
    expect(items[0]!.status).toBe('todo');
    // result object carries no status field anywhere
    expect(JSON.stringify(a)).not.toMatch(/status/i);
  });

  it('covenant: no financing/capital/investor semantics in the engine surface', () => {
    const a = analyzeBudget(
      [wi({ id: 'x', costUSD: 1000 })],
      new Map([['x', { actual: cr(900, 1100, 1300), actualHrs: 2 }]]),
    );
    const json = JSON.stringify({
      byItemId: [...a.byItemId.entries()],
      byPhase: [...a.byPhase.entries()],
      total: a.total,
    });
    expect(json).not.toMatch(
      /interest|riba|invest|equity|capital|financ|loan|yield|return|salam|gharar/i,
    );
  });
});
