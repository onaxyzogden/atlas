# Observation Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (fresh implementer + spec reviewer + code-quality reviewer per task). Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Git hygiene (HARD):** Execute on `feat/atlas-permaculture` in `C:\Users\MY OWN AXIS\Documents\MAQASID OS - V2.1\atlas`. `git fetch` + confirm **0 behind** before EVERY commit (branch is rebased out-of-band -- uncommitted work gets wiped, commit **immediately** on green). **Push ONLY when the user asks.** Stage **only** the files each task names (explicit paths, never `git add -A`/`.`); the working tree has heavy foreign WIP -- `git status -s <path>` each file first and confirm before staging if a named file is already dirty. **Never `git commit --amend`** on this branch. Commit messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
>
> **Build constraints:** ASCII-only copy. TS strict + `noUncheckedIndexedAccess` (guard every indexed access). Windows / PowerShell only. **`v3/plan/spine/` + `ProtocolConfirmationFlow` are import-only -- never edit. No deletions.** `preview_screenshot` unavailable on this Windows setup -- verify via `preview_eval` DOM (port 5200) and **disclose**.
> - shared tsc: `corepack pnpm --filter @ogden/shared exec tsc --noEmit`
> - web tsc (run via the **PowerShell tool natively**, not bash-wrapped): `$env:NODE_OPTIONS='--max-old-space-size=8192'; corepack pnpm --filter @ogden/web exec tsc --noEmit`
> - shared tests (BOUNDED): `corepack pnpm --filter @ogden/shared exec vitest run --pool=forks <pattern>`
> - web tests (BOUNDED -- default threads pool hangs on Windows): `corepack pnpm --filter @ogden/web exec vitest run --pool=forks <pattern>`

**Goal:** Build an append-only ledger of flag-closure facts so a future detector can reconstruct which protocol-signatures co-deviated in past cycles.

**Architecture:** A persisted `ObservationRecord` (zod, validated) is appended inside `reviewFlagStore.resolveFlag`/`dismissFlag` -- the only steward-closure chokepoints -- via a pure `buildObservationRecord` helper in `@ogden/shared`. Storage is `observationLogStore`, a structural twin of `proofEventStore` (flat array, append-only, projectId-tagged). Cluster semantics are NOT in the log; they stay derived in the (separate, later) chronic detector. Headless slice: schema + emission + read seam + tests, no UI.

**Tech Stack:** TypeScript (strict), zod, Zustand 5 (`persist`), Vitest (`--pool=forks`), pnpm via corepack.

**Spec:** `stages/design-observation-log-review.md` (committed `25c61438`).

---

## Verified seams (confirmed in source 2026-06-03)

- `ObjectiveReviewFlag` (`packages/shared/src/schemas/protocol/reviewFlag.schema.ts`): fields used -- `id`, `projectId`, `objectiveId`, `sourceTemplateId`, `deviationSign` (`'over'|'under'|'existential'`), `depth` (`FlagDepth` zod enum `['threshold','soil','water','zones','structural']`), `window` (`{ season?: SeasonName; cycleNumber?: number }`, defaults `{}`), `raisedAt` (string). `FlagDepth` + `ObjectiveReviewFlag`/`Schema` are exported from this file.
- `SeasonName` (`packages/shared/src/schemas/protocol/protocol.schema.ts:162`): zod enum `['spring','summer','autumn','winter']`, type exported.
- `temporalBucketKey(season?, cycleNumber?): string` (`packages/shared/src/constants/protocol/deviationPolicy.ts:26`): returns `` `${season ?? 'unknown'}:${cycleNumber ?? 0}` ``.
- Barrel `packages/shared/src/index.ts`: `reviewFlag.schema.js` exported at L181; `deviationPolicy.js` at L186. Add the new schema export adjacent to L181.
- `proofEventStore.ts` (`apps/web/src/store/`): the exact twin pattern -- `create()(persist((set,get)=>({ events:[], addProofEvent, ... }), { name, version:1, partialize }))` + `rehydrateWithLogging(store)`.
- `reviewFlagStore.resolveFlag` (`apps/web/src/store/reviewFlagStore.ts:368-384`) and `dismissFlag` (`:386-400`): both `set((state)=>({ byProject: { ...state.byProject, [projectId]: (state.byProject[projectId] ?? []).map((f)=> f.id===flagId ? {...f, <stamp>} : f) }}))`. Flag ids are minted with `crypto.randomUUID()` (`:340`).
- `useReviewFlagCountsByObjective` (`reviewFlagStore.ts`, ~L437-487): the stable-select + `useMemo` + module-level EMPTY template the read hook must mirror (NEVER an inline-filter selector -- Zustand v5 fresh-array re-render hazard).
- `syncManifest.ts` (`apps/web/src/lib/`): single source of truth for `ogden-` persisted stores; **a coverage-guard test (`__tests__/syncManifest.test.ts`) FAILS THE BUILD if a persisted store is unregistered.** proofEvent is registered at L661: `blob('ogden-work-item-proof', useProofEventStore, 'projectId-tagged', 1, tagged('events')),`. `blob` + `tagged` are in-file helpers.

