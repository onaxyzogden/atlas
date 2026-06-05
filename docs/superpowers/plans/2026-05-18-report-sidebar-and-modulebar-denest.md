# Report Sidebar Destination + ObserveModuleBar De-Nesting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the orphaned `/report` route an entry point as a standalone left-sidebar destination, and restructure `ObserveModuleBar` so its task pips are no longer `<button>`s nested inside a `<button>` (clearing the `validateDOMNesting` warning the cyclical-navigator change doubled).

**Architecture:** No new module-system scaffolding. Add one `<Link>` to `V3LifecycleSidebar` reusing the existing `/report` route + `ReportPage` unchanged. For `ObserveModuleBar`, the outer `<button class=tile>` becomes a presentational `<div>`; a new transparent absolutely-positioned `<button class=tileHit>` carries the click + `aria-pressed` + `aria-label`; the pip `<button>`s become siblings layered above it via z-index; the label gets `pointer-events:none` so clicks fall through to the hit button. Net behavior unchanged.

**Tech Stack:** React 18 + TypeScript, @tanstack/react-router, Vitest + @testing-library/react (happy-dom), CSS Modules.

**Spec:** `wiki/decisions/2026-05-18-atlas-report-sidebar-destination.md`

**Key facts (verified):**
- `RailStage` ⊇ `LifecycleStage` = `BannerId` which includes `'report'` — so `activeStage="report"` is type-valid and `data-active={activeStage === 'report'}` works.
- `V3ProjectLayout.activeFromPath` already maps the `report` path segment → `stage:"report"` → `<V3LifecycleSidebar activeStage={stage} />`. No plumbing change.
- `apps/web/src/v3/observe/types.ts` has **no** lucide import, so the `ObserveModuleBar` test does **not** need a lucide mock.
- The existing sidebar test mocks `@tanstack/react-router` (its `Link` → `<a {...rest}>`); the new sidebar assertions piggyback on that mock.
- Verification preview server: `web-a1`, serverId `50c503b4-d5ec-443c-9353-1f2e1838fbb8`, port 5240. Test project id: `run6-fcef85be-058f-474e-8cf8-e5787fc8de39`. WebGL/MapLibre screenshot capture hangs — use `preview_eval` DOM assertions + `preview_console_logs`.

---

## File Structure

- **Modify** `apps/web/src/v3/components/V3LifecycleSidebar.tsx` — add the Report `<Link>` between the Project Home link and the stage-groups `<div>`.
- **Modify** `apps/web/src/v3/components/__tests__/V3LifecycleSidebar.test.tsx` — add the Report-link assertions.
- **Modify** `apps/web/src/v3/observe/components/ObserveModuleBar.tsx` — JSX restructure (outer `<button>` → `<div>` + `.tileHit` button + sibling pips).
- **Modify** `apps/web/src/v3/observe/components/ObserveModuleBar.module.css` — add `.tileHit`, `position`/`z-index` on `.tile`/`.cardProgress`, `pointer-events` on `.tileLabel`.
- **Create** `apps/web/src/v3/observe/components/__tests__/ObserveModuleBar.test.tsx` — regression lock: no nested `<button>`, hit button has `aria-pressed` + `aria-label`, pips still render.

---

## Task 1: Report standalone sidebar link

**Files:**
- Modify: `apps/web/src/v3/components/V3LifecycleSidebar.tsx` (insert after the Project Home `</Link>`, line 168; before `<div className={css.stageGroups}>`, line 170)
- Test: `apps/web/src/v3/components/__tests__/V3LifecycleSidebar.test.tsx` (add two `it` blocks at the end of the `describe`, before its closing `});` at line 112)

- [ ] **Step 1: Add the failing tests**

Insert these two `it` blocks immediately before the closing `});` of the `describe('V3LifecycleSidebar', …)` (currently line 112) in `apps/web/src/v3/components/__tests__/V3LifecycleSidebar.test.tsx`:

```tsx
  it('renders a standalone Report link to the report route', () => {
    render(<V3LifecycleSidebar activeStage="plan" />);
    const report = screen.getByText('Report');
    expect(report).toBeTruthy();
    expect(report.getAttribute('to')).toBe('/v3/project/$projectId/report');
  });

  it('marks the Report link active when activeStage="report"', () => {
    render(<V3LifecycleSidebar activeStage="report" />);
    const report = screen.getByText('Report');
    expect(report.getAttribute('data-active')).toBe('true');
  });
```

