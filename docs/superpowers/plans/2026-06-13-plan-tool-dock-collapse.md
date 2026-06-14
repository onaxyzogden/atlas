# Plan tool dock — global collapse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted, global collapse control to the Plan tier-shell bottom tools dock so it can be hidden (freeing center-column height for the IF/THEN threshold editor in Protocols mode) and re-shown, in both Objectives and Protocols mode.

**Architecture:** A thin Plan-side wrapper component (`PlanToolDock`) owns the collapse chrome and reads/writes a new `uiStore` preference; `PlanTierShell` passes it into `StageShell`'s existing `bottomTray` slot. `StageShell` is untouched and stays generic. The preference mirrors the existing `rightPanelCollapsed` precedent (default expanded, persisted to localStorage, not synced).

**Tech Stack:** React 18 + TypeScript (strict), Zustand 5 (`persist` middleware), CSS modules, lucide-react icons, Vitest + @testing-library/react (happy-dom). pnpm via `corepack pnpm`. Windows/PowerShell.

**Working directory for all commands:** `apps/web` (run from `C:\Users\MY OWN AXIS\Documents\MAQASID OS - V2.1\atlas\apps\web`).

**Baseline note:** `tsc` already emits 4 pre-existing errors unrelated to this work
(`src/store/__tests__/syncServiceWorkItemsFallback.test.ts:119`,
`src/v3/act/tier-shell/__tests__/WorkConflictSection.test.tsx:119,120,134`). "tsc clean"
below means **exactly those 4 and no others**.

**Branch:** `main`. Commit each task; **push nothing** (steward authorizes pushes separately). Explicit pathspecs only — never `git add -A`/`-A`/`.`. ASCII-only commit messages, each ending with the `Co-Authored-By` trailer shown below.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `apps/web/src/store/uiStore.ts` | Global UI prefs (color scheme, sidebar, collapse prefs) | Modify — add `planToolDockCollapsed` field + actions + partialize |
| `apps/web/src/store/__tests__/uiStore.test.ts` | Unit test for the new preference | Create |
| `apps/web/src/v3/plan/tier-shell/PlanToolDock.tsx` | Collapse-aware wrapper around the tools rail | Create |
| `apps/web/src/v3/plan/tier-shell/PlanToolDock.module.css` | Slim-handle / collapse-bar chrome | Create |
| `apps/web/src/v3/plan/tier-shell/__tests__/PlanToolDock.test.tsx` | Unit test for the wrapper | Create |
| `apps/web/src/v3/plan/tier-shell/PlanTierShell.tsx` | Plan tier-shell; mounts the bottom tray | Modify — swap rail for `PlanToolDock`, drop now-unused import |

---

## Task 1: Commit the approved design + this plan

**Files:**
- Already created: `docs/superpowers/specs/2026-06-13-plan-tool-dock-collapse-design.md`
- Already created: `docs/superpowers/plans/2026-06-13-plan-tool-dock-collapse.md`

- [ ] **Step 1: Confirm both docs exist**

Run (from repo root `atlas/`):
```
git status --porcelain docs/superpowers/specs/2026-06-13-plan-tool-dock-collapse-design.md docs/superpowers/plans/2026-06-13-plan-tool-dock-collapse.md
```
Expected: both listed as untracked (`??`).

- [ ] **Step 2: Commit the docs (explicit pathspec)**

