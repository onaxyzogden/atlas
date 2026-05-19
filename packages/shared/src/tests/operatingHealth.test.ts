/**
 * operatingHealth — pure D5 composition engine unit tests.
 * Composes the four D1–D4 engine results into health lights +
 * ranked deterministic render-only recommendations. No spine writes.
 */
import { describe, it, expect } from 'vitest';
import type { WorkItem } from '../schemas/workItem.schema.js';
import type {
  WorkItemGraphResult,
  ResourcingConflictResult,
  BudgetAnalysis,
  FieldProofAnalysis,
  BudgetCell,
} from '../index.js';
import {
  computeOperatingHealth,
  type OperatingHealthInput,
} from '../lib/operatingHealth.js';

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

const ZERO_BAND = { low: 0, mid: 0, high: 0 };
const cell = (p: Partial<BudgetCell> = {}): BudgetCell => ({
  planned: { ...ZERO_BAND },
  actual: { ...ZERO_BAND },
  variance: { ...ZERO_BAND },
  actualHrs: 0,
  drift: false,
  ...p,
});

const emptyGraph = (): WorkItemGraphResult => ({
  byId: new Map(),
  cyclic: false,
  order: [],
});
const emptyResourcing = (): ResourcingConflictResult => ({
  equipment: [],
  workload: [],
  byItemId: new Map(),
});
const emptyBudget = (): BudgetAnalysis => ({
  byItemId: new Map(),
  byPhase: new Map(),
  total: cell(),
});
const emptyProof = (): FieldProofAnalysis => ({
  byItemId: new Map(),
  suggestions: [],
  counts: { proven: 0, claimed: 0, open: 0 },
});

function input(p: Partial<OperatingHealthInput> = {}): OperatingHealthInput {
  return {
    items: [],
    graph: emptyGraph(),
    resourcing: emptyResourcing(),
    budget: emptyBudget(),
    proof: emptyProof(),
    now: '2026-05-19T00:00:00.000Z',
    ...p,
  };
}

