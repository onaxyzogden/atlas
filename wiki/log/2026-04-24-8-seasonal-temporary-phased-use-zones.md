# 2026-04-24 — §8 seasonal / temporary / phased use zones


Closes `seasonal-temporary-phased-use-zones` (featureManifest §8 Land
Use Zoning & Functional Allocation / P2). Adds a third orthogonal
zone-tag axis (alongside §7 invasive pressure and succession stage)
plus a dashboard rollup so stewards can see how the design's zones
schedule across the year.

### Context
ZoneEcologyRollup (§7) shipped earlier covers the *condition* axis
(invasive pressure, succession stage). The §8 spec calls for a
*scheduling* axis: which zones are year-round, which only run summer
or winter, which are intentionally temporary (event staging, phased
construction laydown). This adds the third axis as another optional
field on `LandZone`, surfaces it in the existing ZonePanel "Tag" UI,
and rolls it up in a dashboard card with a per-month coverage strip
that flags peak and dead months.

### Changes
- `apps/web/src/store/zoneStore.ts` — new `Seasonality` union
  (`'year_round' | 'summer' | 'winter' | 'spring_fall' | 'temporary'`),
  `SEASONALITY_LABELS` and `SEASONALITY_COLORS` (warm summer / cool
  winter / sage year-round / soft green spring-fall / purple temporary
  — picked to read distinctly from invasive/succession palettes so the
  three rollups don't blur). New optional `seasonality?: Seasonality |
  null` on `LandZone`. No persist version bump because the field is
  optional; existing zones load with `undefined`.
- `apps/web/src/features/zones/ZonePanel.tsx` — extended creation form
  with a third select, wired into `handleSaveZone`. Added a third chip
  to the zone-row chip group. Extended the inline edit disclosure with
  a third `<select>` so stewards can tag/retag without redrawing the
  polygon.
- `apps/web/src/features/zones/ZoneSeasonalityRollup.tsx` (NEW, ~205
  lines) — pure-presentation card. Aggregates `byBucket` (Record of
  Seasonality | 'untagged' → acres) and a 12-element `monthlyAc` via
  the `ACTIVE_MONTHS` lookup table (NH calendar). Renders acres-by-
  season stacked bar with legend, plus a 12-cell monthly coverage
  strip whose heights scale to each month's tagged-acre activity
  relative to the year's peak. Narrative line surfaces peak and
  quietest months ("dead months are good slots for temporary / event
  programming").
- `apps/web/src/features/zones/ZoneSeasonalityRollup.module.css` (NEW,
  ~140 lines) — visual language mirrors ZoneEcologyRollup. New classes:
  `.monthStrip`, `.monthCell`, `.monthBar`, `.monthLabel`.
- `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx` —
  mounted `<ZoneSeasonalityRollup>` between `ZoneEcologyRollup` and
  `CarbonByLandUseCard` (both skeleton path and full path) so the
  three zone-tag rollups read as a coherent block.
- `packages/shared/src/featureManifest.ts` — line 237 status
  `planned → done`.

### Rationale
Pure presentation. Three orthogonal zone-tag axes (condition,
succession, scheduling) layered on top of the same `LandZone` entity —
no new store, no new entity, no shared-package math. Per-month strip
gives stewards a quick read on labor / activity peaks and quiet
windows that could host event programming.

### Hemisphere caveat
`ACTIVE_MONTHS` uses Northern Hemisphere conventions (summer = May–Aug,
winter = Nov–Feb). The bucket bar is accurate everywhere; SH stewards
read summer/winter as inverted in the monthly strip. Wiring the §14
climate `latitudeDeg` derivation into ZoneStore is a separate task —
the seasonal-tag UI itself is hemisphere-neutral.

### Not in scope
- No per-zone date-range editor (e.g., "active May 1 – Sep 30") — the
  five-bucket vocabulary is intentional; finer windows belong in §15
  phasing/timeline.
- No labor/cost rollup tied to monthly activity (separate §6/§13
  follow-on).
- No SH calendar flip (separate task; needs project lat plumbed into
  this card).

### Verification
- `cd atlas/apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
  → exit 0, clean.
- Preview verification deferred (user-driven smoke test).
