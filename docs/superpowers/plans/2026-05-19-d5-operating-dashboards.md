# D5 — Operating Dashboards & Adaptive Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pure composition engine over the four D1–D4 engines that produces four project-health lights plus a ranked, deterministic, render-only recommendation list, surfaced on a new dedicated `act-operating-dashboard` Act card.

**Architecture:** A new pure `@ogden/shared` engine `operatingHealth.ts` consumes the *already-computed results* of `analyzeWorkItemGraph`/`analyzeResourcing`/`analyzeBudget`/`analyzeFieldProof` (never re-deriving their logic) plus the project `WorkItem[]`, and returns `{ lights, recommendations, counts }`. A render-only `OperatingDashboardCard.tsx` runs the four engines via `useMemo` and renders the composition. Append-only six-mount-point registration. No store, no `syncManifest`, no schema/DB change, no spine-status write.

**Tech Stack:** TypeScript, Zod (existing schemas only), React 18, Zustand (read-only selectors), Vitest (+ happy-dom for the card), pnpm/Turborepo.

**Source spec:** `docs/superpowers/specs/2026-05-19-d5-operating-dashboards-design.md` (commit `56471d9b`).

**Binding constraints:** explicit-path `git add` only (never `-A`/`.`); per-task commits; no push (branch `feat/atlas-permaculture` rebased out-of-band — push is a separate explicit instruction); covenant — no riba/gharar/CSRA/salam/investor/financing/yield-as-return framing; budget signal is D3 drift surfaced verbatim, never re-framed; no spine-status mutation; no DB migration; legacy untouched; do not modify `wiki/index.md` if dirty (commit ADR/log standalone).

---

## File Structure

| File | Responsibility |
|---|---|
| `packages/shared/src/lib/operatingHealth.ts` *(new)* | Pure composition engine: `computeOperatingHealth(input) → OperatingHealth`. No React/store/I/O. |
| `packages/shared/src/tests/operatingHealth.test.ts` *(new)* | Light thresholds, rule firing/absence, ranking, counts, no-status-mutation invariant, covenant regex. |
| `packages/shared/src/index.ts` *(edit — append 1 line after line 69)* | Barrel-export the new engine. |
| `apps/web/src/features/act/OperatingDashboardCard.tsx` *(new)* | Render-only card: runs 4 engines via `useMemo`, renders lights + bottlenecks + ranked recs. |
| `apps/web/src/features/act/__tests__/OperatingDashboardCard.test.tsx` *(new, happy-dom)* | Mounts; lights + recs render; target labels present; empty "on track"; no cost/financing string. |
| `apps/web/src/v3/act/types.ts` *(edit — append 1 manifest entry)* | Mount 1. |
| `apps/web/src/v3/act/ActModuleSlideUp.tsx` *(edit — lazy import + switch case)* | Mount 2. |
| `apps/web/src/features/dashboard/DashboardRouter.tsx` *(edit — lazy import + switch case)* | Mount 3. |
| `apps/web/src/features/act/ActHub.tsx` *(edit — 1 action link)* | Mount 4. |
| `apps/web/src/features/navigation/taxonomy.ts` *(edit — 1 NavItem)* | Mount 5. |
| `apps/web/src/components/stage-navigator/stageModules.ts` *(edit — append to 1 itemIds array)* | Mount 6. |
| `wiki/decisions/2026-05-19-atlas-d5-operating-dashboards.md` *(new)* + `wiki/log.md` *(prepend)* | Session-close ADR. |

---

## Task 1: Pure composition engine `operatingHealth.ts`

**Files:**
- Create: `packages/shared/src/lib/operatingHealth.ts`
- Test: `packages/shared/src/tests/operatingHealth.test.ts`
- Modify: `packages/shared/src/index.ts` (append after line 69 `export * from './lib/fieldProof.js';`)

**Context:** The four D-engine result types already exist and are barrel-exported from `@ogden/shared`:
- `analyzeWorkItemGraph(items) → WorkItemGraphResult { byId: Map<string, WorkItemGraphNode>, cyclic: boolean, order: string[] }`; `WorkItemGraphNode { earliestStart, earliestFinish, latestStart, latestFinish, slack, critical, duration, blocked, blockedBy }`.
- `analyzeResourcing(items, crew) → ResourcingConflictResult { equipment: EquipmentConflict[], workload: WorkloadConflict[], byItemId: Map<string,{equipmentConflict:boolean;overCapacity:boolean}> }`.
- `analyzeBudget(items, actualsByItemId) → BudgetAnalysis { byItemId: Map<string,BudgetCell>, byPhase: Map<string,BudgetCell>, total: BudgetCell }`; `BudgetCell { planned, actual, variance: CostRange, actualHrs, drift:boolean }`; `CostRange { low, mid, high }`.
- `analyzeFieldProof(items, linkedEventsByItemId, domainEvents, windowDays?) → FieldProofAnalysis { byItemId: Map<string,ProofState>, suggestions, counts:{proven,claimed,open} }`; `ProofState = 'proven'|'claimed'|'open'`.