```
git add docs/superpowers/specs/2026-06-13-plan-tool-dock-collapse-design.md docs/superpowers/plans/2026-06-13-plan-tool-dock-collapse.md
git commit -m "docs(plan): design + plan for global collapsible Plan tool dock

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: 2 files changed.

**Gate:** Both docs committed; working tree otherwise unchanged.

---

## Task 2: Add the `planToolDockCollapsed` UI preference

**Files:**
- Modify: `apps/web/src/store/uiStore.ts`
- Create: `apps/web/src/store/__tests__/uiStore.test.ts`

The preference mirrors the existing `rightPanelCollapsed` (`uiStore.ts:43-47,140-142,206`):
default `false` (expanded), persisted via `partialize`. It is additive with a default, so **no `version` bump and no `migrate` change** — zustand `persist` merges the persisted partial over initial state, leaving the new key at its default for returning users.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/store/__tests__/uiStore.test.ts`:
```ts
/**
 * @vitest-environment happy-dom
 *
 * uiStore.planToolDockCollapsed — global, persisted collapse preference for the
 * Plan tier-shell bottom tools dock. Mirrors the rightPanelCollapsed precedent:
 * default expanded (false), toggled, and written through to the persisted
 * `ogden-ui` localStorage payload (i.e. included in partialize).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore.js';

beforeEach(() => {
  useUIStore.setState({ planToolDockCollapsed: false });
  localStorage.removeItem('ogden-ui');
});

describe('uiStore.planToolDockCollapsed', () => {
  it('defaults to false (dock expanded)', () => {
    expect(useUIStore.getState().planToolDockCollapsed).toBe(false);
  });

  it('toggle flips the value', () => {
    useUIStore.getState().togglePlanToolDockCollapsed();
    expect(useUIStore.getState().planToolDockCollapsed).toBe(true);
    useUIStore.getState().togglePlanToolDockCollapsed();
    expect(useUIStore.getState().planToolDockCollapsed).toBe(false);
  });

  it('setter assigns the value', () => {
    useUIStore.getState().setPlanToolDockCollapsed(true);
    expect(useUIStore.getState().planToolDockCollapsed).toBe(true);
  });

  it('is persisted (included in partialize) to the ogden-ui payload', () => {
    useUIStore.getState().setPlanToolDockCollapsed(true);
    const raw = localStorage.getItem('ogden-ui');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.planToolDockCollapsed).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```
corepack pnpm exec vitest run src/store/__tests__/uiStore.test.ts --pool=forks --testTimeout=20000
```
Expected: FAIL — `togglePlanToolDockCollapsed is not a function` / `planToolDockCollapsed` is `undefined`.

- [ ] **Step 3: Add the field + actions to the `UIState` interface**

In `apps/web/src/store/uiStore.ts`, inside the `interface UIState { ... }` block, immediately after the `rightPanelCollapsed` trio (currently ending at `setRightPanelCollapsed: (v: boolean) => void;`, line ~47), add:
```ts
  // Plan tier-shell bottom tools dock — collapsed shows a slim handle with an
  // expand affordance; the heavy tools rail is unmounted so the canvas reclaims
  // the height. Global across Plan modes, persisted across sessions.
  planToolDockCollapsed: boolean;
  togglePlanToolDockCollapsed: () => void;
  setPlanToolDockCollapsed: (v: boolean) => void;
```

- [ ] **Step 4: Add the implementation to the store body**

In the `create<UIState>()(persist((set, get) => ({ ... })))` body, immediately after the `rightPanelCollapsed` implementation trio (currently ending `setRightPanelCollapsed: (v) => set({ rightPanelCollapsed: v }),`, line ~142), add:
```ts
      // Plan tools dock collapse — default expanded.
      planToolDockCollapsed: false,
      togglePlanToolDockCollapsed: () =>
        set((s) => ({ planToolDockCollapsed: !s.planToolDockCollapsed })),
      setPlanToolDockCollapsed: (v) => set({ planToolDockCollapsed: v }),
```

- [ ] **Step 5: Add the field to `partialize`**

In the persist options `partialize` (line ~202-207), add the new key so it is written to localStorage:
```ts
      partialize: (state) => ({
        colorScheme: state.colorScheme,
        sidebarOpen: state.sidebarOpen,
        sidebarGrouping: state.sidebarGrouping,
        rightPanelCollapsed: state.rightPanelCollapsed,
        planToolDockCollapsed: state.planToolDockCollapsed,
      }),
```

- [ ] **Step 6: Run the test to verify it passes**

Run:
```
corepack pnpm exec vitest run src/store/__tests__/uiStore.test.ts --pool=forks --testTimeout=20000
```
Expected: PASS (4/4).

- [ ] **Step 7: Commit**

```
git add apps/web/src/store/uiStore.ts apps/web/src/store/__tests__/uiStore.test.ts
git commit -m "feat(plan): add planToolDockCollapsed UI preference

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

**Gate:** `planToolDockCollapsed` defaults false, toggles, and round-trips through localStorage; test green; committed.

---

## Task 3: Create the `PlanToolDock` wrapper component

**Files:**
- Create: `apps/web/src/v3/plan/tier-shell/PlanToolDock.tsx`
- Create: `apps/web/src/v3/plan/tier-shell/PlanToolDock.module.css`
- Create: `apps/web/src/v3/plan/tier-shell/__tests__/PlanToolDock.test.tsx`

