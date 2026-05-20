# B3.1 — Editable Rotation-Adherence Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a render-only sibling card to the B3 read-only adherence audit that mounts per-row inline Save/Cancel editors keyed off `AdherenceKind`, writing only to `rotationPlanStore`, plus a deep-link affordance that pushes a non-persisted draft to `PlanExecutionTrackerCard` for a corrective work item — without touching `WorkItem.status` from anywhere inside `features/livestock/`.

**Architecture:** A new `RotationAdherenceActionsCard.tsx` re-runs `computeRotationAdherence()` (independent of the existing audit card) and renders each ranked recommendation with an `[Edit]` button matched to its kind plus a `[Schedule make-good task]` button. Editors live in `features/livestock/editors/` and follow the D2.1 `ResourcingEditor` Save/Cancel state-machine: local `useState` draft, single `upsertCell` write on Save, draft discarded on Cancel. Make-good clicks push a `WorkItemDraft` to a new in-memory `workItemDraftStore` (no `persist`, no `syncManifest`); `PlanExecutionTrackerCard` consumes + clears the draft on mount, rendering a small banner whose "Create work item" calls `useWorkItemStore.addItem(…)` (existing action) — a *creation* path, not a status mutation. Append-only one-mount-point registration.

**Tech Stack:** TypeScript, React 18, Zustand 5 (read selectors + in-memory draft slice), Vitest + happy-dom, pnpm/Turborepo.

**Source spec:** `docs/superpowers/specs/2026-05-19-rotation-adherence-edit-design.md` (commit `9ce13fe4`).

**Binding constraints:** explicit-path `git add` only (never `-A`/`.`); per-task commits; no push (branch `feat/atlas-permaculture` rebased out-of-band — push is a separate explicit instruction); covenant — no riba/gharar/CSRA/salam/investor/financing/yield-as-return framing; no `WorkItem.status` read or write from `features/livestock/`; no persist + no `syncManifest` touch on the new draft store; no schema change to `WorkItem`, `LivestockMoveEvent`, or `RotationPlanCell`; `wiki/index.md` left untouched in task commits (added separately at session close per D4/D5 precedent).

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/web/src/store/workItemDraftStore.ts` *(new)* | In-memory `WorkItemDraft` channel; `setDraft` / `clearDraft`. No persist. |
| `apps/web/src/store/__tests__/workItemDraftStore.test.ts` *(new)* | Set/clear/null-clear; covenant grep. |
| `apps/web/src/features/livestock/editors/OvergrazedEditor.tsx` *(new)* | Patches `cell.targetGrazeDays` via `upsertCell`. |
| `apps/web/src/features/livestock/editors/RestEditor.tsx` *(new)* | Patches `cell.targetRestDays` (handles `under-rested-reentry` + `short-rest`). |
| `apps/web/src/features/livestock/editors/UnplannedPaddockEditor.tsx` *(new)* | `upsertCell` with a new `RotationCell` for an unplanned paddock. |
| `apps/web/src/features/livestock/editors/index.ts` *(new)* | Barrel. |
| `apps/web/src/features/livestock/editors/__tests__/editors.test.tsx` *(new, happy-dom)* | Open/Save/Cancel per editor; covenant + no-status-read greps. |
| `apps/web/src/features/livestock/RotationAdherenceActionsCard.tsx` *(new)* | Per-row inline editors + make-good buttons. |
| `apps/web/src/features/livestock/RotationAdherenceActionsCard.module.css` *(new)* | Styles, mirror sibling palette. |
| `apps/web/src/features/livestock/__tests__/RotationAdherenceActionsCard.test.tsx` *(new, happy-dom)* | Empty states; rows; Edit opens matched editor; Save patches store; make-good pushes draft; covenant. |
| `apps/web/src/features/act/PlanExecutionTrackerCard.tsx` *(modify — small banner + useEffect)* | Consume + clear draft; offer "Create work item" via existing `addItem`. |
| `apps/web/src/features/act/__tests__/PlanExecutionTrackerCard.draftBanner.test.tsx` *(new)* | Draft → banner → Create → `addItem` called once → draft cleared. |
| `apps/web/src/v3/plan/types.ts` *(edit — append 1 manifest row)* | Mount. |
| `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` *(edit — lazy import + 1 switch case)* | Mount. |
| `wiki/decisions/2026-05-19-atlas-b3-1-rotation-adherence-editor.md` *(new)* + `wiki/log.md` *(prepend)* | Session-close ADR + log. |

---

## Task 1: `workItemDraftStore` — in-memory draft channel

**Files:**
- Create: `apps/web/src/store/workItemDraftStore.ts`
- Test: `apps/web/src/store/__tests__/workItemDraftStore.test.ts`

**Context:** A minimal zustand slice. No `persist`, no `syncManifest`, no entry in any sync registry. Survives only the current tab.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/store/__tests__/workItemDraftStore.test.ts`:

```typescript
/**
 * workItemDraftStore — in-memory draft channel unit tests.
 *
 * Verifies set/clear/no-op-clear semantics and confirms the source
 * file carries no financing lexicon and no spine-status mutation
 * (covenant).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  useWorkItemDraftStore,
  type WorkItemDraft,
} from '../workItemDraftStore.js';

const draft: WorkItemDraft = {
  title: 'Make-good move — overgrazed paddock a',
  notes: 'Reduce graze, schedule earlier move.',
  paddockId: 'a',
  source: 'rotation-adherence',
};

beforeEach(() => {
  useWorkItemDraftStore.setState({ draft: null });
});

describe('useWorkItemDraftStore', () => {
  it('starts with no draft', () => {
    expect(useWorkItemDraftStore.getState().draft).toBeNull();
  });

  it('setDraft stores the draft verbatim', () => {
    useWorkItemDraftStore.getState().setDraft(draft);
    expect(useWorkItemDraftStore.getState().draft).toEqual(draft);
  });

  it('clearDraft resets to null', () => {
    useWorkItemDraftStore.getState().setDraft(draft);
    useWorkItemDraftStore.getState().clearDraft();
    expect(useWorkItemDraftStore.getState().draft).toBeNull();
  });

  it('clearDraft is a no-op when already null', () => {
    expect(() => useWorkItemDraftStore.getState().clearDraft()).not.toThrow();
    expect(useWorkItemDraftStore.getState().draft).toBeNull();
  });

  it('source file carries no financing lexicon and no WorkItem.status touch', () => {
    const src = readFileSync(
      join(__dirname, '..', 'workItemDraftStore.ts'),
      'utf8',
    );
    expect(src).not.toMatch(
      /interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i,
    );
    expect(src).not.toMatch(/WorkItem\.status|useWorkItemStore/);
    expect(src).not.toMatch(/persist|syncManifest/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ogden/web test -- workItemDraftStore`