---

## File Structure

| File | Responsibility |
|---|---|
| `packages/shared/src/schemas/protocol/observationRecord.schema.ts` (create) | `ObservationRecordSchema` (zod) + `ObservationRecord` type + pure `buildObservationRecord`. |
| `packages/shared/src/schemas/protocol/__tests__/observationRecord.schema.test.ts` (create) | Builder field-mapping + schema validation tests. |
| `packages/shared/src/index.ts` (modify, ~L181) | Barrel export the new schema. |
| `apps/web/src/store/observationLogStore.ts` (create) | Append-only store (twin of proofEventStore) + `useObservationLog` hook. |
| `apps/web/src/store/__tests__/observationLogStore.test.ts` (create) | Store append/filter + hook stability tests. |
| `apps/web/src/lib/syncManifest.ts` (modify, after L661) | Register `ogden-observation-log` (keeps the coverage guard green). |
| `apps/web/src/store/reviewFlagStore.ts` (modify, `resolveFlag` + `dismissFlag`) | Append one record on each closure. |
| `apps/web/src/store/__tests__/reviewFlagStore.observationlog.test.ts` (create) | Emission tests (resolve/dismiss append; dormancy none; reopen-reclose twice). |

---

## Task T1 -- Shared: `ObservationRecord` schema + `buildObservationRecord` (TDD)

**Files:**
- Create: `packages/shared/src/schemas/protocol/observationRecord.schema.ts`
- Create: `packages/shared/src/schemas/protocol/__tests__/observationRecord.schema.test.ts`
- Modify: `packages/shared/src/index.ts` (~L181)

- [ ] **Step 1: Write the failing test**

```ts
// observationRecord.schema.test.ts
import { describe, it, expect } from 'vitest';
import {
  ObservationRecordSchema,
  buildObservationRecord,
} from '../observationRecord.schema.js';
import type { ObjectiveReviewFlag } from '../reviewFlag.schema.js';

const baseFlag: ObjectiveReviewFlag = {
  id: 'flag-1',
  projectId: 'mtc',
  objectiveId: 'obj-water',
  sourceTemplateId: 'paddock-rotation-cover-trigger',
  sourceActivationIds: [],
  observedCount: 3,
  window: { season: 'spring', cycleNumber: 1 },
  deviationSign: 'over',
  depth: 'water',
  direction: 'tighten',
  reason: 'cover trigger fired 3x vs expected 1',
  raisedAt: '2026-03-01T00:00:00.000Z',
};

describe('buildObservationRecord', () => {
  it('maps every field from the flag and stamps closure', () => {
    const rec = buildObservationRecord(
      baseFlag,
      'resolved',
      '2026-04-01T00:00:00.000Z',
      'rec-1',
    );
    expect(rec).toEqual({
      id: 'rec-1',
      projectId: 'mtc',
      flagId: 'flag-1',
      sourceTemplateId: 'paddock-rotation-cover-trigger',
      objectiveId: 'obj-water',
      bucketKey: 'spring:1',
      season: 'spring',
      cycleNumber: 1,
      depth: 'water',
      deviationSign: 'over',
      raisedAt: '2026-03-01T00:00:00.000Z',
      closedAt: '2026-04-01T00:00:00.000Z',
      closeKind: 'resolved',
    });
  });

  it('handles an empty window (bucketKey unknown:0, season/cycleNumber omitted)', () => {
    const rec = buildObservationRecord(
      { ...baseFlag, window: {} },
      'dismissed',
      '2026-04-02T00:00:00.000Z',
      'rec-2',
    );
    expect(rec.bucketKey).toBe('unknown:0');
    expect(rec.season).toBeUndefined();
    expect(rec.cycleNumber).toBeUndefined();
    expect(rec.closeKind).toBe('dismissed');
  });

  it('produces a value the schema accepts', () => {
    const rec = buildObservationRecord(baseFlag, 'resolved', '2026-04-01T00:00:00.000Z', 'rec-3');
    expect(ObservationRecordSchema.safeParse(rec).success).toBe(true);
  });

  it('rejects a record missing a required field', () => {
    const bad = { id: 'x' };
    expect(ObservationRecordSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @ogden/shared exec vitest run --pool=forks observationRecord`
