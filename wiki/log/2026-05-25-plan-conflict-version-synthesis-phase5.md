# 2026-05-25 — Conflict Detection + Plan Versioning + Synthesis/Approval (Plan-Operation Phase 5)

**Branch.** `feat/atlas-permaculture`. The **final** Plan-Operation roadmap slice,
shipped as three commit-on-verify sub-slices: **5a** `72f9cabb` · **5b** `68b5f526`
· **5c** `2b408b9b`. Full rationale + file lists in ADR
[[decisions/2026-05-25-atlas-plan-conflict-version-synthesis-phase5]].

## What shipped

- **5a — Plan Conflict Detection** (`/plan/conflicts`). The last dangling Observe↔Plan
  edge: a *new* recorded observation that contradicts an existing plan decision now
  surfaces as a triageable conflict. Pure `derivePlanConflicts(views, decisions)`
  matches recorded/resolved observations to non-`rejected` decisions through module
  affinity (`likely` = direct match, `possible` = affinity), with an optional
  separate turf point-in-polygon pass. Thin-run triage
  (`dismiss|acknowledge|revise-plan` + note) persists in
  `ogden-plan-conflict-reviews`. Mirrors Phase 1's derived-flag/stored-run split.

- **5b — Plan Versioning** (`/plan/versions`). Full-geometry snapshot + restore. The
  snapshot engine combines the `syncManifest` `selectForProject`/`applyForProject`
  engine over ~63 versioned-blob stores (skipping `ogden-plan-versions` itself) with
  a 4-store typed-design array adapter (zones/paths/utilities/built-environment-v2)
  the manifest omits. Versions have a draft/approved/superseded lifecycle; Restore is
  `window.confirm`-gated and overwrites only this project's rows.

- **5c — Plan Synthesis & Approval** (`/plan/synthesis`). A read-mostly roll-up of the
  whole Plan-Operation state (readiness tiles + open items + active version),
  composing the existing counts hooks, plus an **advisory approval** block: Approve
  stamps a `PlanVersion` draft→approved (who/when/note) or captures a fresh snapshot;
  Reopen reverses it. Steward-sovereign — locks/gates nothing. No new store; approval
  metadata lives on `PlanVersion`.

Each slice added its route (before `plan/$module`) + a `V3LifecycleSidebar` entry in
the `entry.id === 'plan'` block.

## Key engineering note (5b)

`planSnapshot.ts` cannot be imported under vitest — the
`syncManifest → projectStore → cascadeDelete → useZoneStore` runtime cycle plus the
zundo+persist `zoneStore` crashes at module load (`store.persist.getOptions()`
undefined, `persistRehydrate.ts:62`). Solved by extracting the bespoke project-slice
filter/replace into a pure, store-free `planSnapshotMerge.ts` and testing that (the
genuine restore-safety invariant) instead. No production guard added (would silence
real rehydrate instrumentation); no DI refactor (over-scope).

## Verification

- 5b: `planVersion.test.ts` (5) + `planSnapshot.test.ts` (7) + `syncManifest.test.ts`
  guard → **22/22 passing**. 5a: `planConflict.test.ts` + guard. 5c: composition only.
- `tsc --noEmit` clean for the Phase 5 changeset; only the **3** documented
  pre-existing unrelated errors remain (`planImpactFlag.test.ts:143`,
  `HostUnionContextMenu.test.tsx:58`, `HostUnionDrilldownCard.test.tsx:25`).
- **Browser visual check deferred** — needs a logged-in operator session;
  auth-bypass remains forbidden.

## Process

Plan-mode Phase 5, executed after operator plan approval (auto-drive). Each slice
staged by name only — the working tree carries unrelated foreign WIP
(economics/map/financial/api-pdf edits, ZoneSomSidebar, MapCoordinateReadout,
materialSubstitution) left untouched per [[feedback-no-deletion]]. For 5c the shared
files (`routes/index.tsx`, `V3LifecycleSidebar.tsx`) were diff-verified to contain
only the additive 5c hunks before staging; fetched + divergence-checked (0/0) before
a fast-forward push per [[feedback-commit-immediately-on-rebased-branches]].

Closes the Plan-Operation roadmap (Phases 1–5) — the living-plan loop is now
end-to-end. Updates entity [[entities/atlas-platform]]. Next (additive, demand-gated):
Risk & Compliance module #9, Operations Model surface #11.
