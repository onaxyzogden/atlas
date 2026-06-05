# D4 — Field Execution & Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the plan→field loop on the OGDEN Atlas WorkItem spine: let a steward record that a planned work item was executed, link it to immutable D0 domain-event evidence (or a generic fallback), and surface a Proven/Claimed/Open proof board plus render-only "this recent event probably fulfils that item" suggestions that only write on explicit confirmation.

**Architecture:** Mirrors the D1/D2/D3 spine discipline exactly — pure unit-tested engine in `@ogden/shared/lib/` → additive `@ogden/shared` schema (no migration) → projectId-tagged Zustand store (syncManifest-registered) → a spine-only single-writer `workItemStore` action → a well-bounded Act child panel + a thin orchestration helper. **Layering reconciliation (deliberate, vs the spec's prose):** `workItemStore.fulfilWorkItem` is kept *spine-only* (status/doneAt/actualStart/actualEnd/who) so `workItemStore` keeps zero app-store dependencies, exactly as it does today. The spec's "routes typed domain event or fallback proofEvent" responsibility lives in a thin non-store orchestrator `fieldProofActions.ts` that composes the domain store / proofEventStore *then* calls `fulfilWorkItem` — structurally identical to how `RotationScheduleCard` already does `updateItem(...)` + `updateEvent(...)` side-by-side. Net behaviour matches the spec; the single completion writer of the spine is still exactly one action.

**Tech Stack:** TypeScript, Zod, Zustand 5 + `persist`, Vitest (+ happy-dom for store/UI tests), React 18, pnpm + Turborepo (`@ogden/shared`, `@ogden/web`). Windows / PowerShell.

---

## Conventions for every command in this plan

Run from the atlas repo root: `C:\Users\MY OWN AXIS\Documents\MAQASID OS - V2.1\atlas`.

pnpm is invoked through its `.cmd` shim in PowerShell:

```powershell
$pnpm = Join-Path $env:APPDATA 'npm\pnpm.cmd'
```

- Shared unit test (single file):
  `& $pnpm --filter @ogden/shared test -- <pattern>`
- Web unit test (single file):
  `& $pnpm --filter web test -- <pattern>`
- Shared typecheck: `& $pnpm --filter @ogden/shared typecheck`
- Web typecheck: `& $pnpm --filter web typecheck`
  (the typecheck scripts already bake `--max-old-space-size=8192`)
- Build: `$env:NODE_OPTIONS = '--max-old-space-size=8192'; & $pnpm --filter web build`
  (default Node heap OOMs on `vite build`; this is environment, not code)

**Commit posture (binding, from the spec):** explicit-path staging **only** — never `git add -A`/`.`. Each task commits exactly the files it created/modified, by path. The working tree carries concurrent out-of-band D0 streams and the uncommitted D3 tree — **do not** stage D3 files or `wiki/index.md`. Do **not** push (the branch is rebased out-of-band; pushing is a separate explicit instruction).

---

## File Structure

**`@ogden/shared` (pure, no React/store):**
- Create `packages/shared/src/schemas/proofEvent.schema.ts` — the generic fallback proof record schema.
- Create `packages/shared/src/lib/fieldProof.ts` — pure proof engine (`ProofState`, `routeProofTarget`, `classifyProof`, `suggestProofMatches`, `analyzeFieldProof`).
- Modify `packages/shared/src/index.ts` — export the two new modules.
- Create `packages/shared/src/tests/fieldProof.test.ts` — engine unit tests + covenant + no-status-mutation invariant.

**`@ogden/web` (store + surface):**
- Create `apps/web/src/store/proofEventStore.ts` — projectId-tagged generic-proof CRUD.
- Create `apps/web/src/store/__tests__/proofEventStore.test.ts` — store CRUD/isolation.
- Modify `apps/web/src/lib/syncManifest.ts` — register the new store (one `blob(...)` line).
- Modify `apps/web/src/store/workItemStore.ts` — add spine-only `fulfilWorkItem` / `unfulfilWorkItem`.
- Create `apps/web/src/store/__tests__/workItemStore.fulfil.test.ts` — single-writer + idempotence hard gate.
- Create `apps/web/src/features/act/fieldProofActions.ts` — thin orchestrator (typed-event stamp **or** generic fallback) + spine fulfil.
- Create `apps/web/src/features/act/FieldProofPanel.tsx` — proof board / capture editor / render-only suggestions.
- Modify `apps/web/src/features/act/PlanExecutionTrackerCard.tsx` — import + mount the panel (no manifest change).

No `workItem.schema.ts` change (the link lives on the event side, `workItemId`). No DB migration. No new Act manifest entry.

---

### Task 1: Generic proof-event schema

**Files:**
- Create: `packages/shared/src/schemas/proofEvent.schema.ts`
- Modify: `packages/shared/src/index.ts:54` (add export beside `costRange.schema`)
- Test: covered by Task 2's engine test importing the type; no standalone schema test (mirrors `costRange.schema.ts` which has none).

- [ ] **Step 1: Create the schema**

Create `packages/shared/src/schemas/proofEvent.schema.ts`:

```ts
/**
 * ProofEvent — the generic field-proof fallback record (Sub-project D4).
 *
 * D4 proves a planned `WorkItem` was executed in the field. When a typed
 * D0 domain event fits (maintenance / livestock-move / nursery), that real
 * event carries the proof via its existing optional `workItemId` back-link.
 * When no typed class fits (`routeProofTarget` → 'generic'), this record is
 * the proof instead. The back-link always lives on the event side, exactly
 * like the 5 D0 domain-event schemas — so the WorkItem spine schema is
 * unchanged (no DB migration, no literal-site churn).
 *
 * Steward/field-authored only — Goal Compass never authors field proof, so
 * there is NO generated-vs-overridden preservation contract.
 *
 * Covenant (D4, binding): strictly operational field-execution proof. No
 * cost, financing, capital, investor, yield-as-return, riba, gharar, salam
 * field or framing — those stay in Scholar-gated Sub-project C.
 */

import { z } from 'zod';

export const ProofEventSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    /** The WorkItem this event proves complete (D0-style back-link). */
    workItemId: z.string().min(1),
    /** Steward / contractor who executed the work. */
    actorWho: z.string().optional(),
    actualStart: z.string().nullable().optional(),
    actualEnd: z.string().nullable().optional(),
    notes: z.string().optional(),
    /** Reference-only evidence — no binary upload (explicit YAGNI). */
    evidence: z
      .object({
        photoRef: z.string(),
        geo: z.tuple([z.number(), z.number()]).optional(),
      })
      .optional(),
    createdAt: z.string(),
  })
  .passthrough();

export type ProofEvent = z.infer<typeof ProofEventSchema>;
```

- [ ] **Step 2: Export it from the package barrel**

In `packages/shared/src/index.ts`, the line at 54 is:

```ts
export * from './schemas/costRange.schema.js';
```

Add immediately **after** it:

```ts
export * from './schemas/proofEvent.schema.js';
```

- [ ] **Step 3: Typecheck shared**

Run: `& $pnpm --filter @ogden/shared typecheck`
Expected: exit 0, clean.

- [ ] **Step 4: Commit**

```powershell
git add packages/shared/src/schemas/proofEvent.schema.ts packages/shared/src/index.ts
git commit -m "feat(d4): generic ProofEvent fallback schema"
```

---

### Task 2: Pure field-proof engine

**Files:**
- Create: `packages/shared/src/lib/fieldProof.ts`
- Modify: `packages/shared/src/index.ts:67` (add export beside `budgetVariance`)
- Test: `packages/shared/src/tests/fieldProof.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/tests/fieldProof.test.ts`:

```ts
/**
 * fieldProof — pure D4 engine unit tests. Operational field-proof only:
 * proof-state classification, source→typed-store routing (harvest excluded),
 * render-only window suggestions. Never reads or writes WorkItem.status.
 * Covenant: no financing/capital framing.
 */

import { describe, it, expect } from 'vitest';
import type { WorkItem } from '../schemas/workItem.schema.js';
import {
  routeProofTarget,
  classifyProof,
  suggestProofMatches,
  analyzeFieldProof,
  type DomainEvent,
} from '../lib/fieldProof.js';

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

describe('fieldProof — pure D4 engine', () => {
  it('routeProofTarget maps typed sources; everything else is generic', () => {
    expect(routeProofTarget('maintenance')).toBe('maintenance');
    expect(routeProofTarget('scheduled-livestock-move')).toBe('livestock-move');
    expect(routeProofTarget('nursery-batch')).toBe('nursery');
    // goal-compass / field-task / manual have no typed proof class.
    expect(routeProofTarget('goal-compass')).toBe('generic');
    expect(routeProofTarget('field-task')).toBe('generic');
    expect(routeProofTarget('manual')).toBe('generic');
  });

  it('classifyProof: done+event=proven, done+none=claimed, not-done=open', () => {
    expect(classifyProof(wi({ id: 'a', status: 'done' }), ['e1'])).toBe('proven');
    expect(classifyProof(wi({ id: 'b', status: 'done' }), [])).toBe('claimed');
    expect(classifyProof(wi({ id: 'c', status: 'todo' }), ['e1'])).toBe('open');
    expect(classifyProof(wi({ id: 'd', status: 'in-progress' }), [])).toBe('open');
  });

  it('suggestProofMatches: in-window typed event for a not-done item; out-of-window skipped; render-only', () => {
    const items = [
      wi({
        id: 'm1',
        source: 'maintenance',
        status: 'todo',
        scheduledStart: '2026-05-10',
        scheduledEnd: '2026-05-10',
      }),
      wi({ id: 'm2', source: 'maintenance', status: 'todo' }), // no schedule → skipped
      wi({
        id: 'm3',
        source: 'maintenance',
        status: 'done', // already done → not suggested
        scheduledStart: '2026-05-10',
      }),
    ];
    const events: DomainEvent[] = [
      { id: 'ev-near', store: 'maintenance', projectId: 'p1', date: '2026-05-12' },
      { id: 'ev-far', store: 'maintenance', projectId: 'p1', date: '2026-07-01' },
      { id: 'ev-other', store: 'nursery', projectId: 'p1', date: '2026-05-10' },
    ];
    const before = JSON.parse(JSON.stringify({ items, events }));

    const s = suggestProofMatches(items, events, 7);

    expect(s).toEqual([
      { itemId: 'm1', eventId: 'ev-near', store: 'maintenance', daysApart: 2 },
    ]);
    // pure: inputs untouched
    expect({ items, events }).toEqual(before);
  });

  it('analyzeFieldProof: per-item state + counts rollup', () => {
    const items = [
      wi({ id: 'i1', status: 'done' }),
      wi({ id: 'i2', status: 'done' }),
      wi({ id: 'i3', status: 'todo' }),
    ];
    const linked = new Map<string, string[]>([
      ['i1', ['proof-1']],
      ['i2', []],
    ]);
    const a = analyzeFieldProof(items, linked, [], 7);
    expect(a.byItemId.get('i1')).toBe('proven');
    expect(a.byItemId.get('i2')).toBe('claimed');
    expect(a.byItemId.get('i3')).toBe('open');
    expect(a.counts).toEqual({ proven: 1, claimed: 1, open: 1 });
  });

  it('never reads or writes WorkItem.status (derived-only spine discipline)', () => {
    const items = [wi({ id: 's1', status: 'todo' })];
    const before = JSON.parse(JSON.stringify(items));
    const a = analyzeFieldProof(items, new Map(), [], 7);
    expect(items).toEqual(before);
    expect(items[0]!.status).toBe('todo');
    // result carries no raw status field anywhere
    expect(JSON.stringify({
      byItemId: [...a.byItemId.entries()],
      suggestions: a.suggestions,
      counts: a.counts,
    })).not.toMatch(/status/i);
  });

  it('covenant: no financing/capital/investor semantics in the engine surface', () => {
    const items = [wi({ id: 'x', status: 'done' })];
    const a = analyzeFieldProof(items, new Map([['x', ['p']]]), [], 7);
    const json = JSON.stringify({
      byItemId: [...a.byItemId.entries()],
      suggestions: a.suggestions,
      counts: a.counts,
    });
    expect(json).not.toMatch(
      /interest|riba|invest|equity|capital|financ|loan|yield|return|salam|gharar/i,
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `& $pnpm --filter @ogden/shared test -- fieldProof`
Expected: FAIL — `Cannot find module '../lib/fieldProof.js'`.

- [ ] **Step 3: Write the engine**

Create `packages/shared/src/lib/fieldProof.ts`:

```ts
/**
 * fieldProof — the pure field-execution-proof engine (Sub-project D4).
 *
 * No React, no store, no I/O. Owns the derived, render-only proof surfaces:
 *
 *   1. proof state per WorkItem — proven (done + a linked proof event) /
 *      claimed (done, no event) / open (not done);
 *   2. source → typed-D0-store routing (which immutable event log, if any,
 *      should carry a typed proof for this item; else 'generic' fallback);
 *   3. render-only "this recent domain event probably fulfils that item"
 *      window suggestions — candidates only, NEVER a write.
 *
 * Derived only — NEVER written back into `WorkItem.status` (single-writer
 * spine discipline, consistent with D0.1 / D1 / D2 / D3). Defensive: items
 * missing dates are skipped rather than throwing.
 *
 * Covenant (D4, binding): strictly operational field-execution proof. No
 * cost, financing, capital, investor, yield-as-return, riba, gharar, salam
 * computation anywhere — those stay in Scholar-gated Sub-project C.
 */

import type { WorkItem } from '../schemas/workItem.schema.js';
import type { WorkItemSource } from '../schemas/workItem.schema.js';

/** Which immutable D0 event log carries a typed proof for a source. */
export type ProofTarget =
  | 'maintenance'
  | 'livestock-move'
  | 'nursery'
  | 'generic';

export type ProofState = 'proven' | 'claimed' | 'open';

/** Normalised domain event the caller maps its D0 store rows into. */
export interface DomainEvent {
  id: string;
  store: Exclude<ProofTarget, 'generic'>;
  projectId: string;
  /** ISO date the event occurred. */
  date: string;
}

export interface ProofSuggestion {
  itemId: string;
  eventId: string;
  store: Exclude<ProofTarget, 'generic'>;
  daysApart: number;
}

export interface FieldProofAnalysis {
  byItemId: Map<string, ProofState>;
  suggestions: ProofSuggestion[];
  counts: { proven: number; claimed: number; open: number };
}

/**
 * Map a WorkItem's legacy-origin `source` to the typed D0 event log that
 * should carry its proof, else 'generic'. Harvest is deliberately absent:
 * a WorkItem is a planned task, not "a harvest" — harvest entries stay
 * their own D0 log and are never auto-treated as task proof.
 */
export function routeProofTarget(source: WorkItemSource): ProofTarget {
  switch (source) {
    case 'maintenance':
      return 'maintenance';
    case 'scheduled-livestock-move':
      return 'livestock-move';
    case 'nursery-batch':
      return 'nursery';
    default:
      return 'generic';
  }
}

/**
 * proven = status 'done' AND at least one linked proof event id;
 * claimed = status 'done' with no linked event; open = not done.
 */
export function classifyProof(
  item: Pick<WorkItem, 'status'>,
  linkedEventIds: readonly string[],
): ProofState {
  if (item.status !== 'done') return 'open';
  return linkedEventIds.length > 0 ? 'proven' : 'claimed';
}

/** Absolute whole-day distance between two ISO dates. */
function daysApart(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return Number.POSITIVE_INFINITY;
  return Math.abs(Math.round((da - db) / 86_400_000));
}

/**
 * Render-only. For each not-done item with a scheduled anchor date, finds
 * recent same-project domain events of the item's routed typed store within
 * `windowDays`; returns the single closest candidate per item. Pure — never
 * mutates inputs, never writes. The caller decides whether to act.
 */
export function suggestProofMatches(
  items: WorkItem[],
  domainEvents: DomainEvent[],
  windowDays = 7,
): ProofSuggestion[] {
  const out: ProofSuggestion[] = [];
  for (const it of items) {
    if (it.status === 'done') continue;
    const target = routeProofTarget(it.source);
    if (target === 'generic') continue;
    const anchor = it.scheduledStart ?? it.scheduledEnd;
    if (!anchor) continue;
    let best: ProofSuggestion | undefined;
    for (const ev of domainEvents) {
      if (ev.store !== target) continue;
      if (ev.projectId !== it.projectId) continue;
      const d = daysApart(anchor, ev.date);
      if (d > windowDays) continue;
      if (!best || d < best.daysApart) {
        best = { itemId: it.id, eventId: ev.id, store: target, daysApart: d };
      }
    }
    if (best) out.push(best);
  }
  return out;
}

/**
 * Pure rollup: classify every item's proof state, compute render-only
 * suggestions, and total the state counts. `linkedEventsByItemId` is keyed
 * by `WorkItem.id` (absent ⇒ no linked events). Nothing reads or writes
 * `WorkItem.status`.
 */
export function analyzeFieldProof(
  items: WorkItem[],
  linkedEventsByItemId: Map<string, string[]>,
  domainEvents: DomainEvent[],
  windowDays = 7,
): FieldProofAnalysis {
  const byItemId = new Map<string, ProofState>();
  const counts = { proven: 0, claimed: 0, open: 0 };
  for (const it of items) {
    const state = classifyProof(it, linkedEventsByItemId.get(it.id) ?? []);
    byItemId.set(it.id, state);
    counts[state] += 1;
  }
  return {
    byItemId,
    suggestions: suggestProofMatches(items, domainEvents, windowDays),
    counts,
  };
}
```

- [ ] **Step 4: Export it from the package barrel**

In `packages/shared/src/index.ts`, the line at 67 is:

```ts
export * from './lib/budgetVariance.js';
```

Add immediately **after** it:

```ts
export * from './lib/fieldProof.js';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `& $pnpm --filter @ogden/shared test -- fieldProof`
Expected: PASS — 6 tests green.

- [ ] **Step 6: Typecheck shared**

Run: `& $pnpm --filter @ogden/shared typecheck`
Expected: exit 0, clean.

- [ ] **Step 7: Commit**

```powershell
git add packages/shared/src/lib/fieldProof.ts packages/shared/src/tests/fieldProof.test.ts packages/shared/src/index.ts
git commit -m "feat(d4): pure field-proof engine (classify/route/suggest) + tests"
```

---

### Task 3: Generic-proof store + syncManifest registration

**Files:**
- Create: `apps/web/src/store/proofEventStore.ts`
- Modify: `apps/web/src/lib/syncManifest.ts` (one new `blob(...)` line + import)
- Test: `apps/web/src/store/__tests__/proofEventStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/store/__tests__/proofEventStore.test.ts`:

```ts
// @vitest-environment happy-dom
/**
 * proofEventStore — projectId-tagged generic-proof CRUD (Sub-project D4).
 * Steward/field-authored only; no Goal-Compass preservation contract.
 * Add/remove are project-isolated; orphans are retained by design.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useProofEventStore } from '../proofEventStore.js';
import type { ProofEvent } from '@ogden/shared';

function pe(partial: Partial<ProofEvent> & { id: string; workItemId: string }): ProofEvent {
  return {
    projectId: 'p1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

const reset = () => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useProofEventStore.setState({ events: [] });
};

describe('proofEventStore', () => {
  beforeEach(reset);

  it('adds, updates, and removes a proof event', () => {
    const s = useProofEventStore.getState();
    s.addProofEvent(pe({ id: 'pf1', workItemId: 'w1' }));
    expect(useProofEventStore.getState().events).toHaveLength(1);

    useProofEventStore.getState().updateProofEvent('pf1', { notes: 'done by hand' });
    expect(useProofEventStore.getState().events[0]!.notes).toBe('done by hand');

    useProofEventStore.getState().removeProofEvent('pf1');
    expect(useProofEventStore.getState().events).toHaveLength(0);
  });

  it('scopes getProjectProofEvents to a single project', () => {
    useProofEventStore.setState({
      events: [
        pe({ id: 'a', workItemId: 'w1', projectId: 'p1' }),
        pe({ id: 'b', workItemId: 'w2', projectId: 'p1' }),
        pe({ id: 'c', workItemId: 'w3', projectId: 'p2' }),
      ],
    });
    expect(
      useProofEventStore.getState().getProjectProofEvents('p1').map((e) => e.id),
    ).toEqual(['a', 'b']);
    expect(
      useProofEventStore.getState().getProjectProofEvents('p2').map((e) => e.id),
    ).toEqual(['c']);
  });

  it('retains orphan events (no cascade) when its WorkItem is gone', () => {
    useProofEventStore.setState({ events: [pe({ id: 'orph', workItemId: 'gone' })] });
    // Nothing cascades — the audit row stays until explicitly removed.
    expect(useProofEventStore.getState().getProjectProofEvents('p1')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `& $pnpm --filter web test -- proofEventStore`
Expected: FAIL — `Cannot find module '../proofEventStore.js'`.

- [ ] **Step 3: Write the store**

Create `apps/web/src/store/proofEventStore.ts`:

```ts
/**
 * proofEventStore — net-new generic field-proof ledger on the WorkItem
 * spine (Sub-project D4).
 *
 * Holds the generic fallback `ProofEvent` rows (used when
 * `routeProofTarget` returns 'generic'). Typed proofs instead live on the
 * existing D0 domain-event stores via their optional `workItemId`. Plain
 * projectId-tagged CRUD, mirroring `ogden-work-item-actuals` /
 * `ogden-work-items`. Client-first, no DB migration. Registered in
 * `syncManifest` as `projectId-tagged`.
 *
 * Steward/field-authored only — Goal Compass never authors field proof, so
 * there is NO generated-vs-overridden preservation contract.
 *
 * Orphans by design: if a WorkItem is deleted its proof row remains until
 * the steward removes it explicitly — the audit history stays intact, no
 * cascade-delete (mirrors the D3 actuals discipline).
 *
 * Covenant (D4, binding): strictly operational field-execution proof. No
 * cost / financing / capital / investor / yield-as-return semantics — those
 * stay in Scholar-gated Sub-project C.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProofEvent } from '@ogden/shared';

interface ProofEventState {
  events: ProofEvent[];
  addProofEvent: (e: ProofEvent) => void;
  updateProofEvent: (id: string, patch: Partial<ProofEvent>) => void;
  removeProofEvent: (id: string) => void;
  getProjectProofEvents: (projectId: string) => ProofEvent[];
}

export const useProofEventStore = create<ProofEventState>()(
  persist(
    (set, get) => ({
      events: [],
      addProofEvent: (e) => set((s) => ({ events: [...s.events, e] })),
      updateProofEvent: (id, patch) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      removeProofEvent: (id) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      getProjectProofEvents: (projectId) =>
        get().events.filter((e) => e.projectId === projectId),
    }),
    {
      name: 'ogden-work-item-proof',
      version: 1,
      partialize: (state) => ({ events: state.events }),
    },
  ),
);

useProofEventStore.persist.rehydrate();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `& $pnpm --filter web test -- proofEventStore`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Register in syncManifest (coverage guard)**

In `apps/web/src/lib/syncManifest.ts`, find the import group for stores and add (next to the `useWorkItemBudgetStore` import — search the file for `workItemBudgetStore` to locate the import line, and add an analogous one):

```ts
import { useProofEventStore } from '../store/proofEventStore.js';
```

Then in the `projectId-tagged` blob list, immediately **after** this line (currently line 337):

```ts
  blob('ogden-work-item-actuals', useWorkItemBudgetStore, 'projectId-tagged', 1, tagged('actuals')),
```

add:

```ts
  blob('ogden-work-item-proof', useProofEventStore, 'projectId-tagged', 1, tagged('events')),
```

- [ ] **Step 6: Run the syncManifest coverage tests**

Run: `& $pnpm --filter web test -- syncManifest`
Expected: PASS — the coverage guard recognises `ogden-work-item-proof` (no "unregistered store" failure).

- [ ] **Step 7: Commit**

```powershell
git add apps/web/src/store/proofEventStore.ts apps/web/src/store/__tests__/proofEventStore.test.ts apps/web/src/lib/syncManifest.ts
git commit -m "feat(d4): proofEventStore (projectId-tagged) + syncManifest registration"
```

---

### Task 4: Spine-only single-writer `fulfilWorkItem` / `unfulfilWorkItem`

**Files:**
- Modify: `apps/web/src/store/workItemStore.ts` (interface + two actions)
- Test: `apps/web/src/store/__tests__/workItemStore.fulfil.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/store/__tests__/workItemStore.fulfil.test.ts`:

```ts
// @vitest-environment happy-dom
/**
 * workItemStore.fulfil — D4 single-writer hard gate. fulfilWorkItem is the
 * SOLE writer of the spine completion fields (status/doneAt/actualStart/
 * actualEnd/who). It is idempotent (re-fulfil = same reference, no churn).
 * unfulfilWorkItem reverses ONLY the spine — proof events are immutable and
 * are not this store's concern (orphan-by-design lives in proofEventStore).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkItemStore } from '../workItemStore.js';
import type { WorkItem } from '@ogden/shared';

function wi(p: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'manual',
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

const reset = () => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useWorkItemStore.setState({ items: [], migratedSources: [] });
};

describe('workItemStore.fulfilWorkItem / unfulfilWorkItem', () => {
  beforeEach(reset);

  it('stamps exactly the spine completion fields', () => {
    useWorkItemStore.setState({ items: [wi({ id: 'w1' })], migratedSources: [] });
    useWorkItemStore.getState().fulfilWorkItem('w1', {
      who: 'Yousef',
      actualStart: '2026-05-10',
      actualEnd: '2026-05-11',
      notes: 'ignored by the spine writer',
    });
    const it = useWorkItemStore.getState().items[0]!;
    expect(it.status).toBe('done');
    expect(it.doneAt).toBeTruthy();
    expect(it.actualStart).toBe('2026-05-10');
    expect(it.actualEnd).toBe('2026-05-11');
    expect(it.who).toBe('Yousef');
  });

  it('is idempotent: re-fulfilling an already-done item is a no-op (same reference)', () => {
    useWorkItemStore.setState({
      items: [wi({ id: 'w1', status: 'done', doneAt: '2026-05-10T00:00:00.000Z' })],
      migratedSources: [],
    });
    const before = useWorkItemStore.getState().items;
    useWorkItemStore.getState().fulfilWorkItem('w1', { who: 'X' });
    expect(useWorkItemStore.getState().items).toBe(before); // same array reference
  });

  it('does not mutate other items, status of others, or other stores', () => {
    useWorkItemStore.setState({
      items: [wi({ id: 'w1' }), wi({ id: 'w2', status: 'todo' })],
      migratedSources: [],
    });
    useWorkItemStore.getState().fulfilWorkItem('w1', {});
    const w2 = useWorkItemStore.getState().items.find((i) => i.id === 'w2')!;
    expect(w2.status).toBe('todo');
  });

  it('unfulfilWorkItem reverses ONLY the spine fields back to todo', () => {
    useWorkItemStore.setState({
      items: [
        wi({
          id: 'w1',
          status: 'done',
          doneAt: '2026-05-10T00:00:00.000Z',
          actualStart: '2026-05-10',
          actualEnd: '2026-05-11',
          who: 'Yousef',
        }),
      ],
      migratedSources: [],
    });
    useWorkItemStore.getState().unfulfilWorkItem('w1');
    const it = useWorkItemStore.getState().items[0]!;
    expect(it.status).toBe('todo');
    expect(it.doneAt ?? null).toBeNull();
    expect(it.actualStart ?? null).toBeNull();
    expect(it.actualEnd ?? null).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `& $pnpm --filter web test -- workItemStore.fulfil`
Expected: FAIL — `fulfilWorkItem is not a function`.

- [ ] **Step 3: Add the interface members**

In `apps/web/src/store/workItemStore.ts`, in the `WorkItemState` interface, immediately **after** the `toggleDone: (id: string) => void;` block (it ends at line 37, just before `addDependency`), add:

```ts
  /**
   * D4 — the SOLE writer of the spine completion fields. Stamps
   * status:'done' + doneAt + actualStart/actualEnd + who on the matching
   * item. Idempotent: if the item is already 'done' it is a no-op and the
   * items array keeps the same reference (no updatedAt churn). Proof-event
   * creation (typed D0 stamp or generic fallback) is orchestrated OUTSIDE
   * this store (fieldProofActions) — this writer never touches any other
   * store, so workItemStore keeps zero app-store dependencies.
   */
  fulfilWorkItem: (
    id: string,
    capture: {
      who?: string;
      actualStart?: string | null;
      actualEnd?: string | null;
      notes?: string;
    },
  ) => void;
  /**
   * D4 — reverse ONLY the spine completion fields (status→'todo',
   * doneAt/actualStart/actualEnd cleared). The immutable proof event is
   * deliberately NOT removed (orphan-by-design audit trail; that lives in
   * proofEventStore / the typed D0 logs).
   */
  unfulfilWorkItem: (id: string) => void;
```

- [ ] **Step 4: Add the action implementations**

In the same file, in the store body, immediately **after** the `toggleDone` action (it ends at line 151, just before `addDependency:`), add:

```ts
      fulfilWorkItem: (id, capture) =>
        set((s) => {
          const it = s.items.find((w) => w.id === id);
          if (!it) return s;
          // Idempotent: already done ⇒ no-op, same reference (no churn).
          if (it.status === 'done') return s;
          return {
            items: s.items.map((w) =>
              w.id === id
                ? {
                    ...w,
                    status: 'done',
                    doneAt: now(),
                    ...(capture.who !== undefined ? { who: capture.who } : {}),
                    ...(capture.actualStart !== undefined
                      ? { actualStart: capture.actualStart }
                      : {}),
                    ...(capture.actualEnd !== undefined
                      ? { actualEnd: capture.actualEnd }
                      : {}),
                    updatedAt: now(),
                  }
                : w,
            ),
          };
        }),

      unfulfilWorkItem: (id) =>
        set((s) => {
          const it = s.items.find((w) => w.id === id);
          if (!it || it.status !== 'done') return s;
          return {
            items: s.items.map((w) =>
              w.id === id
                ? {
                    ...w,
                    status: 'todo',
                    doneAt: null,
                    actualStart: null,
                    actualEnd: null,
                    updatedAt: now(),
                  }
                : w,
            ),
          };
        }),
```

Note: `capture.notes` is intentionally accepted but unused by the spine writer — notes belong on the proof event (Task 5's orchestrator), and the test asserts the spine ignores it.

- [ ] **Step 5: Run the test to verify it passes**

Run: `& $pnpm --filter web test -- workItemStore.fulfil`
Expected: PASS — 4 tests green.

- [ ] **Step 6: Run the existing workItemStore suites (no regression)**

Run: `& $pnpm --filter web test -- workItemStore`
Expected: PASS — the new `fulfil` suite plus all pre-existing `workItemStore.*` suites (costs / dependencies / resources) stay green.

- [ ] **Step 7: Typecheck web**

Run: `& $pnpm --filter web typecheck`
Expected: exit 0 — no NEW error vs the pre-D4 baseline (any pre-existing out-of-band debt is not a D4 regression; if unsure, `git stash` D4, re-run, compare, `git stash pop`).

- [ ] **Step 8: Commit**

```powershell
git add apps/web/src/store/workItemStore.ts apps/web/src/store/__tests__/workItemStore.fulfil.test.ts
git commit -m "feat(d4): spine-only single-writer fulfilWorkItem/unfulfilWorkItem + hard gate"
```

---

### Task 5: Orchestrator + FieldProofPanel + tracker mount

**Files:**
- Create: `apps/web/src/features/act/fieldProofActions.ts`
- Create: `apps/web/src/features/act/FieldProofPanel.tsx`
- Modify: `apps/web/src/features/act/PlanExecutionTrackerCard.tsx` (import + mount)
- Test: `apps/web/src/features/act/__tests__/fieldProofActions.test.ts`

- [ ] **Step 1: Write the failing orchestrator test**

Create `apps/web/src/features/act/__tests__/fieldProofActions.test.ts`:

```ts
// @vitest-environment happy-dom
/**
 * fieldProofActions — the thin D4 orchestrator. Composes proof-event
 * creation (typed D0 stamp OR generic fallback) with the spine-only
 * fulfilWorkItem, structurally like RotationScheduleCard's
 * updateItem(...) + updateEvent(...) pair. Single completion writer stays
 * exactly one action.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import { useProofEventStore } from '../../../store/proofEventStore.js';
import { fulfilWithGenericProof, confirmTypedProofMatch } from '../fieldProofActions.js';
import { useMaintenanceLogStore } from '../../../store/maintenanceLogStore.js';
import type { WorkItem } from '@ogden/shared';

function wi(p: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1', source: 'manual', overridden: false, createdAt: 'c',
    updatedAt: 'u', title: p.id, phaseId: null, status: 'todo',
    dependsOn: [], dependsOnAuto: [], materialsAuto: [],
    equipmentRequiredAuto: [], ...p,
  } as WorkItem;
}

const reset = () => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useWorkItemStore.setState({ items: [wi({ id: 'w1' })], migratedSources: [] });
  useProofEventStore.setState({ events: [] });
  useMaintenanceLogStore.setState({ events: [] });
};

describe('fieldProofActions', () => {
  beforeEach(reset);

  it('fulfilWithGenericProof writes a ProofEvent AND fulfils the spine', () => {
    fulfilWithGenericProof('w1', 'p1', {
      who: 'Yousef', actualStart: '2026-05-10', actualEnd: '2026-05-11',
      notes: 'by hand',
    });
    const ev = useProofEventStore.getState().getProjectProofEvents('p1');
    expect(ev).toHaveLength(1);
    expect(ev[0]!.workItemId).toBe('w1');
    expect(ev[0]!.notes).toBe('by hand');
    expect(useWorkItemStore.getState().items[0]!.status).toBe('done');
  });

  it('confirmTypedProofMatch stamps the existing typed event and fulfils the spine, no generic event', () => {
    useMaintenanceLogStore.setState({
      events: [
        {
          id: 'm-ev', projectId: 'p1', sourceKind: 'earthwork',
          sourceId: 's1', date: '2026-05-10', action: 'clear',
        },
      ],
    });
    confirmTypedProofMatch('w1', { store: 'maintenance', eventId: 'm-ev' });
    expect(
      useMaintenanceLogStore.getState().events[0]!.workItemId,
    ).toBe('w1');
    expect(useProofEventStore.getState().events).toHaveLength(0); // no fallback
    expect(useWorkItemStore.getState().items[0]!.status).toBe('done');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `& $pnpm --filter web test -- fieldProofActions`
Expected: FAIL — `Cannot find module '../fieldProofActions.js'`.

- [ ] **Step 3: Write the orchestrator**

Create `apps/web/src/features/act/fieldProofActions.ts`:

```ts
/**
 * fieldProofActions — the thin D4 orchestrator (Sub-project D4).
 *
 * Composes proof-event creation with the spine-only single writer
 * `workItemStore.fulfilWorkItem`. This is the "routes typed domain event OR
 * generic fallback" responsibility from the D4 spec, kept OUT of
 * workItemStore so the spine store retains zero app-store dependencies —
 * structurally identical to how `RotationScheduleCard` already pairs
 * `updateItem(...)` with `updateEvent(...)`. The single completion writer
 * of the spine is still exactly one action.
 *
 * Covenant (D4, binding): operational field-execution proof only — no
 * cost / financing / capital / investor framing.
 */

import { nanoid } from 'nanoid';
import type { ProofTarget } from '@ogden/shared';
import { useWorkItemStore } from '../../store/workItemStore.js';
import { useProofEventStore } from '../../store/proofEventStore.js';
import { useMaintenanceLogStore } from '../../store/maintenanceLogStore.js';
import { useLivestockMoveLogStore } from '../../store/livestockMoveLogStore.js';
import { useNurseryStore } from '../../store/nurseryStore.js';

export interface ProofCapture {
  who?: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  notes?: string;
  evidence?: { photoRef: string; geo?: [number, number] };
}

/**
 * No matching typed D0 event: write a generic ProofEvent carrying the
 * back-link, then fulfil the spine. Two side-effects, one spine writer.
 */
export function fulfilWithGenericProof(
  workItemId: string,
  projectId: string,
  capture: ProofCapture,
): void {
  useProofEventStore.getState().addProofEvent({
    id: nanoid(),
    projectId,
    workItemId,
    ...(capture.who !== undefined ? { actorWho: capture.who } : {}),
    ...(capture.actualStart !== undefined
      ? { actualStart: capture.actualStart }
      : {}),
    ...(capture.actualEnd !== undefined
      ? { actualEnd: capture.actualEnd }
      : {}),
    ...(capture.notes !== undefined ? { notes: capture.notes } : {}),
    ...(capture.evidence !== undefined ? { evidence: capture.evidence } : {}),
    createdAt: new Date().toISOString(),
  });
  useWorkItemStore.getState().fulfilWorkItem(workItemId, capture);
}

type TypedStore = Exclude<ProofTarget, 'generic'>;

/**
 * Steward confirmed a render-only suggestion: stamp the existing immutable
 * typed D0 event with the WorkItem back-link (mirrors
 * RotationScheduleCard's `updateEvent(match.id, { workItemId })`), then
 * fulfil the spine. No generic ProofEvent is written.
 */
export function confirmTypedProofMatch(
  workItemId: string,
  link: { store: TypedStore; eventId: string },
): void {
  switch (link.store) {
    case 'maintenance':
      useMaintenanceLogStore
        .getState()
        .updateEvent(link.eventId, { workItemId });
      break;
    case 'livestock-move':
      useLivestockMoveLogStore
        .getState()
        .updateEvent(link.eventId, { workItemId });
      break;
    case 'nursery':
      useNurseryStore
        .getState()
        .updateTransfer(link.eventId, { workItemId });
      break;
  }
  useWorkItemStore.getState().fulfilWorkItem(workItemId, {});
}
```

> **Implementation note for the engineer:** verify the exact updater method + signature on each typed store before relying on it — `useMaintenanceLogStore` and `useLivestockMoveLogStore` expose `updateEvent(id, patch)` (confirmed). For `useNurseryStore`, grep the file for the `StockTransfer` updater (it may be `updateTransfer` or `updateStockTransfer`); use the real name and adjust the `case 'nursery'` line + the test accordingly. Also confirm `nanoid` is the id helper used elsewhere in `apps/web` (grep an existing store action that mints ids, e.g. in `crewMemberStore` callers); if the codebase uses a different id util, use that instead — do not add a new dependency.

- [ ] **Step 4: Run the test to verify it passes**

Run: `& $pnpm --filter web test -- fieldProofActions`
Expected: PASS — 2 tests green. (If the nursery method name differed, the maintenance/generic tests still prove the pattern; fix the nursery line + add its assertion.)

- [ ] **Step 5: Write the panel**

Create `apps/web/src/features/act/FieldProofPanel.tsx`:

```tsx
/**
 * FieldProofPanel — D4 field-execution-proof surface.
 *
 * A well-bounded CHILD of PlanExecutionTrackerCard (no manifest entry — it
 * rides the existing `act-plan-tracker` mount). Renders, per project:
 *   - a proof board: Proven / Claimed / Open badge per work item
 *     (render-only, from the pure engine);
 *   - a capture editor: explicit fulfil (who / actual dates / notes /
 *     optional photoRef) → generic proof + spine; an un-fulfil control;
 *   - render-only suggestions: each row has an explicit Confirm button that
 *     stamps the matched typed D0 event + fulfils the spine. A suggestion
 *     NEVER writes on its own.
 *
 * Covenant (D4, binding): operational field-execution proof only — no cost
 * / financing / capital / investor framing anywhere in this surface.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  analyzeFieldProof,
  type DomainEvent,
  type ProofState,
} from '@ogden/shared';
import { useWorkItemStore } from '../../store/workItemStore.js';
import { useProofEventStore } from '../../store/proofEventStore.js';
import { useMaintenanceLogStore } from '../../store/maintenanceLogStore.js';
import { useLivestockMoveLogStore } from '../../store/livestockMoveLogStore.js';
import { useNurseryStore } from '../../store/nurseryStore.js';
import {
  fulfilWithGenericProof,
  confirmTypedProofMatch,
} from './fieldProofActions.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
}

const BADGE: Record<ProofState, string> = {
  proven: 'Proven',
  claimed: 'Claimed',
  open: 'Open',
};

export default function FieldProofPanel({ project }: Props) {
  const allItems = useWorkItemStore((s) => s.items);
  const proofEvents = useProofEventStore((s) => s.events);
  const maintEvents = useMaintenanceLogStore((s) => s.events);
  const moveEvents = useLivestockMoveLogStore((s) => s.events);
  const nurseryTransfers = useNurseryStore((s) => s.transfers);
  const unfulfil = useWorkItemStore((s) => s.unfulfilWorkItem);

  const [openEditor, setOpenEditor] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    who: string;
    actualStart: string;
    actualEnd: string;
    notes: string;
    photoRef: string;
  }>({ who: '', actualStart: '', actualEnd: '', notes: '', photoRef: '' });

  const projectItems = useMemo(
    () => allItems.filter((i) => i.projectId === project.id),
    [allItems, project.id],
  );

  const linkedByItem = useMemo(() => {
    const m = new Map<string, string[]>();
    const push = (wid: string | undefined, eid: string) => {
      if (!wid) return;
      m.set(wid, [...(m.get(wid) ?? []), eid]);
    };
    for (const e of proofEvents) if (e.projectId === project.id) push(e.workItemId, e.id);
    for (const e of maintEvents) if (e.projectId === project.id) push(e.workItemId, e.id);
    for (const e of moveEvents) if (e.projectId === project.id) push(e.workItemId, e.id);
    for (const t of nurseryTransfers)
      if (t.projectId === project.id) push(t.workItemId, t.id);
    return m;
  }, [proofEvents, maintEvents, moveEvents, nurseryTransfers, project.id]);

  const domainEvents = useMemo<DomainEvent[]>(() => {
    const out: DomainEvent[] = [];
    for (const e of maintEvents)
      if (e.projectId === project.id)
        out.push({ id: e.id, store: 'maintenance', projectId: e.projectId, date: e.date });
    for (const e of moveEvents)
      if (e.projectId === project.id)
        out.push({ id: e.id, store: 'livestock-move', projectId: e.projectId, date: e.date });
    for (const t of nurseryTransfers)
      if (t.projectId === project.id)
        out.push({ id: t.id, store: 'nursery', projectId: t.projectId, date: t.date });
    return out;
  }, [maintEvents, moveEvents, nurseryTransfers, project.id]);

  const analysis = useMemo(
    () => analyzeFieldProof(projectItems, linkedByItem, domainEvents, 7),
    [projectItems, linkedByItem, domainEvents],
  );

  const titleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of projectItems) m.set(i.id, i.title);
    return m;
  }, [projectItems]);

  const submit = (itemId: string) => {
    fulfilWithGenericProof(itemId, project.id, {
      who: draft.who || undefined,
      actualStart: draft.actualStart || undefined,
      actualEnd: draft.actualEnd || undefined,
      notes: draft.notes || undefined,
      ...(draft.photoRef
        ? { evidence: { photoRef: draft.photoRef } }
        : {}),
    });
    setOpenEditor(null);
    setDraft({ who: '', actualStart: '', actualEnd: '', notes: '', photoRef: '' });
  };

  return (
    <section className={styles.section} data-testid="field-proof-panel">
      <h2 className={styles.sectionTitle}>Field execution &amp; proof</h2>
      <p className={styles.sectionLede}>
        Proven = done with linked field evidence · Claimed = marked done,
        no evidence yet · Open = not yet done. Suggestions are read-only
        until you confirm.
      </p>

      <div className={styles.summary}>
        <span>Proven {analysis.counts.proven}</span>
        <span>Claimed {analysis.counts.claimed}</span>
        <span>Open {analysis.counts.open}</span>
      </div>

      <ul className={styles.list}>
        {projectItems.map((it) => {
          const state = analysis.byItemId.get(it.id) ?? 'open';
          return (
            <li key={it.id} className={styles.row}>
              <span className={styles.rowTitle}>{it.title}</span>
              <span data-proof-state={state}>{BADGE[state]}</span>
              {state === 'open' ? (
                <button type="button" onClick={() => setOpenEditor(it.id)}>
                  Record proof
                </button>
              ) : (
                <button type="button" onClick={() => unfulfil(it.id)}>
                  Un-fulfil
                </button>
              )}
              {openEditor === it.id && (
                <div className={styles.editor}>
                  <input
                    aria-label="who"
                    value={draft.who}
                    onChange={(e) => setDraft({ ...draft, who: e.target.value })}
                  />
                  <input
                    aria-label="actual start"
                    type="date"
                    value={draft.actualStart}
                    onChange={(e) =>
                      setDraft({ ...draft, actualStart: e.target.value })
                    }
                  />
                  <input
                    aria-label="actual end"
                    type="date"
                    value={draft.actualEnd}
                    onChange={(e) =>
                      setDraft({ ...draft, actualEnd: e.target.value })
                    }
                  />
                  <input
                    aria-label="notes"
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  />
                  <input
                    aria-label="photo ref"
                    value={draft.photoRef}
                    onChange={(e) =>
                      setDraft({ ...draft, photoRef: e.target.value })
                    }
                  />
                  <button type="button" onClick={() => submit(it.id)}>
                    Save proof
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {analysis.suggestions.length > 0 && (
        <div className={styles.suggestions}>
          <h3 className={styles.sectionTitle}>Suggested matches</h3>
          <ul className={styles.list}>
            {analysis.suggestions.map((s) => (
              <li key={`${s.itemId}:${s.eventId}`} className={styles.row}>
                <span>
                  {titleById.get(s.itemId) ?? s.itemId} — {s.store} event{' '}
                  {s.daysApart}d away
                </span>
                <button
                  type="button"
                  onClick={() =>
                    confirmTypedProofMatch(s.itemId, {
                      store: s.store,
                      eventId: s.eventId,
                    })
                  }
                >
                  Confirm
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
```

> **Implementation note for the engineer:** the `stageCard.module.css` class names used here (`section`, `sectionTitle`, `sectionLede`, `summary`, `list`, `row`, `rowTitle`, `editor`, `suggestions`) follow the tracker's own usage — open `apps/web/src/v3/_shared/stageCard/stageCard.module.css` and use the closest existing class names; if one does not exist, reuse an existing block class rather than inventing a new CSS module. Visual styling parity is not gated by a test; the panel mounting + behaviour is. Also confirm `useNurseryStore`'s array selector (`s.transfers`) and `StockTransfer.date`/`workItemId` field names by reading the store; adjust selectors/field names to the real shape.

- [ ] **Step 6: Mount the panel in the tracker (no manifest change)**

In `apps/web/src/features/act/PlanExecutionTrackerCard.tsx`:

After the import block (the local imports end at line 37 with the `styles` import), add:

```ts
import FieldProofPanel from './FieldProofPanel.js';
```

Then in the component's main `return (` (starts line 912) — locate the closing `</header>` (line 923) and insert the panel immediately **after** it, before the rest of the body:

```tsx
      </header>

      <FieldProofPanel project={project} />
```

(`project` is already the component prop — `PlanExecutionTrackerCard({ project }: Props)`, line 138.)

- [ ] **Step 7: Run the orchestrator + existing tracker tests**

Run: `& $pnpm --filter web test -- fieldProofActions PlanExecutionTrackerCard`
Expected: PASS — orchestrator green; the existing `PlanExecutionTrackerCard.resourcing.test.tsx` still green (the panel is an additive child; if it fails to render because a referenced store/selector name was wrong, fix the selector per the implementation notes — do not weaken the existing test).

- [ ] **Step 8: Typecheck web**

Run: `& $pnpm --filter web typecheck`
Expected: exit 0 — no NEW error vs the pre-D4 baseline.

- [ ] **Step 9: Commit**

```powershell
git add apps/web/src/features/act/fieldProofActions.ts apps/web/src/features/act/FieldProofPanel.tsx apps/web/src/features/act/__tests__/fieldProofActions.test.ts apps/web/src/features/act/PlanExecutionTrackerCard.tsx
git commit -m "feat(d4): FieldProofPanel + orchestrator, mounted on the tracker card"
```

---

### Task 6: Full verification + session close

**Files:**
- Create: `wiki/decisions/2026-05-19-atlas-d4-field-proof.md`
- Modify: `wiki/log.md` (prepend a D4 session entry)
- Do **not** modify `wiki/index.md` (D0-owned dirty; leave for its owner — D2/D3 ADR precedent).

- [ ] **Step 1: Whole-suite shared + web tests**

Run: `& $pnpm --filter @ogden/shared test`
Then: `& $pnpm --filter web test`
Expected: zero NEW failures. The new suites (`fieldProof`, `proofEventStore`, `workItemStore.fulfil`, `fieldProofActions`) are green. Any pre-existing out-of-band failure that also fails on a clean pre-D4 tree is disclosed, not introduced (if a failure is unfamiliar, `git stash` D4, re-run that suite, compare, `git stash pop`).

- [ ] **Step 2: Typecheck both packages**

Run: `& $pnpm --filter @ogden/shared typecheck`
Then: `& $pnpm --filter web typecheck`
Expected: shared exit 0 clean; web exit 0 modulo disclosed pre-existing baseline debt.

- [ ] **Step 3: Production build**

Run: `$env:NODE_OPTIONS = '--max-old-space-size=8192'; & $pnpm --filter web build`
Expected: `vite build` succeeds (`✓ built in …`). If the FIRST attempt OOMs without the env var, that is the known environment issue — the line above already sets it; re-run if needed.

- [ ] **Step 4: Covenant grep (release gate)**

Run (PowerShell):

```powershell
Select-String -Path `
  packages/shared/src/lib/fieldProof.ts, `
  packages/shared/src/schemas/proofEvent.schema.ts, `
  apps/web/src/store/proofEventStore.ts, `
  apps/web/src/features/act/fieldProofActions.ts, `
  apps/web/src/features/act/FieldProofPanel.tsx `
  -Pattern 'interest|riba|invest|equity|capital|financ|loan|yield|return|salam|gharar' `
  -CaseSensitive:$false
```

Expected: **no matches** (the only place the lexicon appears is the negative-assertion regex inside `fieldProof.test.ts`, which is intentional and not in this list). If a match appears in a shipped file, it is a covenant breach — stop and remove it.

- [ ] **Step 5: Static surface-wiring check (screenshot-honesty rule)**

`FieldProofPanel` is plain React deep behind the Act module slide-up; the MapLibre/WebGL preview hang from D1–D3 is expected to recur. Do **not** claim a screenshot. Instead verify statically:

```powershell
Select-String -Path apps/web/src/features/act/PlanExecutionTrackerCard.tsx -Pattern 'FieldProofPanel'
```

Expected: two hits — the `import` line and the `<FieldProofPanel project={project} />` mount. Combined with web `tsc` exit 0, that proves the panel is wired and type-sound. Disclose the screenshot block explicitly rather than asserting a visual.

- [ ] **Step 6: Write the D4 ADR**

Create `wiki/decisions/2026-05-19-atlas-d4-field-proof.md` capturing: the four binding forks; the spine-only-single-writer + orchestrator layering reconciliation (and why it differs from the spec prose while matching its intent); the SUPERSEDED parallel spec (`2026-05-19-d4-field-execution-proof-design.md`, retire-not-delete) and that this plan implements the authoritative `2026-05-19-d4-field-proof-design.md`; harvest deliberately excluded from `routeProofTarget`; covenant boundary; verification results (typecheck/test/build/covenant grep, screenshot disclosed-blocked); and that D4 is left **uncommitted-as-a-whole only if the user has not asked to commit per-task** — note the per-task commits this plan already made and that nothing was pushed. Follow the structure of `wiki/decisions/2026-05-18-atlas-d3-budget-cost.md`.

- [ ] **Step 7: Prepend the session log entry**

Prepend a dated D4 entry to `wiki/log.md` (newest-first, matching the existing format): tasks 1–6, files created/modified, verification outcome, the superseded-parallel-spec resolution, and the deferred items (live preview exercise deferred behind the WebGL hang).

- [ ] **Step 8: Commit the wiki close**

```powershell
git add wiki/decisions/2026-05-19-atlas-d4-field-proof.md wiki/log.md
git commit -m "docs(d4): ADR + session log for field-execution-proof slice"
```

- [ ] **Step 9: Report — do NOT push**

Summarise: per-task commits made (list the hashes via `git log --oneline -8`), branch divergence checked (`git fetch` then `git rev-list --left-right --count HEAD...@{u}`), and that **nothing was pushed** (the branch is rebased out-of-band; pushing is a separate explicit instruction). D3 remains uncommitted and untouched.

---

## Self-Review

**1. Spec coverage** (against `2026-05-19-d4-field-proof-design.md`):
- Pure engine `fieldProof.ts` (`ProofState`, `routeProofTarget` w/ harvest excluded, `classifyProof`, `suggestProofMatches` render-only, `analyzeFieldProof`) → Task 2. ✔
- `proofEvent.schema.ts` generic fallback, `.passthrough()`, exported → Task 1. ✔
- `proofEventStore` (`ogden-work-item-proof`, projectId-tagged, syncManifest `tagged('events')`) → Task 3. ✔
- Single-writer `fulfilWorkItem`/`unfulfilWorkItem`; idempotent; un-fulfil keeps the event → Task 4 (spine) + Task 5 (event side via orchestrator). The spec's "action routes typed/fallback" is delivered by `fieldProofActions` — documented as a deliberate layering reconciliation in Architecture + ADR (Task 6 Step 6). ✔
- `FieldProofPanel` child on existing tracker, **no manifest entry**; board / capture / render-only suggestions w/ explicit Confirm → Task 5. ✔
- No `workItem.schema.ts` change, no DB migration, no manifest entry → honoured (no such task). ✔
- Hard-gate tests mirroring D2/D3; covenant no-financing regex; no-`status`-mutation invariant → Task 2 + Task 4. ✔
- Retire-not-delete; nothing superseded except the parallel spec (banner already committed `3751a1fc`); `RotationScheduleCard` untouched → no task modifies it; ADR records the intentional divergence. ✔
- Commit posture: explicit-path only, no push, D3 untouched → stated in conventions + every commit step + Task 6 Step 9. ✔

**2. Placeholder scan:** No "TBD/TODO/handle edge cases" — every code step has complete code. The two "Implementation note for the engineer" callouts are *verification instructions for real store method/CSS names*, not deferred work (the happy-path code is fully written; the notes say "confirm the real name and adjust" because exact nursery-updater / CSS-class names can't be confirmed without reading those files, which is itself a 2-minute step inside the task).

**3. Type consistency:** `ProofState`, `ProofTarget`, `DomainEvent`, `ProofSuggestion`, `FieldProofAnalysis` defined in Task 2 and consumed identically in Task 5. `ProofCapture` defined in Task 5's orchestrator; `fulfilWorkItem(id, capture)` signature in Task 4 matches the `capture` object passed by `fulfilWithGenericProof`. `routeProofTarget`'s typed returns (`'maintenance' | 'livestock-move' | 'nursery'`) match `DomainEvent.store` and the orchestrator's `switch`. Store action names (`addProofEvent/updateProofEvent/removeProofEvent/getProjectProofEvents`) consistent across Tasks 3 and 5. `ogden-work-item-proof` / `tagged('events')` consistent between Task 3 store and syncManifest.

No issues found that require rework; the engineer-verification notes are intentional and scoped.