Expected: FAIL -- cannot resolve `../observationRecord.schema.js`.

- [ ] **Step 3: Write the implementation**

```ts
// observationRecord.schema.ts
//
// ObservationRecord: an immutable, append-only ledger row written each time a
// steward CLOSES an ObjectiveReviewFlag (resolve or dismiss). It is the
// historical substrate the (separate, later) chronic co-occurrence detector
// reads to reconstruct which protocol-signatures co-deviated across cycles.
//
// Per-flag-closure grain by design: this record carries ONLY the facts of one
// flag's closure -- NO cluster/signature is precomputed here. Cluster semantics
// stay derived in the detector (record observations, derive verdicts on read).
//
// PERSISTED -> validated: zod schema, mirroring reviewFlag.schema.ts (contrast
// CoOccurrenceCluster, a never-persisted derived interface).

import { z } from 'zod';
import { SeasonName } from './protocol.schema.js';
import { FlagDepth, type ObjectiveReviewFlag } from './reviewFlag.schema.js';
import { temporalBucketKey } from '../../constants/protocol/deviationPolicy.js';

/** How a flag left the open set. Distinct steward judgments (see reviewFlag). */
export const ObservationCloseKind = z.enum(['resolved', 'dismissed']);
export type ObservationCloseKind = z.infer<typeof ObservationCloseKind>;

export const ObservationRecordSchema = z.object({
  /** Stable unique id, one per CLOSURE event (caller-generated). */
  id: z.string(),
  /** The project this closure belongs to. */
  projectId: z.string(),
  /** The flag that closed (NOT unique across records: a reopened flag recloses). */
  flagId: z.string(),
  /** The protocol template that authored the deviated flag. */
  sourceTemplateId: z.string(),
  /** The objective the deviated flag targeted. */
  objectiveId: z.string(),
  /** temporalBucketKey(season, cycleNumber) -- the grouping axis for the detector. */
  bucketKey: z.string(),
  /** Season of the flag's window, if any. */
  season: SeasonName.optional(),
  /** Rotation/observation cycle of the flag's window, if any. */
  cycleNumber: z.number().int().nonnegative().optional(),
  /** Structural depth of the deviated flag. */
  depth: FlagDepth,
  /** Direction/sign of the deviation. */
  deviationSign: z.enum(['over', 'under', 'existential']),
  /** ISO-8601: when the flag was originally raised (copied from the flag). */
  raisedAt: z.string().min(1),
  /** ISO-8601: when the steward closed it. */
  closedAt: z.string().min(1),
  /** Whether the closure was a resolve or a dismiss. */
  closeKind: ObservationCloseKind,
});
export type ObservationRecord = z.infer<typeof ObservationRecordSchema>;

/**
 * Pure builder: derive a closure record from the flag being closed. Store-free
 * and side-effect-free so the emission layer stays trivially testable. The
 * caller supplies closedAt (the same ISO stamp written to the flag) and a
 * unique id (crypto.randomUUID() at the call site).
 */
export function buildObservationRecord(
  flag: ObjectiveReviewFlag,
  closeKind: ObservationCloseKind,
  closedAt: string,
  id: string,
): ObservationRecord {
  const season = flag.window.season;
  const cycleNumber = flag.window.cycleNumber;
  return {
    id,
    projectId: flag.projectId,
    flagId: flag.id,
    sourceTemplateId: flag.sourceTemplateId,
    objectiveId: flag.objectiveId,
    bucketKey: temporalBucketKey(season, cycleNumber),
    ...(season !== undefined ? { season } : {}),
    ...(cycleNumber !== undefined ? { cycleNumber } : {}),
    depth: flag.depth,
    deviationSign: flag.deviationSign,
    raisedAt: flag.raisedAt,
    closedAt,
    closeKind,
  };
}
```

