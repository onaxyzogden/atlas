# 2026-06-02 -- Promote Observe lens prototype to the live module-bar shell + whole-UI true-zoom

**Branch:** `feat/atlas-permaculture` (explicit-path commit `f7e164f2`, 8 files
+156/-78; **not pushed**)

## What

Promoted the mock-backed observational-lens dashboard out of the `prototype/`
namespace and mounted it as the live `module-bar` Observe shell, replacing the
legacy 16-domain module bar; the 4-surface `dashboard` shell is byte-for-byte
untouched and remains the default. Whole UI enlarged by proportional true-zoom so
the smallest font renders at 12px. Still mock-backed -- no live-data wiring this
pass. Direct continuation of [[log/2026-06-02-observe-lens-prototype-shared-lens-mapping]].

## Scope (operator gates)

Two AskUserQuestion answers fixed scope: **replace ONLY the legacy module-bar**
(dashboard shell untouched); **whole-UI true zoom** (every pixel proportional,
smallest font 7px -> 12px). Plus standing constraint: **no live data**.

## Landed (8 files)

- **Move/rename:** `git mv apps/web/src/v3/observe/prototype/ ->
  .../observe/lens/` (`components.tsx` R099, `mockData.ts` R099, `tokens.ts`
  R093, `types.ts` R098); root `ObserveLensPrototype.tsx` -> new
  `lens/ObserveLensDashboard.tsx` (component + default export renamed; git tracked
  as D-old + A-new). Header comments changed from "PROTOTYPE ONLY (deletable)" to
  "mock-backed Observe lens surface -- not yet wired to live data".
- **`lens/ObserveLensDashboard.tsx`** -- added the true-zoom wrapper:
  `const Z = 12 / 7;` then `<div style={{ width: calc(100%/Z), height:
  calc(100%/Z), zoom: Z }}>` around the former root content (whose outer
  `position:absolute; inset:0; display:flex` became the INNER
  `position:relative; width:100%; height:100%`). Inner box pre-sized to
  `canvas/Z`, scaled back by `zoom: Z` -> fills the canvas exactly, no overflow,
  every length uniformly 1.714x. `components.tsx` inline-px literals untouched.
- **`ObserveLayout.tsx`** (+58/-0) -- thin `export default function
  ObserveLayout()` wrapper: when `getObserveShellMode(projectRecord) ===
  'module-bar'` returns a rails/tray-`null` `StageShell` whose canvas is
  `<ObserveShellToggle .../>` + `<ObserveLensDashboard />`; otherwise delegates to
  the preserved `function ObserveDualShellLayoutLegacy()` (the prior body,
  verbatim -- still renders the real dashboard shell and the preserved legacy
  module-bar assembly). Added `import ObserveLensDashboard from
  './lens/ObserveLensDashboard.js'`. Route-component name unchanged -> all
  routes/nav keep resolving; dashboard render path byte-identical.
- **`routes/index.tsx`** -- `observeLensPrototypeRoute` (`/v3/prototype/observe-lens`,
  under `appShellRoute`) import repointed `prototype/ObserveLensPrototype.js` ->
  `lens/ObserveLensDashboard.js`; comment reframed to "chrome-free preview alias"
  (the same component is now also the live module-bar shell). Diff confirmed to
  carry ONLY this change (no foreign hunks).

## Verified

- **Typecheck:** `node --max-old-space-size=8192
  ../../node_modules/typescript/bin/tsc --noEmit` from `apps/web` -> EXIT 0.
  (Atlas web `lint` script IS `tsc --noEmit` -- there is no ESLint config in
  atlas; lint == the passing typecheck.)
- **Live DOM (real Vite :5200, `preview_eval`):** standalone
  `/v3/prototype/observe-lens` -> `zoom` 1.71429 applied; scoped strictly inside
  the wrapper, distinct source font sizes `[8,9,10,11,14,18]`, NO sub-7px text in
  the default view; `getComputedStyle().fontSize` returns PRE-zoom values
  (Chromium), painted = computed x Z, so a 7px source -> exactly 12px
  (`7 x 12/7 = 12`); smallest currently-visible 8px source -> 13.71px painted.
- **In-app promotion:** navigated to `mtc` (Moontrance Creek; no
  `observeShellMode` -> defaults to `dashboard`, correctly rendering the 4-surface
  shell, no zoom). Flipped `ObserveShellToggle` to "Module bar" -> the promoted
  `ObserveLensDashboard` mounts (zoom 1.71429, lens markers Soil/Climate, same
  font profile). Flipped back to "Dashboard" -> zoom gone, all 4-surface markers
  present (shell unchanged). **Screenshot captured** of the zoomed in-app
  module-bar lens view (cycle spiral, "NOW . OBSERVE ACTIVE", lens bar
  All/Foundation/Climate/Water/Living Systems, visibly enlarged).
- **Diff audit:** `git status --short -- apps/web/src/v3/observe/dashboard/`
  empty -> ZERO diffs under the dashboard shell; staged set verified == exactly
  my 8 files before commit.

## Discipline

Explicit-path commit on the rebased branch, staged set verified, foreign WIP
untouched ([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]);
not pushed ([[project-branch-rebase]]); legacy module-bar assembly preserved
inside `ObserveDualShellLayoutLegacy` (no-deletion); CSRA model untouched
([[fiqh-csra-erased-2026-05-04]]); ASCII-only.

ADR [[decisions/2026-06-02-atlas-observe-lens-module-bar-promotion]]; predecessor
[[log/2026-06-02-observe-lens-prototype-shared-lens-mapping]]; entities
[[entities/observe-dashboard]] + [[entities/web-app]] + [[entities/shared-package]].