(The mocked `Link` renders `<a {...rest}>{children}</a>`, so `to`/`data-active` are read straight off the element — same idiom the suite already relies on for Project Home.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "apps/web" && npx vitest run V3LifecycleSidebar`
Expected: FAIL — `Unable to find an element with the text: Report` (link not yet added).

- [ ] **Step 3: Add the Report link**

In `apps/web/src/v3/components/V3LifecycleSidebar.tsx`, the current block (lines 161–170) is:

```tsx
      <Link
        to="/v3/project/$projectId/home"
        params={{ projectId }}
        className={css.homeLink}
        data-active={activeStage === 'home' ? 'true' : 'false'}
      >
        Project Home
      </Link>

      <div className={css.stageGroups}>
```

Insert the Report link between the Project Home `</Link>` and the `<div className={css.stageGroups}>` so the block becomes:

```tsx
      <Link
        to="/v3/project/$projectId/home"
        params={{ projectId }}
        className={css.homeLink}
        data-active={activeStage === 'home' ? 'true' : 'false'}
      >
        Project Home
      </Link>

      <Link
        to="/v3/project/$projectId/report"
        params={{ projectId }}
        className={css.homeLink}
        data-active={activeStage === 'report' ? 'true' : 'false'}
      >
        Report
      </Link>

      <div className={css.stageGroups}>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd "apps/web" && npx vitest run V3LifecycleSidebar`
Expected: PASS — all suite tests green (the 4 pre-existing + 2 new).

- [ ] **Step 5: Typecheck**

Run: `cd "apps/web" && npm run typecheck`
Expected: No new errors. Only the two pre-existing unrelated errors remain:
`src/features/plan/__tests__/useFlowEndpointOptions.test.ts(37,9)` and `(38,9)` — `Type … is missing the following properties from type 'Paddock'`. No `V3LifecycleSidebar` error (confirms `activeStage="report"` is type-valid).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/v3/components/V3LifecycleSidebar.tsx apps/web/src/v3/components/__tests__/V3LifecycleSidebar.test.tsx
git commit -m "feat(web): Report standalone sidebar destination"
```

---

## Task 2: ObserveModuleBar button-nesting restructure

**Files:**
- Create: `apps/web/src/v3/observe/components/__tests__/ObserveModuleBar.test.tsx`
- Modify: `apps/web/src/v3/observe/components/ObserveModuleBar.tsx` (lines 75–113 — the per-module render)
- Modify: `apps/web/src/v3/observe/components/ObserveModuleBar.module.css` (`.tile` line 25, new `.tileHit`, `.cardProgress` line 52, `.tileLabel` line 78)

- [ ] **Step 1: Write the failing regression test**

Create `apps/web/src/v3/observe/components/__tests__/ObserveModuleBar.test.tsx` with exactly:

```tsx
/**
 * @vitest-environment happy-dom
 *
 * ObserveModuleBar de-nesting regression lock:
 *   - No <button> is nested inside another <button> (validateDOMNesting).
 *   - Each tile's hit target is a button carrying aria-pressed + an
 *     aria-label of the module name.
 *   - Task pips still render as their own buttons (siblings of the hit
 *     button, not descendants).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import {
  LevelNavigatorProvider,
  type PillarTask,
} from '../../../../components/LevelNavigator/index.js';
import { OBSERVE_MODULE_LABEL } from '../../types.js';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

// Import AFTER the router mock so the SUT captures it.
import ObserveModuleBar from '../ObserveModuleBar';

afterEach(cleanup);

const TASK: PillarTask = {
  id: 't1',
  title: 'Survey the steward',
  columnId: 'observe_to_do',
} as PillarTask;

function renderBar() {
  return render(
    <LevelNavigatorProvider
      levels={[{ key: 'observe', label: 'Observe', title: 'Observe' }]}
      controlledLevel="observe"
      onLevelChange={() => {}}
      pillarTasks={{ 'human-context': [TASK] }}
    >
      <ObserveModuleBar
        activeModule="human-context"
        onSelectModule={() => {}}
        slideUpOpen={false}
        onOpenSlideUp={() => {}}
        onCloseSlideUp={() => {}}
      />
    </LevelNavigatorProvider>,
  );
}

describe('ObserveModuleBar — no nested buttons', () => {
  it('renders no <button> inside another <button>', () => {
    const { container } = renderBar();
    expect(container.querySelectorAll('button button').length).toBe(0);
  });

  it('exposes each tile hit target as an aria-pressed labelled button', () => {
    renderBar();
    const hit = screen.getByRole('button', {
      name: OBSERVE_MODULE_LABEL['human-context'],
    });
    expect(hit.getAttribute('aria-pressed')).toBe('true');
  });

  it('still renders the task pip as its own button', () => {
    renderBar();
    expect(
      screen.getByRole('button', { name: 'Task: Survey the steward' }),
    ).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "apps/web" && npx vitest run ObserveModuleBar`
Expected: FAIL — the first case fails (`expected 1 to be 0`): the current JSX nests the pip `<button>` inside the tile `<button>`, so `querySelectorAll('button button')` matches.

- [ ] **Step 3: Restructure the ObserveModuleBar JSX**

In `apps/web/src/v3/observe/components/ObserveModuleBar.tsx`, replace the entire returned per-module element (lines 75–113, the `<button key={mod} …> … </button>`) with this `<div>`-wrapped form. Replace **only** that JSX element; leave everything else (handlers, imports, `.map` wrapper) unchanged:

```tsx
              <div
                key={mod}
                className={`${css.tile} ${isActive ? css.tileActive : ''}`}
              >
                <button
                  type="button"
                  aria-pressed={isActive}
                  aria-label={OBSERVE_MODULE_LABEL[mod]}
                  className={css.tileHit}
                  onClick={() => handleCardClick(mod)}
                />
                <div className={css.cardProgress} aria-hidden="true">
                  {tasks.length > 0 ? (
                    tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        className={css.subseg}
                        style={{ background: taskColor(task) }}
                        title={task.title}
                        aria-label={`Task: ${task.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (ctx?.onSubsegClick) {
                            ctx.onSubsegClick(task.id, mod);
                            return;
                          }
                          const pillar = ctx?.pillars.find((p) => p.id === mod);
                          if (pillar?.route) {
                            navigate({ to: `${pillar.route}?task=${task.id}` });
                          }
                        }}
                      />
                    ))
                  ) : (
                    <div className={`${css.subseg} ${css.subsegEmpty}`} />
                  )}
                </div>
                <span className={css.tileLabel}>
                  {OBSERVE_MODULE_LABEL[mod]}
                </span>
              </div>