- [ ] **Step 4: Add the barrel export**

In `packages/shared/src/index.ts`, immediately after the line
`export * from './schemas/protocol/reviewFlag.schema.js';` (~L181), add:

```ts
export * from './schemas/protocol/observationRecord.schema.js';
```

- [ ] **Step 5: Run tests + shared tsc**

Run: `corepack pnpm --filter @ogden/shared exec vitest run --pool=forks observationRecord`
Expected: PASS (4 tests).
Run: `corepack pnpm --filter @ogden/shared exec tsc --noEmit`
Expected: EXIT 0 (no errors in the new file).

- [ ] **Step 6: Commit**

```
git fetch ; (confirm 0 behind)
git status -s -- packages/shared/src/schemas/protocol/observationRecord.schema.ts packages/shared/src/schemas/protocol/__tests__/observationRecord.schema.test.ts packages/shared/src/index.ts
git add -- packages/shared/src/schemas/protocol/observationRecord.schema.ts packages/shared/src/schemas/protocol/__tests__/observationRecord.schema.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): add ObservationRecord schema + buildObservationRecord"
```

**Gate T1:** shared tsc clean; T1 specs green; existing shared specs unaffected.

---

## Task T2 -- Web: `observationLogStore` + `useObservationLog` hook + syncManifest registration (TDD)

**Files:**
- Create: `apps/web/src/store/observationLogStore.ts`
- Create: `apps/web/src/store/__tests__/observationLogStore.test.ts`
- Modify: `apps/web/src/lib/syncManifest.ts` (after L661)

- [ ] **Step 1: Write the failing test**

```ts
// observationLogStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useObservationLogStore,
  useObservationLog,
} from '../observationLogStore.js';
import type { ObservationRecord } from '@ogden/shared';

const rec = (over: Partial<ObservationRecord> = {}): ObservationRecord => ({
  id: 'rec-1',
  projectId: 'mtc',
  flagId: 'flag-1',
  sourceTemplateId: 'tpl-a',
  objectiveId: 'obj-1',
  bucketKey: 'spring:1',
  season: 'spring',
  cycleNumber: 1,
  depth: 'water',
  deviationSign: 'over',
  raisedAt: '2026-03-01T00:00:00.000Z',
  closedAt: '2026-04-01T00:00:00.000Z',
  closeKind: 'resolved',
  ...over,
});

beforeEach(() => {
  useObservationLogStore.setState({ records: [] });
});

describe('observationLogStore', () => {
  it('append adds one row (and is additive, never replacing)', () => {
    useObservationLogStore.getState().append(rec({ id: 'a' }));
    useObservationLogStore.getState().append(rec({ id: 'b' }));
    expect(useObservationLogStore.getState().records.map((r) => r.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('getProjectRecords filters by projectId', () => {
    useObservationLogStore.getState().append(rec({ id: 'a', projectId: 'mtc' }));
    useObservationLogStore.getState().append(rec({ id: 'b', projectId: 'other' }));
    expect(
      useObservationLogStore.getState().getProjectRecords('mtc').map((r) => r.id),
    ).toEqual(['a']);
  });

  it('exposes no update or remove API (append-only covenant)', () => {
    const s = useObservationLogStore.getState() as Record<string, unknown>;
    expect(s.update).toBeUndefined();
    expect(s.remove).toBeUndefined();
  });

  it('useObservationLog returns the project rows and a stable empty for null', () => {
    useObservationLogStore.getState().append(rec({ id: 'a', projectId: 'mtc' }));
    const { result: hit } = renderHook(() => useObservationLog('mtc'));
    expect(hit.current.map((r) => r.id)).toEqual(['a']);
    const { result: a } = renderHook(() => useObservationLog(null));
    const { result: b } = renderHook(() => useObservationLog(null));
    expect(a.current).toBe(b.current); // same module-level EMPTY reference
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @ogden/web exec vitest run --pool=forks observationLogStore`
Expected: FAIL -- cannot resolve `../observationLogStore.js`.

