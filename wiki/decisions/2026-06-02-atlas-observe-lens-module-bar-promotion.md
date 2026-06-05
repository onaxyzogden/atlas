# ADR: Promote the observational-lens prototype to the live Observe `module-bar` shell (with whole-UI true-zoom)

**Date:** 2026-06-02
**Status:** accepted
**Branch:** `feat/atlas-permaculture` (commit `f7e164f2`, not pushed)
**Supersedes the prototype staging of:** [[decisions/2026-05-28-atlas-observe-dashboard-phase4]]-era lens concept; builds directly on [[log/2026-06-02-observe-lens-prototype-shared-lens-mapping]].

## Context

On 2026-06-02 we landed a faithful, mock-backed React prototype of an
"observational lens" reframe of Observe -- a single map-centric, lens-organized
workspace -- mounted standalone at `/v3/prototype/observe-lens` under
`appShellRoute`, with its 6-lens identity sourced from the shared
`OBSERVE_LENSES` constant. It lived in a deletable, header-marked
`apps/web/src/v3/observe/prototype/` folder and did NOT touch the four live
Observe dashboard surfaces.

The Observe stage has **two shells**, selected per-project by
`getObserveShellMode(projectRecord)` (`store/projectStore.ts`):

- `'dashboard'` (the **default**) -- the 4-surface read-only synthesis layer
  documented in [[entities/observe-dashboard]] (`UnifiedLandStateSurface`,
  `DomainDetailLayout`, `TemporalLayerSurface`, `ObjectiveRollupSurface`).
- `'module-bar'` -- the **legacy** 16-domain bottom module-bar assembly
  (`ObserveTools` rail + `DiagnoseMap` + `ObserveModuleBar` tray +
  `ObserveShellToggle`).

`ObserveShellToggle` flips a project between the two and persists
`observeShellMode`.

The operator asked to "replace the existing module version of observe with the
promoted version of the prototype", and -- via two AskUserQuestion gates --
fixed scope to: **(1)** replace ONLY the legacy `module-bar` shell with the
promoted lens dashboard, leaving the `dashboard` shell untouched; **(2)** scale
the whole UI by true zoom so the smallest font (7px in the prototype) renders at
12px with proportions preserved; **(3)** stay mock-backed -- no
`projectId`/store/MapLibre wiring this pass.

## Decision

1. **Promote, don't fork.** `git mv` the prototype folder to its permanent home
   `apps/web/src/v3/observe/lens/` and rename `ObserveLensPrototype` ->
   `ObserveLensDashboard` (default export). Internal imports are relative so they
   survive the move; header comments change from "PROTOTYPE ONLY (deletable)" to
   "mock-backed Observe lens surface -- not yet wired to live data". This is a
   promotion of the same code to its home, NOT a legacy-component deletion
   ([[feedback-no-deletion]] concerns legacy stage components, preserved below).

2. **Intercept only the `module-bar` branch; preserve the dual-shell body
   verbatim.** In `ObserveLayout.tsx`, the prior `export default function
   ObserveLayout()` body is renamed to a preserved inner
   `function ObserveDualShellLayoutLegacy()` (unchanged -- still renders the real
   `dashboard` shell AND the legacy module-bar assembly). A new thin
   `export default function ObserveLayout()` (route-component name unchanged, so
   all routes/nav keep resolving) computes `observeShellMode` and, when it is
   `'module-bar'`, returns a rails/tray-`null` `StageShell` whose canvas is the
   promoted `<ObserveLensDashboard />` plus the preserved `ObserveShellToggle`
   (the escape hatch back to the dashboard shell). Otherwise it delegates to
   `<ObserveDualShellLayoutLegacy />`. The `dashboard` render path is therefore
   **byte-identical** -- zero regression risk to the untouched surface -- and the
   legacy module-bar branch stays compiled/preserved but is simply never entered.

3. **Whole-UI true zoom via a single CSS `zoom` wrapper.** The promoted root
   wraps its content in `<div style={{ width: calc(100%/Z), height: calc(100%/Z),
   zoom: Z }}>` with `Z = 12/7 (~= 1.714)`. The inner box is pre-sized to
   `canvas / Z` then scaled back up by `zoom: Z`, so it fills the canvas exactly
   with no overflow while every rendered length (fonts, padding, fixed panel
   widths, SVG charts, the cycle-spiral geometry) is uniformly `1.714x`. Every
   inline-px literal in `components.tsx` stays pixel-faithful to the source
   concept -- no per-value rewrite, exact proportionality.

4. **Repoint the standalone alias.** `routes/index.tsx`
   `observeLensPrototypeRoute` (path `/v3/prototype/observe-lens`) now imports the
   promoted `ObserveLensDashboard`; kept as a chrome-free pixel-inspection alias.

## Alternatives considered

- **Rewrite the ~hundreds of inline-px literals to bake in the 1.714x scale.**
  Rejected: high risk of mis-scaling individual literals and divergence from the
  source concept; a `scripts/` codemod can multiply whitelisted dimensional props
  later if baked-in values are ever required.
- **Replace the `dashboard` shell instead / make the lens the global default.**
  Out of scope by operator decision -- the dashboard shell stays the default and
  byte-untouched.
- **Delete the legacy module-bar assembly.** Rejected per [[feedback-no-deletion]]
  -- it is preserved inside `ObserveDualShellLayoutLegacy` for fidelity / future
  reuse.

## Consequences

- On a `module-bar`-mode project, `/v3/project/$projectId/observe` now renders
  the promoted `ObserveLensDashboard` (mock-backed) at uniform 1.714x true-zoom
  (smallest 7px source -> 12px painted), with a working `ObserveShellToggle` back
  to the dashboard shell.
- The 4-surface `dashboard` shell and all Observe nav/deep-links are unchanged
  (no diffs under `apps/web/src/v3/observe/dashboard/**`).
- `zoom` is non-standard (Chromium/Safari/FF>=126); Atlas is Chromium-first, so
  this is safe.
- **Caveat:** `getComputedStyle().fontSize` under `zoom` returns the PRE-zoom
  value in Chromium; painted size = computed x zoom. Live verification must
  multiply by `Z`, not read the computed value directly.

## Out of scope (deferred)

Live `ObserveDataPoint` / `useDomainSnapshot` / MapLibre wiring; reskinning to
`tokens.css`; replacing the `dashboard` shell; baking the zoom into literal
per-value font sizes; making the lens the global default for all projects.

ASCII-only; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