```

- [ ] **Step 4: Update the CSS module**

In `apps/web/src/v3/observe/components/ObserveModuleBar.module.css`:

(a) Add `position: relative;` to the `.tile` rule (currently lines 25–39). The rule becomes:

```css
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 8px 6px 6px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  position: relative;
}
```

(Keep any remaining declarations after `color:` that exist between line 35 and the closing brace at line 39 — only the `position: relative;` line is added, immediately before the closing `}`.)

(b) Add a new `.tileHit` rule immediately after the `.tileActive` rule (after line 50):

```css
.tileHit {
  position: absolute;
  inset: 0;
  z-index: 1;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
}
```

(c) Add `position: relative;` and `z-index: 2;` to `.cardProgress` (currently lines 52–60). The rule becomes:

```css
.cardProgress {
  display: flex;
  gap: 2px;
  width: 100%;
  height: 10px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 2px;
  position: relative;
  z-index: 2;
}
```

(d) Add `pointer-events: none;` to `.tileLabel` (currently lines 78–86). The rule becomes:

```css
.tileLabel {
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  pointer-events: none;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd "apps/web" && npx vitest run ObserveModuleBar`
Expected: PASS — all 3 cases green (no nested buttons; hit button is `aria-pressed="true"` and named "Human Context"; pip button "Task: Survey the steward" still present).

- [ ] **Step 6: Typecheck**

Run: `cd "apps/web" && npm run typecheck`
Expected: No new errors; only the two pre-existing `useFlowEndpointOptions.test.ts(37/38)` `Paddock` errors remain.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/v3/observe/components/ObserveModuleBar.tsx apps/web/src/v3/observe/components/ObserveModuleBar.module.css apps/web/src/v3/observe/components/__tests__/ObserveModuleBar.test.tsx
git commit -m "fix(web): de-nest ObserveModuleBar tile buttons (clears validateDOMNesting)"
```

---

## Task 3: Runtime verification + wiki status close-out

**Files:**
- Modify: `wiki/decisions/2026-05-18-atlas-report-sidebar-destination.md` (Status line)
- Modify: `wiki/log.md` (append entry)

- [ ] **Step 1: Confirm the preview server is up**

Use `mcp__Claude_Preview__preview_list`. Confirm `web-a1` / serverId `50c503b4-d5ec-443c-9353-1f2e1838fbb8` is `running`. If not, `mcp__Claude_Preview__preview_start` with name `web-a1`.

- [ ] **Step 2: Navigate to Observe and verify the Report sidebar link + click-through**

`mcp__Claude_Preview__preview_eval` (serverId `50c503b4-d5ec-443c-9353-1f2e1838fbb8`):

```js
location.href = '/v3/project/run6-fcef85be-058f-474e-8cf8-e5787fc8de39/observe'; 'go'
```

Then a second `preview_eval`:

```js
(() => {
  const a = [...document.querySelectorAll('a')].find(
    el => el.textContent.trim() === 'Report');
  return { found: !!a, href: a ? a.getAttribute('href') : null };
})()
```

Expected: `found: true`, `href` ending in `/report`.

- [ ] **Step 3: Click Report and confirm the route + page render**

`preview_eval`:

```js
(() => { const a=[...document.querySelectorAll('a')].find(el=>el.textContent.trim()==='Report'); if(a) a.click(); return 'clicked'; })()
```

Then a follow-up `preview_eval`:

```js
({ url: location.pathname, hasReportHeading: /Project Report|Report/.test(document.body.innerText) })
```

Expected: `url` ends in `/report`; `hasReportHeading: true`.

- [ ] **Step 4: Confirm the validateDOMNesting warning is gone**

Navigate back to Observe and open a module so `ObserveModuleBar` mounts (it renders in the bottom tray on `/observe`). `preview_eval`:

```js
location.href = '/v3/project/run6-fcef85be-058f-474e-8cf8-e5787fc8de39/observe'; 'go'
```

Then `mcp__Claude_Preview__preview_console_logs` with `level: "warn"`, `lines: 200`. If the output is too large, save-and-grep it for `validateDOMNesting` and `cannot appear as a descendant`.
Expected: **no** `validateDOMNesting` / `<button> cannot appear as a descendant of <button>` entries originating from `ObserveModuleBar`. (Pre-existing unrelated warnings may remain; the button-in-button one must be absent.)

- [ ] **Step 5: Update the ADR status**

In `wiki/decisions/2026-05-18-atlas-report-sidebar-destination.md`, change the status line from:

```
- **Status:** Accepted (design — implementation pending)
```

to:

```
- **Status:** Implemented & verified (2026-05-18)
```

- [ ] **Step 6: Append a wiki log entry**

Append to `wiki/log.md` a `## 2026-05-18 — feat(web): Report sidebar destination + ObserveModuleBar de-nesting` entry summarising: the standalone `V3LifecycleSidebar` Report link reusing `/report` (no module scaffolding, no `ReportPage` change); the `ObserveModuleBar` `<div>`+`.tileHit`+sibling-pips restructure clearing the `validateDOMNesting` button-in-button warning; tests added (`V3LifecycleSidebar` +2, new `ObserveModuleBar.test.tsx` 3/3); verification: typecheck clean bar the 2 pre-existing `Paddock` errors, runtime preview confirmed Report link routes to `/report` and the button-nesting warning is gone.

- [ ] **Step 7: Commit**

```bash
git add wiki/decisions/2026-05-18-atlas-report-sidebar-destination.md wiki/log.md
git commit -m "docs(wiki): mark Report-sidebar + ObserveModuleBar ADR implemented"
```

---

## Definition of Done

- Report reachable from the left sidebar as a standalone destination; clicking it routes to the existing `/report` page (unchanged).
- `ObserveModuleBar` renders zero `<button>`-in-`<button>`; the runtime `validateDOMNesting` warning for it is gone; click behaviour (tile selects/toggles module, pip navigates to task) preserved.
- `V3LifecycleSidebar` suite green (+2 new); new `ObserveModuleBar.test.tsx` green (3/3).
- `npm run typecheck` shows only the two pre-existing unrelated `Paddock` errors.
- ADR status flipped to Implemented; wiki log appended; all work committed.

## Notes / risks

- Reusing `css.homeLink` for the Report link is intentional (same visual class as Project Home — both are top-level destinations). No new CSS for Task 1.
- `.tileHit` is transparent and on top (z-index 1); the label sits behind it but stays visible (transparent overlay) and is `pointer-events:none` so clicks reach the hit button. Pips (`.cardProgress` z-index 2) sit above the hit button and take their own clicks; `e.stopPropagation()` is retained defensively though pips are now siblings, not descendants.
- The pip row remains `aria-hidden="true"`; the accessible name now lives on `.tileHit` via `aria-label` — a net a11y improvement (no interactive-in-interactive).