The wrapper renders the existing `PlanTierCategorizedToolsRail` (props passed straight through) plus a collapse control. When collapsed it renders ONLY a slim handle — the rail is not mounted — so `StageShell`'s center canvas (`flex: 1 1 auto`) reclaims the height.

Rendering with `objective={null}` shows just the always-present Modules group, so the rail's `IntersectionObserver` effect (guarded on `visibleCount > 1`) never runs — safe under happy-dom.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/v3/plan/tier-shell/__tests__/PlanToolDock.test.tsx`:
```tsx
/**
 * @vitest-environment happy-dom
 *
 * PlanToolDock — collapse-aware wrapper around the Plan bottom tools rail.
 * Proves:
 *   1. Expanded (default): renders the tools rail + a "Collapse tools" control.
 *   2. Collapsed: renders a "Show tools" handle and does NOT mount the rail.
 *   3. Clicking the control toggles the uiStore preference.
 *
 * Rendered with objective={null} so only the always-present Modules group shows
 * (rail's IntersectionObserver effect stays dormant under happy-dom).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useUIStore } from '../../../../store/uiStore.js';
import PlanToolDock from '../PlanToolDock.js';

function renderDock() {
  return render(
    <PlanToolDock objective={null} disabled={false} onActivate={() => {}} activeFormId={null} />,
  );
}

beforeEach(() => {
  useUIStore.setState({ planToolDockCollapsed: false });
});
afterEach(() => cleanup());

describe('PlanToolDock', () => {
  it('expanded: renders the tools rail and a collapse control', () => {
    renderDock();
    const dock = screen.getByTestId('plan-tool-dock');
    expect(dock.getAttribute('data-collapsed')).toBe('false');
    // The rail panel is identified by its aria-label.
    expect(screen.getByLabelText('Objective tools')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Collapse tools' })).toBeTruthy();
  });

  it('collapsed: renders the handle only, not the rail', () => {
    useUIStore.setState({ planToolDockCollapsed: true });
    renderDock();
    const dock = screen.getByTestId('plan-tool-dock');
    expect(dock.getAttribute('data-collapsed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Show tools' })).toBeTruthy();
    expect(screen.queryByLabelText('Objective tools')).toBeNull();
  });

  it('clicking the collapse control toggles the store preference', () => {
    renderDock();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse tools' }));
    expect(useUIStore.getState().planToolDockCollapsed).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```
corepack pnpm exec vitest run src/v3/plan/tier-shell/__tests__/PlanToolDock.test.tsx --pool=forks --testTimeout=20000
```
Expected: FAIL — cannot resolve `../PlanToolDock.js` (module does not exist yet).

- [ ] **Step 3: Create the CSS module**

Create `apps/web/src/v3/plan/tier-shell/PlanToolDock.module.css`:
```css
/* PlanToolDock — collapse chrome for the Plan bottom tools dock.
   Expanded: a thin bar with the collapse control above the tools rail.
   Collapsed: just the slim handle, so the canvas reclaims the height. */

.dock {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
}

.bar {
  display: flex;
  justify-content: flex-end;
  flex: 0 0 auto;
}

.handle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border, rgba(242, 237, 227, 0.12));
  border-radius: var(--radius-md, 8px);
  color: var(--color-text-muted, rgba(242, 237, 227, 0.65));
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: border-color 140ms ease, color 140ms ease;
}

.handle:hover {
  border-color: var(--color-gold-brand);
  color: var(--color-text);
}

.handleLabel {
  line-height: 1;
}
```

- [ ] **Step 4: Create the component**

Create `apps/web/src/v3/plan/tier-shell/PlanToolDock.tsx`:
```tsx
/**
 * PlanToolDock — collapse-aware wrapper around PlanTierCategorizedToolsRail for
 * the Plan tier-shell bottom tray.
 *
 * Expanded (default): a slim bar with a "Collapse tools" control above the full
 * categorized tools rail. Collapsed: ONLY a "Show tools" handle is rendered --
 * the rail is unmounted, so StageShell's center canvas (flex: 1 1 auto) reclaims
 * the vertical space (e.g. so the IF/THEN threshold editor is unobstructed in
 * Protocols mode). The collapsed/expanded choice is a global, persisted uiStore
 * preference (mirrors rightPanelCollapsed) and applies in both Objectives and
 * Protocols mode.
 */

