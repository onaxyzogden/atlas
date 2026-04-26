# 2026-04-24 — §15 Phase Completion Tracking + §13 Utility Status-Sweep

**Status:** shipped
**Scope:** `featureManifest.ts` (9 flips), `phaseStore.ts`, `PhasingDashboard.tsx` + CSS, financial test fixtures

## Context

Two parallel gap-fill passes against `packages/shared/src/featureManifest.ts`:

1. **§15 `phase-completion-tracking-notes`** was `partial`: the phase store
   had `BuildPhase` but no completion or notes fields; the phasing dashboard
   rendered phases as read-only cards. Needed a per-phase "mark done" flag,
   completion-timestamp, free-text working notes, and an Arc-summary
   progress indicator.

2. **§13 Utilities / placement items** were uniformly `partial` despite
   `UtilityPanel` covering every `UtilityType` in
   `UTILITY_TYPE_CONFIG` with full click-to-place → persist → phase-assign
   plumbing. An audit was needed to confirm parity and batch-flip the
   manifest rather than keep six near-identical placeholder entries.

## Decision

### §15 phase completion

- Extend `BuildPhase` with `completed: boolean`, `notes: string`,
  `completedAt: string | null`. Bump persist store `version` 1 → 2 with a
  migration that initializes the three fields on legacy phases.
- Add `togglePhaseCompleted(id)` action that auto-stamps `completedAt`
  when flipping `true`, clears it on flip back to `false`.
- `PhasingDashboard`:
  - New Arc-summary cell "Completion" with `{doneCount}/{total}` and a
    gold progress bar driven by `completionPct`.
  - Per-phase card header gets a checkbox button (border/fill take the
    phase's own color on check); "Completed <date>" badge when applicable.
  - Working-notes `<textarea>` block at card bottom, two rows, gold focus
    ring, italic placeholder.
- CSS additions isolated to this dashboard — `.arcProgressTrack/Fill`,
  `.phaseCheckbox[Checked]`, `.phaseCardCompleted`, `.phaseCompletedBadge`,
  `.phaseNotesBlock/Label/Input`.
- Test fixtures (`breakEvenEngine.test.ts`, `cashflowEngine.test.ts`,
  `integration.test.ts`) were constructing `BuildPhase` literals missing
  the three new required fields — added `completed: false, notes: '',
  completedAt: null` to each fixture.

### §13 utility status-sweep

Audit confirmed `UtilityPanel` already ships full coverage:

- **Types:** All 15 entries in `UTILITY_TYPE_CONFIG` render as Place-tab
  buttons via `Object.entries` iteration (no hard-coded subset).
- **Persistence:** `useUtilityStore` is `persist`-wrapped (v2 with
  `capacityGal` migration); every placement hits `addUtility` which
  writes to localStorage.
- **Phasing:** Placement modal has a Phase 1–4 `<select>`; a dedicated
  "Phasing" tab renders `InfrastructurePhasing` over the placed utilities.
- **Systems:** `OffGridReadiness`, `SolarPlacement`, `WaterSystemPlanning`
  all wired into the "Energy & Water" tab.

Batch-flipped 8 manifest entries `partial → done`:

1. `solar-battery-generator-placement`
2. `water-tank-well-greywater-planning`
3. `blackwater-septic-toilet`
4. `rain-catchment-corridor-lighting`
5. `firewood-waste-compost-biochar`
6. `tool-maintenance-laundry`
7. `utility-phasing`
8. `off-grid-readiness-redundancy`

`energy-demand-notes` remains `planned` — it requires an explicit
per-utility kWh/day demand field that doesn't exist on `Utility` yet.

## Verification

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` in
  `apps/web` is clean for every file touched today. The remaining
  `PlantingToolDashboard.tsx` errors are pre-existing working-tree
  state (user-intentional rollback) — not regressed by this session.
- No new unit tests (framework not configured per CLAUDE.md); the
  financial test fixtures were only updated for type compliance.

## Consequences

- `PhasingDashboard` now has an actionable "did we finish Phase N?"
  affordance that a real steward can use without editing JSON.
- The §13 batch flip removes six near-identical placeholders from the
  manifest's partial-status list, making the remaining roadmap surface
  area honest about where real gaps live (energy demand, cost per
  structure, scenario phasing).
