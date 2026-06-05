# D2 — Resourcing Layer Design (retroactive, as-built + hardening)

**Date:** 2026-05-18
**Sub-project:** D2 (Resourcing), 2nd slice of Sub-project D per the ratified
D0–D5 roadmap ([[2026-05-18-atlas-land-os-positioning-and-d-roadmap]]).
**Status:** design approved; spec for retroactive formalization of an
implementation that already exists, complete, in the working tree.

## Goal

Operational resourcing on the canonical WorkItem spine: a steward-authored
crew/labour roster plus three render-only derived surfaces — assignee
weekly over-capacity, equipment double-booking, and an effective
bill-of-materials rollup. Success = a steward can run an
Apricot-Lane-complexity build's people/equipment/materials picture without
an external PM tool, with zero new persistence migrations and zero covenant
drift.

## Covenant boundary (non-negotiable)

Strictly operational: **hours and quantities only**. No cost, wage, rate,
budget, financing, capital, advance-purchase, or yield-as-return field or
framing anywhere in D2. Project cost/budget tracking is D3; capital
formation is Sub-project C under Scholar Council. `BudgetActualsCard`
remains untouched. Conflicts are derived at render time only and are
**never** written back into `WorkItem.status` (single-writer-spine
discipline, consistent with D0.1 / D1). This boundary is asserted by tests
at both the engine layer (`seedGoalCompassResources` emits no cost/hours)
and — added as hardening — the UI layer (`ResourcingCard` renders no cost
string).

## Architecture

Mirrors the D0/D1 spine discipline exactly. Five units, each with one clear
responsibility and a well-defined interface.

### 1. Schema — `packages/shared`

- `schemas/crewMember.schema.ts` (new). `CrewMember`: `id`, `projectId`,
  `name`, `skillLevel` (`CrewSkillLevel` enum: `lead | skilled | general
  | apprentice`), `weeklyHoursCap` (`z.number().nonnegative()` — a *soft*
  cap, drives render-only badges only), optional non-coupling
  `networkContactId`, optional `notes`, `createdAt`/`updatedAt`,
  `.passthrough()`. Deliberately distinct from `ProjectMemberRecord` (ACL
  identity) and `NetworkContact` (external CRM): a crew member is the unit
  the resourcing engine buckets `WorkItem.laborHrs` against.
- `schemas/workItem.schema.ts` (modified). Adds two
  provenance-separated arrays beside their manual counterparts —
  **Approach B**, byte-mirroring D1's `dependsOnAuto`:
  - `materialsAuto: z.array(MaterialLineSchema).default([])`
  - `equipmentRequiredAuto: z.array(z.string()).default([])`
  `.default([])` + the existing top-level `.passthrough()` ⇒ existing
  persisted rows hydrate clean with **no DB migration** (A-series additive
  covenant). Effective BOM = manual `materials` merged with
  `materialsAuto` (manual wins on `label+unit`); effective equipment =
  `equipmentRequired ∪ equipmentRequiredAuto`. `MaterialLineSchema` and
  the inferred `MaterialLine` type are now exported (the engine consumes
  them).
- `index.ts` (modified). Exports `./schemas/crewMember.schema.js` and
  `./lib/resourcingConflicts.js`.