describe('computeOperatingHealth — D5 composition engine', () => {
  it('empty project ⇒ all lights ok, no recommendations, on-track', () => {
    const r = computeOperatingHealth(input());
    expect(r.lights).toEqual({
      schedule: 'ok',
      resourcing: 'ok',
      budget: 'ok',
      proof: 'ok',
    });
    expect(r.recommendations).toEqual([]);
    expect(r.counts).toEqual({
      blocked: 0,
      critical: 0,
      overdue: 0,
      equipmentConflicts: 0,
      overCapacity: 0,
      budgetDrift: 0,
      unproven: 0,
      doneTotal: 0,
    });
  });

  it('cyclic DAG ⇒ schedule alert + high cycle recommendation', () => {
    const r = computeOperatingHealth(
      input({ graph: { byId: new Map(), cyclic: true, order: [] } }),
    );
    expect(r.lights.schedule).toBe('alert');
    const rec = r.recommendations.find((x) => x.kind === 'cycle');
    expect(rec).toBeTruthy();
    expect(rec!.severity).toBe('high');
    expect(rec!.targetCard).toBe('act-plan-tracker');
  });

  it('blocked critical item ⇒ schedule alert + high blocked-critical rec', () => {
    const items = [wi({ id: 'a' })];
    const graph: WorkItemGraphResult = {
      byId: new Map([
        [
          'a',
          {
            earliestStart: 0,
            earliestFinish: 1,
            latestStart: 0,
            latestFinish: 1,
            slack: 0,
            critical: true,
            duration: 1,
            blocked: true,
            blockedBy: ['z'],
          },
        ],
      ]),
      cyclic: false,
      order: ['a'],
    };
    const r = computeOperatingHealth(input({ items, graph }));
    expect(r.lights.schedule).toBe('alert');
    expect(r.counts.blocked).toBe(1);
    expect(r.counts.critical).toBe(1);
    const rec = r.recommendations.find((x) => x.kind === 'blocked-critical');
    expect(rec!.severity).toBe('high');
  });

  it('overdue non-blocked item ⇒ schedule warn + med overdue rec', () => {
    const items = [
      wi({ id: 'a', status: 'todo', scheduledEnd: '2026-01-01' }),
    ];
    const r = computeOperatingHealth(input({ items }));
    expect(r.lights.schedule).toBe('warn');
    expect(r.counts.overdue).toBe(1);
    const rec = r.recommendations.find((x) => x.kind === 'overdue');
    expect(rec!.severity).toBe('med');
    expect(rec!.targetCard).toBe('act-plan-tracker');
  });

  it('equipment double-booking ⇒ resourcing alert + high rec', () => {
    const resourcing: ResourcingConflictResult = {
      equipment: [
        {
          equipmentId: 'tractor',
          itemIdA: 'a',
          itemIdB: 'b',
          overlapStart: '2026-05-01',
          overlapEnd: '2026-05-02',
        },
      ],
      workload: [],
      byItemId: new Map(),
    };
    const r = computeOperatingHealth(input({ resourcing }));
    expect(r.lights.resourcing).toBe('alert');
    expect(r.counts.equipmentConflicts).toBe(1);
    const rec = r.recommendations.find((x) => x.kind === 'equipment-conflict');
    expect(rec!.severity).toBe('high');
    expect(rec!.targetCard).toBe('act-resourcing');
  });

  it('crew over capacity only ⇒ resourcing warn + med rec', () => {
    const resourcing: ResourcingConflictResult = {
      equipment: [],
      workload: [{ memberId: 'm1', week: '2026-W20', hours: 50, cap: 40 }],
      byItemId: new Map(),
    };
    const r = computeOperatingHealth(input({ resourcing }));
    expect(r.lights.resourcing).toBe('warn');
    expect(r.counts.overCapacity).toBe(1);
    const rec = r.recommendations.find((x) => x.kind === 'over-capacity');
    expect(rec!.severity).toBe('med');
  });

  it('budget drift + total variance over plan ⇒ budget alert', () => {
    const budget: BudgetAnalysis = {
      byItemId: new Map([['a', cell({ drift: true })]]),
      byPhase: new Map(),
      total: cell({
        planned: { low: 0, mid: 50, high: 100 },
        variance: { low: 0, mid: 150, high: 200 },
      }),
    };
    const r = computeOperatingHealth(input({ budget }));
    expect(r.lights.budget).toBe('alert');
    expect(r.counts.budgetDrift).toBe(1);
    const rec = r.recommendations.find((x) => x.kind === 'budget-drift');
    expect(rec!.severity).toBe('med');
    expect(rec!.targetCard).toBe('act-budget');
  });

  it('budget drift only (variance within plan) ⇒ budget warn', () => {
    const budget: BudgetAnalysis = {
      byItemId: new Map([['a', cell({ drift: true })]]),
      byPhase: new Map(),
      total: cell({
        planned: { low: 0, mid: 50, high: 100 },
        variance: { low: 0, mid: 10, high: 20 },
      }),
    };
    const r = computeOperatingHealth(input({ budget }));
    expect(r.lights.budget).toBe('warn');
  });

  it('done items, low proof closure ⇒ proof alert + low rec', () => {
    const items = [
      wi({ id: 'a', status: 'done' }),
      wi({ id: 'b', status: 'done' }),
      wi({ id: 'c', status: 'done' }),
    ];
    const proof: FieldProofAnalysis = {
      byItemId: new Map([
        ['a', 'proven'],
        ['b', 'claimed'],
        ['c', 'claimed'],
      ]),
      suggestions: [],
      counts: { proven: 1, claimed: 2, open: 0 },
    };
    const r = computeOperatingHealth(input({ items, proof }));
    expect(r.lights.proof).toBe('alert');
    expect(r.counts.unproven).toBe(2);
    expect(r.counts.doneTotal).toBe(3);
    const rec = r.recommendations.find((x) => x.kind === 'unproven');
    expect(rec!.severity).toBe('low');
    expect(rec!.targetCard).toBe('field-proof');
  });

  it('ranks recommendations high→med→low then by count desc', () => {
    const items = [
      wi({ id: 'a', status: 'done' }),
      wi({ id: 'o1', status: 'todo', scheduledEnd: '2026-01-01' }),
      wi({ id: 'o2', status: 'todo', scheduledEnd: '2026-01-01' }),
    ];
    const graph: WorkItemGraphResult = { byId: new Map(), cyclic: true, order: [] };
    const resourcing: ResourcingConflictResult = {
      equipment: [],
      workload: [{ memberId: 'm', week: 'w', hours: 9, cap: 8 }],
      byItemId: new Map(),
    };
    const proof: FieldProofAnalysis = {
      byItemId: new Map([['a', 'claimed']]),
      suggestions: [],
      counts: { proven: 0, claimed: 1, open: 0 },
    };
    const r = computeOperatingHealth(input({ items, graph, resourcing, proof }));
    const sev = r.recommendations.map((x) => x.severity);
    const rank = { high: 0, med: 1, low: 2 } as const;
    for (let i = 1; i < sev.length; i++) {
      expect(rank[sev[i]!]).toBeGreaterThanOrEqual(rank[sev[i - 1]!]);
    }
    expect(r.recommendations[0]!.severity).toBe('high'); // cycle
    expect(r.recommendations.at(-1)!.kind).toBe('unproven'); // low last
  });

  it('orders equal-severity recs by count desc then stable id asc', () => {
    // Three med rules: overdue (count 3), over-capacity (count 2),
    // budget-drift (count 2). Expect overdue first (higher count),
    // then the count-2 tie broken by ascending id:
    // 'budget-drift' < 'over-capacity'.
    const items = [
      wi({ id: 'o1', status: 'todo', scheduledEnd: '2026-01-01' }),
      wi({ id: 'o2', status: 'todo', scheduledEnd: '2026-01-01' }),
      wi({ id: 'o3', status: 'todo', scheduledEnd: '2026-01-01' }),
    ];
    const resourcing: ResourcingConflictResult = {
      equipment: [],
      workload: [
        { memberId: 'm1', week: 'w1', hours: 9, cap: 8 },
        { memberId: 'm2', week: 'w2', hours: 9, cap: 8 },
      ],
      byItemId: new Map(),
    };
    const budget: BudgetAnalysis = {
      byItemId: new Map([
        ['x', cell({ drift: true })],
        ['y', cell({ drift: true })],
      ]),
      byPhase: new Map(),
      total: cell(),
    };
    const r = computeOperatingHealth(input({ items, resourcing, budget }));
    const med = r.recommendations.filter((x) => x.severity === 'med');
    expect(med.map((x) => x.kind)).toEqual([
      'overdue', // count 3 — highest
      'budget-drift', // count 2, id 'budget-drift' < 'over-capacity'
      'over-capacity', // count 2
    ]);
  });

  it('does not mutate any input (no spine-status / engine-result write)', () => {
    const items = [wi({ id: 'a', status: 'done' })];
    const graph = emptyGraph();
    const resourcing = emptyResourcing();
    const budget = emptyBudget();
    const proof = emptyProof();
    for (const o of [
      items,
      items[0],
      graph,
      graph.byId,
      graph.order,
      resourcing,
      resourcing.equipment,
      resourcing.workload,
      budget,
      budget.byItemId,
      budget.total,
      proof,
      proof.byItemId,
      proof.suggestions,
      proof.counts,
    ]) {
      Object.freeze(o);
    }
    expect(() =>
      computeOperatingHealth({
        items,
        graph,
        resourcing,
        budget,
        proof,
        now: '2026-05-19T00:00:00.000Z',
      }),
    ).not.toThrow();
    expect(items[0]!.status).toBe('done');
  });

  it('output carries no financing/capital lexicon (covenant)', () => {
    const items = [
      wi({ id: 'a', status: 'done' }),
      wi({ id: 'b', status: 'todo', scheduledEnd: '2026-01-01' }),
    ];
    const budget: BudgetAnalysis = {
      byItemId: new Map([['a', cell({ drift: true })]]),
      byPhase: new Map(),
      total: cell({ variance: { low: 0, mid: 999, high: 999 } }),
    };
    const proof: FieldProofAnalysis = {
      byItemId: new Map([['a', 'claimed']]),
      suggestions: [],
      counts: { proven: 0, claimed: 1, open: 0 },
    };
    const json = JSON.stringify(
      computeOperatingHealth(input({ items, budget, proof })),
    );
    expect(json).not.toMatch(
      /interest|riba|invest|equity|capital|financ|loan|yield|return|salam|gharar/i,
    );
  });
});