`WorkItem` (`packages/shared/src/schemas/workItem.schema.ts`): `status` ∈ `'todo'|'in-progress'|'blocked'|'done'|'cancelled'`; `scheduledEnd: string|null|undefined`; `id`, `projectId`.

D5 **calls** these; it never re-implements drift/critical/etc. The engine receives the four results pre-computed (the card computes them) so it stays a pure composition with zero store imports.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/tests/operatingHealth.test.ts`:

```typescript
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
      expect(rank[sev[i]]).toBeGreaterThanOrEqual(rank[sev[i - 1]]);
    }
    expect(r.recommendations[0].severity).toBe('high'); // cycle
    expect(r.recommendations.at(-1)!.kind).toBe('unproven'); // low last
  });

  it('does not mutate inputs (no spine-status write)', () => {
    const items = [wi({ id: 'a', status: 'done' })];
    Object.freeze(items);
    Object.freeze(items[0]);
    expect(() => computeOperatingHealth(input({ items }))).not.toThrow();
    expect(items[0].status).toBe('done');
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
```

- [ ] **Step 2: Run test to verify it fails**

Run (from repo root): `pnpm --filter @ogden/shared test -- operatingHealth`
Expected: FAIL — `Cannot find module '../lib/operatingHealth.js'` / `computeOperatingHealth is not exported`.

- [ ] **Step 3: Write minimal implementation**

Create `packages/shared/src/lib/operatingHealth.ts`:

```typescript
/**
 * operatingHealth — pure D5 composition engine.
 *
 * Composes the four D1–D4 engine results (graph / resourcing / budget /
 * proof) into four health lights plus a ranked, deterministic,
 * render-only recommendation list. It CALLS those engines' results;
 * it never re-derives their logic (budget drift stays D3-owned —
 * surfaced verbatim, never re-framed toward financing/capital).
 *
 * Covenant: strictly operating analytics. No riba/gharar/CSRA/salam,
 * no cost-of-capital/financing/investor/yield framing. Never reads or
 * writes WorkItem.status — derived at call time, no mutation.
 */
import type { WorkItem } from '../schemas/workItem.schema.js';
import type { WorkItemGraphResult } from './workItemGraph.js';
import type { ResourcingConflictResult } from './resourcingConflicts.js';
import type { BudgetAnalysis } from './budgetVariance.js';
import type { FieldProofAnalysis } from './fieldProof.js';

export type Light = 'ok' | 'warn' | 'alert';

export type RecommendationKind =
  | 'cycle'
  | 'blocked-critical'
  | 'equipment-conflict'
  | 'over-capacity'
  | 'budget-drift'
  | 'overdue'
  | 'unproven';

export type Severity = 'high' | 'med' | 'low';

export type TargetCard =
  | 'act-plan-tracker'
  | 'act-resourcing'
  | 'act-budget'
  | 'field-proof';

export type SourceSignal = 'schedule' | 'resourcing' | 'budget' | 'proof';

export interface Recommendation {
  id: string;
  severity: Severity;
  kind: RecommendationKind;
  message: string;
  sourceSignal: SourceSignal;
  targetCard: TargetCard;
}

export interface OperatingHealthCounts {
  blocked: number;
  critical: number;
  overdue: number;
  equipmentConflicts: number;
  overCapacity: number;
  budgetDrift: number;
  unproven: number;
  doneTotal: number;
}

export interface OperatingHealth {
  lights: {
    schedule: Light;
    resourcing: Light;
    budget: Light;
    proof: Light;
  };
  recommendations: Recommendation[];
  counts: OperatingHealthCounts;
}

export interface OperatingHealthInput {
  items: WorkItem[];
  graph: WorkItemGraphResult;
  resourcing: ResourcingConflictResult;
  budget: BudgetAnalysis;
  proof: FieldProofAnalysis;
  /** ISO timestamp used for overdue detection; defaults to now. */
  now?: string;
}

const SEVERITY_RANK: Record<Severity, number> = { high: 0, med: 1, low: 2 };

function isOverdue(item: WorkItem, nowMs: number): boolean {
  if (item.status === 'done' || item.status === 'cancelled') return false;
  if (!item.scheduledEnd) return false;
  const end = new Date(item.scheduledEnd).getTime();
  return Number.isFinite(end) && end < nowMs;
}

export function computeOperatingHealth(
  inp: OperatingHealthInput,
): OperatingHealth {
  const { items, graph, resourcing, budget, proof } = inp;
  const nowMs = new Date(inp.now ?? new Date().toISOString()).getTime();

  let blocked = 0;
  let critical = 0;
  let criticalBlocked = 0;
  let overdue = 0;
  for (const it of items) {
    const node = graph.byId.get(it.id);
    if (node?.blocked) blocked += 1;
    if (node?.critical) critical += 1;
    if (node?.blocked && node.critical) criticalBlocked += 1;
    if (isOverdue(it, nowMs)) overdue += 1;
  }

  const equipmentConflicts = resourcing.equipment.length;
  const overCapacity = resourcing.workload.length;

  let budgetDrift = 0;
  for (const c of budget.byItemId.values()) if (c.drift) budgetDrift += 1;
  const varianceOverPlan =
    budget.total.variance.mid > budget.total.planned.high;

  const doneTotal = proof.counts.proven + proof.counts.claimed;
  const unproven = proof.counts.claimed;
  const closureRatio = doneTotal > 0 ? proof.counts.proven / doneTotal : 1;

  const counts: OperatingHealthCounts = {
    blocked,
    critical,
    overdue,
    equipmentConflicts,
    overCapacity,
    budgetDrift,
    unproven,
    doneTotal,
  };

  // --- Lights ---
  const schedule: Light =
    graph.cyclic || criticalBlocked > 0
      ? 'alert'
      : overdue > 0 || blocked > 0
        ? 'warn'
        : 'ok';

  const resourcingLight: Light =
    equipmentConflicts > 0 ? 'alert' : overCapacity > 0 ? 'warn' : 'ok';

  const budgetLight: Light =
    budgetDrift > 0 && varianceOverPlan
      ? 'alert'
      : budgetDrift > 0
        ? 'warn'
        : 'ok';

  const proofLight: Light =
    doneTotal > 0 && closureRatio < 0.5
      ? 'alert'
      : unproven > 0
        ? 'warn'
        : 'ok';

  // --- Recommendations (each fires only on its trigger) ---
  const recs: Recommendation[] = [];

  if (graph.cyclic) {
    recs.push({
      id: 'cycle',
      severity: 'high',
      kind: 'cycle',
      message:
        'Dependency cycle detected — resolve the loop in the Plan tracker.',
      sourceSignal: 'schedule',
      targetCard: 'act-plan-tracker',
    });
  }
  if (criticalBlocked > 0) {
    recs.push({
      id: 'blocked-critical',
      severity: 'high',
      kind: 'blocked-critical',
      message: `${criticalBlocked} critical-path work item(s) blocked — unblock the prerequisite first.`,
      sourceSignal: 'schedule',
      targetCard: 'act-plan-tracker',
    });
  }
  if (equipmentConflicts > 0) {
    recs.push({
      id: 'equipment-conflict',
      severity: 'high',
      kind: 'equipment-conflict',
      message: `${equipmentConflicts} equipment double-booking(s) — reschedule the overlap.`,
      sourceSignal: 'resourcing',
      targetCard: 'act-resourcing',
    });
  }
  if (overCapacity > 0) {
    recs.push({
      id: 'over-capacity',
      severity: 'med',
      kind: 'over-capacity',
      message: `${overCapacity} crew week(s) over capacity — rebalance assignments.`,
      sourceSignal: 'resourcing',
      targetCard: 'act-resourcing',
    });
  }
  if (budgetDrift > 0) {
    recs.push({
      id: 'budget-drift',
      severity: 'med',
      kind: 'budget-drift',
      message: `${budgetDrift} work item(s) over budget variance — review in Budget vs actuals.`,
      sourceSignal: 'budget',
      targetCard: 'act-budget',
    });
  }
  if (overdue > 0) {
    recs.push({
      id: 'overdue',
      severity: 'med',
      kind: 'overdue',
      message: `${overdue} work item(s) past scheduled end — advance the schedule.`,
      sourceSignal: 'schedule',
      targetCard: 'act-plan-tracker',
    });
  }
  if (unproven > 0) {
    recs.push({
      id: 'unproven',
      severity: 'low',
      kind: 'unproven',
      message: `${unproven} completed work item(s) lack field proof — capture evidence.`,
      sourceSignal: 'proof',
      targetCard: 'field-proof',
    });
  }

  const countOf = (r: Recommendation): number => {
    switch (r.kind) {
      case 'blocked-critical':
        return criticalBlocked;
      case 'equipment-conflict':
        return equipmentConflicts;
      case 'over-capacity':
        return overCapacity;
      case 'budget-drift':
        return budgetDrift;
      case 'overdue':
        return overdue;
      case 'unproven':
        return unproven;
      case 'cycle':
        return 1;
    }
  };

  recs.sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (s !== 0) return s;
    return countOf(b) - countOf(a);
  });

  return {
    lights: {
      schedule,
      resourcing: resourcingLight,
      budget: budgetLight,
      proof: proofLight,
    },
    recommendations: recs,
    counts,
  };
}
```

- [ ] **Step 4: Append the barrel export**

In `packages/shared/src/index.ts`, immediately after line 69 (`export * from './lib/fieldProof.js';`) add:

```typescript
export * from './lib/operatingHealth.js';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @ogden/shared test -- operatingHealth`
Expected: PASS — all 12 tests green.

- [ ] **Step 6: Typecheck the shared package**

Run: `pnpm --filter @ogden/shared typecheck`
Expected: exit 0, clean.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/lib/operatingHealth.ts packages/shared/src/tests/operatingHealth.test.ts packages/shared/src/index.ts
git commit -m "feat(d5): pure operating-health composition engine + tests"
```