Expected: FAIL — `Cannot find module '../workItemDraftStore.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/store/workItemDraftStore.ts`:

```typescript
/**
 * workItemDraftStore — non-persisted in-memory draft channel
 * carrying a pending corrective work-item draft from
 * RotationAdherenceActionsCard to PlanExecutionTrackerCard.
 *
 * Render-only payload-passing. No persist, no syncManifest, no
 * schema change to WorkItem. Never reads or writes WorkItem.status.
 *
 * Covenant: strictly agronomic / operating analytics. No riba /
 * gharar / financing / capital / investor / yield framing.
 */
import { create } from 'zustand';

export interface WorkItemDraft {
  title: string;
  notes?: string;
  paddockId?: string;
  source: 'rotation-adherence';
}

interface WorkItemDraftState {
  draft: WorkItemDraft | null;
  setDraft: (d: WorkItemDraft) => void;
  clearDraft: () => void;
}

export const useWorkItemDraftStore = create<WorkItemDraftState>((set) => ({
  draft: null,
  setDraft: (d) => set({ draft: d }),
  clearDraft: () => set({ draft: null }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ogden/web test -- workItemDraftStore`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/store/workItemDraftStore.ts apps/web/src/store/__tests__/workItemDraftStore.test.ts
git commit -m "feat(b3.1): in-memory workItemDraftStore for adherence → tracker hand-off"
```

---

## Task 2: Per-kind inline editors

**Files:**
- Create: `apps/web/src/features/livestock/editors/OvergrazedEditor.tsx`
- Create: `apps/web/src/features/livestock/editors/RestEditor.tsx`
- Create: `apps/web/src/features/livestock/editors/UnplannedPaddockEditor.tsx`
- Create: `apps/web/src/features/livestock/editors/index.ts`
- Test: `apps/web/src/features/livestock/editors/__tests__/editors.test.tsx`

**Context:** `RotationCell` (in `features/livestock/rotationSequenceMath.ts`) is:
```ts
interface RotationCell {
  paddockId: string;
  cellGroup: string;
  sequenceOrder: number;
  targetGrazeDays: number;
  targetRestDays: number;
  note?: string;
}
```
`rotationPlanStore` exposes `upsertCell(projectId, cell)` keyed by `paddockId`. The Save/Cancel state machine mirrors `ResourcingEditor` in `apps/web/src/features/act/PlanExecutionTrackerCard.tsx` (lines 417–470 and 626–632): `useState` for the local draft, `save()` calls a single store action then `onClose()`, Cancel calls `onClose()` directly.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/livestock/editors/__tests__/editors.test.tsx`:

```typescript
/**
 * @vitest-environment happy-dom
 *
 * Per-kind rotation-adherence editors — Save/Cancel state machine.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useRotationPlanStore } from '../../../../store/rotationPlanStore.js';
import {
  OvergrazedEditor,
  RestEditor,
  UnplannedPaddockEditor,
} from '../index.js';

beforeEach(() => {
  localStorage.clear();
  useRotationPlanStore.setState({ byProject: {} });
});

function seedCell(targetGrazeDays = 5, targetRestDays = 30) {
  useRotationPlanStore.setState({
    byProject: {
      p1: {
        projectId: 'p1',
        cells: [
          {
            paddockId: 'a',
            cellGroup: 'A',
            sequenceOrder: 0,
            targetGrazeDays,
            targetRestDays,
          },
        ],
      },
    },
  });
}

describe('OvergrazedEditor', () => {
  it('Save patches targetGrazeDays via upsertCell and closes', () => {
    seedCell(5, 30);
    let closed = false;
    render(
      <OvergrazedEditor
        projectId="p1"
        paddockId="a"
        onClose={() => {
          closed = true;
        }}
      />,
    );
    const input = screen.getByLabelText(/target graze days/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(
      useRotationPlanStore.getState().byProject.p1!.cells[0]!.targetGrazeDays,
    ).toBe(3);
    expect(closed).toBe(true);
  });

  it('Cancel discards the draft and closes without writing', () => {
    seedCell(5, 30);
    let closed = false;
    render(
      <OvergrazedEditor
        projectId="p1"
        paddockId="a"
        onClose={() => {
          closed = true;
        }}
      />,
    );
    const input = screen.getByLabelText(/target graze days/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(
      useRotationPlanStore.getState().byProject.p1!.cells[0]!.targetGrazeDays,
    ).toBe(5);
    expect(closed).toBe(true);
  });
});

describe('RestEditor', () => {
  it('Save patches targetRestDays via upsertCell and closes', () => {
    seedCell(5, 30);
    let closed = false;
    render(
      <RestEditor
        projectId="p1"
        paddockId="a"
        onClose={() => {
          closed = true;
        }}
      />,
    );
    const input = screen.getByLabelText(/target rest days/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(
      useRotationPlanStore.getState().byProject.p1!.cells[0]!.targetRestDays,
    ).toBe(45);
    expect(closed).toBe(true);
  });
});

describe('UnplannedPaddockEditor', () => {
  it('Save upserts a brand-new cell for the unplanned paddock', () => {
    let closed = false;
    render(
      <UnplannedPaddockEditor
        projectId="p1"
        paddockId="z"
        onClose={() => {
          closed = true;
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/cell group/i), {
      target: { value: 'B' },
    });
    fireEvent.change(screen.getByLabelText(/sequence order/i), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByLabelText(/target graze days/i), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText(/target rest days/i), {
      target: { value: '30' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    const cells = useRotationPlanStore.getState().byProject.p1!.cells;
    expect(cells.find((c) => c.paddockId === 'z')).toMatchObject({
      paddockId: 'z',
      cellGroup: 'B',
      sequenceOrder: 0,
      targetGrazeDays: 3,
      targetRestDays: 30,
    });
    expect(closed).toBe(true);
  });
});

describe('editor source files — covenant + no spine-status touch', () => {
  const dir = join(__dirname, '..');
  for (const f of [
    'OvergrazedEditor.tsx',
    'RestEditor.tsx',
    'UnplannedPaddockEditor.tsx',
  ]) {
    it(`${f} carries no financing lexicon and no WorkItem.status read/write`, () => {
      const src = readFileSync(join(dir, f), 'utf8');
      expect(src).not.toMatch(
        /interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i,
      );
      expect(src).not.toMatch(/WorkItem\.status|useWorkItemStore/);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ogden/web test -- editors.test`
