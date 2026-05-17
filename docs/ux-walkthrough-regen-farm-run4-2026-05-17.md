# OLOS / Atlas — Regen-Farm UX Walkthrough (Run 4 — Auto-Design Pipeline Discovery)

**Date:** 2026-05-17
**Build:** branch `feat/atlas-permaculture`, fixed build (post commit `ca4c0a32`),
web app served at `http://localhost:5200/`
**Environment:** **Frontend-only, offline.** No Docker → no Postgres/Redis/Fastify
API. Persistence is browser `localStorage` only.
**Driver:** `preview_*` MCP tools (project mandate). The Mapbox/WebGL canvas
cannot be driven and long poll-loop `preview_eval`s time out while it renders
(documented blocker, carried from Runs 2–3) — so prerequisite state was injected
into the persist stores via store writes and is **explicitly labelled
"(simulated)"** wherever it appears. DOM text/structure was read directly; no
screenshot claims are made.
**Project used:** a **fresh** project `a4d04c74-198f-4f82-81ac-34afe49e9b6e`
("Run-4 Regen Farm (simulated)") — *not* the contaminated `ec5ed028`, per the
approved Run-4 directive.

> This is a **discovery-only** run. Its purpose, per the approved directive, was
> to exercise the headline Goal-Compass auto-design → BuildPhases/PhaseTasks →
> scheduling pipeline end-to-end on the fixed build and **document gaps with
> severity + `file:line` + recommendations — no code changes** (fixes are a
> separate follow-up session). Runs 1–3
> (`docs/ux-walkthrough-regen-farm.md`, `…-run2-2026-05-16.md`,
> `…-run3-2026-05-17.md`) are left **byte-for-byte unmodified**.

---

## Severity Legend

| Tag | Meaning |
|---|---|
| **WORKS** | Pipeline stage produced the expected output, DOM/localStorage-verified |
| **MAJOR** | Stage output present but functionally unusable, or a designed object stranded |
| **MINOR** | Friction, latent robustness gap, confusing behaviour |
| **CAVEAT** | A limitation of the automated harness / fixture authoring, not a confirmed product defect |

---

## Headline

The auto-design pipeline **fires end-to-end and is mostly sound**: a single
"Generate site design" click on the injected fresh fixture produced 8
goal-compass BuildPhases, 38 fully-dated PhaseTasks, season-windowed across
2026–2031, with the barren-zone regeneration obligation correctly adopted into a
single synthetic regen phase (no duplicate). Calendar surfacing works — a
`phaseTask` entry is DOM-confirmed on its concrete date.

**One MAJOR defect found:** every recurring maintenance task is scheduled in
**2124** (~98 years out), making the entire maintenance-recurrence output
invisible on any realistic calendar/agenda. Root cause is a single line in
`scheduleTasksToCalendar.ts`. One MINOR latent robustness gap (silent
goal-tree-template fallback) was surfaced while authoring the fixture.

---

## Pipeline outputs — per-stage verdict

| # | Pipeline output | Verdict | Evidence |
|---|---|---|---|
| B | `generate()` completes; draft chips render | **WORKS** | No thrown errors / console errors; DraftReviewBar chips: 43 features / 16 paddocks / 1 fence / 38 tasks |
| C1 | BuildPhases + ISO-dated PhaseTasks | **WORKS** | 12 phases (8 `generatedFromGoalCompass: true`); 38/38 tasks carry `scheduledStart`/`scheduledEnd` ISO dates; design phases season-windowed 2026→2031 |
| C2 | Calendar `phaseTask` entries on concrete dates | **WORKS** | Act → Operations Schedule → Event calendar, Sep 2026: aria-label `September 1st, 2026 — 1 entries`; detail panel "Keyline ripping / subsoiling — zone zone-barren-1779039531892 · Land regeneration (mandatory) · 8h · 9:00 AM" |
| C3 | Maintenance recurrence | **MAJOR** | `maint-phase-<pid>` exists with 17 recurring tasks (`recurrenceFrequency` annual/quarterly/monthly/biennial) — **but all 17 `scheduledStart` land in 2124** (2124-03-01 … 2124-12-01). Unusable horizon. |
| C4 | Regeneration-zone adoption | **WORKS** | Single `regen-phase-<pid>` (`order: 1`), 5 tasks **all** on `zone-barren-1779039531892`; no duplicate plan-authored regen phase; barren obligation adopted via the acknowledged-zone seam |

