# 2026-06-06 -- Tier-0 cold-load map-flicker fix + Phase B live smoke PASSES

- **Branch:** `feat/structured-capture-forms` (local-only; **not pushed**).
- **Fix commit:** `a842f3f2` -- `fix(act): gate Tier-0 swap on URL objectiveId to avoid cold-load map mount` (2 files: `ActTierShell.tsx` + `ActTierShell.module.css`).
- **Supersedes:** the BLOCKED live-smoke note in [[log/2026-06-06-atlas-tier0-workbench]] (the one remaining manual verification gate from Phase B).
- **Entity:** [[entities/act-tier-shell]]

## Root cause (confirmed, systematic-debugging Iron Law)

Phase B left one open gate: the live preview smoke for the `s1-vision` deep
link wedged the headless WebGL renderer. The Phase B entry hypothesised the
cause; this session **confirmed** it and proved the fix.

`ActTierShell.tsx:768` read `showTierZeroWorkbench = selectedObjective != null
&& isTierZeroObjective(selectedObjective)`. `selectedObjective` is derived from
`objectives.find(o => o.id === objectiveId)`, and `objectives` hydrates
**asynchronously** from the project store. On a COLD deep-link the URL
`objectiveId` (`s1-vision`) is known synchronously but `selectedObjective` is
briefly `null`, so `showTierZeroWorkbench` was `false` for the first render(s)
and the shell transiently mounted `<StageShell>` -> `<DiagnoseMap>`
(MapboxGL/WebGL). In a normal browser that is a brief map flicker; in the
headless preview the WebGL init **wedges the renderer permanently**, which is
exactly what blocked the Phase B smoke.

## Fix (additive, scoped -- spatial map path untouched)

Gate the swap on the **URL-synchronous** `objectiveId` so the workbench wins
from the first render, before objectives hydrate:

```ts
const TIER_ZERO_OBJECTIVE_ID = 's1-vision';
function isTierZeroObjectiveId(objectiveId: string | null): boolean {
  return objectiveId === TIER_ZERO_OBJECTIVE_ID;
}
// ...
const showTierZeroWorkbench =
  isTierZeroObjectiveId(objectiveId) ||
  (selectedObjective != null && isTierZeroObjective(selectedObjective));
```

When `showTierZeroWorkbench` is true but `selectedObjective` has not resolved
yet, a lightweight non-map placeholder (`.tierZeroLoading`, "Loading decision
workbench...", `role="status"`) covers the gap. `<StageShell>`/`<DiagnoseMap>`
is **never** reached on the `s1-vision` route, so no WebGL context is created.
The map render path for every spatial objective is byte-unchanged -- the new
predicate only short-circuits the single universal Tier-0 id.

## Verification -- live smoke now PASSES

- **Web `tsc --noEmit`** EXIT 0 (8GB heap); served bundle clean.
- **Bounded vitest** (`--pool=forks --testTimeout=20000`,
  [[feedback-vitest-bounded-runs]]) green; the 5 pre-existing
  `actWorkItemModule.test.ts` failures proven unrelated (stash-out / stash-in:
  still 5 with my files removed).
- **Live preview smoke -- the previously-blocked gate -- now GREEN.** Fresh dev
  server (web 5200 + api 3001 + native postgres 5432). Two-step proof on the MTC
  tier-shell project:
  - Client-side nav to `/v3/project/mtc/act/tier-shell/s1-vision`: workbench
    renders, **0 canvases / 0 mapbox elements**, no loading placeholder.
  - **Hard reload (the cold deep-link that used to wedge):** `readyState:
    "complete"`, eval returns (no wedge), **0 canvases / 0 mapbox elements**,
    workbench content present. **Screenshot captured** -- Objectives rail
    ("Completes Tier 0 / Unlocks Tier 1 -- Land Reading") + ACTIVE DECISION
    center + WORKING ON right + S1-S7 stratum spine, no map anywhere.
- Per the no-screenshot-no-claim rule ([[project-screenshot-hang]]), the fix is
  asserted by a live screenshot of the cold-loaded route, not by source review
  alone.

## Side-finding -- the "/home reload loop" was a preview-tool artifact, not an app bug

Investigated (operator-authorised) whether modified auth pages or the foreign
spine-gate WIP caused a full-page reload loop on authenticated routes. Decisive
experiment: client-side nav (`history.pushState` + `popstate`, preserving the JS
context) to `/home` returned full DOM in ~4s -- a blocked main thread would have
timed out. **Conclusion:** no application reload loop or main-thread block. Once
one map mount wedges the shared headless WebGL context, *every* subsequent hard
navigation (incl. map-free `/home`) appears to hang because the renderer process
is dead -- hence the required server restart. The repeating `[vite]
connecting/connected` was just the HMR socket reconnecting per hard reload.
**Exonerated:** the modified auth pages (`isAuthenticated()`/`beforeLoad` does
NOT ping-pong) and the catalogue spine-gate WIP (status engine
[[entities/act-tier-shell]] is bounded -- at most one pass per objective,
cycle-safe). No code change resulted from this investigation; the Tier-0 fix
above *also* removes the map-mount trigger on `s1-vision`, which is why the smoke
now succeeds.

## Hygiene and Amanah

Explicit-pathspec commit (`a842f3f2`, 2 files only); `git status` confirms the
extensive foreign WIP (`LoginPage`/`RegisterPage`/`ResetPasswordPage`/
`VerifyEmailPage`/`OrganizationCreatePage`/`authoring.ts`/`catalogues/index.ts`/
`WizardStep2Vision.tsx` + the foreign-modified `act-tier-shell.md` /
`observe-dashboard.md` / `2026-06-05-atlas-observe-declared-intent.md` +
untracked `spineGate.conformance.test.ts` / `2026-06-05-mapsheet-export-...`)
was NEVER staged or touched ([[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]], [[feedback-no-deletion]]);
not pushed; ASCII-only. **Amanah:** a rendering-correctness fix to
land-stewardship planning capture -- no sales channel, advance purchase, or
financing instrument; no CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]]).

## Closes

- The Phase B "live preview smoke" open gate ([[log/2026-06-06-atlas-tier0-workbench]]).
- The "Transient map flash on the `s1-vision` deep link" deferred item from the
  same entry.
