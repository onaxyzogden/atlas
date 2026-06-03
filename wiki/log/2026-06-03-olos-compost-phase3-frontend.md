# 2026-06-03 -- Thermophilic compost vertical: Phase 3 (frontend Plan/Act/Observe)

**Branch:** `feat/atlas-permaculture`
**Commit:** `c7ec380f` -- `/compost` route family + zustand store + three
pixel-matched prototype screens (8 files, 1501 insertions; **commit-only, not
pushed**). Third of four phases of the compost vertical. See ADR
[[decisions/2026-06-03-olos-thermophilic-compost-vertical]].

## Context

P1 (`bf9e7853`) laid the data foundation and P2 (`e26d6550`) shipped the
org-scoped Site/Pile/Reading API. P3 converts the `compost_olos.jsx` prototype
into the live `/compost` frontend: a distinct lightweight vertical that reuses
the OLOS Plan/Act/Observe language + auth/AppShell plumbing but renders bespoke
compost screens, NOT the 14-type land-use project shell.

Amanah gate: hifz al-bi'a; no riba/gharar. Clean.

## What shipped (8 files, all under `apps/web/src/compost/` except the route)

**Create**
- `model.ts` -- shared palette `C`, fonts `F`, types, textbook seed data
  (`PLAN_RECIPE`, `READINGS` r0-r34, `ACT_TASKS`, `PHASE_COMPARISON`), helpers
  (`getPhase`, `getPhaseMeta`, `daysAbovePasteurisation`, `fToC`, `fToCStr`).
  Storage in degrees F; UI in degrees C.
- `useCompostStore.ts` -- `zustand`+`persist` slice `ogden-compost-pile`
  (`version: 1`, no temporal/migrate -- additive covenant shape). `readings`
  seeded from `READINGS`; `logReading(tempC, note)` rounds C->F and appends.
- `CompostWorkspace.module.css` -- ports ONLY the prototype's global reset,
  scoped to `.workspace` so the aggressive reset never leaks app-wide. Height
  `calc(100vh - 48px)` (AppShell header is 48px).
- `CompostWorkspacePage.tsx` -- the `/compost` component: ported `TopBar` +
  `StagePills`, internal `Stage` state switching Plan/Act/Observe.
- `PlanStage.tsx` -- prototype lines 275-529: 228px nav (objectives/recipe/
  checklist + Pile Vitals + progress), centre objectives/recipe(C:N bar)/
  checklist, right objective detail w/ completion gate + Observe feeds. Static
  `PLAN_RECIPE`.
- `ActStage.tsx` -- prototype lines 531-824: Current State card, task list /
  log toggle, task detail w/ proof bar + checklist, OR the "Log a Reading" form
  (degrees C input + field note -> `logReading`), and the full temperature-log
  grid. Reads `readings` + `logReading` from the store (replacing the
  prototype's local `useState`).
- `ObserveStage.tsx` -- prototype lines 826-1172: 5-col KPI row, Unified
  domain cards + pathogen-kill banner, `TempCurve` SVG (phase bands, grid,
  turning markers, curve path, axes -- positions in degrees F, labels degrees
  C), and `PhaseComparison` temporal view. Reads `readings` from the store
  (replacing the `READINGS` constant); `<TempCurve readings={allReadings} .../>`.

**Modify**
- `apps/web/src/routes/index.tsx` -- `import CompostWorkspacePage`, define
  `compostRoute` under `appShellRoute` (path `/compost`, auth-gated, org-scoped
  -- NOT under `v3ProjectLayoutRoute`), and add it to the routeTree. Diff is
  exactly these three additions; no foreign WIP swept in.

## Verification

- **Typecheck:** web `tsc --noEmit -p tsconfig.json` (with
  `--max-old-space-size=8192` so the run completes rather than SIGABRT) -- EXIT
  0, zero errors across the whole web app. Caught + fixed two
  `noUncheckedIndexedAccess` violations in `ObserveStage.tsx` (the isolated
  subagent run had crashed before reaching them): `readings[readings.length-1]
  ?.day ?? 1` and changing `readings[i].turned` to `r.turned` in a filter.
- **Live gate (screenshot-verified on `/compost`, web dev server port 5200):**
  - Plan: TopBar + pills + Pile Vitals (4x4x3 ft, 48 cu ft, 30:1, 55-71.1 C) +
    objective detail w/ completion gate render.
  - Act: Current State + task detail + full log grid (35 readings, 6 turnings,
    11 days above 55 C). Switched to Log view, entered **64 C** -> store wrote
    **147 F** (correct C->F), count 35->36, note preserved, log header
    recomputed to "36 readings . 6 turnings . **12** days above 55 C".
  - Observe: the SAME store reading propagated -> Current Temp **63.9 C**, Days
    Pasteurising **12**, **Pathogen Kill Status: CONFIRMED** ("12 days >= 55 C;
    USDA min 3 consecutive; E. coli + Salmonella kill confirmed"). Temperature
    Curve SVG renders phase bands + turning markers + the curve, with a visible
    uptick at day 35 = the logged reading. End-to-end Act -> store -> Observe
    flow proven.

## Commit shape

Explicit-path commit (`git add` only `apps/web/src/compost/` + the one route
file), verified staged == 8 intended files before `git commit`. The large
pre-existing dirty tree (financial, v3 strata, wiki, scratch files) and all
`??` paths were NOT staged -- never `git add -A`
([[feedback-commit-immediately-on-rebased-branches]]). Commit-only, not pushed
(branch is rebased out-of-band [[project-branch-rebase]] -- a push needs a
fetch + divergence check the user has not requested).

## State after

The compost vertical is **usable end-to-end for manual operation**: a steward
can plan a pile, log temperature readings by hand in Act, and see the curve,
phase detection, and pathogen-kill proof in Observe. Phase 4 (remote sensor
ingestion -- `compost_devices`, hashed device tokens, isolated ingest endpoint,
Observe source/freshness badge) remains the only deferred phase.
