# 2026-05-19 — B3.1: Editable rotation-adherence companion


**Branch.** `feat/atlas-permaculture`. Closes the edit-affordance gap
explicitly deferred by the B3 ADR (commit `4b17a535`, ADR
`2026-05-19-atlas-b3-rotation-adherence.md`). B3.1 is an independent
brainstorm → spec → plan → implementation cycle that ships a sibling
`RotationAdherenceActionsCard` alongside the B3 render-only
`RotationAdherenceCard`. The B3 engine, render-only card, and plan
registration are **untouched**.

**Commits (7, all on `feat/atlas-permaculture`).**

| SHA | Task | Subject |
|---|---|---|
| `dad596d5` | T1 | `workItemDraftStore` in-memory draft channel + tests |
| `8bd0a7a6` | T2 (initial) | per-kind editors (Overgrazed / Rest / UnplannedPaddock) + barrel + tests |
| `f5dd723b` | T2 (review fixes) | Cancel tests for Rest + Unplanned + drop non-null assertions |
| `867a716b` | T3 (initial) | `RotationAdherenceActionsCard` render host + happy-dom test |
| `2ad5be64` | T3 (review fix) | CSS: stack editor below row header (`flex-direction: column` on `.recRow`) + comment header |
| `7f0d1ab0` | T4 | tracker draft-banner consumes `WorkItemDraft` (Create uses existing `addItem`; spine-status invariant preserved) |
| `7deff5c1` | T5 | append-only registration of `plan-livestock-rotation-adherence-actions` |

**Engine + UI summary.** `RotationAdherenceActionsCard` reads the same
pure `computeRotationAdherence` result as its render-only sibling and
mounts per-row inline editors (D2.1 `ResourcingEditor` mounting pattern).
Three editors cover the four patchable kinds: `OvergrazedEditor` (graze
days → `targetGrazeDays`), `RestEditor` (rest days → `targetRestDays`,
shared by `under-rested-reentry` + `short-rest`),
`UnplannedPaddockEditor` (fold-in via `rotationPlanStore.upsertCell`).
`early-move` is advisory only — no edit affordance. An in-memory
`workItemDraftStore` (no `persist`, no `syncManifest`) carries corrective
`WorkItemDraft` proposals to a tracker banner outside `features/livestock/`;
the banner offers Create (→ existing `useWorkItemStore.addItem`) or
Dismiss. All writes inside `features/livestock/` flow only to
`rotationPlanStore.upsertCell`.

**Covenant attestations.**
- Covenant lexicon grep (`/interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i`) over all 7 new source files: **ZERO matches**.
- Spine-status invariant grep (`/WorkItem\.status|useWorkItemStore/`) inside `features/livestock/` (ActionsCard + all 3 editors): **ZERO matches**.
- No schema change to `WorkItem`, `LivestockMoveEvent`, or `RotationPlanCell`.
- No `persist` on `workItemDraftStore`; no `syncManifest` entry.
- D4 single-writer invariant (`fulfilWorkItem`/`unfulfilWorkItem`) preserved — tracker banner calls `addItem` (creation), not a status transition.

**Verification.**
- `pnpm --filter @ogden/web test` → **137 files / 1 441 tests** green (net +10 test files / +83 tests vs post-B3-polish baseline of 127 / 1 358).
- `pnpm --filter @ogden/shared typecheck` → **exit 0**.
- `pnpm --filter @ogden/web typecheck` → **exit 0**.

**Out of scope (reaffirmed).** `LivestockMoveEvent` log immutable; `early-move` advisory only; no `WorkItem.status` mutation from `features/livestock/`; no schema bump; no `workItemDraftStore` persistence.

**ADR.** [decisions/2026-05-19-atlas-b3-1-rotation-adherence-editor.md](decisions/2026-05-19-atlas-b3-1-rotation-adherence-editor.md).
