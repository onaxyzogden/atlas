# 2026-04-24 — §13 energy-demand-notes · §15 temporary-vs-permanent-seasonal


Two manifest gap-fills in a single combined commit (`c2e9862`, pushed to
`feat/shared-scoring`). Both are presentation-layer additions — no new
shared-package math, no new entity types, no persistence version bump.

### Shipped

- **§13 `energy-demand-notes`** — `planned → done`.
  - `Utility` gains optional `demandKwhPerDay?: number` (steward-entered
    daily load placeholder). Store stays at v1 — optional field is
    hydration-safe.
  - `UtilityPanel` placement modal adds a numeric "Energy demand
    (kWh / day)" input beneath the Phase selector; parsed with
    `Number.isFinite` + `> 0` guard so blank / non-numeric input lands
    as `undefined`.
  - New `EnergyDemandRollup` card in the Energy & Water systems tab:
    three stats (kWh/day load · kWh/day solar · net), per-category bar
    breakdown (Energy · Water · Infrastructure), supply-vs-load gap
    indicator. Solar side reuses `estimateSolarOutput(...)` — ≈2.5 kWh/day
    per placed `solar_panel` at 4.5 kWh/m²/day irradiance, 18% efficiency.
  - Rendered above `SolarPlacement` so stewards see supply-vs-load before
    considering array expansion.

- **§15 `temporary-vs-permanent-seasonal`** — `planned → done`.
  - `Structure`, `Utility`, `DesignPath` each gain optional
    `isTemporary?: boolean` and `seasonalMonths?: number[]` (1-indexed).
    JSDoc on each field links back to the §15 spec item.
  - `PhaseFeature` extends to required `isTemporary` + `seasonalMonths`;
    `aggregatePhaseFeatures` populates via `?? false` / `?? []` defaults
    so pre-existing entities flow through untouched.
  - `UtilityPanel` modal adds a "Temporary / seasonal" checkbox between
    the energy-demand input and the Notes textarea. (Checkbox wiring for
    Structure and Path entities deferred — the Utility surface alone is
    enough to demo the feature; can be sprinkled as a follow-on.)
  - `PhasingDashboard` header renders a "Hide temporary (N)" toggle
    when any temporary items exist. Feature list applies a dashed-
    border + italic-name + opacity-dimmed row styling with an inline
    "temp" badge.

### Verification

`apps/web` tsc clean on every file touched today (52 pre-existing
errors unchanged — `HydrologyDashboard.capacityGal`,
`SolarClimateDashboard.deriveInfrastructureCost`, `PlantingToolDashboard`,
`MapView`, `regenerationEventStore`, `AppShell`/`IconSidebar` nav routes,
`SynthesisSummarySection`, `EcologicalDashboard`).

### Recommended next

- **§15 `cost-labor-material-per-phase`** — cost rollup already ships;
  layer `laborHoursEstimate?` + a material tonnage placeholder and
  render a three-column per-phase bar.
- **§14 `seasonal-storage-water-budget`** — the standing plan file in
  `~/.claude/plans/` describes a Water Budget tab built from
  `climate._monthly_normals` + `WHO_BASIC_DAILY_LITERS`; all inputs
  already present.
- **§9 `infrastructure-cost-placeholder-per-structure`** — sanity-pass
  the Structure panel to confirm per-structure `costEstimate` edit UI
  is end-to-end (the §15 rollup already consumes the field; this entry
  may be flippable with zero code).