Expected: FAIL — cannot resolve `../index.js`.

- [ ] **Step 3: Write the editors and barrel**

Create `apps/web/src/features/livestock/editors/OvergrazedEditor.tsx`:

```typescript
/**
 * OvergrazedEditor — patches a rotation cell's targetGrazeDays.
 * Save/Cancel state machine; writes only to rotationPlanStore.
 */
import { useState } from 'react';
import { useRotationPlanStore } from '../../../store/rotationPlanStore.js';

interface Props {
  projectId: string;
  paddockId: string;
  onClose: () => void;
}

export function OvergrazedEditor({ projectId, paddockId, onClose }: Props) {
  const cell = useRotationPlanStore(
    (s) =>
      s.byProject[projectId]?.cells.find((c) => c.paddockId === paddockId) ??
      null,
  );
  const upsertCell = useRotationPlanStore((s) => s.upsertCell);
  const [draft, setDraft] = useState<number>(cell?.targetGrazeDays ?? 1);

  if (!cell) {
    return (
      <div role="alert">
        No plan cell found for paddock {paddockId}.
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  function save() {
    upsertCell(projectId, { ...cell!, targetGrazeDays: draft });
    onClose();
  }

  return (
    <div>
      <label>
        Target graze days
        <input
          type="number"
          min={1}
          value={draft}
          onChange={(e) => setDraft(Number(e.target.value))}
        />
      </label>
      <button type="button" onClick={save}>
        Save
      </button>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}

export default OvergrazedEditor;
```

Create `apps/web/src/features/livestock/editors/RestEditor.tsx`:

```typescript
/**
 * RestEditor — patches a rotation cell's targetRestDays.
 * Shared by under-rested-reentry and short-rest recommendations.
 */
import { useState } from 'react';
import { useRotationPlanStore } from '../../../store/rotationPlanStore.js';

interface Props {
  projectId: string;
  paddockId: string;
  onClose: () => void;
}

export function RestEditor({ projectId, paddockId, onClose }: Props) {
  const cell = useRotationPlanStore(
    (s) =>
      s.byProject[projectId]?.cells.find((c) => c.paddockId === paddockId) ??
      null,
  );
  const upsertCell = useRotationPlanStore((s) => s.upsertCell);
  const [draft, setDraft] = useState<number>(cell?.targetRestDays ?? 0);

  if (!cell) {
    return (
      <div role="alert">
        No plan cell found for paddock {paddockId}.
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  function save() {
    upsertCell(projectId, { ...cell!, targetRestDays: draft });
    onClose();
  }

  return (
    <div>
      <label>
        Target rest days
        <input
          type="number"
          min={0}
          value={draft}
          onChange={(e) => setDraft(Number(e.target.value))}
        />
      </label>
      <button type="button" onClick={save}>
        Save
      </button>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}

export default RestEditor;
```

Create `apps/web/src/features/livestock/editors/UnplannedPaddockEditor.tsx`:

```typescript
/**
 * UnplannedPaddockEditor — folds an unplanned paddock into the
 * rotation plan via upsertCell with a brand-new RotationCell.
 */
import { useState } from 'react';
import { useRotationPlanStore } from '../../../store/rotationPlanStore.js';

interface Props {
  projectId: string;
  paddockId: string;
  onClose: () => void;
}

export function UnplannedPaddockEditor({
  projectId,
  paddockId,
  onClose,
}: Props) {
  const upsertCell = useRotationPlanStore((s) => s.upsertCell);
  const [cellGroup, setCellGroup] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState(0);
  const [targetGrazeDays, setTargetGrazeDays] = useState(3);
  const [targetRestDays, setTargetRestDays] = useState(30);

  function save() {
    upsertCell(projectId, {
      paddockId,
      cellGroup,
      sequenceOrder,
      targetGrazeDays,
      targetRestDays,
    });
    onClose();
  }

  return (
    <div>
      <label>
        Cell group
        <input
          type="text"
          value={cellGroup}
          onChange={(e) => setCellGroup(e.target.value)}
        />
      </label>
      <label>
        Sequence order
        <input
          type="number"
          min={0}
          value={sequenceOrder}
          onChange={(e) => setSequenceOrder(Number(e.target.value))}
        />
      </label>
      <label>
        Target graze days
        <input
          type="number"
          min={1}
          value={targetGrazeDays}
          onChange={(e) => setTargetGrazeDays(Number(e.target.value))}
        />
      </label>
      <label>
        Target rest days
        <input
          type="number"
          min={0}
          value={targetRestDays}
          onChange={(e) => setTargetRestDays(Number(e.target.value))}
        />
      </label>
      <button type="button" onClick={save}>
        Save
      </button>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}

export default UnplannedPaddockEditor;
```

