# 2026-05-18 — D2 implemented: operational resourcing on the WorkItem spine


**Branch.** `feat/atlas-permaculture` (committed this session; D0/D1 were `6211caff`).

Executed the ratified D2 slice on the single-writer `WorkItem` spine: a net-new
crew model + store, Approach-B provenance (`equipmentRequiredAuto` /
`materialsAuto`) beside the manual resourcing fields, Goal-Compass resource
seeding through the existing spine-sync seam with the generated-vs-overridden
preservation contract mirrored 1:1 from D1, a pure hours-only conflict engine
(equipment double-booking + assignee weekly-cap), and a manifest-registered
Resourcing Act card surfacing crew CRUD / assignee workload / equipment booking
/ BOM rollup with render-only conflict badges. Additive only — no DB migration
(`.default([])` + `.passthrough()`), no spine-status auto-mutation, strictly
operational with **no cost surface** (`BudgetActualsCard` untouched; budget
deferred to D3).

**Decisions.** Four binding user-confirmed: net-new `crewMemberStore`
(`ogden-crew-members`, not ACL/CRM); dedicated Resourcing Act card
(`act-resourcing`, not an extension of `PlanExecutionTrackerCard`); mirror D1
Approach B for provenance; render-only conflict badges (hours only, never
written to `WorkItem.status`).

**Pages touched.** New: `crewMember.schema.ts`, `crewMemberStore.ts`,
`resourcingConflicts.ts`, `ResourcingCard.tsx`, ADR
[[2026-05-18-atlas-d2-resourcing]]. Edited: `workItem.schema.ts`,
`workItemStore.ts`, `goalCompassSpineSync.ts`, `syncManifest.ts`, `types.ts`,
`ActModuleSlideUp.tsx`, `index.ts`, 5 literal/migration sites, 3 test fixtures.

**Verification.** shared+web typecheck exit 0 (fully clean); vitest shared
237/237 (incl. `resourcingConflicts` 10), web 1198/1198 (incl. crew store 2,
`workItemStore.resources` 3, `seedGoalCompassResources` 3) — zero failures, the
prior `syncManifest` coverage-guard debt did not recur (new store correctly
registered); `vite build` exit 0 (OOM on default heap disclosed as
environment, succeeded with `--max-old-space-size=8192`). Live (preview, `mtc`):
Resourcing tab mounts zero-console-error, all four blocks render correct empty
states, covenant-clean (only the budget→D3 disclaimer, no cost column), crew
CRUD verified add→list→remove. MapLibre/WebGL screenshot hang disclosed not
faked — DOM/accessibility tree + console + test matrix are the verification of
record.

**Deferred.** Live exercise of the Goal-Compass regenerate-preserves-manual
flow against a project with a generated plan (unit/store-proven by construction);
D3 budget/cost layer is its own brainstorm→spec→plan cycle.

ADR: [[2026-05-18-atlas-d2-resourcing]].