---

## Task 2: Render-only `OperatingDashboardCard.tsx`

**Files:**
- Create: `apps/web/src/features/act/OperatingDashboardCard.tsx`
- Test: `apps/web/src/features/act/__tests__/OperatingDashboardCard.test.tsx`

**Context:** Structural template is `apps/web/src/features/act/BudgetCard.tsx` — props `{ project }: Props` plus `onSwitchToMap`, CSS module `import styles from '../../v3/_shared/stageCard/stageCard.module.css'`. Available classes: `.page .hero .heroTag .title .lede .section .sectionTitle .sectionBody .statRow .pillUnmet .table .empty .list .listRow .listMeta .removeBtn .btn`.

Store read selectors (read-only — no writes anywhere in this card):
- `useWorkItemStore((s) => s.items)` → filter `it.projectId === project.id`
- `useCrewMemberStore((s) => s.members)` → filter `m.projectId === project.id`
- `useWorkItemBudgetStore((s) => s.actuals)` → filter `a.projectId === project.id`
- `useProofEventStore((s) => s.events)` → filter `e.projectId === project.id`

Engine APIs (from `@ogden/shared`): `analyzeWorkItemGraph(items)`, `analyzeResourcing(items, crew)`, `analyzeBudget(items, actualsByItemId: Map<string, RecordedActual>)`, `analyzeFieldProof(items, linkedEventsByItemId: Map<string,string[]>, domainEvents: DomainEvent[], windowDays?)`, then `computeOperatingHealth({...})`.