Create `apps/web/src/features/livestock/editors/index.ts`:

```typescript
export { OvergrazedEditor } from './OvergrazedEditor.js';
export { RestEditor } from './RestEditor.js';
export { UnplannedPaddockEditor } from './UnplannedPaddockEditor.js';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ogden/web test -- editors.test`
Expected: PASS — all editor + covenant tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/livestock/editors/OvergrazedEditor.tsx apps/web/src/features/livestock/editors/RestEditor.tsx apps/web/src/features/livestock/editors/UnplannedPaddockEditor.tsx apps/web/src/features/livestock/editors/index.ts apps/web/src/features/livestock/editors/__tests__/editors.test.tsx
git commit -m "feat(b3.1): per-kind rotation-adherence inline editors (Save/Cancel)"
```

---

## Task 3: `RotationAdherenceActionsCard` — render-host

**Files:**
- Create: `apps/web/src/features/livestock/RotationAdherenceActionsCard.tsx`
- Create: `apps/web/src/features/livestock/RotationAdherenceActionsCard.module.css`
- Test: `apps/web/src/features/livestock/__tests__/RotationAdherenceActionsCard.test.tsx`

**Context:** Independent render — calls `computeRotationAdherence()` from the same stores as the sibling audit card (`useLivestockStore.paddocks`, `useRotationPlanStore.byProject`, `useLivestockMoveLogStore.events`). Render rules:
- Empty states match `RotationAdherenceCard` ("No paddocks…" / "On track…").
- Each recommendation gets a row with severity badge, message, `[Edit]` button (hidden for `early-move`), and `[Schedule make-good task]` button.
- Editor opens inline below the row, one open at a time (`openEditor: string | null` state, like `setOpenResourcingEditor`).
- Click `[Schedule make-good task]` → `useWorkItemDraftStore.getState().setDraft({ … })` with title `"Make-good move — " + r.message`, optional `paddockId`, `source: 'rotation-adherence'`.
- Structural `data-testid="action-row"` + `data-severity={r.severity}` (decouple tests from engine copy, per the A2 polish lesson).

Use the existing sibling palette (`RotationAdherenceCard.module.css` is the visual reference); the new CSS module may simply re-declare the same shapes (card / cardHead / cardTitle / cardHint / modeBadge / empty / headline / groupBlock / moveList / recRow / recSev / recMsg / badgeAlert / badgeWarn / badgeGood / assumption) — copy-paste-edit is acceptable since the spec says "mirror sibling palette."

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/livestock/__tests__/RotationAdherenceActionsCard.test.tsx`:

```typescript
/**
 * @vitest-environment happy-dom
 *
 * RotationAdherenceActionsCard — B3.1 editable companion render host.
 *
 * Asserts: empty states, drift rows render with the right severity,
 * Edit opens the right kind-matched editor, Save patches the store
 * and closes the editor, Schedule make-good pushes a draft, no
 * financing lexicon on the surface.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  useLivestockStore,
  type Paddock,
  type LivestockSpecies,
} from '../../../store/livestockStore.js';
import { useRotationPlanStore } from '../../../store/rotationPlanStore.js';
import { useLivestockMoveLogStore } from '../../../store/livestockMoveLogStore.js';
import { useWorkItemDraftStore } from '../../../store/workItemDraftStore.js';
import RotationAdherenceActionsCard from '../RotationAdherenceActionsCard.js';

function paddock(id: string, overrides: Partial<Paddock> = {}): Paddock {
  return {
    id,
    projectId: 'p1',
    name: `Paddock ${id}`,
    color: '#000',
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] },
    areaM2: 10_000,
    grazingCellGroup: 'A',
    species: [] as LivestockSpecies[],
    stockingDensity: null,
    fencing: 'electric',
    guestSafeBuffer: false,
    waterPointNote: '',
    shelterNote: '',
    phase: 'plan',
    notes: '',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

function seedDrift() {
  useLivestockStore.setState({ paddocks: [paddock('a')] });
  useRotationPlanStore.setState({
    byProject: {
      p1: {
        projectId: 'p1',
        cells: [
          {
            paddockId: 'a',
            cellGroup: 'A',
            sequenceOrder: 0,
            targetGrazeDays: 3,
            targetRestDays: 0,
          },
        ],
      },
    },
  });
  useLivestockMoveLogStore.setState({
    events: [
      {
        id: 'm1',
        projectId: 'p1',
        toPaddockId: 'a',
        date: '2020-01-01T00:00:00.000Z',
        direction: 'move_in',
        species: 'sheep',
        headCount: 12,
      },
    ],
  });
}

beforeEach(() => {
  localStorage.clear();
  useLivestockStore.setState({ paddocks: [] });
  useRotationPlanStore.setState({ byProject: {} });
  useLivestockMoveLogStore.setState({ events: [] });
  useWorkItemDraftStore.setState({ draft: null });
});

describe('RotationAdherenceActionsCard — B3.1', () => {
  it('renders the no-paddocks empty state', () => {
    render(<RotationAdherenceActionsCard projectId="p1" />);
    expect(screen.getByText(/no paddocks/i)).toBeTruthy();
  });

  it('renders the on-track empty state with paddocks but no drift', () => {
    useLivestockStore.setState({ paddocks: [paddock('a')] });
    render(<RotationAdherenceActionsCard projectId="p1" />);
    expect(screen.getByText(/on track/i)).toBeTruthy();
  });

  it('renders a drift row with severity and an Edit button', () => {
    seedDrift();
    const { container } = render(
      <RotationAdherenceActionsCard projectId="p1" />,
    );
    const rows = container.querySelectorAll('[data-testid="action-row"]');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]?.getAttribute('data-severity')).toBe('high');
    expect(screen.getAllByRole('button', { name: /edit/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('clicking Edit opens the matched editor; Save patches the store and closes', () => {
    seedDrift();
    render(<RotationAdherenceActionsCard projectId="p1" />);
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]!);
    const input = screen.getByLabelText(/target graze days/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(
      useRotationPlanStore.getState().byProject.p1!.cells[0]!.targetGrazeDays,
    ).toBe(1);
    expect(screen.queryByLabelText(/target graze days/i)).toBeNull();
  });

  it('clicking Schedule make-good task pushes a WorkItemDraft', () => {
    seedDrift();
    render(<RotationAdherenceActionsCard projectId="p1" />);
    fireEvent.click(
      screen.getAllByRole('button', { name: /schedule make-good/i })[0]!,
    );
    const draft = useWorkItemDraftStore.getState().draft;
    expect(draft).not.toBeNull();
    expect(draft!.source).toBe('rotation-adherence');
    expect(draft!.paddockId).toBe('a');
    expect(draft!.title).toMatch(/make-good/i);
  });

  it('renders no financing/capital lexicon on the surface', () => {
    seedDrift();
    const { container } = render(
      <RotationAdherenceActionsCard projectId="p1" />,
    );
    expect(container.textContent ?? '').not.toMatch(
      /interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ogden/web test -- RotationAdherenceActionsCard`