- [ ] **Step 3: Write the store + hook**

```ts
// observationLogStore.ts
//
// observationLogStore -- append-only ledger of flag-closure ObservationRecords.
// Structural twin of proofEventStore: flat array, add-only, projectId-tagged,
// persisted. NO update/remove -- retention is unbounded and orphans are by
// design (the history is the asset; mirrors the proofEvent audit covenant).
//
// Persist key: 'ogden-observation-log', version 1. Registered in syncManifest
// as projectId-tagged. Written to ONLY by reviewFlagStore's resolve/dismiss
// closures; read by the (later) chronic co-occurrence detector.

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type { ObservationRecord } from '@ogden/shared';

interface ObservationLogState {
  records: ObservationRecord[];
  append: (r: ObservationRecord) => void;
  getProjectRecords: (projectId: string) => ObservationRecord[];
}

export const useObservationLogStore = create<ObservationLogState>()(
  persist(
    (set, get) => ({
      records: [],
      append: (r) => set((s) => ({ records: [...s.records, r] })),
      getProjectRecords: (projectId) =>
        get().records.filter((r) => r.projectId === projectId),
    }),
    {
      name: 'ogden-observation-log',
      version: 1,
      partialize: (state) => ({ records: state.records }),
    },
  ),
);

rehydrateWithLogging(useObservationLogStore);

/** Stable empty result for null projectId / no matches (referential stability). */
const EMPTY_RECORDS: ReadonlyArray<ObservationRecord> = [];

/**
 * Zustand-v5-safe read hook: stable select of the whole array, then derive the
 * per-project slice in useMemo. NEVER an inline-filter selector (fresh array
 * each render -> infinite re-render loop). Mirrors useReviewFlagCountsByObjective.
 */
export function useObservationLog(
  projectId: string | null,
): ReadonlyArray<ObservationRecord> {
  const records = useObservationLogStore((s) => s.records);
  return useMemo(() => {
    if (!projectId) return EMPTY_RECORDS;
    return records.filter((r) => r.projectId === projectId);
  }, [records, projectId]);
}
```

- [ ] **Step 4: Register in syncManifest**

In `apps/web/src/lib/syncManifest.ts`, add an import for the store near the other store imports (match the existing import style in that file -- confirm the relative path `../store/observationLogStore.js`), then add this line immediately after L661 (`blob('ogden-work-item-proof', ...)`):

```ts
  blob('ogden-observation-log', useObservationLogStore, 'projectId-tagged', 1, tagged('records')),
```

- [ ] **Step 5: Run tests + coverage guard + web tsc**

Run: `corepack pnpm --filter @ogden/web exec vitest run --pool=forks observationLogStore syncManifest`
Expected: PASS -- the new store tests AND the syncManifest coverage guard (now that `ogden-observation-log` is registered).
Run (PowerShell tool, native): `$env:NODE_OPTIONS='--max-old-space-size=8192'; corepack pnpm --filter @ogden/web exec tsc --noEmit`
Expected: EXIT 0 in the new + modified files (record any pre-existing FOREIGN errors in unrelated files; do not fix them).

- [ ] **Step 6: Commit**

```
git fetch ; (confirm 0 behind)
git status -s -- apps/web/src/store/observationLogStore.ts apps/web/src/store/__tests__/observationLogStore.test.ts apps/web/src/lib/syncManifest.ts
git add -- apps/web/src/store/observationLogStore.ts apps/web/src/store/__tests__/observationLogStore.test.ts apps/web/src/lib/syncManifest.ts
git commit -m "feat(web): add append-only observationLogStore + sync registration"
```