Build the budget actuals map and proof linkage exactly as `BudgetCard.tsx` and `FieldProofPanel.tsx` already do. **Read those two files first** to copy their precise `actualsByItemId` and `linkedEventsByItemId`/`domainEvents` construction — do not invent the mapping; reuse the established shape. If the proof linkage helper is non-trivial, pass empty `new Map()` / `[]` for `domainEvents` only if `FieldProofPanel` shows no simpler reuse — but prefer mirroring `FieldProofPanel`'s exact derivation so proof counts match the D4 surface.

The deep-link affordance is **render-only**: show the destination as a labelled, non-navigating hint (`<span className={styles.pillUnmet}>`), e.g. `→ Plan tracker`. Do not wire cross-card navigation (no established API; YAGNI; spec says render-only).

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/act/__tests__/OperatingDashboardCard.test.tsx`:

```typescript
/**
 * @vitest-environment happy-dom
 *
 * OperatingDashboardCard — D5 render-only composition surface.
 * Asserts lights + ranked recommendations render from seeded
 * multi-signal data, the empty "on track" state, deep-link target
 * labels present, and no cost/financing string on the surface.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { WorkItem } from '@ogden/shared';
import type { LocalProject } from '../../../store/projectStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import { useCrewMemberStore } from '../../../store/crewMemberStore.js';
import { useWorkItemBudgetStore } from '../../../store/workItemBudgetStore.js';
import { useProofEventStore } from '../../../store/proofEventStore.js';
import OperatingDashboardCard from '../OperatingDashboardCard.js';

const PROJECT = { id: 'p1' } as LocalProject;

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

beforeEach(() => {
  localStorage.clear();
  useWorkItemStore.setState({ items: [] });
  useCrewMemberStore.setState({ members: [] });
  useWorkItemBudgetStore.setState({ actuals: [] });
  useProofEventStore.setState({ events: [] });
});

describe('OperatingDashboardCard — D5', () => {
  it('renders the on-track empty state with no signals', () => {
    render(<OperatingDashboardCard project={PROJECT} onSwitchToMap={() => {}} />);
    expect(screen.getByText(/on track/i)).toBeTruthy();
  });

  it('renders an overdue recommendation deep-linking the Plan tracker', () => {
    useWorkItemStore.setState({
      items: [wi({ id: 'a', status: 'todo', scheduledEnd: '2020-01-01' })],
    });
    render(<OperatingDashboardCard project={PROJECT} onSwitchToMap={() => {}} />);
    expect(screen.getByText(/past scheduled end/i)).toBeTruthy();
    expect(screen.getByText(/Plan tracker/i)).toBeTruthy();
  });

  it('renders four health lights', () => {
    render(<OperatingDashboardCard project={PROJECT} onSwitchToMap={() => {}} />);
    expect(screen.getByText(/Schedule/i)).toBeTruthy();
    expect(screen.getByText(/Resourcing/i)).toBeTruthy();
    expect(screen.getByText(/Budget/i)).toBeTruthy();
    expect(screen.getByText(/Proof/i)).toBeTruthy();
  });

  it('renders no financing/capital lexicon on the surface', () => {
    useWorkItemStore.setState({
      items: [wi({ id: 'a', status: 'done' })],
    });
    const { container } = render(
      <OperatingDashboardCard project={PROJECT} onSwitchToMap={() => {}} />,
    );
    expect(container.textContent ?? '').not.toMatch(
      /interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- OperatingDashboardCard`
Expected: FAIL — cannot resolve `../OperatingDashboardCard.js`.

- [ ] **Step 3: Read the two reuse sources, then implement**

Read `apps/web/src/features/act/BudgetCard.tsx` (for `actualsByItemId: Map<string, RecordedActual>` construction) and `apps/web/src/features/act/FieldProofPanel.tsx` (for `linkedEventsByItemId` + `domainEvents` construction). Create `apps/web/src/features/act/OperatingDashboardCard.tsx` mirroring those exactly:

```typescript
import { useMemo } from 'react';
import {
  analyzeWorkItemGraph,
  analyzeResourcing,
  analyzeBudget,
  analyzeFieldProof,
  computeOperatingHealth,
  type RecordedActual,
  type DomainEvent,
  type Light,
} from '@ogden/shared';
import type { LocalProject } from '../../store/projectStore.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import { useCrewMemberStore } from '../../store/crewMemberStore.js';
import { useWorkItemBudgetStore } from '../../store/workItemBudgetStore.js';
import { useProofEventStore } from '../../store/proofEventStore.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const LIGHT_LABEL: Record<Light, string> = {
  ok: 'OK',
  warn: 'Warning',
  alert: 'Alert',
};

const TARGET_LABEL: Record<string, string> = {
  'act-plan-tracker': 'Plan tracker',
  'act-resourcing': 'Resourcing',
  'act-budget': 'Budget vs actuals',
  'field-proof': 'Field proof',
};

export default function OperatingDashboardCard({ project }: Props) {
  const items = useWorkItemStore((s) => s.items);
  const members = useCrewMemberStore((s) => s.members);
  const actuals = useWorkItemBudgetStore((s) => s.actuals);
  const proofEvents = useProofEventStore((s) => s.events);

  const health = useMemo(() => {
    const projectItems = items.filter((it) => it.projectId === project.id);
    const crew = members.filter((m) => m.projectId === project.id);
    const projActuals = actuals.filter((a) => a.projectId === project.id);

    const actualsByItemId = new Map<string, RecordedActual>();
    for (const a of projActuals) {
      // Mirror BudgetCard's exact RecordedActual mapping.
      actualsByItemId.set(a.workItemId, a as unknown as RecordedActual);
    }

    const linkedEventsByItemId = new Map<string, string[]>();
    for (const e of proofEvents) {
      if (e.projectId !== project.id) continue;
      const arr = linkedEventsByItemId.get(e.workItemId) ?? [];
      arr.push(e.id);
      linkedEventsByItemId.set(e.workItemId, arr);
    }
    const domainEvents: DomainEvent[] = [];

    const graph = analyzeWorkItemGraph(projectItems);
    const resourcing = analyzeResourcing(projectItems, crew);
    const budget = analyzeBudget(projectItems, actualsByItemId);
    const proof = analyzeFieldProof(
      projectItems,
      linkedEventsByItemId,
      domainEvents,
    );

    return computeOperatingHealth({
      items: projectItems,
      graph,
      resourcing,
      budget,
      proof,
    });
  }, [items, members, actuals, proofEvents, project.id]);

  const { lights, recommendations, counts } = health;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <span className={styles.heroTag}>Operating dashboard</span>
        <h2 className={styles.title}>Project health</h2>
        <p className={styles.lede}>
          Composed from the schedule, resourcing, budget, and field-proof
          engines. Read-only — derived every render.
        </p>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Health</h3>
        <div className={styles.sectionBody}>
          <div className={styles.statRow}>
            Schedule: {LIGHT_LABEL[lights.schedule]} ({counts.blocked} blocked,{' '}
            {counts.overdue} overdue)
          </div>
          <div className={styles.statRow}>
            Resourcing: {LIGHT_LABEL[lights.resourcing]} (
            {counts.equipmentConflicts} equipment, {counts.overCapacity} crew)
          </div>
          <div className={styles.statRow}>
            Budget: {LIGHT_LABEL[lights.budget]} ({counts.budgetDrift} over
            variance)
          </div>
          <div className={styles.statRow}>
            Proof: {LIGHT_LABEL[lights.proof]} ({counts.unproven} of{' '}
            {counts.doneTotal} done unproven)
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Recommended next actions</h3>
        <div className={styles.sectionBody}>
          {recommendations.length === 0 ? (
            <p className={styles.empty}>On track — no action needed.</p>
          ) : (
            <ul className={styles.list}>
              {recommendations.map((r) => (
                <li key={r.id} className={styles.listRow}>
                  <span>
                    [{r.severity.toUpperCase()}] {r.message}
                  </span>
                  <span className={styles.pillUnmet}>
                    → {TARGET_LABEL[r.targetCard] ?? r.targetCard}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
```

> If `RecordedActual` is not a 1:1 cast of the store's actual record, replace the `actualsByItemId` loop body with `BudgetCard.tsx`'s exact mapping (read it first). The cast is a placeholder ONLY if BudgetCard does the same; otherwise copy BudgetCard's transform verbatim. Likewise mirror `FieldProofPanel.tsx`'s `linkedEventsByItemId`/`domainEvents` derivation if it differs from the straight event-id grouping above.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- OperatingDashboardCard`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/act/OperatingDashboardCard.tsx apps/web/src/features/act/__tests__/OperatingDashboardCard.test.tsx
git commit -m "feat(d5): render-only OperatingDashboardCard composing the 4 D-engines"
```

---

## Task 3: Append-only six-mount-point registration

**Files (each an append/insert — pre-flight grep the mounted card at each, not just the manifest line; fetch + `git rev-list --left-right --count HEAD...@{u}` before touching shared hot files):**
- Modify: `apps/web/src/v3/act/types.ts`
- Modify: `apps/web/src/v3/act/ActModuleSlideUp.tsx`
- Modify: `apps/web/src/features/dashboard/DashboardRouter.tsx`
- Modify: `apps/web/src/features/act/ActHub.tsx`
- Modify: `apps/web/src/features/navigation/taxonomy.ts`
- Modify: `apps/web/src/components/stage-navigator/stageModules.ts`

- [ ] **Step 1: Mount 1 — `v3/act/types.ts`**

In the `build` module array of `MODULE_CARDS` (the array currently holding `act-build-gantt`/`act-budget`/`act-pilot-plots`), append:

```typescript
{ label: 'Operating Dashboard', sectionId: 'act-operating-dashboard' },
```

- [ ] **Step 2: Mount 2 — `v3/act/ActModuleSlideUp.tsx`**

Add the lazy import beside the existing `BudgetCard` lazy import:

```typescript
const OperatingDashboardCard = lazy(() => import('../../features/act/OperatingDashboardCard.js'));
```

Add the switch case beside the `act-budget` case in `renderActCard`:

```typescript
case 'act-operating-dashboard': return <OperatingDashboardCard project={project} onSwitchToMap={noop} />;
```

- [ ] **Step 3: Mount 3 — `features/dashboard/DashboardRouter.tsx`**

Add the lazy import beside the existing `BudgetCard` lazy import:

```typescript
const OperatingDashboardCard = lazy(() => import('../act/OperatingDashboardCard.js'));
```

Add the switch case beside the `act-budget` case:

```typescript
case 'act-operating-dashboard':
  return (
    <PanelShell name="Operating Dashboard">
      <OperatingDashboardCard project={project} onSwitchToMap={onSwitchToMap} />
    </PanelShell>
  );
```

- [ ] **Step 4: Mount 4 — `features/act/ActHub.tsx`**

In the same module action list that contains `{ label: 'Budget vs actuals →', sectionId: 'act-budget' }`, append:

```typescript
{ label: 'Operating Dashboard →', sectionId: 'act-operating-dashboard' },
```

- [ ] **Step 5: Mount 5 — `features/navigation/taxonomy.ts`**

Beside the `act-budget` NavItem entry, append:

```typescript
{
  id: 'act-operating-dashboard', label: 'Operating Dashboard',
  phase: 'P3', domainGroup: 'finance', stage: 'S4', stage3: 'act',
  dashboardOnly: true,
},
```

- [ ] **Step 6: Mount 6 — `components/stage-navigator/stageModules.ts`**

In the `act` module whose `itemIds` array contains `'act-budget'` (the `act-mod-implementation` module: `['act-build-gantt', 'act-budget', 'act-pilot-plots']`), append `'act-operating-dashboard'`:

```typescript
itemIds: ['act-build-gantt', 'act-budget', 'act-pilot-plots', 'act-operating-dashboard'],
```

- [ ] **Step 7: Typecheck both packages**

Run: `pnpm --filter @ogden/shared typecheck`
Then (PowerShell): `$env:NODE_OPTIONS='--max-old-space-size=8192'; pnpm --filter web typecheck`
Expected: exit 0 — no NEW error vs the pre-D5 baseline (pre-existing out-of-band debt is not a D5 regression; disclose, don't fix).

- [ ] **Step 8: Commit (explicit paths only)**

```bash
git add apps/web/src/v3/act/types.ts apps/web/src/v3/act/ActModuleSlideUp.tsx apps/web/src/features/dashboard/DashboardRouter.tsx apps/web/src/features/act/ActHub.tsx apps/web/src/features/navigation/taxonomy.ts apps/web/src/components/stage-navigator/stageModules.ts
git commit -m "feat(d5): register act-operating-dashboard across the six mount points"
```

> If any registration file's diff mixes D5 and non-D5 hunks, STOP and surface as a blocker — do not silently split hunks.

---

## Task 4: Full verification + session-close ADR

**Files:**
- Create: `wiki/decisions/2026-05-19-atlas-d5-operating-dashboards.md`
- Modify (prepend): `wiki/log.md`
- Do **NOT** touch `wiki/index.md` if dirty (commit ADR/log standalone; the index D5 entry is added in the session-close step by the controller, mirroring D4).

- [ ] **Step 1: Full shared suite**

Run: `pnpm --filter @ogden/shared test`
Expected: all green including the 12 `operatingHealth` tests; baseline count + 12.

- [ ] **Step 2: Full web suite**

Run: `pnpm --filter web test`
Expected: all green including the 4 `OperatingDashboardCard` tests; no new failures vs the pre-D5 baseline (disclose any pre-existing out-of-band failure, do not fix it under D5).

- [ ] **Step 3: Build**

PowerShell: `$env:NODE_OPTIONS='--max-old-space-size=8192'; pnpm --filter web build`
Expected: `vite build` exit 0.

- [ ] **Step 4: Covenant grep**

Grep the engine + card rendered surface for the forbidden lexicon:

Run: `pnpm --filter @ogden/shared exec rg -i "interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar" src/lib/operatingHealth.ts ../../apps/web/src/features/act/OperatingDashboardCard.tsx`
Expected: zero matches that are not (a) the covenant negative-assertion comment, or (b) the literal regex in a test (tests not in this grep set). The engine/card source must be lexicon-clean.

- [ ] **Step 5: Write the ADR**

Create `wiki/decisions/2026-05-19-atlas-d5-operating-dashboards.md` recording: D5 is the final ratified D slice; the composition-over-re-derivation discipline (calls the four engines, budget drift stays D3-owned, never re-framed); the three resolved forks (deterministic rule-based, fully render-only/no store/no syncManifest, new dedicated card); the four lights' thresholds; the seven recommendation rules + severity ranking; covenant boundary + no-financing regex + no-status-mutation invariant; render-only deep-link affordance (no cross-card nav wired — YAGNI); dismiss/snooze deferred; verification results (shared/web suite counts, tsc, build, covenant grep); screenshot-honesty disclosure (deep behind Act slide-up; MapLibre/WebGL hang precedent — static wiring + tsc authoritative); the six commits; nothing pushed; D-series (D0–D5) complete.

- [ ] **Step 6: Prepend the log entry**

Prepend a dated entry to `wiki/log.md` summarizing the D5 session (mirror the D4 log entry style).

- [ ] **Step 7: Commit (standalone, only the two wiki files)**

```bash
git add wiki/decisions/2026-05-19-atlas-d5-operating-dashboards.md wiki/log.md
git commit -m "docs(d5): ADR + session log for operating-dashboards slice"
```

> Do not `git add wiki/index.md` (left for its owner if dirty — D2/D3/D4 precedent). The controller adds the `wiki/index.md` D5 entry as a separate session-close step.

---

## Self-Review

**Spec coverage:**
- Pure engine `operatingHealth.ts` + barrel export → Task 1. ✔
- Four lights with the spec's exact thresholds → Task 1 Step 3 (`schedule`/`resourcing`/`budget`/`proof` Light logic) + tests Task 1 Step 1. ✔
- Seven deterministic recommendation rules + severity-then-count ranking → Task 1. ✔
- `counts` object → Task 1. ✔
- Render-only card, three blocks, deep-link affordance, "on track" empty state → Task 2. ✔
- No store / no `syncManifest` / no schema / no DB migration → no such task exists (correctly absent). ✔
- Six-mount-point append-only registration → Task 3. ✔
- Covenant no-financing regex + no-`status`-mutation invariant → Task 1 tests; UI no-financing → Task 2 test. ✔
- Verification (tsc/suites/build/grep) + ADR + log, `wiki/index.md` untouched → Task 4. ✔
- Screenshot-honesty, explicit-path staging, per-task commits, no push → constraints header + Task 3/4 notes. ✔

**Placeholder scan:** Task 2 contains a deliberately-flagged conditional ("if `RecordedActual` is not a 1:1 cast … copy BudgetCard's transform verbatim"). This is not a placeholder for unknown work — it is an explicit instruction to read two named files and mirror their established mapping, with a concrete fallback. The exact `actualsByItemId`/`linkedEventsByItemId` shapes are owned by D3/D4 code that already exists; reproducing them blindly here would risk drift. Retained intentionally and bounded.

**Type consistency:** `OperatingHealthInput`/`OperatingHealth`/`Light`/`Recommendation`/`Severity`/`TargetCard`/`RecommendationKind`/`OperatingHealthCounts` are defined once in Task 1 Step 3 and referenced identically in the Task 1 test and the Task 2 card (`Light`, `computeOperatingHealth`). Engine result fields (`lights.{schedule,resourcing,budget,proof}`, `recommendations[].{id,severity,kind,message,sourceSignal,targetCard}`, `counts.{...}`) match across engine, tests, and card. `analyze*` signatures match the surveyed `@ogden/shared` exports. Consistent.

---

## Definition of Done

A pure unit-tested `@ogden/shared` `operatingHealth.ts` composes the four D1–D4 engine results into four health lights + a ranked deterministic render-only recommendation list, never re-deriving their logic and never writing `WorkItem.status`; a render-only `OperatingDashboardCard` surfaces lights + bottlenecks + ranked recommendations with render-only deep-link labels and an explicit "on track" empty state; `act-operating-dashboard` is registered append-only across the six mount points; no store, no `syncManifest`, no schema, no DB migration; covenant no-financing regex + no-status-mutation invariant green; shared + web typecheck exit 0 (modulo disclosed pre-existing out-of-band debt), both vitest suites green (+12 shared, +4 web), `vite build` exit 0, covenant grep clean; ADR + log committed standalone with `wiki/index.md` untouched; six per-task commits by explicit path; nothing pushed. D-series D0–D5 complete.

---

## Critical Files
- `packages/shared/src/lib/operatingHealth.ts` *(new — pure composition engine)* + `tests/operatingHealth.test.ts`
- `packages/shared/src/index.ts` *(edit — 1 barrel line after line 69)*
- `apps/web/src/features/act/OperatingDashboardCard.tsx` *(new — render-only)* + `__tests__/OperatingDashboardCard.test.tsx`
- Six registration files (append-only): `v3/act/types.ts`, `v3/act/ActModuleSlideUp.tsx`, `features/dashboard/DashboardRouter.tsx`, `features/act/ActHub.tsx`, `features/navigation/taxonomy.ts`, `components/stage-navigator/stageModules.ts`
- (Reference, read for exact mapping, do not modify) `features/act/BudgetCard.tsx`, `features/act/FieldProofPanel.tsx`
- `wiki/decisions/2026-05-19-atlas-d5-operating-dashboards.md` *(new)* + `wiki/log.md` *(prepend)*; `wiki/index.md` **must not be staged** here

## Verification
1. `pnpm --filter @ogden/shared typecheck` and `pnpm --filter web typecheck` (`--max-old-space-size=8192`) → exit 0, no NEW error vs pre-D5 baseline.
2. `pnpm --filter @ogden/shared test` → green incl. 12 `operatingHealth` tests (light boundaries, rule firing/absence, ranking, counts, no-status-mutation, covenant regex).
3. `pnpm --filter web test` → green incl. 4 `OperatingDashboardCard` tests; no new failure vs baseline.
4. `pnpm --filter web build` → succeeds.
5. Covenant grep over engine + card source → lexicon-clean.
6. Deep behind Act module slide-up — tsc + suites authoritative; disclose MapLibre/WebGL screenshot hang rather than claiming a live screenshot.