Expected: FAIL — cannot resolve `../RotationAdherenceActionsCard.js`.

- [ ] **Step 3: Write the card and module CSS**

Create `apps/web/src/features/livestock/RotationAdherenceActionsCard.tsx`:

```typescript
/**
 * RotationAdherenceActionsCard — B3.1 editable companion to the
 * read-only adherence audit. Per-row inline Save/Cancel editors
 * keyed off AdherenceKind. Writes only to rotationPlanStore.
 * Pushes a WorkItemDraft to workItemDraftStore on
 * "Schedule make-good task" — never touches WorkItem.status.
 *
 * Covenant: strictly agronomic / operating analytics. No riba /
 * gharar / financing / capital / investor / yield framing.
 */
import { useMemo, useState } from 'react';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useRotationPlanStore } from '../../store/rotationPlanStore.js';
import { useLivestockMoveLogStore } from '../../store/livestockMoveLogStore.js';
import { useWorkItemDraftStore } from '../../store/workItemDraftStore.js';
import {
  computeRotationAdherence,
  type AdherenceRecommendation,
  type RotationAdherence,
} from './rotationAdherence.js';
import {
  OvergrazedEditor,
  RestEditor,
  UnplannedPaddockEditor,
} from './editors/index.js';
import css from './RotationAdherenceActionsCard.module.css';

interface Props {
  projectId: string;
}

const SEVERITY_CLASS = {
  high: css.badgeAlert,
  med: css.badgeWarn,
  low: css.badgeGood,
} as const;

function EditorFor({
  rec,
  projectId,
  onClose,
}: {
  rec: AdherenceRecommendation;
  projectId: string;
  onClose: () => void;
}) {
  const paddockId = rec.paddockId ?? '';
  switch (rec.kind) {
    case 'overgrazed':
      return (
        <OvergrazedEditor
          projectId={projectId}
          paddockId={paddockId}
          onClose={onClose}
        />
      );
    case 'under-rested-reentry':
    case 'short-rest':
      return (
        <RestEditor
          projectId={projectId}
          paddockId={paddockId}
          onClose={onClose}
        />
      );
    case 'unplanned-paddock':
      return (
        <UnplannedPaddockEditor
          projectId={projectId}
          paddockId={paddockId}
          onClose={onClose}
        />
      );
    case 'early-move':
      return null;
  }
}

export default function RotationAdherenceActionsCard({ projectId }: Props) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const plan = useRotationPlanStore((s) => s.byProject[projectId] ?? null);
  const moves = useLivestockMoveLogStore((s) => s.events);
  const setDraft = useWorkItemDraftStore((s) => s.setDraft);

  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const adherence: RotationAdherence = useMemo(
    () =>
      computeRotationAdherence({
        paddocks,
        plan,
        moves,
        now: new Date().toISOString(),
      }),
    [paddocks, plan, moves],
  );

  const [openEditor, setOpenEditor] = useState<string | null>(null);

  if (paddocks.length === 0) {
    return (
      <section className={css.card}>
        <h3 className={css.cardTitle}>Rotation adherence — actions</h3>
        <div className={css.empty}>No paddocks in this project yet.</div>
      </section>
    );
  }

  if (adherence.recommendations.length === 0) {
    return (
      <section className={css.card}>
        <h3 className={css.cardTitle}>Rotation adherence — actions</h3>
        <div className={css.empty}>
          On track — logged moves match the rotation plan.
        </div>
      </section>
    );
  }

  return (
    <section className={css.card}>
      <h3 className={css.cardTitle}>Rotation adherence — actions</h3>
      <div className={css.moveList}>
        {adherence.recommendations.map((r) => {
          const isOpen = openEditor === r.id;
          const supportsEdit = r.kind !== 'early-move';
          return (
            <div
              key={r.id}
              className={css.recRow}
              data-testid="action-row"
              data-severity={r.severity}
            >
              <div className={css.recHead}>
                <span className={`${css.recSev} ${SEVERITY_CLASS[r.severity]}`}>
                  [{r.severity.toUpperCase()}]
                </span>
                <span className={css.recMsg}>{r.message}</span>
                {supportsEdit ? (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenEditor((cur) => (cur === r.id ? null : r.id))
                    }
                  >
                    Edit
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      title: `Make-good move — ${r.message}`,
                      notes: undefined,
                      paddockId: r.paddockId,
                      source: 'rotation-adherence',
                    })
                  }
                >
                  Schedule make-good task
                </button>
              </div>
              {isOpen ? (
                <div className={css.editorSlot}>
                  <EditorFor
                    rec={r}
                    projectId={projectId}
                    onClose={() => setOpenEditor(null)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className={css.assumption}>
        Edits write only to the rotation plan. The Schedule make-good
        button drafts a corrective work item handed to the Plan
        execution tracker — this surface never marks work-item status.
      </div>
    </section>
  );
}
```

