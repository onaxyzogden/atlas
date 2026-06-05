# 2026-04-24 — §15 phase completion + notes · §13 utility status-sweep


Two parallel manifest gap-fills.

### Shipped
- **§15 `phase-completion-tracking-notes`** — `partial → done`.
  - `BuildPhase` extended with `completed`, `notes`, `completedAt`;
    store bumped to v2 with legacy-phase migration + `togglePhaseCompleted`.
  - `PhasingDashboard` Arc-summary gets a "Completion" cell with progress
    bar; each phase card gets a color-matched checkbox, completed-at
    badge, and working-notes textarea. CSS additions isolated to the
    dashboard module.
  - Financial test fixtures updated to include the three new required
    `BuildPhase` fields.
- **§13 utility placement sweep** — 8 entries `partial → done` after
  confirming `UtilityPanel` covers all 15 `UtilityType`s with click-to-
  place, localStorage persistence, and Phase 1–4 assignment (plus the
  dedicated Phasing tab and the systems-tab composition of
  `OffGridReadiness` + `SolarPlacement` + `WaterSystemPlanning`):
  `solar-battery-generator-placement`, `water-tank-well-greywater-
  planning`, `blackwater-septic-toilet`, `rain-catchment-corridor-
  lighting`, `firewood-waste-compost-biochar`, `tool-maintenance-
  laundry`, `utility-phasing`, `off-grid-readiness-redundancy`.
  `energy-demand-notes` left `planned` — needs a per-utility demand
  field that doesn't exist on `Utility` yet.

### Verification
`apps/web` tsc clean for every file touched today. Remaining
`PlantingToolDashboard.tsx` tsc errors are pre-existing working-tree
state (user-intentional rollback) — not regressed this session.

### Decision
`atlas/wiki/decisions/2026-04-24-phasing-completion-tracking-and-utility-status-sweep.md`

### Recommended next
- `energy-demand-notes` — add `demandKwhPerDay?: number` to `Utility`,
  a light input in the placement modal, and a rollup card in the
  Energy & Water systems tab.
- `infrastructure-cost-placeholder-per-structure` (§9) — the §15 cost
  rollup already uses `deriveInfrastructureCost`; flipping this needs
  a sanity pass over the Structure panel to confirm per-structure
  `costEstimate` edit UI is present end-to-end.
- `temporary-vs-permanent-seasonal` (§15) — `planned`; low cost, just
  a boolean + filter UI.
