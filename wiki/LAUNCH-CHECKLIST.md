# Launch Checklist — Pre-Commercial Blockers

Canonical list of items that must be resolved before Atlas can be offered as a
paid / commercial product. Items here are accepted-and-deferred, not
oversights — they are tracked to prevent quiet violation at launch.

## Legal

- [ ] **CC BY-NC-SA 3.0 IGO legal review — FAO GAEZ v4 data**
  FAO GAEZ v4 Theme 4 agro-climatic suitability rasters (self-hosted
  Sprint BV, 2026-04-20) are licensed under CC BY-NC-SA 3.0 IGO. The
  **non-commercial** clause is incompatible with any paid SaaS /
  commercial offering. Before launch, Atlas must either:
  (a) negotiate a commercial license directly from FAO,
  (b) remove GAEZ-derived layers from the commercial product,
  (c) isolate GAEZ inside a non-commercial subsystem / free tier,
  or (d) swap GAEZ suitability for an equivalent non-NC data source.
  Source: [wiki/decisions/2026-04-20-gaez-self-hosting.md](decisions/2026-04-20-gaez-self-hosting.md).
  **Sprint CC (2026-04-21) update:** `/api/v1/gaez/raster/*` is now auth-gated
  behind `fastify.authenticate` as defense-in-depth — the raster COG bytes are
  no longer served to anonymous clients. This does **not** resolve the NC
  clause (any logged-in user can still retrieve the bytes; the gate only
  removes the passive-scrape surface). The license decision above remains
  the launch blocker.

## Operational

- [ ] **Caveat-disclosure plumbing across scoring panels.**
  `EcologicalDashboard.tsx:200-250` renders only the first `caveats[]`
  entry; `HydrologyPanel`, `EconomicsPanel`, and `RegulatoryPanel`
  likely mirror this pattern (not audited). Add a "Why this matters"
  collapsed disclosure listing the full `caveats[]` array per scoring
  surface so users see the full reasoning, not just the first caveat.
  Source: [decisions/2026-04-25-pre-flight-audit.md](decisions/2026-04-25-pre-flight-audit.md).

- [ ] **Citation backfill on regional cost rows.**
  `packages/shared/src/regionalCosts/US_MIDWEST.ts` and
  `regionalCosts/CA_ONTARIO.ts` carry ~10 rows each with
  `citation: null, confidence: 'low'` (habitation, food_production,
  commons, spiritual, education, retreat, water_retention,
  infrastructure zones, plus `post_rail` fencing). Financial outputs
  that hit these rows are unbacked. Either source citations, hide
  cost outputs whose rows are `confidence: 'low'`, or surface a
  banner. Source:
  [decisions/2026-04-22-regional-cost-dataset.md](decisions/2026-04-22-regional-cost-dataset.md)
  + [decisions/2026-04-25-pre-flight-audit.md](decisions/2026-04-25-pre-flight-audit.md).

- [ ] **Map-overlay chrome migration to `MapControlPopover`.**
  10 overlays still ship hand-rolled `backdropFilter` chrome:
  `AgroforestryOverlay`, `BiodiversityCorridorOverlay`,
  `CrossSectionTool`, `MeasureTools`, `MicroclimateOverlay`,
  `MulchCompostCovercropOverlay`, `RestorationPriorityOverlay`,
  `ViewshedOverlay`, `HistoricalImageryControl`, `OsmVectorOverlay`,
  `SplitScreenCompare`, `WindbreakOverlay`. Migrate to
  `<MapControlPopover variant="panel"|"dropdown">` per
  [decisions/2026-04-24-map-control-popover-and-mapzindex.md](decisions/2026-04-24-map-control-popover-and-mapzindex.md).

- [ ] **`SlideUpPanel` / `RailPanelShell` focus-trap audit.**
  `Modal.tsx` is correct. `SlideUpPanel.tsx` and `RailPanelShell.tsx`
  focus-trap behavior unverified — accessibility blocker for any
  modal-equivalent surface. Add focus trap or document the absence.

## Compliance

_(Future sprints append blockers here.)_