**Gate T2:** web tsc clean (foreign errors excepted); store + hook + syncManifest-guard specs green.

---

## Task T3 -- Web: emit a record inside `resolveFlag` + `dismissFlag` (TDD)

**Files:**
- Modify: `apps/web/src/store/reviewFlagStore.ts` (`resolveFlag` ~L368, `dismissFlag` ~L386; imports)
- Create: `apps/web/src/store/__tests__/reviewFlagStore.observationlog.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// reviewFlagStore.observationlog.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useReviewFlagStore } from '../reviewFlagStore.js';
import { useObservationLogStore } from '../observationLogStore.js';
import type { ObjectiveReviewFlag } from '@ogden/shared';

const flag = (over: Partial<ObjectiveReviewFlag> = {}): ObjectiveReviewFlag => ({
  id: 'flag-1',
  projectId: 'mtc',
  objectiveId: 'obj-1',
  sourceTemplateId: 'tpl-a',
  sourceActivationIds: [],
  observedCount: 2,
  window: { season: 'spring', cycleNumber: 1 },
  deviationSign: 'over',
  depth: 'water',
  direction: 'tighten',
  reason: 'r',
  raisedAt: '2026-03-01T00:00:00.000Z',
  ...over,
});

beforeEach(() => {
  useReviewFlagStore.setState({ byProject: { mtc: [flag()] } });
  useObservationLogStore.setState({ records: [] });
});

describe('reviewFlagStore closure -> observation log', () => {
  it('resolveFlag appends exactly one resolved record carrying the flag fields', () => {
    useReviewFlagStore.getState().resolveFlag('mtc', 'flag-1');
    const recs = useObservationLogStore.getState().records;
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({
      flagId: 'flag-1',
      projectId: 'mtc',
      sourceTemplateId: 'tpl-a',
      objectiveId: 'obj-1',
      bucketKey: 'spring:1',
      depth: 'water',
      deviationSign: 'over',
      closeKind: 'resolved',
    });
  });

  it('dismissFlag appends exactly one dismissed record', () => {
    useReviewFlagStore.getState().dismissFlag('mtc', 'flag-1');
    const recs = useObservationLogStore.getState().records;
    expect(recs).toHaveLength(1);
    expect(recs[0]?.closeKind).toBe('dismissed');
  });

  it('resolving an unknown flagId appends nothing', () => {
    useReviewFlagStore.getState().resolveFlag('mtc', 'nope');
    expect(useObservationLogStore.getState().records).toHaveLength(0);
  });

  it('a reopen-then-reclose logs two records', () => {
    useReviewFlagStore.getState().resolveFlag('mtc', 'flag-1');
    // simulate reopen: clear resolvedAt back to an open flag
    useReviewFlagStore.setState({ byProject: { mtc: [flag()] } });
    useReviewFlagStore.getState().dismissFlag('mtc', 'flag-1');
    expect(useObservationLogStore.getState().records).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @ogden/web exec vitest run --pool=forks reviewFlagStore.observationlog`
Expected: FAIL -- 0 records appended (no emission wired yet).

- [ ] **Step 3: Add imports to `reviewFlagStore.ts`**

Near the existing `@ogden/shared` import block, add:

```ts
import { buildObservationRecord } from '@ogden/shared';
import { useObservationLogStore } from './observationLogStore.js';
```

(`observationLogStore` imports only the `ObservationRecord` TYPE from `@ogden/shared` and never imports `reviewFlagStore`, so there is no import cycle.)

- [ ] **Step 4: Emit inside `resolveFlag`**

Replace the `resolveFlag` action body (currently `set((state) => ({ ... }))` at ~L368-384) with a version that finds the target flag, appends a record when found, then performs the existing stamp. Keep the existing `parameterDelta` behavior unchanged:

