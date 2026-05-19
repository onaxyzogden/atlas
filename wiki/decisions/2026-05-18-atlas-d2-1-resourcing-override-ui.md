# 2026-05-18 — D2.1: per-WorkItem manual resourcing-override editor

**Status:** Implemented & verified (TDD unit suite / typecheck / live DOM
on preview `web-a1`); **committed** on `feat/atlas-permaculture`
(`d2853b2f` editor + tests, `f63187ba` code-quality fixes, `dfd8a5f6`
dev seed seam). Dated 2026-05-18 to sit with the D2 ADR it closes;
authored and verified 2026-05-19.

**Context source:** Approved Session Execution Plan (the
"all-stage-should-be-toasty-puzzle" plan). Closes the single deferred
item of D2 ([[2026-05-18-atlas-d2-resourcing]]): the **live** exercise of
the Goal-Compass regenerate-preserves-manual-edit contract. Exploration
found the blocker — D2 shipped `replaceGoalCompassResources` (the
preservation gate) and the read-only `ResourcingCard`, but **no UI to
manually override a WorkItem's `equipmentRequired`/`materials` and mark it
`overridden`**. A faithful live run therefore required first building
that missing edit surface. This is that slice (D2.1).

## Decision

User-confirmed binding decisions (via the planning dialog):

1. **Build the missing edit UI first**, then verify through real clicks —
   rather than asserting the contract only by construction/unit tests.
2. **Mount the editor inline in `PlanExecutionTrackerCard`'s `TaskItem`**
   (the only place individual WorkItems are listed with row actions),
   mirroring the existing `DependencyEditor` pattern exactly — a toggle
   button sibling of "Deps"/"Mark done" + a collapsible inline editor.
3. **Edit manual fields only.** The draft is seeded from
   `equipmentRequired`/`materials`; the engine-owned `*Auto` fields are
   never shown as editable. Save writes
   `updateItem(id, { overridden:true, equipmentRequired, materials })`.
4. **Seed the generated-plan fixture programmatically** via a dev-only
   `window.__ogden*` console seam, mirroring `seedFertilitySample` —
   not a production behaviour change.

## Scope delivered

- **Editor** `apps/web/src/features/act/PlanExecutionTrackerCard.tsx` —
  `openResourcingEditor: string | null` state beside `openDepEditor`; a
  **"Resourcing"** toggle in the `TaskItem` action row with
  `aria-expanded` and a `(${equip+mat})` count suffix when non-zero; new
  co-located `ResourcingEditor({ w })` structured like `DependencyEditor`.
  Equipment: add (trim + dedup) / remove chips. Materials: rows of
  `label` / `unit` / `quantityPerAcre?` / `notes?` keyed by a stable
  `crypto.randomUUID()` `_rk` (not array index — avoids focus/value
  misbinding on mid-list delete); blank-label rows dropped on save. Save
  → `useWorkItemStore.getState().updateItem(w.id, { overridden:true,
  equipmentRequired, materials })` then close; Cancel → close, no write.
  Root is `role="group" aria-label="Resourcing"`. Reuses existing
  `stageCard.module.css` classes + the `DependencyEditor` inline-box
  style; no new CSS.
- **Tests** `apps/web/src/features/act/__tests__/PlanExecutionTrackerCard.resourcing.test.tsx`
  (new, TDD, 4 cases): toggle renders + opens (`aria-expanded` flips);
  add equipment + material + Save ⇒ store row `overridden===true`, manual
  fields set, **`*Auto` untouched (`[]`)**; editor pre-populates from
  manual fields and the `*Auto` fields are not shown editable; Cancel
  makes no store write (`updatedAt` unchanged). 4/4 green;
  `ResourcingCard` + `PlanExecutionTrackerCard` suites 7/7.
- **Dev seam** `apps/web/src/dev/seedGoalCompassPlan.ts` (new) —
  `seedGoalCompassPlan(projectId?)` exposed as
  `window.__ogdenSeedGoalCompassPlan`. Idempotent (refuses a project that
  already has `goal-compass` WorkItems). Ensures a Goal Tree
  (`goalTreeStore.ensureDefault`) and Site Profile
  (`siteProfileStore.ensureDefault` + ~25 acres + valid facets via the
  real `setFacet`), then reproduces `GeneratedPlanTab.handleGenerate`
  argument-for-argument (`runSequencingEngine` →
  `scheduleTasksToCalendar` → `phaseStore.replaceGoalCompassRows` →
  `pushGoalCompassToSpine`) so the seeded plan is byte-identical to a UI
  generation. Registered in `apps/web/src/main.tsx`. No engine/store
  logic change, no cost/price semantics.

## Live verification (run6, 2026-05-19)

Preview `web-a1` (:5240), builtin "351 House"
(`31b47ae7-9afd-4db6-ab23-bac099549713`); 19 goal-compass WorkItems
seeded. Target `gc-task-keyline-access-track`. Override entered through
the real editor UI (equipment `STEWARD-OVERRIDE-EXCAVATOR`, material
`{label:"STEWARD-COMPOST",unit:"m³",quantityPerAcre:9}`).

- **Post-override:** `overridden:true`; manual fields set; `*Auto`
  unchanged. Act → Resourcing BOM showed `STEWARD-COMPOST … manual`;
  equipment booking listed `STEWARD-OVERRIDE-EXCAVATOR — 1 item`.
- **Regenerated** via Plan → Goal Compass → Proposal → "Generate
  proposal" (the real path).
- **Post-regenerate (PASS):** manual `equipmentRequired`/`materials`
  byte-identical; `overridden` still `true`; `source` still
  `goal-compass`; `updatedAt` **unchanged** (gate short-circuited the
  overridden row — zero churn); the 18 non-overridden goal-compass rows
  re-seeded their `*Auto`, proving the resource sync ran spine-wide while
  skipping the one overridden row. Console clean (zero errors; only the
  known unrelated act-telemetry / machinery 500s — no backend in
  preview).

Full before/after evidence recorded in
[[2026-05-18-atlas-d2-resourcing]] "Notes & deferred".

## Covenant & scope boundary

Operational resourcing only — manual override of crew-facing
equipment/materials, hours/quantities. **No cost** introduced anywhere
(D3 owns budget/cost; the editor surfaces no `costUSD`). No spine-status
auto-mutation. No DB migration (only additive UI state + a dev seam). No
riba/gharar/CSRA/salam/investor framing. Legacy components preserved; no
deletions.

## Notes & deferred

- Screenshot capture on the WebGL/MapLibre canvas hangs (documented
  gotcha); verification of record is `preview_eval` DOM/localStorage
  assertions + `preview_console_logs`, not images — disclosed, not faked.
- The branch carries D3 (budget/cost) commits landed out-of-band
  (`7ad993d0`/`09bfaab2`/`317b887d`/`1472b4ea`) below the D2.1 commits.
  The planned Part C was only a written D3 brainstorm seed (no code); D3
  having already shipped externally is noted, not reconciled here — its
  own ADR/spec exist on-branch.
