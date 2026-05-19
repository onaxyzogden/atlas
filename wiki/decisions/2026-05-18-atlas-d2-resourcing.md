# 2026-05-18 — D2: operational resourcing on the WorkItem spine

**Status:** Implemented & verified (typecheck / vitest / `vite build` / live
DOM); **committed & pushed** on `feat/atlas-permaculture` (commit
`63313677`, 2026-05-18) — rebased onto the remote tip during divergence
reconciliation (duplicate `21f30db5` syncManifest fix dropped in favour of
the already-merged remote `45a87345`; `ogden-crew-members` registration
preserved). Preservation contract re-confirmed green post-rebase by the
hard-gate unit suite. **Update 2026-05-19:** the previously-deferred live
regenerate-preservation run is now **VERIFIED LIVE (run6)** after building
the D2.1 manual-override editor
([[2026-05-18-atlas-d2-1-resourcing-override-ui]]) — see "Notes &
deferred".
**Context source:** Approved Session Execution Plan for Sub-project D2,
executing the ratified D0–D5 roadmap
([[2026-05-18-atlas-land-os-positioning-and-d-roadmap]]). Builds on the
D0/D0.1 single-writer spine ([[2026-05-18-atlas-d0-workitem-spine]],
[[2026-05-18-atlas-d0-1-coupled-cutovers]]) and mirrors the D1 provenance
seam ([[2026-05-18-atlas-d1-dependency-critical-path]]). The spine schema
already carried every resourcing field (`assigneeId`, `who`, `roleAccess`,
`laborHrs`, `materials: MaterialLine[]`, `requiredPersonnel`,
`equipmentRequired: string[]`) but nothing surfaced or operationalised
them — no crew model, no equipment linkage, no BOM view, no workload view,
no conflict detection. D2 is that slice.

## Decision

Four user-confirmed binding decisions:

1. **Net-new crew store.** A dedicated `crewMemberStore`
   (`ogden-crew-members`, projectId-tagged, no DB migration) over a new
   `@ogden/shared` `crewMember.schema.ts` (skill level + soft weekly-hours
   cap). **Not** `ProjectMemberRecord` (ACL identity) and **not**
   `NetworkContact` (external CRM) — those stay as-is; a crew member *may*
   carry an optional non-coupled `networkContactId`. Crew is fully
   steward-authored — **no Goal-Compass preservation contract** (Goal
   Compass never authors people).
2. **New Resourcing Act card** with its own manifest entry (`act-resourcing`
   under the `tracker` module) — not an extension of
   `PlanExecutionTrackerCard`. Blocks: crew CRUD, assignee workload,
   equipment booking, BOM rollup.
3. **Mirror D1 Approach B.** Provenance-separated `*Auto` arrays
   (`equipmentRequiredAuto`, `materialsAuto`) beside the manual fields;
   effective value = union; `replaceGoalCompassResources` mirrors
   `replaceGoalCompassDependencies` **1:1**; Goal Compass re-seeds
   equipment/materials while steward edits survive regeneration.
4. **Render-only conflict badges.** Equipment double-booked across
   overlapping scheduled spans + assignee labour-hours over a soft weekly
   cap. Computed at render only, **never** written to `WorkItem.status`.
   Hours only — no cost.

## Scope delivered

- **Crew schema** `packages/shared/src/schemas/crewMember.schema.ts`
  (new) — `CrewSkillLevel = enum(lead|skilled|general|apprentice)`;
  `CrewMemberSchema` `{ id, projectId, name (min 1), skillLevel,
  weeklyHoursCap (nonnegative), networkContactId?, notes?, createdAt,
  updatedAt }.passthrough()`. Exported from `@ogden/shared` `index.ts`.
- **Crew store** `apps/web/src/store/crewMemberStore.ts` (new) —
  Zustand+persist key `ogden-crew-members`, `partialize` to `members`,
  CRUD (`addMember`/`updateMember` bumps `updatedAt`/`deleteMember`) +
  `getProjectMembers(projectId)`; `newCrewMemberId`. Registered in
  `syncManifest.ts` as `blob('ogden-crew-members', …, 'projectId-tagged',
  1, tagged('members'))` (coverage-guard clean).