```ts
      resolveFlag: (projectId, flagId, parameterDelta) => {
        const target = (get().byProject[projectId] ?? []).find(
          (f) => f.id === flagId,
        );
        if (target) {
          useObservationLogStore
            .getState()
            .append(
              buildObservationRecord(
                target,
                'resolved',
                new Date().toISOString(),
                crypto.randomUUID(),
              ),
            );
        }
        set((state) => ({
          byProject: {
            ...state.byProject,
            [projectId]: (state.byProject[projectId] ?? []).map((f) =>
              f.id === flagId
                ? {
                    ...f,
                    resolvedAt: new Date().toISOString(),
                    ...(parameterDelta !== undefined
                      ? { resolutionParameterDelta: parameterDelta }
                      : {}),
                  }
                : f,
            ),
          },
        }));
      },
```

> NOTE: this requires `get` to be in scope. The store factory is `persist((set, get) => ({ ... }))` -- confirm `get` is already destructured (it is used by other actions); if not, add it.

- [ ] **Step 5: Emit inside `dismissFlag`**

Replace the `dismissFlag` action body (~L386-400) similarly:

```ts
      dismissFlag: (projectId, flagId) => {
        const target = (get().byProject[projectId] ?? []).find(
          (f) => f.id === flagId,
        );
        if (target) {
          useObservationLogStore
            .getState()
            .append(
              buildObservationRecord(
                target,
                'dismissed',
                new Date().toISOString(),
                crypto.randomUUID(),
              ),
            );
        }
        set((state) => ({
          byProject: {
            ...state.byProject,
            [projectId]: (state.byProject[projectId] ?? []).map((f) =>
              f.id === flagId
                ? {
                    ...f,
                    dismissedAt: new Date().toISOString(),
                    dismissedAtCount: f.observedCount,
                  }
                : f,
            ),
          },
        }));
      },
```

- [ ] **Step 6: Run emission tests + the existing reviewFlagStore suites + web tsc**

Run: `corepack pnpm --filter @ogden/web exec vitest run --pool=forks reviewFlagStore`
Expected: PASS -- the new `reviewFlagStore.observationlog` spec AND every existing `reviewFlagStore*` spec (no regression; the auto-dormancy and dismissed-but-worsening reopen paths append nothing because they do not call resolve/dismiss).
Run (PowerShell tool, native): `$env:NODE_OPTIONS='--max-old-space-size=8192'; corepack pnpm --filter @ogden/web exec tsc --noEmit`
Expected: EXIT 0 (foreign errors excepted).

- [ ] **Step 7: Commit**

```
git fetch ; (confirm 0 behind)
git status -s -- apps/web/src/store/reviewFlagStore.ts apps/web/src/store/__tests__/reviewFlagStore.observationlog.test.ts
git add -- apps/web/src/store/reviewFlagStore.ts apps/web/src/store/__tests__/reviewFlagStore.observationlog.test.ts
git commit -m "feat(web): append observation-log record on flag resolve/dismiss"
```

**Gate T3:** web tsc clean; emission specs + all existing reviewFlagStore specs green; dormancy/reopen paths log nothing.

---

## Task T4 -- Verification + preview gate

- [ ] **Step 1: tsc both packages**

Run: `corepack pnpm --filter @ogden/shared exec tsc --noEmit` -> EXIT 0.
Run (PowerShell tool, native): `$env:NODE_OPTIONS='--max-old-space-size=8192'; corepack pnpm --filter @ogden/web exec tsc --noEmit` -> EXIT 0 (list any pre-existing FOREIGN errors; do not fix).

- [ ] **Step 2: Bounded test sweep (no regression)**

Run: `corepack pnpm --filter @ogden/shared exec vitest run --pool=forks observationRecord`
Run: `corepack pnpm --filter @ogden/web exec vitest run --pool=forks observationLogStore syncManifest reviewFlagStore`
Expected: all green -- new specs (`observationRecord`, `observationLogStore`, `reviewFlagStore.observationlog`) plus the existing `reviewFlagStore*` and `syncManifest*` suites.

