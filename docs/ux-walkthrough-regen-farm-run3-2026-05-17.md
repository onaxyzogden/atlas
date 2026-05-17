# OLOS / Atlas — Regen-Farm UX Walkthrough (Run 3 — Fix & Verify)

**Date:** 2026-05-17
**Build:** branch `feat/atlas-permaculture`, web app served at `http://localhost:5200/`
**Environment:** **Frontend-only, offline.** No Docker → no Postgres/Redis/Fastify API.
Persistence is browser `localStorage` only.
**Driver:** `preview_*` MCP tools (project mandate). The Mapbox/WebGL canvas cannot be
driven and `preview_screenshot` hangs on it (documented blocker, carried from Run 2) —
so map-origin state was injected into the persist stores via `preview_eval` and is
**explicitly labelled "(simulated)"** wherever it appears. DOM text/structure was read
directly; no screenshot claims are made.
**Project used:** existing `ec5ed028-0320-4480-9543-2ff10308834e`.

> Unlike Runs 1 & 2 this is **not** an independent discovery run. Its purpose, per the
> approved directive, was to **fix the still-open documented defects from Runs 1–2
> first**, then confirm the fixes hold on the running build. Runs 1 & 2
> (`docs/ux-walkthrough-regen-farm.md`, `…-run2-2026-05-16.md`) are left **byte-for-byte
> unmodified**.

---

## Severity Legend

| Tag | Meaning |
|---|---|
| **FIXED** | Was open in Run 1/2; corrected this session; tsc-clean + test/logic/DOM-verified |
| **MAJOR** | Feature visibly broken / a designed object stranded |
| **MINOR** | Friction, confusing copy, cosmetic |
| **CAVEAT** | A limitation of the automated harness, not a confirmed product defect |
| **DEFERRED** | Real, acknowledged, intentionally out of this session's contained scope |

---

## Headline

