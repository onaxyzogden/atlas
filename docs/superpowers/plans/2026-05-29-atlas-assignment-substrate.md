# Assignment Substrate (ActTask) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make cross-user task assignment real by wiring the already-scaffolded ActTask sync to the server (addressed by the project's serverId), adding a `listForAssignee` read primitive, pulling tasks on project-open, and giving owners/designers an assign-to-member control in the Act feedback loop.

**Architecture:** ActTask carries the assignment (`assigneeId` -> users). The store is keyed by LOCAL project id (the OLOS UI flow keys every store by the local id from the route `/v3/project/$projectId/...`), but the `olos.tasks.*` API addresses projects by their server UUID. We resolve the serverId at the API boundary: `pullAll(localProjectId, serverId)` and `pushOne(task, serverId)` take the serverId explicitly and normalise every server record's `projectId` back to the LOCAL id on store-write, so the store stays internally local-keyed. A shared `useActTaskSync` hook pulls on project-open at the two surfaces that need it (Per-Project Home + the Act feedback loop). A role-gated `<select>` in `ActFeedbackLoop` writes the assignment and pushes it. No schema change.

**Tech Stack:** React 18 + TypeScript + Zustand + TanStack Router; Fastify + Postgres/PostGIS; Vitest + happy-dom + @testing-library/react; pnpm + Turborepo; Windows/PowerShell; `noUncheckedIndexedAccess: true`.

---

## Premise correction (read before executing)

This slice was scoped as "carry assignment on the already-server-backed ActTask." Investigation corrected one premise:

- **ActTask sync was scaffolded but never wired.** `pullAll` / `pushOne` / `pushDelete` exist on the store (Phase 2.4) but have **zero call sites** (`grep` of `apps/web/src` for `.pullAll(` / `.pushOne(` returns nothing). No ActTask reaches the server today.
- **Local <-> server id-space mismatch.** The store is keyed by LOCAL project id, but `api.olos.tasks.*` needs the server UUID (`/api/v1/projects/:projectId/olos/tasks`, server casts `::uuid`). The current `pullAll(projectId)` passes the LOCAL id to the API (wrong), and the current `pushOne` create-path keys the saved record under `saved.projectId` (the SERVER id) and never deletes the local-id draft -> wrong bucket + duplicate.

Option A (this plan) fixes both by resolving serverId at the API boundary and normalising `record.projectId` to the local id on write. This stays faithful to "carry on ActTask" and needs **no schema change**. The decision still holds over the alternative (FieldAction) because FieldAction has no server table at all.

**Deferred (not in this slice):** full per-record server<->local reconciliation a la `syncService.mergeDesignFeatures` (we replace-on-pull, which is correct for a read-then-assign flow); re-keying the OLOS stores by serverId globally; `pushDelete` serverId-threading (zero callers, not needed for assignment); the `SYNC_STATE_BLOBS` typed-table hydration path.

---

## Foreign WIP — DO NOT STAGE

The working tree has unrelated in-progress files. **Never `git add -A`.** Each task below lists the exact files to stage. Never stage any of: `apps/api/src/services/pdf/templates/capitalPartnerSummary.ts`, `apps/web/src/features/economics/EconomicsPanel.tsx`, `apps/web/src/features/export/CapitalPartnerSummaryExport.tsx`, `apps/web/src/features/financial/engine/missionScoring.ts`, `apps/web/src/features/financial/hooks/useFinancialModel.ts`, `apps/web/src/store/financialStore.ts`, `apps/web/src/v3/components/DesignMap.tsx`, `apps/web/src/v3/components/DiagnoseMap.tsx`, `apps/web/src/v3/components/OperateMap.tsx`, `apps/web/src/v3/plan/cards/phasing-budgeting/MaterialSubstitutionsCard.tsx`, `apps/web/src/v3/plan/cards/phasing-budgeting/substitutionCatalog.ts`, `apps/web/src/features/financial/ZoneSomSidebar.tsx` (+ its `__tests__`), `apps/web/src/v3/plan/cards/phasing-budgeting/materialSubstitutionMath.ts`, `apps/web/src/v3/plan/cards/phasing-budgeting/__tests__/`, `graphify-out/*`, `packages/shared/src/evidence/selectors/capitalPartner.ts`, `.superpowers/`, and any `tsc_*.txt` / `vitest_*.txt` / `_sweep_out.txt` / `_act_spec_dump.txt` / `_observe_spec_dump.txt` / `_dump_act_spec.py` / `slice3-auto-needs-display.*` / `tsc_errors.txt` / `tsc_slice111.txt`.

## Branch + commit discipline

- Work directly on `feat/atlas-permaculture` (it is rebased out-of-band; commit each task the moment it verifies).
- Before any commit: `git diff --cached --name-only` to confirm only the intended files are staged.
- Never `--no-verify`. Never `--force`. Commit footer (exact):
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```
- Typecheck (web): `cd apps/web` then `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit`.
- Tests (web): `cd apps/web` then `npx vitest run <path>`.
- All git on this Windows path uses PowerShell.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `apps/web/src/store/olos/actTaskStore.ts` | ActTask state + sync verbs | Modify: add `listForAssignee`; serverId-thread `pullAll`/`pushOne`; normalise `projectId` to local; fix create-path dedup bug |
| `apps/web/src/store/olos/__tests__/actTaskStore.test.ts` | Store unit tests | Create (Task 1), extend (Tasks 2, 3) |
| `apps/web/src/hooks/useActTaskSync.ts` | Pull-on-open hook (no-op offline) | Create |
| `apps/web/src/hooks/__tests__/useActTaskSync.test.ts` | Hook unit test | Create |
| `apps/web/src/v3/olos/handoff/ActFeedbackLoop.tsx` | Act surface: task list + assign control + escalation | Modify: assign `<select>`, role gate, pull wiring |
| `apps/web/src/v3/olos/handoff/HandoffSection.tsx` | Stage handoff dispatcher | Modify: thread `serverId` |
| `apps/web/src/v3/olos/ObjectiveWorkspace.tsx` | Objective workspace host | Modify: resolve `serverId` from projectStore, thread down |
| `apps/web/src/v3/olos/handoff/__tests__/ActFeedbackLoop.test.tsx` | Component test | Create |
| `apps/web/src/v3/home/PerProjectHomePage.tsx` | Assignee landing surface | Modify: call `useActTaskSync` |
| `apps/web/src/v3/home/__tests__/PerProjectHomePage.test.tsx` | Page test | Modify: mock hook + assert call |
| `wiki/...` + `docs/...` ADR | Decision record | Create/append (Task 8) |

---

### Task 1: `listForAssignee` selector (the read primitive)

The pure read primitive Slice 5.5b consumes for "tasks assigned to me". Independent of the sync work.

**Files:**
- Modify: `apps/web/src/store/olos/actTaskStore.ts` (interface ~line 60; impl ~line 148)
- Create: `apps/web/src/store/olos/__tests__/actTaskStore.test.ts`

- [ ] **Step 1: Write the failing test (create the file)**

Create `apps/web/src/store/olos/__tests__/actTaskStore.test.ts`:

```ts
/**
 * @vitest-environment happy-dom
 *
 * actTaskStore - assignment substrate (2026-05-29).
 * Covers the read primitive (listForAssignee) and the serverId-resolved sync
 * verbs (pullAll / pushOne) that wire cross-user assignment through the
 * olos_act_tasks API. The store is keyed by LOCAL project id; only the API
 * speaks serverId.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ActTask } from '@ogden/shared';

const h = vi.hoisted(() => ({
  listResp: [] as ActTask[],
  createResp: null as ActTask | null,
  updateResp: null as ActTask | null,
  listCalls: [] as string[],
  createCalls: [] as Array<{ projectId: string; input: unknown }>,
  updateCalls: [] as Array<{ projectId: string; taskId: string; patch: unknown }>,
}));

// Resolves to apps/web/src/lib/apiClient.ts - the same module the store imports
// as '../../lib/apiClient.js' (vi.mock matches by resolved absolute path).
vi.mock('../../../lib/apiClient.js', () => ({
  api: {
    olos: {
      tasks: {
        list: vi.fn(async (projectId: string) => {
          h.listCalls.push(projectId);
          return { data: h.listResp, error: null };
        }),
        create: vi.fn(async (projectId: string, input: unknown) => {
          h.createCalls.push({ projectId, input });
          return { data: h.createResp, error: null };
        }),
        update: vi.fn(
          async (projectId: string, taskId: string, patch: unknown) => {
            h.updateCalls.push({ projectId, taskId, patch });
            return { data: h.updateResp, error: null };
          },
        ),
      },
    },
  },
}));

import { useActTaskStore } from '../actTaskStore';

function task(
  p: Partial<ActTask> & { id: string; projectId: string },
): ActTask {
  return {
    objectiveId: 'obj-1',
    handoffPackageId: 'pkg-1',
    title: p.id,
    description: '',
    priority: 'normal',
    status: 'ready',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...p,
  } as ActTask;
}

beforeEach(() => {
  localStorage.clear();
  useActTaskStore.setState({ byProject: {}, syncByProject: {} });
  h.listResp = [];
  h.createResp = null;
  h.updateResp = null;
  h.listCalls = [];
  h.createCalls = [];
  h.updateCalls = [];
});

describe('actTaskStore.listForAssignee', () => {
  it('returns only the tasks whose assigneeId matches', () => {
    useActTaskStore.setState({
      byProject: {
        'local-1': {
          a: task({ id: 'a', projectId: 'local-1', assigneeId: 'u-me' }),
          b: task({ id: 'b', projectId: 'local-1', assigneeId: 'u-other' }),
          c: task({ id: 'c', projectId: 'local-1', assigneeId: 'u-me' }),
        },
      },
    });
    const mine = useActTaskStore
      .getState()
      .listForAssignee('local-1', 'u-me');
    expect(mine.map((t) => t.id).sort()).toEqual(['a', 'c']);
  });

  it('returns an empty array for an unknown project', () => {
    expect(
      useActTaskStore.getState().listForAssignee('nope', 'u-me'),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web; npx vitest run src/store/olos/__tests__/actTaskStore.test.ts`
Expected: FAIL — `listForAssignee is not a function`.

- [ ] **Step 3: Add the interface declaration**

In `apps/web/src/store/olos/actTaskStore.ts`, after the `listForObjective` declaration (currently line 60):

Old:
```ts
  /** Tasks tied to a given objective. */
  listForObjective: (projectId: string, objectiveId: string) => ActTask[];
