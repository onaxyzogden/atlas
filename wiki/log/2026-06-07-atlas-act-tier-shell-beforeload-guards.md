# 2026-06-07 -- Act Tier-Shell Plan Gate: STRATUM_PREREQS wiring + beforeLoad guards

**Session:** feat/structured-capture-forms
**Commits:** 67d184c9 (Phase 1), e0a65aca (Phase 2)
**ADR:** [[decisions/2026-06-07-atlas-act-tier-shell-beforeload-guards]]

---

## Problem

After the Plan spine gate shipped, two gaps remained:

**Gap 1 (STRATUM_PREREQS not wired):** The `obj()` authoring helper in
`packages/shared/src/constants/plan/catalogues/authoring.ts` defaulted
`prerequisiteObjectiveIds: []` for every objective, so the gate engine had no
prereq data and no objective ever locked. `STRATUM_PREREQS` (the per-stratum gate
map) was defined and documented but never wired.

**Gap 2 (deep-link bypass):** The interactive Act paths (handleSelectObjective /
handleSelectStratum in ActTierShell) enforced the gate. But navigating directly
to `act/tier-shell/$objectiveId` or `act/tier-shell/stratum/$stratumId` via URL
bypassed all guards and rendered locked content silently.

---

## Phase 1: STRATUM_PREREQS wiring (67d184c9)

`packages/shared/src/constants/plan/catalogues/authoring.ts` -- `obj()` now
defaults `prerequisiteObjectiveIds` from `STRATUM_PREREQS[stratumId]` when the
caller omits the field:

```typescript
prerequisiteObjectiveIds:
  input.prerequisiteObjectiveIds ?? [...STRATUM_PREREQS[input.stratumId]],
```

`STRATUM_PREREQS` gate map:
- `s1-project-foundation`: [] (always unlocked)
- `s2-land-reading`: S1 vision/boundaries/stakeholders
- `s3-systems-reading`: S2 terrain/climate/ecology/infrastructure
- `s4-foundation-decisions`: S3 hydrology/soil
- `s5-system-design`: S4 direction/water-strategy/zones
- `s6-integration-design`: S5 access/water-infrastructure/soil-improvement
- `s7-phasing-resourcing`: S6 monitoring

New `packages/shared/src/relationships/__tests__/spineGate.conformance.test.ts`:
6 project-type combos x 4 assertions (30 total):
1. Non-empty objective set with universal backbone present
2. No dangling prereq refs (every prereq id resolves in the set)
3. Gate binds at zero progress: S1 active, S2+ locked
4. Gate releases: completing S1-S4 unlocks S5

All 30 green at commit time.

---

## Phase 2: beforeLoad guards (e0a65aca)

`apps/web/src/routes/index.tsx` (87 insertions):

New `buildActLockContext(projectId)` helper: reads Zustand `.getState()` synchronously
(stores hydrate from localStorage before first render via persist middleware),
runs `computeEffectiveProgress` -> `computeAllObjectiveStatuses`. Returns `undefined`
when DEV unlock is on or project not found.

**Objective guard** on `v3ActTierShellObjectiveRoute`: redirects to
`act/tier-shell` if `statuses[objectiveId] ?? 'locked' === 'locked'`. Unknown
objectiveId passes through to component gracefully.

**Stratum guard** on `v3ActTierShellStratumRoute`: calls `computeAllStratumStates`;
redirects to `act/tier-shell` if `stratumStates[stratumId] ?? 'locked' === 'locked'`.

Smoke-tested via `window.__TSR_ROUTER__.navigate()` on MTC (all 5 cases pass).

Note: the previous session's Test 3 failure (stratum guard not firing via
`location.href`) was a full-page-reload timing/state issue -- the guard was
correct in source but the store state differed on that reload. Client-side
navigation via `router.navigate()` confirmed correct behavior in this session.

---

## Incidentals

- 9 UU (unmerged) conflict marker files from a failed stash pop resolved via
  `git checkout HEAD --` (taking upstream side; all foreign WIP).
- `designElementsStore.ts` was accidentally staged (from the stash pop's staged
  changes); unstaged via `git restore --staged`.
- Wiki entry for stash pop resolution: see summary above in this log.