- **Schema** `packages/shared/src/schemas/workItem.schema.ts` — added
  `materialsAuto: z.array(MaterialLineSchema).default([])` and
  `equipmentRequiredAuto: z.array(z.string()).default([])` beside the
  manual fields; `MaterialLineSchema`/`MaterialLine` now exported.
  `.default([])` + existing `.passthrough()` ⇒ existing persisted rows
  hydrate clean, **no DB migration** (A-series covenant). Required on the
  inferred output type ⇒ all literal sites updated (5 migration mappers,
  `MaintenanceScheduleCard`, `RotationScheduleCard`, 3 test fixtures).
- **Store action** `apps/web/src/store/workItemStore.ts` —
  `replaceGoalCompassResources(projectId, resourcesByItemId)` mirrors the
  `replaceGoalCompassDependencies` preservation filter **1:1**: writes
  `equipmentRequiredAuto` / `materialsAuto` only on rows where
  `source === 'goal-compass' && !overridden`; never touches manual
  `equipmentRequired`/`materials`, overridden rows, or other
  sources/projects. Idempotent via element/line-equality short-circuit
  (same input → same state reference, no `updatedAt` churn).
- **Edge seeding** `v3/plan/engine/goalCompass/goalCompassSpineSync.ts`
  — pure `seedGoalCompassResources(items, catalog = INTERVENTION_CATALOG)`
  groups WorkItems by `generatedFromInterventionId`, merges
  `entry.materials` + `maintenanceSchedule.materialsPerOccurrence`
  (label+unit deduped) → `materialsAuto`, dedups
  `maintenanceSchedule.equipmentRequired` → `equipmentRequiredAuto`;
  skips no-intervention/unknown/no-resource items. Called immediately
  after `replaceGoalCompassDependencies` in `pushGoalCompassToSpine`.
- **Conflict engine** `packages/shared/src/lib/resourcingConflicts.ts`
  (new, no React/store) — `effectiveEquipment` (manual ∪ auto deduped),
  `rollUpBom` (`${label}__${unit}` key, sums `quantityPerAcre`, sorted),
  `equipmentConflicts` (per-equipment pairwise overlap, strict `start <
  end`, items missing either date skipped), `isoWeekKey`,
  `assigneeWeeklyLoad` (ISO-week buckets by `scheduledStart` fallback
  `scheduledEnd`; `hours > cap` ⇒ over-capacity; no-assignee/`laborHrs<=0`/
  no-date ignored), `analyzeResourcing` → `{ equipment, workload,
  byItemId }`. **Hours only — no cost.** Exported from `@ogden/shared`.
- **Surface** `apps/web/src/features/act/ResourcingCard.tsx` (new) +
  manifest entry `{ label:'Resourcing', sectionId:'act-resourcing' }` in
  `v3/act/types.ts` `MODULE_CARDS.tracker` + lazy import + `renderActCard`
  case in `ActModuleSlideUp.tsx`. One `useMemo` over project
  `WorkItem`s + `CrewMember`s → engine result. Four blocks: crew CRUD
  (name/skill/weekly-cap, list with over-capacity badge + remove),
  assignee workload (over-cap rows), equipment booking (per-equipment
  items + double-booked badge), BOM rollup (label/unit/qty-per-acre/source
  — **no cost column**). Subtitle states "Hours and quantities only —
  budget lives in Budget vs actuals" (points to D3, does not surface it).

## Covenant & scope boundary

Strictly operational resourcing: crew, assignment, equipment booking,
BOM, hours/capacity conflicts. **Explicitly out:** D3 budget/cost (no
`costUSD` aggregation, no cost column anywhere, `BudgetActualsCard`
untouched), D4 field proof, D5 dashboards/recommendations. No
riba/gharar/CSRA/salam/investor/financing framing. No spine-status
auto-mutation (conflicts derived at render only). No DB migration.

## Verification

- `pnpm --filter @ogden/shared typecheck` + `--filter web typecheck`
  exit 0, **fully clean** (the 2 disclosed pre-existing
  `useFlowEndpointOptions` Paddock errors did not surface this run).
- Vitest: `@ogden/shared` **237/237 (16 files)** incl.
  `resourcingConflicts.test.ts` 10 (overlap vs non-overlap, missing-date
  skip, weekly bucket under/at/over, unassigned/no-hours ignored,
  no-cost invariant); web **1198/1198 (107 files)** incl.
  `crewMemberStore.test.ts` 2, `workItemStore.resources.test.ts` 3
  (preservation+idempotence hard gate), `seedGoalCompassResources.test.ts`
  3. **Zero failures** — the previously-disclosed `syncManifest`
  coverage-guard debt did **not** recur (the new
  `ogden-crew-members` store is correctly registered).