---

## Findings

### F-1 — MAJOR — Maintenance recurrence scheduled ~98 years out (2124)

All 17 synthetic maintenance tasks (`maint-phase-<pid>`, "Ongoing maintenance
(recurring)") receive `scheduledStart`/`scheduledEnd` in **2124**, e.g.
`maint-task-iv-keyline-access-track` → `2124-09-01`. The phase and its recurring
tasks are structurally correct (`isMaintenanceTask: true`,
`recurrenceFrequency: 'annual'`, materials/equipment/labor populated) but no
operator will ever see a task dated 98 years in the future on the Act calendar
or agenda — the maintenance-recurrence pipeline output is effectively dead.

**Root cause (single line):**
`apps/web/src/v3/plan/engine/goalCompass/scheduleTasksToCalendar.ts:102`

```
const year = startYear + (order - 1);
```

The synthetic maintenance phase is assigned a **sentinel `order: 99`** (so it
sorts last in the phasing matrix). `scheduleTasksToCalendar` blindly maps
`phase.order` to a calendar-year offset: `startYear (2026) + (99 - 1) = 2124`.
The design phases (`order` 1–6) schedule correctly (2026→2031); only the
sentinel-ordered maintenance phase is thrown to the far horizon. The regen phase
escapes because it carries `order: 1`.

**Recommendation (follow-up session, not this one):** special-case the
maintenance phase in `scheduleTasksToCalendar` — anchor recurring upkeep to
`startYear` (or `startYear + designHorizon`) and project occurrences forward by
`recurrenceFrequency`, rather than treating the sentinel `order` as a
year-offset. Alternatively, clamp the `order → year` mapping (e.g. cap at the
max real design-phase order) before computing the season window.

### F-2 — MINOR — Silent goal-tree-template fallback to HOMESTEAD

While authoring the fixture, passing `projectType: 'regenerative-farm'` (the
hyphenated `ProjectArchetype` form) instead of `regenerative_farm` (the
underscored `PlanProjectTypeKey` that keys `GOAL_TREE_TEMPLATES`) caused
`goalTreeStore.ensureDefault` → `getGoalTreeTemplate` to **silently fall back to
the HOMESTEAD tree** with no warning. The real wizard
(`features/project/wizard/StepBasicInfo.tsx:20-21`) stores underscore values, so
this is **not a product bug** in the normal flow (CAVEAT: it was a
fixture-authoring error, corrected via `switchTemplate('regenerative_farm')`,
after which the archetype resolved correctly to `regenerative-farm`).

It is, however, a **latent robustness gap**: any unknown/mis-cased
`projectType` yields a plausible-but-wrong homestead goal tree with no
diagnostic. **Recommendation:** have `getGoalTreeTemplate`
(`apps/web/src/v3/plan/data/goalTreeTemplates.ts`) `console.warn` (dev-only) on
unrecognised keys, or normalise hyphen↔underscore before lookup (the
divergence-aware `archetypeToTemplateKey()` in `GoalTreeTab.tsx` already exists —
reuse it on the write path).

### F-3 — MINOR — `scheduleTasksToCalendar` buckets by bare `phase.order`

`scheduleTasksToCalendar.ts:92` keys distribution buckets by
`` `${phase.order}|${season}` ``. After Generate, the project carries 4 empty
plan-authored placeholder phases ("Phase 1–4", `order` 1–4, 0 tasks) **and**
goal-compass phases that reuse `order` values 1–6. Tasks from *different* phases
sharing the same `(order, season)` are interleaved into one even-distribution
window. Harmless in this run (placeholders have 0 tasks; same-order GC phases
intentionally share a year), but if a placeholder phase ever carried tasks it
would silently co-bucket with an unrelated GC phase. **Recommendation:** bucket
by `phaseId` (or `(phaseId, season)`) and derive the year from the phase's real
timeframe, not a shared ordinal.

---

## Reproducible fixture (exact, as injected — labelled "(simulated)")

Fresh project `a4d04c74-198f-4f82-81ac-34afe49e9b6e`, then four prerequisite
stores seeded:

**`ogden-projects`** — `createProject` then corrected:
```
{ name: "Run-4 Regen Farm (simulated)",
  projectType: "regenerative_farm",   // underscore PlanProjectTypeKey — see F-2
  startDate: "2026-06-01",
  parcelBoundaryGeojson: <simulated FeatureCollection, present> }
```

**`ogden-goal-trees`** — `switchTemplate(pid, 'regenerative_farm')` →
archetype `regenerative-farm`, parentGoal "Profitable regenerative farm",
4 subGoals: Cash crop yield / Soil health / Water cycle / Livestock enterprise.

**`ogden-site-profiles`** — `profilesByProject[pid]` facets:
```
{ acres: 120, climateZone: "6b", primaryLandform: "rolling",
  avgSlopePct: 6, currentLandCover: "degraded-pasture",
  soilCompaction: "high", waterPosture: "rainfed", hazards: [],
  household: { adults: 2, children: 2 },
  lastFrostDate: "2026-05-05", firstFrostDate: "2026-10-10" }
```

**`ogden-zones`** — 2 `LandZone`:
```
zone-barren-1779039531892  "West Pasture (barren, simulated)"
  category=livestock  groundCover=barren  successionStage=disturbed
  areaM2=202343  permacultureZone=4  suitableForLivestock=true
zone-food-1779039531892    "East Field (food production, simulated)"
  category=food_production  groundCover=bare-soil  successionStage=pioneer
  areaM2=202343  permacultureZone=2  suitableForLivestock=false
```

**`ogden-regen-plans`** — 1 `RegenerationPlan`:
```
{ id: "regen-fdf249e4-0f7f-432b-8d36-6d1441e06e6b",
  zoneId: "zone-barren-1779039531892",
  baseline: { groundCover: "barren", successionStage: "disturbed",
              source: "derived", capturedAt: "2026-05-17T17:38:51.891Z" },
  stewardReadinessConfirmedAt: "2026-05-17T17:38:51.891Z" }
```

Phase A gate met: GenerateSiteDesignBar showed no missing-prerequisite warning;
the "Generate site design" affordance was enabled.

---

## Validation method & honesty caveats

- **CAVEAT — canvas-origin geometry.** No zone/paddock/swale could be *drawn*;
  the WebGL canvas is undrivable and long poll-loop evals time out while it
  renders. All prerequisite objects were injected into the persist stores and
  are labelled "(simulated)". The Generate pipeline itself ran natively from
  that state — its outputs (phases/tasks/calendar) are genuine engine results,
  not injected.
- **No screenshots claimed.** All pipeline outputs were verified via
  `localStorage` reads and DOM text/aria-label reads (`preview_eval` /
  `preview_snapshot`).
- **Discovery-only.** No source files were edited. `file:line` pointers in
  F-1/F-2/F-3 are diagnostic for a future fix session, not applied here.
- The Run-3 fixed linkages (#61/#66/#67/#72/#75/#71) were not re-exercised here;
  Run-3 already verified them. This run targeted only the auto-design pipeline.

---

## Net

The headline Goal-Compass → auto-design → phasing/scheduling pipeline works
end-to-end on the fixed build: 4 of 5 verified outputs are clean (Generate,
dated phases/tasks, calendar surfacing, regen-zone adoption). One MAJOR
single-line scheduling defect (F-1: maintenance recurrence dumped to 2124) makes
the maintenance-recurrence output unusable until fixed, and two MINOR latent
robustness gaps (F-2 silent template fallback, F-3 order-keyed bucketing) are
recorded for the follow-up fix session. No code changed; Runs 1–3 untouched.
