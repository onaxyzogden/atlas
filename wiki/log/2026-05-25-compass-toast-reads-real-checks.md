# 2026-05-25 — Compass toast reads real How-checks, not seed evidence

**Branch.** atlas `feat/atlas-permaculture`, commit `73ff75a0` (3 files). See ADR [[2026-05-25-atlas-compass-toast-reads-real-checks]].

## Why

Steward screenshot bug: in the Observe map the **HUMAN CONTEXT** right-rail
panel correctly read **"33% ready · 1/3 steps"** (only the last of 3 How
checkboxes ticked), yet the in-map **"Objective complete — Every step here is
verified"** toast fired anyway. "Just because the last task on the list is
marked complete it renders the whole objective as complete." Steward chose
(AskUserQuestion) to fix **all three stages**, not just Observe.

## Root cause

Two parallel progress systems read different sources:

- **Panel** (`GuidanceCard` via `*ChecklistAside`) → `progressFromChecks(checked,
  how.length)` over the per-stage **How-checks** store → real ticks → 1/3 ✓.
- **Toast** (`*ObjectiveCompletePrompt`) → the single-objective hooks
  `use*ObjectiveProgress` → `objectiveProgress` over the **seed-backed compass**
  store. `isVerified = raw[i]==='verified' || checked.includes(i)`; the Observe
  `human-context` SEED is `{0:'verified',1:'verified',2:'evidence-in'}`, so the
  one real tick on node 2 + the two seed-verified nodes = 3/3 = 100% → false toast.

The discrepancy was **purely** the mock SEED pre-verification being counted as
real completion — not a node-count mismatch (`nodes.length === how.length`
because compass nodes are `how.map(...)`).

## The change (3 files, −12 net lines)

Each hook dropped the `evidence`/`seedFor` read + `objectiveProgress(...)` and
now returns `progressFromChecks(checks ?? EMPTY_CHECKS, obj.nodes.length)` over
the stage's How-checks store, with `evidence` removed from the `useMemo` deps:

- `apps/web/src/v3/compass/useCompassData.ts` — `useObjectiveProgress` (Observe)
- `apps/web/src/v3/plan/compass/usePlanCompassData.ts` — `usePlanObjectiveProgress`
- `apps/web/src/v3/act/compass/useActCompassData.ts` — `useActObjectiveProgress`

The compass-store imports stay (the plural `use*CompassData` **wheel** hook still
uses SEED for its prototype display). Toast components unchanged — their
`pct === 100` gate is correct once fed the right numbers.

## Verification (in-browser, dev server :5200)

- **Observe** (`human-context`): 1/3 → "33% · IN PROGRESS", **no toast**
  (screenshot); 3/3 → "COMPLETE" + toast (screenshot); untick one → "67% · IN
  PROGRESS", toast gone.
- **Plan** (`livestock`): 2/4 → no toast; 4/4 → "COMPLETE" + toast.
- **Act** (`tracker`, the exact seed-gap analog — SEED verifies nodes 0+1):
  drove `actHowChecksStore` via localStorage. Only node 2 checked → **no toast**
  (pre-fix this fired the false toast); 3/3 → toast (screenshot). Test
  localStorage cleaned up afterward.
- `objectiveStatus.test.ts` 10/10 pass. `tsc` clean for the 3 changed files — the
  only `tsc` errors are the **known 3-error pre-existing baseline** (foreign WIP:
  `StepBoundary.tsx`, two `HostUnion*` plan/layers tests; documented in
  [[2026-05-25-compass-progress-fill-outside-in]]). `tsc` also OOMs at default
  heap — re-ran with `--max-old-space-size=8192`.

## Discipline notes

Staged by **explicit path** (the 3 hook files only) per
[[feedback-commit-immediately-on-rebased-branches]]; all foreign WIP
(`EconomicsPanel*`, `CapitalPartnerSummary*`/`capitalPartner*`, `MapCanvas`,
the `*Map.tsx` trio, `ZoneSomSidebar*`, `MapCoordinateReadout*`, `launch.json`,
`.superpowers/`, etc.) left untouched per [[feedback-no-deletion]]. `git fetch` +
divergence check (1 ahead / 0 behind) before push.