import { ChevronDown, ChevronUp } from 'lucide-react';
import type { PlanStratumObjective } from '@ogden/shared';
import { useUIStore } from '../../../store/uiStore.js';
import PlanTierCategorizedToolsRail from './PlanTierCategorizedToolsRail.js';
import type { PlanTool } from './planToolCatalog.js';
import css from './PlanToolDock.module.css';

interface Props {
  objective: PlanStratumObjective | null;
  disabled?: boolean;
  onActivate: (tool: PlanTool) => void;
  activeFormId?: string | null;
}

export default function PlanToolDock({
  objective,
  disabled,
  onActivate,
  activeFormId,
}: Props) {
  const collapsed = useUIStore((s) => s.planToolDockCollapsed);
  const toggle = useUIStore((s) => s.togglePlanToolDockCollapsed);

  if (collapsed) {
    return (
      <div className={css.dock} data-testid="plan-tool-dock" data-collapsed="true">
        <button
          type="button"
          className={css.handle}
          onClick={toggle}
          aria-expanded={false}
          aria-label="Show tools"
        >
          <ChevronUp size={16} strokeWidth={1.8} aria-hidden="true" />
          <span className={css.handleLabel}>Tools</span>
        </button>
      </div>
    );
  }

  return (
    <div className={css.dock} data-testid="plan-tool-dock" data-collapsed="false">
      <div className={css.bar}>
        <button
          type="button"
          className={css.handle}
          onClick={toggle}
          aria-expanded={true}
          aria-label="Collapse tools"
        >
          <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
          <span className={css.handleLabel}>Tools</span>
        </button>
      </div>
      <PlanTierCategorizedToolsRail
        objective={objective}
        disabled={disabled}
        onActivate={onActivate}
        activeFormId={activeFormId}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:
```
corepack pnpm exec vitest run src/v3/plan/tier-shell/__tests__/PlanToolDock.test.tsx --pool=forks --testTimeout=20000
```
Expected: PASS (3/3).

- [ ] **Step 6: Commit**

```
git add apps/web/src/v3/plan/tier-shell/PlanToolDock.tsx apps/web/src/v3/plan/tier-shell/PlanToolDock.module.css apps/web/src/v3/plan/tier-shell/__tests__/PlanToolDock.test.tsx
git commit -m "feat(plan): PlanToolDock collapse wrapper for the bottom tools dock

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

**Gate:** Expanded renders rail + collapse control; collapsed renders handle only and unmounts the rail; click toggles the store; test green; committed.

---

## Task 4: Wire `PlanToolDock` into `PlanTierShell`

**Files:**
- Modify: `apps/web/src/v3/plan/tier-shell/PlanTierShell.tsx` (bottomTray slot ~1024-1033; imports)

- [ ] **Step 1: Locate the existing rail import**

Run (from repo root `atlas/`):
```
git grep -n "PlanTierCategorizedToolsRail" apps/web/src/v3/plan/tier-shell/PlanTierShell.tsx
```
Expected: an `import ... from './PlanTierCategorizedToolsRail.js';` line and the JSX usage in the `bottomTray` slot.

- [ ] **Step 2: Add the `PlanToolDock` import and remove the now-unused rail import**

In `PlanTierShell.tsx`, replace the existing
```tsx
import PlanTierCategorizedToolsRail from './PlanTierCategorizedToolsRail.js';
```
with
```tsx
import PlanToolDock from './PlanToolDock.js';
```
(The rail is now mounted only inside `PlanToolDock`; leaving the unused import would introduce a NEW `tsc` error.)

- [ ] **Step 3: Swap the bottomTray JSX**

In the `bottomTray={ ... }` prop (currently `PlanTierShell.tsx:1024-1033`), replace the `<PlanTierCategorizedToolsRail ... />` element with `<PlanToolDock ... />`, keeping the same four props and the `showTierZeroWorkbench ? undefined :` guard:
```tsx
            bottomTray={
              showTierZeroWorkbench ? undefined : (
                <PlanToolDock
                  objective={selectedObjective}
                  disabled={!params.projectId}
                  onActivate={handleActivateTool}
                  activeFormId={openFormGroup?.activeFormId ?? null}
                />
              )
            }
```

- [ ] **Step 4: Typecheck (proves the import swap is clean)**

Run (from `apps/web`, PowerShell):
```
$env:NODE_OPTIONS='--max-old-space-size=8192'; corepack pnpm exec tsc -b
```
Expected: exactly the 4 pre-existing baseline errors, no others. In particular, NO "PlanTierCategorizedToolsRail is declared but never used" and NO "Cannot find name PlanToolDock".

- [ ] **Step 5: Commit**

```
git add apps/web/src/v3/plan/tier-shell/PlanTierShell.tsx
git commit -m "feat(plan): mount PlanToolDock in the Plan tier-shell bottom tray

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

**Gate:** Plan tier-shell renders the dock through `PlanToolDock`; tsc clean bar baseline; committed.

---

## Task 5: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run all three new/affected test files bounded**

Run (from `apps/web`):
```
corepack pnpm exec vitest run src/store/__tests__/uiStore.test.ts src/v3/plan/tier-shell/__tests__/PlanToolDock.test.tsx --pool=forks --testTimeout=20000
```
Expected: all green (uiStore 4/4, PlanToolDock 3/3).

- [ ] **Step 2: Typecheck the whole web package**

Run (from `apps/web`, PowerShell):
```
$env:NODE_OPTIONS='--max-old-space-size=8192'; corepack pnpm exec tsc -b
```
Expected: exactly the 4 pre-existing baseline errors, no others.

- [ ] **Step 3: Live preview proof (demo build)**

Start the demo build (`web-demo` launch config, `FEATURE_DEMO_MODE=true`, port 5206) so a throwaway guest auto-provisions and a sample project clone is available (no credential entry, no showcase mutation). Open a Plan project tier view:
- In Objectives mode: click the "Tools" collapse control; confirm the bottom tools dock collapses to the slim handle and the canvas grows. Click "Tools" again; confirm it expands.
- Switch to Protocols mode (rail toggle -> `?planMode=protocol`), select a protocol; with the dock collapsed, confirm the IF/THEN threshold editor (`protocol-threshold-editor`) is fully visible.
- Reload the page; confirm the collapsed/expanded choice persisted.

Capture a screenshot of the collapsed Protocols-mode workspace. **If the v3 mount hangs the headless preview** (standing disclosure), fall back to `preview_eval` DOM assertions:
- `document.querySelector('[data-testid="plan-tool-dock"]').getAttribute('data-collapsed")` reflects the toggle.
- when collapsed, `document.querySelector('[aria-label="Objective tools"]')` is `null`.
Disclose the fallback in the report rather than claiming a screenshot.

- [ ] **Step 4: Final report**

Report: commits made (5), test counts, tsc result (bar baseline), and the preview proof (screenshot or disclosed DOM-assertion fallback). Confirm nothing was pushed.

**Gate:** All tests green; tsc clean bar baseline; collapse works + persists in both modes (proven live or by DOM assertion); session complete. Push remains UNAUTHORIZED until the steward says so.

---

## Self-Review

**Spec coverage:**
- Global collapse control, both modes, persisted -> Tasks 2 (pref) + 3 (control) + 4 (wired in shell, no mode guard). ✓
- Default expanded / behavior preserved -> Task 2 Step 4 (`planToolDockCollapsed: false`). ✓
- No version bump / no migration -> Task 2 preamble + Step 5. ✓
- Plan-side wrapper, StageShell untouched -> Tasks 3 + 4 (no StageShell edit). ✓
- Collapsed unmounts rail so canvas reclaims height -> Task 3 component (early return) + test Step 1 case 2. ✓
- Amanah-neutral / no sync -> uiStore is localStorage-only (not in syncManifest); no spine writes in any task. ✓
- Single global preference (YAGNI) -> one boolean, no per-mode state. ✓
- Tests: default/toggle/partialize + expanded/collapsed/toggle -> Tasks 2 + 3. ✓
- tsc bar baseline + bounded vitest + live/DOM preview -> Task 5. ✓

**Placeholder scan:** none — every code/test step has complete content.

**Type consistency:** `planToolDockCollapsed: boolean`, `togglePlanToolDockCollapsed(): void`, `setPlanToolDockCollapsed(v: boolean): void` are used identically across uiStore impl (Task 2) and `PlanToolDock` consumption (Task 3). `PlanToolDock` Props (`objective`, `disabled`, `onActivate`, `activeFormId`) match `PlanTierCategorizedToolsRail`'s Props exactly and the call site in Task 4. Rail aria-label `"Objective tools"` (from `PlanTierCategorizedToolsRail.tsx:132`) is what the Task 3 test queries. ✓
