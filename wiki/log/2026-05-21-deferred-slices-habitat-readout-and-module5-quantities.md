# 2026-05-21 — Land two deferred slices: habitat readout + Module 5 quantity capture

**Branch.** `feat/atlas-permaculture`.

**Context.** After the Vite-proxy `API_OFFLINE` envelope fix landed
(`1c35311e`), two cohesive slices remained uncommitted in the working tree.
This branch is rebased out-of-band, so uncommitted work is at risk —
landing them as separate commits and pushing each immediately.

**Slice A — habitat-feature unification, Slice 4 (commit `eda282d3`).**
Adds a pure selector module
[apps/web/src/features/biodiversity/habitatCommitments.ts](../../apps/web/src/features/biodiversity/habitatCommitments.ts)
that reads `DesignElement.habitatMetadata` from the design-elements store
and tallies the 10 habitat-commitment kinds (`owl-box`, `raptor-perch`,
`nest-box`, `brush-pile`, `snag`, `insectary-strip`, `wetland-edge`,
`hedgerow`, `pond`, `shrub`). Two consumer panels render a "Planned habitat
commitments" / "Placed on map" section from the same selector:
[BiodiversityMonitorCard.tsx](../../apps/web/src/features/plan/BiodiversityMonitorCard.tsx)
(+56) and [FeatureInventoryPanel.tsx](../../apps/web/src/features/plan/habitatAllocation/FeatureInventoryPanel.tsx)
(+59). Test coverage: 10 vitest cases. Closes Slice 4 of the habitat-feature
unification rollout (Slices 1–3 landed in `43dd56a9` / `933c0709` / `ac11dfa6`).

**Slice B — Module 5 MaterialFlow quantity capture (commit `92e5a169`).**
Follow-up to `0e5f3310` (data-model extension). `WasteVectorListView.tsx`
gains a collapsed "Quantities" sub-section in the create/edit form with
six optional fields (mass kg/mo, volume L/mo, energy kWh/mo, nutrient
N/P/K kg/mo). Helper `parsePositive(s)` returns `undefined` for empty /
NaN / zero / negative — blank cells stay un-persisted instead of writing
0. Helper `quantitySummary(v)` renders a compact `12 kg, 8 L` meta row
beside each list entry.

**Verification.**
- `pnpm vitest run` (full apps/web): **1694 passed / 170 files**.
- `pnpm vitest run src/features/plan` (Slice B targeted): 29 passed.
- `pnpm tsc --noEmit`: 3 pre-existing unrelated errors (`StepBoundary.tsx:365`,
  two `HostUnion…` test files), no regressions introduced by either slice.
- Branch governance: `git fetch origin feat/atlas-permaculture` + divergence
  check before each push; `git push --force-with-lease` per
  [memory/feedback-commit-immediately-on-rebased-branches](.) and
  [memory/project-branch-rebase](.).

**Out of scope.** No edits to the auth handlers or the Vite proxy (already
shipped). No reintroduction of the 7-stage lifecycle in either panel. No
mobile-Overview structural changes. The earlier Observe vertex-edit +
click-delete work landed independently in `14db482f` / `bcd5e0ad` with its
own log entry — not duplicated here.

**Files.**
- `apps/web/src/features/biodiversity/habitatCommitments.ts` (new, +153).
- `apps/web/src/features/biodiversity/__tests__/habitatCommitments.test.ts` (new, +175).
- `apps/web/src/features/plan/BiodiversityMonitorCard.tsx` (+56).
- `apps/web/src/features/plan/habitatAllocation/FeatureInventoryPanel.tsx` (+59).
- `apps/web/src/features/plan/WasteVectorListView.tsx` (+150 / −10).

**Plan.** `~/.claude/plans/need-credentials-to-login-compressed-bentley.md`
(the four-slice rollup; Slices 1 + 4 in that plan landed in earlier
parallel-session commits, leaving 2 + 3 for this entry).