Create `apps/web/src/features/livestock/RotationAdherenceActionsCard.module.css` — copy-paste the contents of `RotationAdherenceCard.module.css` verbatim, then append:

```css
.recHead {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.editorSlot {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(232, 220, 200, 0.022);
  border: 1px solid rgba(232, 220, 200, 0.08);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ogden/web test -- RotationAdherenceActionsCard`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/livestock/RotationAdherenceActionsCard.tsx apps/web/src/features/livestock/RotationAdherenceActionsCard.module.css apps/web/src/features/livestock/__tests__/RotationAdherenceActionsCard.test.tsx
git commit -m "feat(b3.1): RotationAdherenceActionsCard render host with per-row editors"
```

---

## Task 4: Tracker hand-off — draft banner + create

**Files:**
- Modify: `apps/web/src/features/act/PlanExecutionTrackerCard.tsx`
- Test: `apps/web/src/features/act/__tests__/PlanExecutionTrackerCard.draftBanner.test.tsx`

**Context:** `PlanExecutionTrackerCard.tsx` has no add-task UI today. The hand-off adds a small banner near the top of the tracker that renders only when `workItemDraftStore.draft != null`. The banner exposes:
- The draft title + notes.
- **Create work item** → calls `useWorkItemStore.getState().addItem({...})` with a fully-formed new `WorkItem` (`id: crypto.randomUUID()`, `status: 'todo'`, `source: 'goal-compass'`, derived `title`, `projectId: project.id`, empty arrays for `dependsOn`/`dependsOnAuto`/`materialsAuto`/`equipmentRequiredAuto`, `phaseId: null`, `overridden: false`, ISO timestamps for `createdAt`/`updatedAt`). This is a **create** call — not a status mutation of an existing item — so the D4 single-writer `fulfilWorkItem`/`unfulfilWorkItem` invariant is preserved.
- **Dismiss** → `clearDraft()` only.
After either button, the banner disappears.

The status field on a newly-created item starts at `'todo'` because that is the spine's initial state for any work item; it is not a transition mutation.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/act/__tests__/PlanExecutionTrackerCard.draftBanner.test.tsx`:

```typescript
/**
 * @vitest-environment happy-dom
 *
 * PlanExecutionTrackerCard — workItemDraftStore hand-off banner.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import { useWorkItemDraftStore } from '../../../store/workItemDraftStore.js';
import PlanExecutionTrackerCard from '../PlanExecutionTrackerCard.js';
import type { LocalProject } from '../../../store/projectStore.js';

const PROJECT = { id: 'p1' } as LocalProject;

beforeEach(() => {
  localStorage.clear();
  useWorkItemStore.setState({ items: [] });
  useWorkItemDraftStore.setState({ draft: null });
});

describe('PlanExecutionTrackerCard — adherence draft banner', () => {
  it('renders no banner when draft is null', () => {
    render(<PlanExecutionTrackerCard project={PROJECT} onSwitchToMap={() => {}} />);
    expect(screen.queryByText(/make-good/i)).toBeNull();
  });

  it('renders the banner when a draft is present', () => {
    useWorkItemDraftStore.getState().setDraft({
      title: 'Make-good move — overgrazed paddock a',
      paddockId: 'a',
      source: 'rotation-adherence',
    });
    render(<PlanExecutionTrackerCard project={PROJECT} onSwitchToMap={() => {}} />);
    expect(screen.getByText(/make-good move/i)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /create work item/i }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeTruthy();
  });

  it('clicking Create work item calls addItem once and clears the draft', () => {
    useWorkItemDraftStore.getState().setDraft({
      title: 'Make-good move — overgrazed paddock a',
      paddockId: 'a',
      source: 'rotation-adherence',
    });
    render(<PlanExecutionTrackerCard project={PROJECT} onSwitchToMap={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /create work item/i }));
    const items = useWorkItemStore.getState().items;
    expect(items.length).toBe(1);
    expect(items[0]!.title).toMatch(/make-good/i);
    expect(items[0]!.projectId).toBe('p1');
    expect(items[0]!.status).toBe('todo');
    expect(useWorkItemDraftStore.getState().draft).toBeNull();
  });

  it('clicking Dismiss clears the draft without adding an item', () => {
    useWorkItemDraftStore.getState().setDraft({
      title: 'Make-good move — overgrazed paddock a',
      paddockId: 'a',
      source: 'rotation-adherence',
    });
    render(<PlanExecutionTrackerCard project={PROJECT} onSwitchToMap={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(useWorkItemStore.getState().items.length).toBe(0);
    expect(useWorkItemDraftStore.getState().draft).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ogden/web test -- PlanExecutionTrackerCard.draftBanner`
Expected: FAIL — banner not rendered.

- [ ] **Step 3: Add the banner to the tracker**

In `apps/web/src/features/act/PlanExecutionTrackerCard.tsx`, near the top of the component (after the existing `useState` block, before the first render section), add:

```typescript
import { useWorkItemDraftStore } from '../../store/workItemDraftStore.js';

// inside the component:
const draft = useWorkItemDraftStore((s) => s.draft);
const clearDraft = useWorkItemDraftStore((s) => s.clearDraft);
const addItem = useWorkItemStore((s) => s.addItem);

function createFromDraft() {
  if (!draft) return;
  const now = new Date().toISOString();
  addItem({
    id: crypto.randomUUID(),
    projectId: project.id,
    source: 'goal-compass',
    overridden: false,
    createdAt: now,
    updatedAt: now,
    title: draft.title,
    phaseId: null,
    status: 'todo',
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
  });
  clearDraft();
}
```

In the JSX, just inside the root container, render:

```tsx
{draft ? (
  <div data-testid="adherence-draft-banner" style={{ padding: 8, border: '1px solid rgba(232,220,200,0.18)', borderRadius: 6, marginBottom: 8 }}>
    <p style={{ margin: 0 }}>{draft.title}</p>
    {draft.notes ? <p style={{ margin: 0, opacity: 0.7 }}>{draft.notes}</p> : null}
    <button type="button" onClick={createFromDraft}>Create work item</button>
    <button type="button" onClick={clearDraft}>Dismiss</button>
  </div>
) : null}
```

> If the existing tracker imports `useWorkItemStore` already, do not re-import — reuse the existing import; only add `addItem` to the selectors actually pulled.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ogden/web test -- PlanExecutionTrackerCard.draftBanner`
Expected: PASS — all 4 banner tests green.

- [ ] **Step 5: Run the existing tracker test to ensure no regression**

Run: `pnpm --filter @ogden/web test -- PlanExecutionTrackerCard.resourcing`
Expected: PASS — pre-existing suite still green.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/act/PlanExecutionTrackerCard.tsx apps/web/src/features/act/__tests__/PlanExecutionTrackerCard.draftBanner.test.tsx
git commit -m "feat(b3.1): tracker draft banner consumes adherence WorkItemDraft"
```

---

## Task 5: Append-only Plan registration

**Files:**
- Modify: `apps/web/src/v3/plan/types.ts`
- Modify: `apps/web/src/v3/plan/PlanModuleSlideUp.tsx`

- [ ] **Step 1: Mount 1 — `types.ts`**

In `MODULE_CARDS.livestock` (around line 209), insert directly after the `'plan-livestock-rotation-adherence'` row:

```typescript
{ label: 'Rotation adherence — actions', sectionId: 'plan-livestock-rotation-adherence-actions' },
```

- [ ] **Step 2: Mount 2 — `PlanModuleSlideUp.tsx`**

Beside the existing `RotationAdherenceCard` lazy import (line 60), add:

```typescript
const RotationAdherenceActionsCard = lazy(() => import('../../features/livestock/RotationAdherenceActionsCard.js'));
```

In the `renderPlanCard` switch (around line 144), beside the existing `'plan-livestock-rotation-adherence'` case, add:

```typescript
case 'plan-livestock-rotation-adherence-actions': return <RotationAdherenceActionsCard projectId={project.id} />;
```

- [ ] **Step 3: Typecheck**

PowerShell: `$env:NODE_OPTIONS='--max-old-space-size=8192'; pnpm --filter @ogden/web typecheck`
Expected: exit 0, no NEW errors vs the pre-B3.1 baseline.

- [ ] **Step 4: Commit (explicit paths)**

```bash
git add apps/web/src/v3/plan/types.ts apps/web/src/v3/plan/PlanModuleSlideUp.tsx
git commit -m "feat(b3.1): register plan-livestock-rotation-adherence-actions section"
```

> If either registration diff mixes B3.1 and non-B3.1 hunks, STOP and surface as a blocker — do not silently split hunks.

---

## Task 6: Full verification + session-close ADR + log

**Files:**
- Create: `wiki/decisions/2026-05-19-atlas-b3-1-rotation-adherence-editor.md`
- Modify (prepend): `wiki/log.md`
- Do **NOT** stage `wiki/index.md` (added separately at session close, per D4/D5/B3 precedent).

- [ ] **Step 1: Full web suite**

Run: `pnpm --filter @ogden/web test`
Expected: all green; new files contribute: 5 (draft store) + ~7 (editors + covenant) + 6 (actions card) + 4 (tracker banner) ≈ +22 tests. No new failures vs the post-polish-trio baseline (127 files / 1358 tests).

- [ ] **Step 2: Typecheck both packages**

```
pnpm --filter @ogden/shared typecheck
$env:NODE_OPTIONS='--max-old-space-size=8192'; pnpm --filter @ogden/web typecheck
```
Expected: both exit 0; no NEW error vs the pre-B3.1 baseline.

- [ ] **Step 3: Covenant grep on all new B3.1 source files**

```
rg -i "interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar" \
  apps/web/src/store/workItemDraftStore.ts \
  apps/web/src/features/livestock/editors/OvergrazedEditor.tsx \
  apps/web/src/features/livestock/editors/RestEditor.tsx \
  apps/web/src/features/livestock/editors/UnplannedPaddockEditor.tsx \
  apps/web/src/features/livestock/RotationAdherenceActionsCard.tsx \
  apps/web/src/features/livestock/RotationAdherenceActionsCard.module.css
```
Expected: zero matches (excluding negative-assertion comments). The covenant comment in the new card source explicitly negates the lexicon and is permitted; if any positive use surfaces, STOP.

- [ ] **Step 4: Spine-status invariant grep**

```
rg "WorkItem\.status|useWorkItemStore" \
  apps/web/src/features/livestock/RotationAdherenceActionsCard.tsx \
  apps/web/src/features/livestock/editors/
```
Expected: zero matches. Spine-status is only touched in the *tracker* banner code in `apps/web/src/features/act/PlanExecutionTrackerCard.tsx`, via the existing `addItem` action (a create call, not a status transition).

- [ ] **Step 5: Write the ADR**

Create `wiki/decisions/2026-05-19-atlas-b3-1-rotation-adherence-editor.md` recording:
- B3.1 ships the editable companion deferred by the B3 ADR (covenant clause: out-of-scope until its own brainstorm → spec → plan cycle ran).
- Resolved forks (mounting = per-row inline; editable kinds = patch-only, 4-of-5; move-log immutable; explicit Save/Cancel; deep-link via in-memory draft store; on-track parity; independent renders).
- Architecture: render-only sibling card; editors under `features/livestock/editors/`; new `workItemDraftStore` (no persist, no `syncManifest`); tracker hand-off banner uses existing `addItem` (not a status transition).
- Covenant guarantees verified (covenant grep + spine-status grep both clean on all new sources under `features/livestock/`; banner creates new items only, never mutates `status` on existing items).
- Verification results (web suite counts, both typechecks, grep results).
- Append-only one-mount-point registration.
- Five per-task commits; nothing pushed; `wiki/index.md` left for the session-close step.