The Zod `.default([])` output-type trap (a `.default` field is *required*
on the inferred `WorkItem` literal type — same as D1's `dependsOnAuto`)
forces every constructed `WorkItem` literal to set both new fields.
Affected literal sites: `MaintenanceScheduleCard.tsx` and
`RotationScheduleCard.tsx` (each gains `materialsAuto: []`,
`equipmentRequiredAuto: []`).

### 2. Pure engine — `packages/shared/src/lib/resourcingConflicts.ts` (new)

No React, no store, no I/O. Input: project-scoped `WorkItem[]` +
`CrewMember[]`. Output: one computed result object.

- `effectiveEquipment(item)` → `string[]` — `equipmentRequired ∪
  equipmentRequiredAuto`, deduped.
- `rollUpBom(items)` → `BomLine[]` — manual + auto merged by `label+unit`,
  `quantityPerAcre` summed, `fromManual`/`fromAuto` provenance flags,
  sorted by label. No cost column.
- `equipmentConflicts(items)` → `EquipmentConflict[]` — for each equipment
  id, any pair of items whose `[scheduledStart, scheduledEnd]` spans
  overlap (strict `start < end`; touching spans do **not** conflict).
  Items missing either scheduled date make no booking claim and are
  skipped.
- `isoWeekKey(ms)` → `YYYY-Www` — ISO-8601 Thursday-shift week key.
- `assigneeWeeklyLoad(items, crew)` → `WorkloadConflict[]` — each assigned
  item's `laborHrs` bucketed into the ISO week of `scheduledStart`
  (fallback `scheduledEnd`); per member, any week whose summed hours
  exceeds the soft `weeklyHoursCap` (strict `>`; at-or-under the cap is
  not flagged). Items lacking `assigneeId` / positive `laborHrs` /
  schedulable date are ignored.
- `analyzeResourcing(items, crew)` → `{ equipment, workload, byItemId }` —
  combines both passes; `byItemId` carries per-item
  `{ equipmentConflict, overCapacity }` booleans for render-time badging.
- Defensive throughout: missing data is skipped, never thrown.

### 3. Store — `apps/web`

- `store/crewMemberStore.ts` (new). `ogden-crew-members`,
  projectId-tagged Zustand+persist (mirrors the `ogden-phases` /
  `ogden-work-items` sync class), `version: 1`,
  `partialize → { members }`, `persist.rehydrate()` on module load.
  Plain CRUD: `addMember`, `updateMember` (bumps `updatedAt`),
  `deleteMember`, `getProjectMembers`. **No** generated-vs-overridden
  preservation contract — Goal Compass never authors people.
- `store/workItemStore.ts` (modified). New action
  `replaceGoalCompassResources(projectId, resourcesByItemId)` — mirrors
  the `replaceGoalCompassDependencies` preservation filter **1:1**:
  writes `equipmentRequiredAuto`/`materialsAuto` only on this project's
  `source === 'goal-compass' && !overridden` rows; manual
  `equipmentRequired`/`materials`, overridden rows, and every other
  source/project are never touched. Idempotent via deep array-equality
  short-circuit (same input → same state reference, no `updatedAt`
  churn).
- `lib/syncManifest.ts` (modified). `ogden-crew-members` registered as
  `projectId-tagged` versioned-blob (`tagged('members')`). *(Already
  present in the working tree alongside the separately-committed 4-store
  classification fix `21f30db5`.)*

### 4. Seam — `apps/web/.../goalCompass/goalCompassSpineSync.ts` (modified)

- `seedGoalCompassResources(items, catalog = INTERVENTION_CATALOG)` —
  pure. For each generated WorkItem produced by intervention `X`:
  effective `*Auto` = union of `X`'s base `materials` and
  `maintenanceSchedule.materialsPerOccurrence` (label+unit deduped) plus
  `maintenanceSchedule.equipmentRequired` (string deduped). Items with no
  `generatedFromInterventionId`, an unknown intervention, or no resources
  produce no map entry ⇒ the store clears any stale auto. Never reads or
  emits hours/cost.
- Wired into `pushGoalCompassToSpine` immediately after
  `replaceGoalCompassDependencies`, calling
  `store.replaceGoalCompassResources(projectId,
  seedGoalCompassResources(items))`. Same preservation contract as the
  dependency seeding.

### 5. Surface — `apps/web/src/features/act/ResourcingCard.tsx` (new)

ACT-stage dedicated card (not an extension of
`PlanExecutionTrackerCard`). Reads `workItemStore` + `crewMemberStore`
for the project; renders three derived, render-only blocks:
1. **Assignee workload** — per crew member, assigned items + this/next
   ISO-week hours vs soft `weeklyHoursCap` (over-cap badge);
2. **Equipment booking** — per equipment id, the items claiming it, with
   a double-booking badge when scheduled spans overlap;
3. **BOM rollup** — effective `materials ∪ materialsAuto` aggregated by
   label+unit (auto vs manual marked, read-only).
Plus crew CRUD (people are steward-authored). **No cost column.** Derive
discipline: subscribe to store arrays raw, filter+analyse in `useMemo`
(never a freshly-allocating selector inside a Zustand selector — per
`wiki/decisions/2026-04-26-zustand-selector-stability.md`). Registered in
`v3/act/ActModuleSlideUp.tsx` (lazy import + `case 'act-resourcing'`) and
`v3/act/types.ts` (`{ label: 'Resourcing', sectionId: 'act-resourcing'
}`).

## Current state

The full implementation, registration, and four test specs exist in the
working tree — a mix of untracked new files
(`crewMember.schema.ts`, `resourcingConflicts.ts`, `crewMemberStore.ts`,
`ResourcingCard.tsx`, and the four `*.test.ts` specs) and tracked
modifications (`workItem.schema.ts`, `index.ts`, `workItemStore.ts`,
`goalCompassSpineSync.ts`, `syncManifest.ts`, `ActModuleSlideUp.tsx`,
`v3/act/types.ts`, `MaintenanceScheduleCard.tsx`,
`RotationScheduleCard.tsx`). **Entirely uncommitted.**
`pnpm --filter @ogden/shared typecheck` is clean (0 errors).

### Existing test coverage (solid — keep)

- `resourcingConflicts.test.ts`: `effectiveEquipment` (union/dedup),
  `equipmentConflicts` (overlap / non-overlap / missing-date skip),
  `isoWeekKey` (one happy case), `assigneeWeeklyLoad` (over-cap /
  at-or-under / ignored), `rollUpBom` (merge+sum+provenance),
  `analyzeResourcing` (combined, never emits cost).
- `seedGoalCompassResources.test.ts`: merge base+maintenance materials;
  skip no/unknown intervention; emits no cost/hours (covenant).
- `workItemStore.resources.test.ts`: seeds `*Auto` only on generated
  un-overridden goal-compass rows; clears stale; idempotent.
- `crewMemberStore.test.ts`: CRUD + `updatedAt` bump; project scoping.

## Targeted hardening (this spec's net-new test work)

Added because the as-built coverage, while solid, leaves four
high-value boundaries unpinned:

1. **`isoWeekKey` year-boundary** — assert the ISO-8601 rollover:
   2026-12-31 and 2027-01-01 (a Friday → belongs to **W53 of 2026**),
   and a Jan-1-belongs-to-prior-year case. Highest value: an off-by-one
   here silently mis-buckets hours across the year boundary with no
   other failing signal.
2. **`equipmentConflicts` touching-span boundary** — two items where
   `a.scheduledEnd === b.scheduledStart` ⇒ **no** conflict. Pins the
   strict-`<` contract against a future `<=` regression that would
   false-positive every back-to-back booking.
3. **`assigneeWeeklyLoad` exact-cap boundary** — add a dedicated case
   asserting a member whose summed week hours `=== weeklyHoursCap` is
   **not** flagged (strict `>`), independent of the existing
   "at-or-under" case. This pins the exact boundary value unconditionally
   rather than relying on the existing case's chosen number.
4. **`ResourcingCard` happy-dom render test** (new
   `apps/web/src/features/act/__tests__/ResourcingCard.test.tsx`) —
   mounts without error; renders the over-capacity badge for a seeded
   over-cap crew member; asserts **no cost/currency string** anywhere in
   the rendered output (covenant asserted at the UI layer, not only the
   engine).

## Verification

- `pnpm --filter @ogden/shared typecheck` exit 0.
- `apps/web` whole-project tsc with
  `$env:NODE_OPTIONS='--max-old-space-size=8192'` — **green = no NEW
  error vs the pre-D2 baseline**. The only documented pre-existing debt
  is none outstanding (the `useFlowEndpointOptions` Paddock fixtures were
  closed by `41ee2027`; the syncManifest 4-store debt by `21f30db5`).
- Full web vitest run — D2 specs green; suite baseline 1182/1183 with no
  new failures (the `1` is unrelated/historical and must not regress
  further).
- Run the four engine/seed/store suites by filename substring:
  `resourcingConflicts`, `seedGoalCompassResources`,
  `workItemStore.resources`, `crewMemberStore`, plus the new
  `ResourcingCard`.
- `ResourcingCard` is plain React deep behind the ACT module slide-up —
  the happy-dom test + tsc are the authoritative gate. No browser
  screenshot will be claimed if the surface cannot be reached
  (screenshot-honesty rule; MapLibre/WebGL hang precedent from the D1
  ADR).

## Commit posture

Explicit-path staging **only** — never `git add -A`/`.`. The working
tree carries other live out-of-band streams; each D2 file is staged by
exact path. `syncManifest.ts` already contains the separately-committed
4-store classification (`21f30db5`); the D2 commit adds only the crew
`ogden-crew-members` line within it. `wiki/index.md`/`wiki/log.md` are
owned by other streams — the D2 session-close ADR is a standalone
commit, noting this posture (mirrors the B3 ADR precedent).

## Scope / risk boundary

- **Covenant (highest):** any cost/budget/wage/financing field or
  framing is out — rejected to D3 / Sub-project C. Enforced by engine +
  UI no-cost tests.
- **Additive only:** new isolated `ogden-crew-members` slice; `*Auto`
  fields are `.default([])` + `.passthrough()` ⇒ no DB migration;
  registration is append-only; no `WorkItem.status` auto-mutation.
- **Preservation contract:** `replaceGoalCompassResources` is a 1:1
  structural mirror of the proven `replaceGoalCompassDependencies` — no
  parallel logic that could drift.
- **No-clobber:** the D2 stream coexists with concurrent out-of-band
  streams in the working tree; strict explicit-path staging is mandatory.