- [ ] **Step 3: Live preview gate (`preview_eval` DOM, port 5200 -- `preview_screenshot` unavailable, DISCLOSE)**

  1. Back up `localStorage['ogden-observation-log']` and `localStorage['ogden-review-flags']` to temp keys.
  2. Seed one OPEN MTC flag into `ogden-review-flags` (shape: `{"state":{"byProject":{"mtc":[<flag>]}},"version":1}`) with a real `objectiveId`, distinct `sourceTemplateId`, `window:{season:'spring',cycleNumber:1}`, `deviationSign:'over'`, `depth:'water'`, `raisedAt` set, and NO resolvedAt/dismissedAt/dormantSince. Reload.
  3. Resolve that flag through the UI control that calls `resolveFlag` (the review-flag resolve action on the Plan objective). If no direct control is reachable in the seeded state, drive it via a `preview_eval` that calls `useReviewFlagStore.getState().resolveFlag('mtc', '<flagId>')`.
  4. In a SEPARATE `preview_eval` (let React flush), read `localStorage['ogden-observation-log']` and assert it contains exactly one record with `closeKind:'resolved'`, `flagId` matching, and `bucketKey:'spring:1'`.
  5. Restore both backed-up keys; remove the temp keys. Leave the app as found. DISCLOSE that the screenshot tool was unavailable and the check was DOM/localStorage-based.

- [ ] **Step 4: Wiki + design-doc close-out**

  - Flip `stages/design-observation-log-review.md` status `review -> approved (slice complete; verified live)`.
  - Create `wiki/decisions/2026-06-03-atlas-observation-log.md` (ADR: per-flag-closure grain, append-only twin of proofEventStore, emission at the resolve/dismiss chokepoint, syncManifest registration, unbounded retention).
  - Create `wiki/log/2026-06-03-atlas-observation-log.md` (what shipped + the preview gate result).
  - Commit (explicit paths only): `docs(wiki): record observation-log slice (chronic-detection substrate)`.

**Gate T4 (DONE):** both tsc clean (foreign excepted); all new + existing specs green (bounded forks); a real resolve appends exactly one record verified via `preview_eval` (disclosed); spine + ProtocolConfirmationFlow untouched; no deletions; ASCII-only; not pushed unless asked.

---

## Risks

| Risk | L | I | Mitigation |
|---|---|---|---|
| Unregistered persisted store fails the syncManifest coverage-guard build | High | High | T2 registers `ogden-observation-log` in the same task that creates the store; T2 runs the guard. |
| Inline-filter Zustand v5 selector -> infinite re-render | Med | High | `useObservationLog` mirrors `useReviewFlagCountsByObjective`: stable whole-array select + `useMemo` + module-level `EMPTY_RECORDS`. |
| Import cycle reviewFlagStore <-> observationLogStore | Low | Med | One-way only: reviewFlagStore imports the store; observationLogStore imports just the TYPE from `@ogden/shared`. Verified no back-import. |
| Emission silently bypassed by a non-closure path | Low | Med | Emission lives INSIDE resolve/dismiss (the only steward-closure chokepoints); dormancy/reopen deliberately excluded and tested. |
| Foreign WIP on a named file in the dirty tree | Med | Med | `git status -s <path>` each file before staging; explicit paths only; stop + confirm if already dirty. |
| `get` not destructured in the reviewFlagStore factory | Low | Low | T3 Step 4 note: confirm/add `get` (already used by other actions). |

## Definition of Done

A zod `ObservationRecord` + pure `buildObservationRecord` ship in `@ogden/shared`; an append-only `observationLogStore` (twin of `proofEventStore`, registered in `syncManifest`) persists records under `ogden-observation-log`; `reviewFlagStore.resolveFlag`/`dismissFlag` each append exactly one record (resolve+dismiss only; dormancy/reopen excluded); a Zustand-v5-safe `useObservationLog(projectId)` exposes per-project rows; shared + web tsc clean (foreign excepted); all new specs green (bounded forks); verified via `preview_eval` (disclosed); spine + ProtocolConfirmationFlow untouched; no deletions; ASCII-only; not pushed unless asked.

## Deferred (explicit, later slices)

- The chronic / multi-cycle co-occurrence detector (slice #3) -- unions `useObservationLog` history with live open clusters.
- Any UI surface for the log or for chronic verdicts.
- Retention / pruning / cap on `records[]`.
- Backfill of records for flags resolved before this ships -- the log starts EMPTY and accrues forward (disclosed, not fabricated).