- [ ] **Step 6: Prepend the log entry**

Prepend a dated entry to `wiki/log.md` mirroring the B3 / D5 log entry style: branch, commits, engine + UI summary, covenant + spine-status attestations, verification numbers, what stays out of scope (move-log edits, status mutation, early-move edits).

- [ ] **Step 7: Commit (standalone, only the two wiki files)**

```bash
git add wiki/decisions/2026-05-19-atlas-b3-1-rotation-adherence-editor.md wiki/log.md
git commit -m "docs(b3.1): ADR + session log for editable rotation-adherence companion"
```

> Do not `git add wiki/index.md` here — the controller adds the B3.1 entry to the index as a separate session-close commit, per D4 / D5 / B3 precedent.

---

## Self-Review

**Spec coverage:**
- In-memory `workItemDraftStore` (no persist, no `syncManifest`) → Task 1. ✔
- Per-kind editors (`overgrazed`, `under-rested-reentry` + `short-rest` share `RestEditor`, `unplanned-paddock`; `early-move` advisory only) → Task 2 + Task 3 `EditorFor`. ✔
- Save/Cancel state machine mirroring D2.1 → Task 2 (editor source) + Task 3 (open-editor state). ✔
- Render-only sibling `RotationAdherenceActionsCard` with empty-state parity, drift rows, structural `data-testid` → Task 3. ✔
- Make-good button pushes `WorkItemDraft` via `setDraft` → Task 3 + tested. ✔
- Tracker banner consumes + clears draft; offers Create (via existing `addItem`) and Dismiss → Task 4. ✔
- Append-only registration of `plan-livestock-rotation-adherence-actions` → Task 5. ✔
- Covenant + spine-status greps + ADR + log + index untouched → Task 6. ✔
- Per-task commits, explicit-path staging, no push until session end → constraints header + per-task commit blocks. ✔

**Placeholder scan:** None — every step contains exact paths and complete code or commands.

**Type consistency:** `RotationCell` shape (`paddockId`, `cellGroup`, `sequenceOrder`, `targetGrazeDays`, `targetRestDays`, `note?`) used identically in Task 2 editors and the seeded test fixtures of Task 3. `WorkItemDraft` shape defined once in Task 1 and consumed identically in Task 3 (setDraft) and Task 4 (banner). `AdherenceRecommendation` consumed via the existing engine type (`paddockId?` optional matches the unplanned-paddock fallback to `''`).

---

## Definition of Done

A render-only `RotationAdherenceActionsCard` mounted at the new `plan-livestock-rotation-adherence-actions` section renders one row per ranked adherence recommendation with a kind-matched inline Save/Cancel editor (Patch overgraze / Patch rest / Fold-in unplanned paddock) and a "Schedule make-good task" button that pushes a `WorkItemDraft` to a non-persisted in-memory `workItemDraftStore`; the Plan Execution Tracker consumes the draft via a small banner offering Create (existing `addItem` — a creation, not a status mutation) or Dismiss. No `WorkItem.status` read or write occurs anywhere under `apps/web/src/features/livestock/`; no schema or persisted-store version bumps; no `syncManifest` entry; no financing/yield/investor lexicon on any new file. Web typecheck exit 0 (modulo disclosed pre-existing out-of-band debt); web vitest green (~+22 tests); covenant grep + spine-status grep clean. ADR + log committed standalone; `wiki/index.md` left for session close. Five per-task commits + one wiki commit; nothing pushed.

---

## Critical Files

- `apps/web/src/store/workItemDraftStore.ts` *(new)* + tests
- `apps/web/src/features/livestock/editors/{OvergrazedEditor,RestEditor,UnplannedPaddockEditor,index}.{tsx,ts}` *(new)* + tests
- `apps/web/src/features/livestock/RotationAdherenceActionsCard.tsx` + `.module.css` *(new)* + tests
- `apps/web/src/features/act/PlanExecutionTrackerCard.tsx` *(modify — banner + useEffect-free draft consumption)* + new banner test
- `apps/web/src/v3/plan/types.ts` *(append 1 row)*; `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` *(lazy + case)*
- (Reference, do not modify) `apps/web/src/features/livestock/rotationAdherence.ts`, `apps/web/src/store/rotationPlanStore.ts`, `apps/web/src/features/livestock/RotationAdherenceCard.{tsx,module.css}`, `apps/web/src/features/act/PlanExecutionTrackerCard.tsx` (ResourcingEditor lines 417–470, 626–632)
- `wiki/decisions/2026-05-19-atlas-b3-1-rotation-adherence-editor.md` *(new)* + `wiki/log.md` *(prepend)*; `wiki/index.md` **must not be staged** here

## Verification

1. `pnpm --filter @ogden/shared typecheck` and `pnpm --filter @ogden/web typecheck` (`--max-old-space-size=8192`) → exit 0, no NEW errors vs pre-B3.1 baseline.
2. `pnpm --filter @ogden/web test` → green with ~+22 new tests covering draft store / editors / actions card / tracker banner.
3. Covenant grep over the five new source files → lexicon-clean.
4. Spine-status grep over the actions card + editors directory → zero matches.
5. Visual: Plan → Livestock → seed drift → open "Rotation adherence — actions" card → click `[Edit]` on a HIGH overgrazed row → reduce target graze days → Save → engine reruns → row severity drops or disappears. Then click `[Schedule make-good task]` on a remaining row → switch to Act → Plan execution tracker shows the banner → Create work item → item appears in the tracker list at `status: 'todo'`; draft cleared.
6. Disclose, do not bypass, any MapLibre/WebGL preview-tool screenshot hang — static wiring + tsc + suites are authoritative.