```
New:
```ts
  /** Tasks tied to a given objective. */
  listForObjective: (projectId: string, objectiveId: string) => ActTask[];
  /** Tasks assigned to a given user - the "assigned to me" read primitive. */
  listForAssignee: (projectId: string, assigneeId: string) => ActTask[];
```

- [ ] **Step 4: Add the implementation**

In the same file, after the `listForObjective` implementation (currently lines 145-148):

Old:
```ts
        listForObjective: (projectId, objectiveId) =>
          Object.values(get().byProject[projectId] ?? {}).filter(
            (t) => t.objectiveId === objectiveId,
          ),
```
New:
```ts
        listForObjective: (projectId, objectiveId) =>
          Object.values(get().byProject[projectId] ?? {}).filter(
            (t) => t.objectiveId === objectiveId,
          ),

        listForAssignee: (projectId, assigneeId) =>
          Object.values(get().byProject[projectId] ?? {}).filter(
            (t) => t.assigneeId === assigneeId,
          ),
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/web; npx vitest run src/store/olos/__tests__/actTaskStore.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Typecheck**

Run: `cd apps/web; $env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```powershell
git add apps/web/src/store/olos/actTaskStore.ts apps/web/src/store/olos/__tests__/actTaskStore.test.ts
git diff --cached --name-only   # confirm ONLY those two files
git commit -m @'
feat(olos): add listForAssignee selector to actTaskStore

