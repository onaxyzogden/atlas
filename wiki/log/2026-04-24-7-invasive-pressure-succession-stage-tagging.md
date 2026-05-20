# 2026-04-24 — §7 invasive pressure + succession stage tagging


Closes `invasive-succession-mapping` (featureManifest §7 Soil, Ecology
& Regeneration Diagnostics) — the missing per-zone ecological-condition
vocabulary that lets stewards tag zones from walk-throughs without
needing a formal survey.

### Shipped
- **`zoneStore.ts`** — adds `InvasivePressure` (`none` / `low` /
  `medium` / `high`) and `SuccessionStage` (`bare` / `pioneer` / `mid`
  / `climax`) string-union types, plus optional fields on `LandZone`.
  Exports `INVASIVE_PRESSURE_LABELS` / `_COLORS` and
  `SUCCESSION_STAGE_LABELS` / `_COLORS` vocab maps for downstream UI
  parity. Succession palette runs the low-biomass gold (bare) to
  sage-green (climax) gradient already in use on pollinator-habitat
  overlays; invasive palette mirrors the biological-activity chip
  palette in `soilSampleStore`. Both fields are optional so the
  `ogden-zones` persist version does **not** bump — existing zones
  load clean with `undefined` tags.
- **`features/zones/ZonePanel.tsx`** — two extra `<select>` controls
  on the zone-creation form (both default `''` = "not set"); inline
  "Tag" disclosure button on every zone-list row toggles an
  ecology-condition edit panel (pressure + stage + Done). The edit
  panel writes directly via `useZoneStore.updateZone` on change, so
  there's no Save/Cancel pair needed. Name / category / use fields
  remain immutable from this surface — deliberate v1 minimum.
  Color-coded chips render on the zone-list row whenever tags are
  present, borrowing the `currentColor`-driven pill style used in
  `SoilSamplesCard`.
- **`features/zones/ZonePanel.module.css`** — new `.zoneRow`,
  `.zoneChips`, `.zoneChip`, `.editBtn`, `.editRow`, `.editLabel`,
  `.editDoneBtn` classes. Layout inserts the disclosure row as a
  sibling beneath the existing `.zoneItem` so the chip + tag buttons
  sit horizontal and the edit drawer slides in vertically under it.
- **`features/zones/ZoneEcologyRollup.tsx`** (new, ~155 lines) —
  dashboard card aggregating acres-by-pressure and acres-by-stage
  across all zones in the project. Stacked-bar renderer with an
  "Untagged" bucket per row so un-classified zones are visible
  rather than silently dropped. Includes total acreage + zone count
  in the pressure block header, and a Bare→Climax direction hint in
  the stage block header. Pure presentation — no scoring-engine
  involvement.
- **`features/zones/ZoneEcologyRollup.module.css`** (new, ~120 lines)
  — matches the palette of existing EcologicalDashboard cards
  (`soilDataItem` / `carbonGrid`) with a 10-px bar track and a
  responsive legend grid.
- **`EcologicalDashboard.tsx`** — imports `ZoneEcologyRollup`,
  mounts it in both the env-data-loading skeleton state and the full
  dashboard, positioned above `<SoilSamplesCard>` so the three
  project-scoped observation surfaces (zone tags → soil samples →
  regeneration timeline) sit as a group.
- **`packages/shared/src/featureManifest.ts`** —
  `invasive-succession-mapping` planned → done (P2, §7).

### Verified
- `cd atlas/apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc
  --noEmit` — exit 0, zero diagnostics.

### Commit
- `2fdbe11` feat(zones): invasive pressure + succession stage tagging
  (§7) — 7 files, +578 / -20.

### Scope discipline
- **Presentation-layer only.** No shared-package math, no new API
  routes, no computeScores wiring. `@ogden/shared` touched only for
  the manifest status flip.
- **No persist version bump.** Both new fields are optional, so
  existing zones in localStorage continue to load without migration.
  Downstream consumers that iterate zones should treat the fields as
  `| null | undefined` — the store and rollup both do.
- **No map-layer color driver yet.** Zone fill on the Mapbox canvas
  still uses `z.color` (category color). The rollup currently surfaces
  tags via the panel chips + the dashboard bars. Re-paletting the map
  by pressure or stage would need a separate overlay toggle pattern
  (Mapbox `match` expression on `invasivePressure`) and dedicated
  legend chrome, so it is deferred.
- **No scoring impact.** Tags are qualitative and intentionally kept
  out of the scoring engine — they inform the steward, not the
  suitability / regenerative-potential labels. A future iteration can
  fold them into regeneration-priority ordering, but that is a scoring
  decision, not a UI one.

### Not in scope
- Map-layer re-paletting by pressure or stage (deferred to a
  §7 polish task — needs overlay toggle + legend).
- Bulk-tag affordance (tag multiple zones at once). v1 tags one zone
  at a time; bulk is a future UX polish.
- Historical comparison (diff the rollup across versionStore snapshots
  to see succession movement). Out of scope for the data-capture task.
- Export of the rollup to the project-summary PDF / CSV surfaces
  (follow-on).
- Invasive-species species list per zone (just pressure magnitude for
  now). A future feature could layer Asteraceae-family checklists or
  state noxious-weed lists on top — deliberately not conflated here.