The dominant Run-2 failure mode — **silent Plan→Act linkage gaps** plus a couple of
contained UX defects — has been closed. Six findings were fixed and verified on the live
build. One large finding (#58/#59 closed-loop model unification) remains **DEFERRED** by
design: it needs a data-model change and Scholar review, not an inline patch. One new,
smaller limitation was surfaced while fixing #67/#72 and is recorded as a
recommendation rather than silently shipped.

---

## Fixes applied & verified this session

| # | Sev (Run 2) | Finding | Fix | Verification |
|---|---|---|---|---|
| #61 | MAJOR | Structures / Built-Env Plan module rendered blank though `ogden-built-environment-v2` persisted | Created `StructuresOverviewCard` + `SubsystemsOverviewCard` (read-only grouped inventory + empty states) and wired the two `plan-structures-overview` / `plan-subsystems-overview` switch cases in `PlanModuleSlideUp` (was `default: return null`) | tsc EXIT:0; DOM-confirmed module renders inventory |
| #66 | MAJOR | MAINTAIN event-log FEATURE picker blind to Scholar `waterNodes` (only legacy `earthworks`/`storageInfra`) | `MaintenanceLogCard` now also sources `useWaterSystemsStore().waterNodes`, deriving earthwork (swale/catchment/sink) and storage nodes; `sourceLabel` + `sourceOptions` extended | tsc EXIT:0; DOM-confirmed simulated swale selectable |
| #67/#72 | MAJOR | HARVEST + Irrigation pickers couldn't see designed guilds/orchards (`ogden-polyculture` / `…design-elements`) | `HarvestLogCard` unified `harvestAreas` across crops + guilds + orchards; `IrrigationManagerCard` surfaces designed plant systems read-only | tsc EXIT:0; HARVEST picker DOM-confirmed listing `Guild ·` and `Orchard ·` entries (incl. simulated) |
| #75 | MAJOR | No forward Act→Report affordance; Report had no stage-nav chrome | Added `report` as the 4th `LEVELS` entry + regex/stage-union/`handleLevelChange` in `V3LevelNavBridge` | tsc EXIT:0; Act stage DOM shows forward **REPORT** nav; Report page carries lifecycle chrome |
| #71 | MINOR | LIVESTOCK Move-log SPECIES silently defaulted to `sheep` for a poultry paddock | Root cause: drop-/auto-placed paddocks carry `species: []`, so the existing `p.species[0]` prefill fell through to the hardcoded `'sheep'`. `LivestockMoveTool` now falls back to the species of the **most recent move-in to that paddock** (the move log is the real grazing record) before defaulting | tsc EXIT:0; logic simulation: empty-species paddock + prior poultry move-in → `poultry`; explicit-species paddock still drives from `paddock.species[0]` |
| #62 | MINOR | Local-only persistence banner honest but too soft for a naive user | Strengthened both warn messages in `ProjectBundleBar` to name the concrete loss vectors (clear browser data / switch browser / device failure → permanent deletion) and the Export remedy; updated `ProjectBundleBar.test.tsx` assertions | tsc EXIT:0; vitest 3/3 pass; DOM-confirmed new copy live, old weak copy gone |

### Per-feature-class status (Run-2 open items)

| Class | Run-2 | Run-3 |
|---|---|---|
| Built-Environment Plan module | MAJOR (blank) | **FIXED** |
| MAINTAIN feature picker | MAJOR (blind to waterNodes) | **FIXED** |
| Plant systems → HARVEST | MAJOR (stranded) | **FIXED** |
| Act → Report navigation | MAJOR (undiscoverable) | **FIXED** |
| Move-log species prefill | MINOR | **FIXED** |
| Local-only persistence copy | MINOR | **FIXED** |
| Closed-loop From/To unification (#58/#59) | CRITICAL | **DEFERRED** (see below) |
| 0-ha boundary area → dishonest Report (#77/#78) | MAJOR | Confirmed CLOSED by PR #29 (triage) |

---

## Deferred / new recommendations

- **#58/#59 closed-loop model unification — DEFERRED (document-only).** Canvas
  Flow-connectors and Waste-vectors remain disjoint, and From/To pickers only enumerate
  zones + composter. Unifying these is a model change with fiqh-adjacent framing
  implications (waste→resource accounting) and warrants design + Scholar Council review;
  it is **not** a safe inline patch and was intentionally left out of this session's
  contained scope.
- **Irrigation guild/orchard tracking is read-only (new, MINOR).** The #67/#72 fix makes
  HARVEST fully cross-store (id-only storage). `IrrigationManagerCard` now *surfaces*
  designed guilds/orchards but the active→passive irrigation transition still records
  only onto `CropArea`. Mutable cross-store irrigation state was out of contained scope.
  Recommendation: either let a guild/orchard be promoted to a tracked crop area, or add
  an irrigation-mode field to plant-system records.
- **Paddock species capture at draw time.** #71 is mitigated (history-based fallback) but
  the deeper cause is that drop-/auto-placed paddocks persist `species: []`. A small
  follow-up: have the palette/auto-designer carry a primary species so the very first
  move-log on a never-rotated paddock prefills correctly too.

---

## Validation method & honesty caveats

- **CAVEAT — canvas-origin geometry.** No paddock/guild/swale could be *drawn*; the
  WebGL canvas is undrivable and screenshots hang. State was injected into the persist
  stores and is labelled "(simulated)" everywhere. The injected project already carried
  prior-session simulated objects; counts in this run are cumulative, not freshly seeded.
- The auto-task generation / scheduling / phasing scenario (Goal Compass "Generate site
  design" → BuildPhases + dated PhaseTasks) was **not** re-exercised end-to-end this run;
  the session's approved scope was fix-first + linkage confirmation. It remains a
  candidate for a future independent discovery run on the now-fixed build.
- Every fix was gated on `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
  (EXIT:0) plus a targeted test or in-page logic check plus a DOM read of the affected
  surface before being marked done. No screenshot success was claimed.

---

## Net

Six Run-1/2 findings closed and verified; one large finding consciously deferred with
rationale; two smaller follow-ups recorded honestly rather than hidden. The Plan→Act
linkage trust gap that defined Run 2 is materially reduced.