The read primitive for "tasks assigned to me" (Slice 5.5b). Pure get()-based
filter over byProject, mirroring listForObjective.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
'@
```

---

### Task 2: `pullAll(projectId, serverId)` — fetch by serverId, store local-keyed

Wire the read half of sync: fetch by the server UUID, normalise each record's `projectId` to the LOCAL id so the store stays internally local-keyed.

**Files:**
- Modify: `apps/web/src/store/olos/actTaskStore.ts` (interface line 98; impl lines 223-246)
- Modify: `apps/web/src/store/olos/__tests__/actTaskStore.test.ts` (append a describe block — the `h` mock harness, `task()` helper, and `beforeEach` from Task 1 are already in this file)

- [ ] **Step 1: Write the failing test (append to the existing file)**

Append to `apps/web/src/store/olos/__tests__/actTaskStore.test.ts`:

```ts
describe('actTaskStore.pullAll', () => {
  it('fetches by serverId and stores under the LOCAL projectId, normalising each record', async () => {
    h.listResp = [task({ id: 'uuid-a', projectId: 'srv-1', assigneeId: 'u-me' })];

    await useActTaskStore.getState().pullAll('local-1', 'srv-1');

    expect(h.listCalls).toEqual(['srv-1']); // addressed by serverId, not local id
    const stored = useActTaskStore.getState().byProject['local-1'] ?? {};
    expect(stored['uuid-a']?.projectId).toBe('local-1'); // normalised to local
    expect(stored['uuid-a']?.assigneeId).toBe('u-me');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web; npx vitest run src/store/olos/__tests__/actTaskStore.test.ts -t pullAll`
Expected: FAIL — TS arity error (pullAll takes 1 arg) and/or the record keeps `projectId: 'srv-1'`.

- [ ] **Step 3: Change the interface declaration**

In `apps/web/src/store/olos/actTaskStore.ts` (currently line 97-98):

Old:
```ts
  /** GET the project's tasks from the API and replace local state. */
  pullAll: (projectId: string) => Promise<void>;
```
New:
```ts
  /**
   * GET the project's tasks from the API (addressed by serverId) and replace
   * local state. Each server record's projectId is normalised to the LOCAL id.
   */
  pullAll: (projectId: string, serverId: string) => Promise<void>;
```

- [ ] **Step 4: Replace the implementation**

In the same file (currently lines 223-246):

Old:
```ts
        pullAll: async (projectId) => {
          set((s) => ({
            syncByProject: { ...s.syncByProject, [projectId]: startSync() },
          }));
          try {
            const env = await api.olos.tasks.list(projectId);
            if (env.error) throw new Error(env.error.message);
            const records = env.data ?? [];
            const byId: TasksById = {};
            for (const r of records) byId[r.id] = r;
            set((s) => ({
              byProject: { ...s.byProject, [projectId]: byId },
              syncByProject: { ...s.syncByProject, [projectId]: readySync() },
            }));
          } catch (err) {
            set((s) => ({
              syncByProject: {
                ...s.syncByProject,
                [projectId]: errorSync(err),
              },
            }));
            throw err;
          }
        },
```
New:
```ts
        pullAll: async (projectId, serverId) => {
          set((s) => ({
            syncByProject: { ...s.syncByProject, [projectId]: startSync() },
          }));
          try {
            const env = await api.olos.tasks.list(serverId);
            if (env.error) throw new Error(env.error.message);
            const records = env.data ?? [];
            const byId: TasksById = {};
            // Normalise the server record's projectId to the LOCAL id: the OLOS
            // UI flow keys every store by local projectId; only the API speaks
            // serverId. Without this the store would hold server-keyed records
            // that no UI surface can find.
            for (const r of records) byId[r.id] = { ...r, projectId };
            set((s) => ({
              byProject: { ...s.byProject, [projectId]: byId },
              syncByProject: { ...s.syncByProject, [projectId]: readySync() },
            }));
          } catch (err) {
            set((s) => ({
              syncByProject: {
                ...s.syncByProject,
                [projectId]: errorSync(err),
              },
            }));
            throw err;
          }
        },
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/web; npx vitest run src/store/olos/__tests__/actTaskStore.test.ts`
Expected: PASS (3 describe blocks now; pullAll green).

- [ ] **Step 6: Typecheck**

Run: `cd apps/web; $env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit`
Expected: no errors (zero callers of `pullAll` exist, so the arity change is safe).

- [ ] **Step 7: Commit**

```powershell
git add apps/web/src/store/olos/actTaskStore.ts apps/web/src/store/olos/__tests__/actTaskStore.test.ts
git diff --cached --name-only
git commit -m @'
feat(olos): pullAll fetches by serverId, stores local-keyed

Resolves the local<->server id mismatch at the API boundary: pullAll takes the
server UUID and normalises each record's projectId back to the local id so the
store stays internally keyed by local project id.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
'@
```

---

### Task 3: `pushOne(task, serverId)` — push by serverId, dedup create, normalise

Wire the write half: POST (local-id draft) or PATCH (UUID) addressed by serverId; on create, drop the local-id draft and store the server copy under the LOCAL bucket; normalise `projectId` to local on both paths. Fixes the current create-path bug (keys under the server id, leaves a duplicate).

**Files:**
- Modify: `apps/web/src/store/olos/actTaskStore.ts` (interface line 100; impl lines 248-301)
- Modify: `apps/web/src/store/olos/__tests__/actTaskStore.test.ts` (append a describe block)

- [ ] **Step 1: Write the failing test (append to the existing file)**

Append to `apps/web/src/store/olos/__tests__/actTaskStore.test.ts`:

```ts
describe('actTaskStore.pushOne', () => {
  it('create path: POSTs by serverId, replaces the local-id draft, normalises projectId', async () => {
    const draft = task({
      id: 'task-local',
      projectId: 'local-1',
      assigneeId: 'u-me',
    });
    useActTaskStore.setState({
      byProject: { 'local-1': { 'task-local': draft } },
    });
    h.createResp = task({
      id: 'uuid-new',
      projectId: 'srv-1',
      assigneeId: 'u-me',
    });

    await useActTaskStore.getState().pushOne(draft, 'srv-1');

    expect(h.createCalls[0]?.projectId).toBe('srv-1'); // addressed by serverId
    const stored = useActTaskStore.getState().byProject['local-1'] ?? {};
    expect(stored['task-local']).toBeUndefined(); // draft removed (dedup)
    expect(stored['uuid-new']?.projectId).toBe('local-1'); // normalised + correct bucket
  });

  it('update path: PATCHes by serverId + taskId, normalises projectId', async () => {
    const existing = task({
      id: 'uuid-x',
      projectId: 'local-1',
      assigneeId: 'u-me',
    });
    useActTaskStore.setState({
      byProject: { 'local-1': { 'uuid-x': existing } },
    });
    h.updateResp = task({
      id: 'uuid-x',
      projectId: 'srv-1',
      assigneeId: 'u-me',
    });

    await useActTaskStore.getState().pushOne(existing, 'srv-1');

    expect(h.updateCalls[0]?.projectId).toBe('srv-1');
    expect(h.updateCalls[0]?.taskId).toBe('uuid-x');
    const stored = useActTaskStore.getState().byProject['local-1'] ?? {};
    expect(stored['uuid-x']?.projectId).toBe('local-1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web; npx vitest run src/store/olos/__tests__/actTaskStore.test.ts -t pushOne`
Expected: FAIL — TS arity error (pushOne takes 1 arg); create-path keeps `task-local` and keys under `srv-1`.

- [ ] **Step 3: Change the interface declaration**

In `apps/web/src/store/olos/actTaskStore.ts` (currently line 99-100):

Old:
```ts
  /** POST (local id) or PATCH (UUID) the task upstream. */
  pushOne: (task: ActTask) => Promise<ActTask | null>;
```
New:
```ts
  /** POST (local id) or PATCH (UUID) the task upstream, addressed by serverId. */
  pushOne: (task: ActTask, serverId: string) => Promise<ActTask | null>;
```

- [ ] **Step 4: Replace the implementation**

In the same file (currently lines 248-301):

Old:
```ts
        pushOne: async (task) => {
          try {
            if (isLocalId(task.id)) {
              const { id: _id, projectId: _p, createdAt: _c, ...input } = task;
              const env = await api.olos.tasks.create(task.projectId, input);
              if (env.error) throw new Error(env.error.message);
              const saved = env.data;
              if (!saved) return null;
              set((s) => ({
                byProject: {
                  ...s.byProject,
                  [saved.projectId]: {
                    ...(s.byProject[saved.projectId] ?? {}),
                    [saved.id]: saved,
                  },
                },
              }));
              return saved;
            }
            const {
              id: _id,
              projectId: _p,
              handoffPackageId: _h,
              createdAt: _c,
              ...patch
            } = task;
            const env = await api.olos.tasks.update(
              task.projectId,
              task.id,
              patch,
            );
            if (env.error) throw new Error(env.error.message);
            const saved = env.data;
            if (!saved) return null;
            set((s) => ({
              byProject: {
                ...s.byProject,
                [saved.projectId]: {
                  ...(s.byProject[saved.projectId] ?? {}),
                  [saved.id]: saved,
                },
              },
            }));
            return saved;
          } catch (err) {
            set((s) => ({
              syncByProject: {
                ...s.syncByProject,
                [task.projectId]: errorSync(err),
              },
            }));
            throw err;
          }
        },
```
New:
```ts
        pushOne: async (task, serverId) => {
          // task.projectId is the LOCAL id (the store is local-keyed); the API
          // is addressed by serverId. Saved records are normalised back to the
          // local id before being written to the store.
          const localProjectId = task.projectId;
          try {
            if (isLocalId(task.id)) {
              const { id: _id, projectId: _p, createdAt: _c, ...input } = task;
              const env = await api.olos.tasks.create(serverId, input);
              if (env.error) throw new Error(env.error.message);
              const saved = env.data;
              if (!saved) return null;
              const normalised = { ...saved, projectId: localProjectId };
              set((s) => {
                const project = { ...(s.byProject[localProjectId] ?? {}) };
                // Drop the local-id draft so the created task is not duplicated
                // alongside its server copy.
                delete project[task.id];
                project[saved.id] = normalised;
                return {
                  byProject: { ...s.byProject, [localProjectId]: project },
                };
              });
              return normalised;
            }
            const {
              id: _id,
              projectId: _p,
              handoffPackageId: _h,
              createdAt: _c,
              ...patch
            } = task;
            const env = await api.olos.tasks.update(serverId, task.id, patch);
            if (env.error) throw new Error(env.error.message);
            const saved = env.data;
            if (!saved) return null;
            const normalised = { ...saved, projectId: localProjectId };
            set((s) => ({
              byProject: {
                ...s.byProject,
                [localProjectId]: {
                  ...(s.byProject[localProjectId] ?? {}),
                  [saved.id]: normalised,
                },
              },
            }));
            return normalised;
          } catch (err) {
            set((s) => ({
              syncByProject: {
                ...s.syncByProject,
                [localProjectId]: errorSync(err),
              },
            }));
            throw err;
          }
        },
```

- [ ] **Step 5: Run the full store test to verify it passes**

Run: `cd apps/web; npx vitest run src/store/olos/__tests__/actTaskStore.test.ts`
Expected: PASS (listForAssignee + pullAll + pushOne, all green).

- [ ] **Step 6: Typecheck**

Run: `cd apps/web; $env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit`
Expected: no errors (zero callers of `pushOne`).

- [ ] **Step 7: Commit**

```powershell
git add apps/web/src/store/olos/actTaskStore.ts apps/web/src/store/olos/__tests__/actTaskStore.test.ts
git diff --cached --name-only
git commit -m @'
feat(olos): pushOne pushes by serverId, dedups create, normalises projectId

Push half of ActTask sync. Addresses the API by serverId; on create, drops the
local-id draft and stores the server copy under the LOCAL bucket (fixes the old
bug that keyed under the server id and left a duplicate). Both paths normalise
projectId back to the local id.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
'@
```

---

### Task 4: `useActTaskSync` hook (pull on open, no-op offline)

A shared hook so the two surfaces that need a fresh pull (Per-Project Home, Act feedback loop) wire it identically. No-op when there is no serverId (local-only/offline projects render the full local view with no assignment concept).

**Files:**
- Create: `apps/web/src/hooks/useActTaskSync.ts`
- Create: `apps/web/src/hooks/__tests__/useActTaskSync.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/hooks/__tests__/useActTaskSync.test.ts`:

```ts
/**
 * @vitest-environment happy-dom
 *
 * useActTaskSync - pulls a project's ActTasks on mount (addressed by serverId)
 * and no-ops for local-only projects (no serverId).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const h = vi.hoisted(() => ({ listCalls: [] as string[] }));

// Resolves to apps/web/src/lib/apiClient.ts (the store imports it; the hook
// drives the store).
vi.mock('../../lib/apiClient.js', () => ({
  api: {
    olos: {
      tasks: {
        list: vi.fn(async (projectId: string) => {
          h.listCalls.push(projectId);
          return { data: [], error: null };
        }),
      },
    },
  },
}));

import { useActTaskSync } from '../useActTaskSync';

beforeEach(() => {
  localStorage.clear();
  h.listCalls = [];
});

describe('useActTaskSync', () => {
  it('pulls by serverId on mount when both ids are present', async () => {
    renderHook(() => useActTaskSync('local-1', 'srv-1'));
    await Promise.resolve();
    expect(h.listCalls).toEqual(['srv-1']);
  });

  it('does nothing for a local-only project (no serverId)', async () => {
    renderHook(() => useActTaskSync('local-1', undefined));
    await Promise.resolve();
    expect(h.listCalls).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web; npx vitest run src/hooks/__tests__/useActTaskSync.test.ts`
Expected: FAIL — cannot find module `../useActTaskSync`.

- [ ] **Step 3: Write the hook**

Create `apps/web/src/hooks/useActTaskSync.ts`:

```ts
/**
 * useActTaskSync - pulls a project's ActTasks from the server on mount so a
 * freshly opened device sees assignments made elsewhere.
 *
 * No-op for local-only projects (no serverId): assignment / scoped views are
 * an authenticated + synced capability, and the offline/demo flow always
 * renders the full local view. Safe to call unconditionally (before any early
 * return) because it guards on its own arguments.
 */
import { useEffect } from 'react';
import { useActTaskStore } from '../store/olos/index.js';

export function useActTaskSync(
  localProjectId?: string,
  serverId?: string,
): void {
  useEffect(() => {
    if (!localProjectId || !serverId) return;
    void useActTaskStore.getState().pullAll(localProjectId, serverId);
  }, [localProjectId, serverId]);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/web; npx vitest run src/hooks/__tests__/useActTaskSync.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck**

Run: `cd apps/web; $env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/hooks/useActTaskSync.ts apps/web/src/hooks/__tests__/useActTaskSync.test.ts
git diff --cached --name-only
git commit -m @'
feat(olos): add useActTaskSync hook (pull-on-open, no-op offline)

Shared hook that pulls a project's ActTasks by serverId on mount. No-ops for
local-only projects. Consumed by Per-Project Home and the Act feedback loop.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
'@
```

---

### Task 5: Assign-to-member control in `ActFeedbackLoop` (+ thread serverId)

Add the role-gated assignee `<select>` to the Act surface, wire the pull, and thread `serverId` down through `ObjectiveWorkspace` -> `HandoffSection` -> `ActFeedbackLoop`. The gate mirrors the API PATCH gate `requireRole('owner','designer')`: show the picker only to roles that satisfy either, and only on synced projects.

**Files:**
- Modify: `apps/web/src/v3/olos/ObjectiveWorkspace.tsx` (resolve serverId, thread to HandoffSection)
- Modify: `apps/web/src/v3/olos/handoff/HandoffSection.tsx` (thread serverId to ActFeedbackLoop)
- Modify: `apps/web/src/v3/olos/handoff/ActFeedbackLoop.tsx` (assign control + pull + gate)
- Create: `apps/web/src/v3/olos/handoff/__tests__/ActFeedbackLoop.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/v3/olos/handoff/__tests__/ActFeedbackLoop.test.tsx`:

```tsx
/**
 * @vitest-environment happy-dom
 *
 * ActFeedbackLoop - assignment substrate (2026-05-29). Pins:
 *   1. an owner sees an assignee picker per task; assigning writes
 *      ActTask.assigneeId and PATCHes the olos_act_tasks API by serverId;
 *   2. a viewer sees no picker (read-only);
 *   3. the surface wires the on-open pull via useActTaskSync.
 *
 * useActTaskSync is mocked here (it is unit-tested in its own suite); mocking
 * it keeps the seeded task from being clobbered by an async empty pull and
 * lets us assert the wiring call directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ActTask, Objective, ProjectMemberRecord } from '@ogden/shared';

const h = vi.hoisted(() => ({
  updateCalls: [] as Array<{ projectId: string; taskId: string; patch: { assigneeId?: string } }>,
}));

vi.mock('../../../../lib/apiClient.js', () => ({
  api: {
    olos: {
      tasks: {
        list: vi.fn(async () => ({ data: [], error: null })),
        create: vi.fn(async () => ({ data: null, error: null })),
        update: vi.fn(
          async (projectId: string, taskId: string, patch: { assigneeId?: string }) => {
            h.updateCalls.push({ projectId, taskId, patch });
            return { data: { ...patch, id: taskId, projectId }, error: null };
          },
        ),
      },
    },
    members: { list: vi.fn(async () => ({ data: [], error: null })) },
  },
}));

vi.mock('../../../../hooks/useActTaskSync.js', () => ({
  useActTaskSync: vi.fn(),
}));

import { useActTaskStore } from '../../../../store/olos/index.js';
import { useMemberStore } from '../../../../store/memberStore.js';
import { useAuthStore } from '../../../../store/authStore.js';
import { useActTaskSync } from '../../../../hooks/useActTaskSync.js';
import ActFeedbackLoop from '../ActFeedbackLoop';

const OBJ = { id: 'obj-1', domain: 'water', stage: 'act' } as unknown as Objective;

function member(
  userId: string,
  role: ProjectMemberRecord['role'],
  displayName: string,
): ProjectMemberRecord {
  return {
    userId,
    role,
    displayName,
    email: `${userId}@x.co`,
    joinedAt: '2026-01-01T00:00:00.000Z',
  } as ProjectMemberRecord;
}

function seedTask(): void {
  useActTaskStore.setState({
    byProject: {
      'local-1': {
        'uuid-t1': {
          id: 'uuid-t1',
          projectId: 'local-1',
          objectiveId: 'obj-1',
          handoffPackageId: 'pkg-1',
          title: 'Mulch the swale',
          description: '',
          priority: 'normal',
          status: 'ready',
          createdAt: '2026-01-01T00:00:00.000Z',
        } as ActTask,
      },
    },
    syncByProject: {},
  });
}

beforeEach(() => {
  localStorage.clear();
  h.updateCalls = [];
  seedTask();
  useMemberStore.setState({
    members: [
      member('u-owner', 'owner', 'Owner'),
      member('u-me', 'team_member', 'Me'),
    ],
    myRole: null,
    myRoles: {},
    isLoading: false,
  });
  useAuthStore.setState({
    user: { id: 'u-owner', email: 'o@x.co', displayName: 'Owner', defaultOrgId: 'org-1' },
  });
});

describe('ActFeedbackLoop - assignment', () => {
  it('owner sees an assignee picker and assigning PATCHes by serverId', async () => {
    render(<ActFeedbackLoop projectId="local-1" objective={OBJ} serverId="srv-1" />);

    const select = screen.getByLabelText('Assign Mulch the swale');
    expect(select).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Me' })).toBeTruthy();

    fireEvent.change(select, { target: { value: 'u-me' } });

    const stored = useActTaskStore.getState().byProject['local-1'] ?? {};
    expect(stored['uuid-t1']?.assigneeId).toBe('u-me'); // assign applied synchronously

    await Promise.resolve();
    expect(h.updateCalls).toHaveLength(1);
    const call = h.updateCalls[0]!;
    expect(call.projectId).toBe('srv-1');
    expect(call.taskId).toBe('uuid-t1');
    expect(call.patch.assigneeId).toBe('u-me');
  });

  it('wires the on-open pull with the local id + serverId', () => {
    render(<ActFeedbackLoop projectId="local-1" objective={OBJ} serverId="srv-1" />);
    expect(vi.mocked(useActTaskSync)).toHaveBeenCalledWith('local-1', 'srv-1');
  });

  it('a viewer sees no assignee picker', () => {
    useAuthStore.setState({
      user: { id: 'u-viewer', email: 'v@x.co', displayName: 'V', defaultOrgId: 'org-1' },
    });
    useMemberStore.setState((s) => ({
      members: [...s.members, member('u-viewer', 'viewer', 'V')],
    }));
    render(<ActFeedbackLoop projectId="local-1" objective={OBJ} serverId="srv-1" />);
    expect(screen.queryByLabelText('Assign Mulch the swale')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web; npx vitest run src/v3/olos/handoff/__tests__/ActFeedbackLoop.test.tsx`
Expected: FAIL — `ActFeedbackLoop` does not accept `serverId`; no `Assign ...` label exists.

- [ ] **Step 3: Replace `ActFeedbackLoop.tsx` in full**

> This is a faithful superset of the current file: every existing string, the
> entire escalation form, and the closing note are reproduced byte-for-byte;
> only the docstring (updated to describe assignment), the imports, the hooks,
> the derived `myRole`/`canAssign`/`onAssign`, and the per-task `<select>` are
> added. Preserve the em-dash in "No tasks yet — emit ..." exactly as written —
> it is pre-existing copy; do NOT ASCII-normalise it (that would be an
> undiscussed edit to existing UI text). New copy you add ("Unassigned",
> "Assigned", `Assign <title>`) is ASCII, per the project rule.

Overwrite `apps/web/src/v3/olos/handoff/ActFeedbackLoop.tsx` with:

```tsx
/**
 * ActFeedbackLoop - the Act->upstream return path. Lists the tasks attached to
 * the current Act objective, lets an owner/designer assign each task to a
 * project member, and lets the steward raise an EscalationRecord routed back to
 * Observe / Plan / Risk / Monitoring.
 *
 * Assignment is the cross-user substrate (2026-05-29): the assignee picker
 * writes ActTask.assigneeId and pushes it to the olos_act_tasks API addressed
 * by the project's serverId, so the assignee sees the task on any device. The
 * picker only renders for synced projects (serverId present) and editors (roles
 * that satisfy owner/designer, mirroring the API PATCH gate); local-only /
 * offline projects render the plain task list.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  EscalationSeverity,
  EscalationTriggerKind,
  STATUS_LABELS,
  Stage,
  roleSatisfies,
  type Objective,
} from '@ogden/shared';
import {
  useActTaskStore,
  useEscalationRecordStore,
} from '../../../store/olos/index.js';
import { useMemberStore } from '../../../store/memberStore.js';
import { useAuthStore } from '../../../store/authStore.js';
import { useActTaskSync } from '../../../hooks/useActTaskSync.js';
import css from './HandoffSection.module.css';

interface Props {
  projectId: string;
  objective: Objective;
  serverId?: string;
}

const STAGE_OPTIONS = Stage.options;
const TRIGGER_OPTIONS = EscalationTriggerKind.options;
const SEVERITY_OPTIONS = EscalationSeverity.options;

export default function ActFeedbackLoop({
  projectId,
  objective,
  serverId,
}: Props) {
  const taskByProject = useActTaskStore((s) => s.byProject);
  const assign = useActTaskStore((s) => s.assign);
  const pushOne = useActTaskStore((s) => s.pushOne);
  const getTask = useActTaskStore((s) => s.getTask);
  const escalationByProject = useEscalationRecordStore((s) => s.byProject);
  const createEscalation = useEscalationRecordStore((s) => s.createEscalation);

  const members = useMemberStore((s) => s.members);
  const fetchMembers = useMemberStore((s) => s.fetchMembers);
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Pull this project's tasks on mount so assignments made elsewhere are
  // visible. No-op for local-only projects.
  useActTaskSync(projectId, serverId);

  // Load the member roster for the assignee picker on synced projects.
  useEffect(() => {
    if (serverId && members.length === 0) void fetchMembers(serverId);
  }, [serverId, members.length, fetchMembers]);

  const tasks = useMemo(
    () =>
      Object.values(taskByProject[projectId] ?? {}).filter(
        (t) => t.objectiveId === objective.id,
      ),
    [taskByProject, projectId, objective.id],
  );
  const escalations = useMemo(
    () =>
      Object.values(escalationByProject[projectId] ?? {}).filter(
        (e) => e.objectiveId === objective.id,
      ),
    [escalationByProject, projectId, objective.id],
  );

  const myRole = useMemo(
    () => members.find((m) => m.userId === currentUserId)?.role,
    [members, currentUserId],
  );
  // Mirrors the API PATCH gate requireRole('owner','designer'): show the picker
  // only to roles that satisfy either, and only on synced projects.
  const canAssign =
    !!serverId &&
    !!myRole &&
    (roleSatisfies(myRole, 'owner') || roleSatisfies(myRole, 'designer'));

  const onAssign = (taskId: string, userId: string) => {
    if (!serverId) return;
    const existing = getTask(projectId, taskId);
    if (!existing) return;
    // Preserve the existing roleId: assign() wipes roleId when passed undefined.
    assign(projectId, taskId, userId || undefined, existing.roleId);
    const updated = getTask(projectId, taskId);
    if (updated) void pushOne(updated, serverId);
  };

  const [showForm, setShowForm] = useState(false);
  const [trigger, setTrigger] = useState<typeof TRIGGER_OPTIONS[number]>(
    'new-condition',
  );
  const [severity, setSeverity] = useState<typeof SEVERITY_OPTIONS[number]>(
    'medium',
  );
  const [routedTo, setRoutedTo] = useState<typeof STAGE_OPTIONS[number]>(
    'observe',
  );
  const [note, setNote] = useState('');

  const onRaise = () => {
    if (!trigger || !routedTo) return;
    createEscalation(projectId, {
      objectiveId: objective.id,
      triggerKind: trigger,
      triggerNote: note,
      severity,
      routedToStage: routedTo,
      routedToDomain: objective.domain,
      requestedAction: '',
      status: 'open',
    });
    setNote('');
    setShowForm(false);
  };

  return (
    <div className={css.wrap}>
      <div className={css.packet}>
        <span className={css.packetTitle}>Act tasks for this objective</span>
        {tasks.length === 0 ? (
          <p className={css.packetEmpty}>
            No tasks yet — emit a Plan handoff from the matching Plan
            objective to seed the first task.
          </p>
        ) : (
          <ul className={css.tasksList}>
            {tasks.map((t) => {
              const assignee = members.find((m) => m.userId === t.assigneeId);
              return (
                <li key={t.id}>
                  <span>{t.title}</span>
                  <span className={css.taskStatus}>
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                  {canAssign ? (
                    <select
                      className={css.formSelect}
                      aria-label={`Assign ${t.title}`}
                      value={t.assigneeId ?? ''}
                      onChange={(e) => onAssign(t.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.displayName ?? m.email}
                        </option>
                      ))}
                    </select>
                  ) : t.assigneeId ? (
                    <span className={css.taskStatus}>
                      {assignee?.displayName ?? assignee?.email ?? 'Assigned'}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={css.actions}>
        <button
          type="button"
          className={css.btnGhost}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Cancel escalation' : 'Raise escalation'}
        </button>
        {escalations.length > 0 ? (
          <span className={css.chip}>
            {escalations.length} raised from this objective
          </span>
        ) : null}
      </div>

      {showForm ? (
        <div className={css.form}>
          <div className={css.formRow}>
            <label htmlFor="esc-trigger">Trigger</label>
            <select
              id="esc-trigger"
              className={css.formSelect}
              value={trigger}
              onChange={(e) =>
                setTrigger(e.target.value as typeof TRIGGER_OPTIONS[number])
              }
            >
              {TRIGGER_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className={css.formRow}>
            <label htmlFor="esc-severity">Severity</label>
            <select
              id="esc-severity"
              className={css.formSelect}
              value={severity}
              onChange={(e) =>
                setSeverity(e.target.value as typeof SEVERITY_OPTIONS[number])
              }
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className={css.formRow}>
            <label htmlFor="esc-route">Route to</label>
            <select
              id="esc-route"
              className={css.formSelect}
              value={routedTo}
              onChange={(e) =>
                setRoutedTo(e.target.value as typeof STAGE_OPTIONS[number])
              }
            >
              {STAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className={css.formRow}>
            <label htmlFor="esc-note">Note</label>
            <input
              id="esc-note"
              className={css.formInput}
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What changed / what needs upstream attention?"
            />
          </div>
          <div className={css.actions}>
            <button type="button" className={css.btnPrimary} onClick={onRaise}>
              Raise escalation
            </button>
          </div>
        </div>
      ) : null}

      <p className={css.note}>
        Escalations feed back to Observe / Plan / Risk / Monitoring so the owning
        Stage can re-observe, redesign, or close the signal.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Thread serverId through `HandoffSection.tsx`**

Overwrite `apps/web/src/v3/olos/handoff/HandoffSection.tsx` with:

```tsx
/**
 * HandoffSection - dispatches to the stage-specific handoff component for the
 * objective being worked. Mounts in ObjectiveWorkspace's side panel and
 * replaces the Phase 1.5 placeholder button.
 */

import type { Objective } from '@ogden/shared';
import ObserveToPlanHandoff from './ObserveToPlanHandoff.js';
import PlanToActHandoff from './PlanToActHandoff.js';
import ActFeedbackLoop from './ActFeedbackLoop.js';

interface Props {
  projectId: string;
  objective: Objective;
  serverId?: string;
}

export default function HandoffSection({ projectId, objective, serverId }: Props) {
  if (objective.stage === 'observe') {
    return <ObserveToPlanHandoff projectId={projectId} objective={objective} />;
  }
  if (objective.stage === 'plan') {
    return <PlanToActHandoff projectId={projectId} objective={objective} />;
  }
  return (
    <ActFeedbackLoop
      projectId={projectId}
      objective={objective}
      serverId={serverId}
    />
  );
}
```

- [ ] **Step 5: Resolve + thread serverId in `ObjectiveWorkspace.tsx`**

5a. Add the projectStore import. After the existing olos store import block (currently lines 27-31), insert a new import line:

Old:
```ts
import {
  useChecklistProgressStore,
  useObservationRecordStore,
  usePlanDecisionRecordStore,
} from '../../store/olos/index.js';
import type { Project } from '../types.js';
```
New:
```ts
import {
  useChecklistProgressStore,
  useObservationRecordStore,
  usePlanDecisionRecordStore,
} from '../../store/olos/index.js';
import { useProjectStore } from '../../store/projectStore.js';
import type { Project } from '../types.js';
```

5b. Resolve serverId from projectStore (the v3 `Project` type has no serverId; the projectStore's LocalProject does). After the `setPlanApprovalStatus` hook (currently lines 68-70), insert:

Old:
```ts
  const setPlanApprovalStatus = usePlanDecisionRecordStore(
    (s) => s.setApprovalStatus,
  );
```
New:
```ts
  const setPlanApprovalStatus = usePlanDecisionRecordStore(
    (s) => s.setApprovalStatus,
  );

  // The v3 Project carries no serverId; resolve it from the project store
  // (keyed by the same local id) so the Act handoff can sync assignment.
  const serverId = useProjectStore((s) =>
    s.projects.find((p) => p.id === projectId)?.serverId,
  );
```

5c. Pass serverId to HandoffSection (currently line 245):

Old:
```tsx
          <HandoffSection projectId={projectId} objective={objective} />
```
New:
```tsx
          <HandoffSection
            projectId={projectId}
            objective={objective}
            serverId={serverId}
          />
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd apps/web; npx vitest run src/v3/olos/handoff/__tests__/ActFeedbackLoop.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Typecheck**

Run: `cd apps/web; $env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```powershell
git add apps/web/src/v3/olos/handoff/ActFeedbackLoop.tsx apps/web/src/v3/olos/handoff/HandoffSection.tsx apps/web/src/v3/olos/ObjectiveWorkspace.tsx apps/web/src/v3/olos/handoff/__tests__/ActFeedbackLoop.test.tsx
git diff --cached --name-only
git commit -m @'
feat(olos): role-gated assign-to-member control in Act feedback loop

Adds an assignee picker (owner/designer on synced projects), wires the on-open
pull via useActTaskSync, and threads serverId
ObjectiveWorkspace -> HandoffSection -> ActFeedbackLoop. Assignment writes
ActTask.assigneeId and pushes it by serverId; roleId is preserved.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
'@
```

---

### Task 6: Wire `useActTaskSync` into `PerProjectHomePage`

The assignee's landing surface. Pulling here means a team_member opening their project home (Slice 5.5b) sees tasks assigned to them on a fresh device. The hook is called before the early return (it guards on its own args).

**Files:**
- Modify: `apps/web/src/v3/home/PerProjectHomePage.tsx`
- Modify: `apps/web/src/v3/home/__tests__/PerProjectHomePage.test.tsx`

- [ ] **Step 1: Write the failing test (extend the existing suite)**

1a. Add the hook mock alongside the other mocks in `apps/web/src/v3/home/__tests__/PerProjectHomePage.test.tsx` (after the existing `vi.mock('../../../hooks/useMyProjectRoles.js', ...)` block, currently lines 152-154):

```ts
vi.mock('../../../hooks/useActTaskSync.js', () => ({
  useActTaskSync: vi.fn(),
}));
```

1b. Add the hook import next to the SUT import (after the existing `import PerProjectHomePage from '../PerProjectHomePage';` line):

```ts
import { useActTaskSync } from '../../../hooks/useActTaskSync.js';
```

1c. Append a new describe block at the end of the file:

```ts
describe('PerProjectHomePage - ActTask pull on open', () => {
  it('pulls ActTasks with the local id + serverId for a synced project', () => {
    h.project = { ...h.project!, serverId: 'srv-1' };
    render(<PerProjectHomePage />);
    expect(vi.mocked(useActTaskSync)).toHaveBeenCalledWith('p-1', 'srv-1');
  });

  it('passes no serverId for a local-only project (hook no-ops)', () => {
    h.project = { ...h.project!, serverId: undefined };
    render(<PerProjectHomePage />);
    expect(vi.mocked(useActTaskSync)).toHaveBeenCalledWith('p-1', undefined);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web; npx vitest run src/v3/home/__tests__/PerProjectHomePage.test.tsx -t "ActTask pull"`
Expected: FAIL — `useActTaskSync` was never called (PerProjectHomePage does not call it yet).

- [ ] **Step 3: Wire the hook into the page**

3a. Add the import to `apps/web/src/v3/home/PerProjectHomePage.tsx`. After the existing `useMyProjectRoles` import (currently line 21):

Old:
```ts
import { useMyProjectRoles } from '../../hooks/useMyProjectRoles.js';
```
New:
```ts
import { useMyProjectRoles } from '../../hooks/useMyProjectRoles.js';
import { useActTaskSync } from '../../hooks/useActTaskSync.js';
```

3b. Call the hook before the early return. After `const roleMap = useMyProjectRoles();` (currently line 41):

Old:
```ts
  const roleMap = useMyProjectRoles();

  if (!project) {
```
New:
```ts
  const roleMap = useMyProjectRoles();

  // Pull this project's ActTasks on open so the assignee's "assigned to me"
  // surface (Slice 5.5b) reflects assignments made elsewhere. No-op offline.
  // Called before the early return; the hook guards on its own arguments.
  useActTaskSync(project?.id, project?.serverId);

  if (!project) {
```

- [ ] **Step 4: Run the full page suite to verify it passes**

Run: `cd apps/web; npx vitest run src/v3/home/__tests__/PerProjectHomePage.test.tsx`
Expected: PASS — the original 14 tests stay green (the hook is a no-op spy) plus the 2 new ones.

- [ ] **Step 5: Typecheck**

Run: `cd apps/web; $env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/v3/home/PerProjectHomePage.tsx apps/web/src/v3/home/__tests__/PerProjectHomePage.test.tsx
git diff --cached --name-only
git commit -m @'
feat(olos): pull ActTasks on Per-Project Home open

Wires useActTaskSync at the assignee landing surface so a synced project hydrates
its task assignments on open (sets up the Slice 5.5b "assigned to me" view).
No-op for local-only projects.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
'@
```

---

### Task 7: Full-suite green + typecheck sweep + divergence-checked push

Verification gate across all three packages, then a divergence-checked push (the branch is rebased out-of-band).

**Files:** none (verification only; if a fix is needed, stage only the file fixed).

- [ ] **Step 1: Web typecheck**

Run: `cd apps/web; $env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Shared + API typecheck**

Run: `cd packages/shared; npx tsc --noEmit`
Run: `cd apps/api; npx tsc --noEmit`
Expected: no errors (this slice touches neither package; this confirms no incidental break).

- [ ] **Step 3: Run the touched test files**

Run:
```powershell
cd apps/web; npx vitest run src/store/olos/__tests__/actTaskStore.test.ts src/hooks/__tests__/useActTaskSync.test.ts src/v3/olos/handoff/__tests__/ActFeedbackLoop.test.tsx src/v3/home/__tests__/PerProjectHomePage.test.tsx
```
Expected: all PASS.

- [ ] **Step 4: Run the full web suite (catch incidental breakage)**

Run: `cd apps/web; npx vitest run`
Expected: PASS (no regressions). If a pre-existing unrelated failure appears that is clearly tied to the foreign WIP files, note it and do not attempt to fix it here.

- [ ] **Step 5: Fetch + check divergence before pushing**

Run:
```powershell
git fetch origin feat/atlas-permaculture
git log --left-right --oneline HEAD...origin/feat/atlas-permaculture
```
Expected: understand divergence. If `origin` has commits HEAD lacks, STOP and surface it (the branch was rebased out-of-band) before any push. If clean fast-forward, push:
```powershell
git push origin feat/atlas-permaculture
```

---

### Task 8: Implementation ADR + epic-ADR addendum + wiki log + pointers

Record the decision and the premise correction (mirrors Slice 5.5a Task 8). ASCII-only.

**Files:**
- Create: `wiki/decisions/2026-05-29-assignment-substrate-acttask.md`
- Modify: `wiki/decisions/2026-05-28-atlas-scoped-views-epic-design.md` (open-questions addendum)
- Create: `wiki/log/2026-05-29-assignment-substrate.md`
- Modify: `wiki/index.md` (rich Decisions-section paragraph entry)

> The wiki log convention is one file per day under `wiki/log/YYYY-MM-DD-slug.md` (NOT the monolithic `wiki/log.md`, which is collision-prone on this force-pushed branch -- confirmed by [[concepts/parallel-session-coordination]] and the `[[log/...]]` wikilinks throughout `wiki/index.md`). Do NOT touch `wiki/log.md`. Verify the exact path of the epic ADR first: `Glob wiki/decisions/2026-05-28-*scoped*`; if the slug differs, use the actual file. Match the formatting of the neighbouring entries.

- [ ] **Step 1: Write the implementation ADR**

Create `wiki/decisions/2026-05-29-assignment-substrate-acttask.md`:

```markdown
# 2026-05-29 - Assignment substrate carried on ActTask

Status: Accepted
Slice: Assignment substrate (precedes 5.5b)
Branch: feat/atlas-permaculture

## Context

Slice 5.5b (team_member scoped Per-Project Home) needs to read "tasks assigned
to me." That requires a real cross-user assignment substrate: a read primitive,
a pull on project-open, and an assign control. Two candidate carriers were
considered: ActTask (server-backed) and FieldAction.

## Decision

Carry assignment on ActTask (assigneeId -> users). It has a server table, a sync
scaffold, and an assign() mutator. FieldAction has no server table at all, so it
could not back a cross-user feature without new backend work.

## Premise correction discovered during implementation

The slice was scoped as "ActTask is already fully synced." That was inaccurate:

- pullAll / pushOne / pushDelete existed (Phase 2.4) but had zero call sites - no
  ActTask reached the server.
- The store is keyed by the LOCAL project id, but the olos.tasks API is addressed
  by the server UUID. The old pullAll passed the local id to the API; the old
  pushOne create-path keyed the saved record under the server id and left the
  local-id draft in place (wrong bucket + duplicate).

This did not change the decision (ActTask still beats FieldAction), but it
expanded the slice to actually wire the round-trip.

## How it was built (Option A: resolve serverId at the API boundary)

- pullAll(localProjectId, serverId) and pushOne(task, serverId) take the serverId
  explicitly. The serverId is resolved from the project store at the call site
  (PerProjectHomePage has the LocalProject; ObjectiveWorkspace looks it up by
  local id). No schema change.
- Every server record's projectId is normalised back to the LOCAL id on
  store-write, so the store stays internally local-keyed and every UI surface can
  find its records.
- pushOne create-path now deletes the local-id draft and stores the server copy
  under the local bucket (dedup fix).
- listForAssignee(projectId, assigneeId) is the read primitive for 5.5b.
- useActTaskSync(localProjectId, serverId) pulls on open; no-op when there is no
  serverId (local-only / offline projects render the full local view, no
  assignment concept - assignment is an authenticated + synced capability).
- The assign control is a role-gated <select> in ActFeedbackLoop. The gate
  mirrors the API PATCH gate requireRole('owner','designer') via
  roleSatisfies(myRole,'owner') || roleSatisfies(myRole,'designer'), and only on
  synced projects. team_member aliases to designer, so it currently satisfies the
  gate server-side; 5.5b / 5.5c tighten the scoped surfaces.

## Deferred

- Full per-record server<->local reconciliation a la syncService.mergeDesignFeatures
  (we replace-on-pull, correct for read-then-assign).
- Re-keying the OLOS stores by serverId globally.
- pushDelete serverId-threading (zero callers; not needed for assignment).
- The SYNC_STATE_BLOBS typed-table hydration path.

## Consequences

5.5b can now read listForAssignee for the team_member home. Assignment is a
synced-only capability; offline projects are unaffected.
```

- [ ] **Step 2: Append the epic-ADR open-questions addendum**

In the epic ADR (`wiki/decisions/2026-05-28-atlas-scoped-views-epic-design.md`, or the actual slug from the Glob), append to its open-questions / decisions-log section:

```markdown

## Addendum 2026-05-29 - assignment substrate resolved

The open question "what backs cross-user assignment for the team_member scoped
home" is resolved: assignment is carried on the server-backed ActTask
(assigneeId). Slice 5.5b reads useActTaskStore.listForAssignee(projectId,
assigneeId). Note the premise correction recorded in
[2026-05-29-assignment-substrate-acttask.md](2026-05-29-assignment-substrate-acttask.md):
ActTask sync was scaffolded but never wired; it is now wired by resolving the
serverId at the API boundary (no schema change).
```

- [ ] **Step 3: Write the session log entry**

Create `wiki/log/2026-05-29-assignment-substrate.md` (mirror the Slice 5.5a log structure: `# date - title` / `**Branch.**` / `## Shipped` / `## Notable choices` / `## Verification` / `## Carry-over`):

```markdown
# 2026-05-29 - Assignment substrate (ActTask)

**Branch.** `feat/atlas-permaculture`. The cross-user assignment substrate that
precedes Slice 5.5b. ADR:
[[decisions/2026-05-29-assignment-substrate-acttask]]. Design:
[[decisions/2026-05-28-atlas-scoped-views-epic-design]].

## Shipped

Three deliverables so 5.5b can read "tasks assigned to me":
`listForAssignee(projectId, assigneeId)` read primitive on the ActTask store;
`pullAll` wired on project-open via a new `useActTaskSync(localProjectId,
serverId)` hook (mounted in PerProjectHomePage and ObjectiveWorkspace); and a
role-gated assign-to-member `<select>` in ActFeedbackLoop. The assign gate
mirrors the API PATCH gate `requireRole('owner','designer')` via `roleSatisfies`
and only renders on a synced project.

## Notable choices

- ActTask sync was scaffolded (Phase 2.4) but never wired - zero call sites, no
  ActTask reached the server. The store is keyed by the LOCAL project id while
  the `olos.tasks` API is addressed by the server UUID.
- Option A (no schema change): `pullAll(localProjectId, serverId)` and
  `pushOne(task, serverId)` take the serverId explicitly; it is resolved from
  the project store at the call site. Every server record's projectId is
  normalised back to the LOCAL id on store-write.
- Fixed the pushOne create-path bug: it keyed the saved record under the server
  id and left the local-id draft in place (wrong bucket + duplicate). It now
  deletes the draft and stores the server copy under the local bucket.
- Assignment is a synced-only capability: offline / local-only projects render
  the full single-owner view with no assignment concept.

## Verification

web/shared/api `tsc --noEmit` clean; the new store / hook / component vitest
files green; full web vitest green. Per-commit `git diff --cached --name-only`
confirmed only slice files staged - no foreign WIP. Divergence check before push
per [[feedback-commit-immediately-on-rebased-branches]].

## Carry-over

5.5b (team_member scoped Per-Project Home) reads `listForAssignee` for the
"assigned to me" filter. 5.5c / 5.5d follow.
```

- [ ] **Step 4: Add the index Decisions-section entry**

In `wiki/index.md`, insert a rich paragraph entry at the TOP of the `## Decisions` list (most-recent-first; it goes immediately above the `2026-05-29 projectType normalization` entry). Match the multi-sentence paragraph format + the trailing `Log: [[log/...]]` of the neighbouring entries, using the ASCII `--` separator the most-recent entry uses. Do NOT edit `wiki/log.md`.
```markdown
- [2026-05-29 Assignment substrate carried on ActTask (listForAssignee + pull-on-open + role-gated assign control)](decisions/2026-05-29-assignment-substrate-acttask.md) -- Built the cross-user assignment substrate that Slice 5.5b needs to read "tasks assigned to me," on `feat/atlas-permaculture`. Three deliverables: a `listForAssignee(projectId, assigneeId)` read primitive on the ActTask store, `pullAll` wired on project-open via a new `useActTaskSync(localProjectId, serverId)` hook (mounted in PerProjectHomePage + ObjectiveWorkspace), and a role-gated assign-to-member `<select>` in ActFeedbackLoop whose gate mirrors the API PATCH gate `requireRole('owner','designer')` via `roleSatisfies` and only renders on a synced project. **Premise correction:** the slice was scoped as "ActTask is already fully synced" but `pullAll`/`pushOne`/`pushDelete` (Phase 2.4) had zero call sites -- no ActTask reached the server -- and the store is keyed by the LOCAL project id while the `olos.tasks` API is addressed by the server UUID (the old pullAll passed the local id to the API; the old pushOne create-path keyed the saved record under the server id and left the local-id draft in place -- wrong bucket + duplicate). **Option A (no schema change):** `pullAll(localProjectId, serverId)` and `pushOne(task, serverId)` take the serverId explicitly, resolved from the project store at the call site; every server record's projectId is normalised back to the LOCAL id on store-write; the pushOne create-path now deletes the draft and stores the server copy under the local bucket. Assignment is a synced-only capability -- offline / local-only projects render the full single-owner view with no assignment concept; team_member aliases to designer so it currently satisfies the gate, and 5.5b / 5.5c tighten the scoped surfaces. Deferred: full per-record server<->local reconciliation, global serverId re-keying of the OLOS stores, pushDelete serverId-threading (zero callers), SYNC_STATE_BLOBS hydration. Verified: web/shared/api `tsc --noEmit` clean; new store/hook/component vitest + full web vitest green; per-commit `git diff --cached --name-only` (no foreign WIP); divergence-checked push. No-deletion; 3-item nav forward IA; CSRA model untouched; ASCII-only copy. Implements [[decisions/2026-05-28-atlas-scoped-views-epic-design]]. Log: [[log/2026-05-29-assignment-substrate]].
```

- [ ] **Step 5: Commit**

```powershell
git add wiki/decisions/2026-05-29-assignment-substrate-acttask.md wiki/decisions/2026-05-28-atlas-scoped-views-epic-design.md wiki/log/2026-05-29-assignment-substrate.md wiki/index.md
git diff --cached --name-only   # confirm only wiki files (adjust the epic-ADR path to the real one found via Glob); wiki/log.md must NOT appear
git commit -m @'
docs(wiki): assignment substrate ADR + epic addendum + log

Records the ActTask assignment decision, the premise correction (sync was
scaffolded but never wired; local<->server id mismatch resolved at the API
boundary), and the deferred items. Updates the epic ADR open-questions and adds
the index Decisions-section entry.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
'@
```

- [ ] **Step 6: Push (divergence-checked)**

```powershell
git fetch origin feat/atlas-permaculture
git log --left-right --oneline HEAD...origin/feat/atlas-permaculture
# fast-forward only; if origin has unmatched commits, STOP and surface it
git push origin feat/atlas-permaculture
```

---

## Definition of Done

- `listForAssignee(projectId, assigneeId)` exists on actTaskStore and is unit-tested.
- `pullAll(projectId, serverId)` fetches by serverId and stores records under the LOCAL project id (projectId normalised); unit-tested.
- `pushOne(task, serverId)` POSTs/PATCHes by serverId, dedups the create-path draft, normalises projectId; unit-tested.
- `useActTaskSync(localProjectId, serverId)` pulls on mount and no-ops without a serverId; unit-tested.
- `ActFeedbackLoop` shows a role-gated assignee picker on synced projects; assigning writes `assigneeId` and PATCHes by serverId; `serverId` is threaded ObjectiveWorkspace -> HandoffSection -> ActFeedbackLoop; component-tested (owner picker + PATCH, viewer no-picker, pull wiring).
- `PerProjectHomePage` calls `useActTaskSync(project?.id, project?.serverId)`; existing 14 page tests still green + 2 new.
- `npx tsc --noEmit` clean in apps/web, packages/shared, apps/api. Full web vitest green.
- Implementation ADR + epic addendum + wiki log + index/log pointers committed.
- Every commit staged file-by-file (never `-A`); no foreign-WIP file ever staged; branch pushed only after a divergence check.

---

## Notes for the executor

- The three store tasks (1-3) share one test file and edit one store file sequentially - they are NOT independent; run them in order.
- `roleSatisfies` is exported from `@ogden/shared` (package barrel). `ProjectRole` values: `owner | designer | reviewer | viewer | primary_steward | team_member | contractor | landowner`.
- `assign(projectId, taskId, assigneeId?, roleId?)` wipes `roleId` if passed `undefined` - always pass `existing.roleId` (the control does this).
- vi.mock matches by resolved absolute path: the store imports apiClient as `../../lib/apiClient.js`; from the store test at `store/olos/__tests__/` the same module is `../../../lib/apiClient.js`; from the hook test at `hooks/__tests__/` it is `../../lib/apiClient.js`; from the component test at `v3/olos/handoff/__tests__/` it is `../../../../lib/apiClient.js`.
- `noUncheckedIndexedAccess: true`: index access into `Record` / arrays yields `T | undefined` - use `?.` and `!` after a length assertion (the test code above already does).
```