- `vite build` exit 0 (`✓ built in 53.25s`, PWA 720 precache entries).
  First attempt OOM'd on the default Node heap (environment, not code —
  `tsc` had already passed); succeeded with
  `NODE_OPTIONS=--max-old-space-size=8192`.
- Live (preview, server `web` :5200, project `mtc`): required a dev-server
  restart — the long-running dev server had cached a stale 1-card
  `types.ts`; after restart the Tracker module serves both `Plan tracker`
  and `Resourcing` tabs. Card mounts via lazy chunk with **zero console
  errors**; all four blocks render with correct empty states (unseeded
  `mtc`); covenant-clean (only the budget→D3 disclaimer, no cost column);
  crew CRUD verified end-to-end (add → list row "skilled · cap 30h/wk · 0
  assigned" → remove → empty state; test row cleaned up). MapLibre/WebGL
  screenshot hang **disclosed not faked** — DOM/accessibility tree +
  console + the test matrix are the verification of record. Only
  pre-existing unrelated warnings present (AI-enrichment / act-telemetry
  500s — no backend in preview; no D2 file in any stack trace).

## Notes & deferred

- Live exercise of the Goal-Compass regenerate-preserves-manual-edit flow
  is **VERIFIED LIVE (run6, 2026-05-19)** — superseding the prior deferral.
  The missing manual-override edit surface was built first as **D2.1**
  ([[2026-05-18-atlas-d2-1-resourcing-override-ui]]; per-WorkItem inline
  `ResourcingEditor` in `PlanExecutionTrackerCard`); the generated-plan
  fixture was seeded programmatically via the new dev seam
  `apps/web/src/dev/seedGoalCompassPlan.ts`
  (`window.__ogdenSeedGoalCompassPlan`). Run executed on preview `web-a1`
  (:5240), builtin "351 House" project
  (`31b47ae7-9afd-4db6-ab23-bac099549713`): 19 goal-compass WorkItems
  seeded. Target item `gc-task-keyline-access-track`:
  - **Before:** `overridden:false`, `equipmentRequired:null`,
    `materials:null`, `equipmentRequiredAuto:["tractor + grader blade"]`,
    `materialsAuto:[4 catalog lines]`.
  - **Manual override via the D2.1 editor UI (real clicks):** equipment
    `STEWARD-OVERRIDE-EXCAVATOR`, material
    `{label:"STEWARD-COMPOST",unit:"m³",quantityPerAcre:9}`. Post-override:
    `overridden:true`, manual fields set, `*Auto` unchanged. Act →
    Resourcing BOM showed `STEWARD-COMPOST … manual` and the equipment
    booking listed `STEWARD-OVERRIDE-EXCAVATOR — 1 item`.
  - **Regenerated via the real path** (Plan → Goal Compass → Proposal →
    "Generate proposal", `GeneratedPlanTab.handleGenerate` →
    `pushGoalCompassToSpine` → `replaceGoalCompassResources`).
  - **Post-regenerate (the contract — PASS):** manual
    `equipmentRequired`/`materials` **byte-identical** to the
    STEWARD-OVERRIDE values; `overridden` still `true`; `source` still
    `goal-compass`; `updatedAt` **unchanged** (`08:06:38.456Z` —
    preservation gate short-circuited the overridden row, zero churn);
    `equipmentRequiredAuto`/`materialsAuto` retained their catalog values;
    the 18 **non-overridden** goal-compass rows re-seeded their `*Auto`
    fields, proving the resource sync ran spine-wide while skipping the
    single overridden row. `preview_console_logs` clean (zero errors;
    only the known unrelated act-telemetry / machinery 500s — no backend
    in preview; no D2/D2.1 file in any stack trace). The
    construction/unit-test proof above stands and is now corroborated by
    this live run.
- **Committed & pushed** — `63313677` on `feat/atlas-permaculture`
  (D0/D1 were `6211caff`); divergence with the remote reconciled by
  rebase and pushed (`80553503..249dad54`).
- Continues the D-series. D3 (budget/cost tracking, the covenant-bounded
  cost layer) is its own brainstorm→spec→plan cycle.
