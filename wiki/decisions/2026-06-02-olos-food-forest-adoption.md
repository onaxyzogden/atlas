# ADR: Food-forest adoption -- formula modules over mockup revival, + 5 primary catalogues

**Date:** 2026-06-02
**Status:** accepted

**Context:**
The operator asked to adopt "a lot of work done for the food forest aspect of OLOS
including formulas and drawing tools" from the prior `OGDEN Land Operating System` app
into v3. Investigation found that app's Canopy Simulator / Guild Builder / Plant
Database pages are **static mockups** -- they encode an *intended* formula-driven design
(light-by-layer, productivity-by-layer, Shannon diversity, water balance) but use
hardcoded numbers with no live math and no drawing logic. v3 meanwhile already has
functional, mounted equivalents (`CanopySuccessionCard` with real `lightByLayer()` /
`maturityFactor(year)`, `GuildSpatialBuilderCard` with on-map ring placement) plus
drawing tools (`CropAreaTool`, `GuildTool`, `useMapboxDrawTool`) that **exceed** the
prior app. Separately, 5 of 13 `.docx` objective catalogues were still unencoded
(Homestead, Education, Conservation, Market Garden, Off-Grid).

**Decision:**
1. **Do not revive the mockups.** Instead, turn their *intended* metrics into two pure,
   documented, unit-tested formula modules -- `features/forest/canopyMetricsMath.ts` and
   `features/agroforestry/guildAnalyticsMath.ts` -- derived from the existing
   `PLANT_CATALOG` / `FOOD_FOREST_LAYERS` / `guildIntegrityMath`, with **no hardcoded
   mock numbers**, labelled in the UI as design-time estimates (not field-calibrated
   yields). Enrich the live Canopy Simulator + Guild Builder cards to render them.
2. **Do not re-port drawing tools** -- v3's already surpass the source.
3. **Encode the 5 missing catalogues** verbatim from their `.docx` specs via the proven
   `obj`/`ck`/`dg` helpers, Tier 0-6 -> Stratum S1-S7, each registered in
   `catalogues/index.ts` via the (now) 5-edit pattern. Decision-group partitions
   authored under the 2026-05-31 extended override.
4. **Amanah handling of CSA (operator ruling 2026-06-02):** where a generic catalogue
   surfaces Community Supported Agriculture (Market Garden), encode it **verbatim** AND
   attach an Amanah `scopeNotes` flag that any CSA arrangement must avoid
   *bayʿ mā laysa ʿindak* (produce sold as delivered / membership-benefit framing, not
   advance purchase). Never silently omit or reword. Applied to MGD-S1.4 + MGD-S1.6;
   the pattern is standing for all future catalogues. See
   [[fiqh-csra-erased-2026-05-04]].
5. **Preserve source hard gates** via `scopeNotes` rather than dropping or softening
   them (Off-Grid OFG-S4.7/S7.4/S7.6 no-habitation-before-independent-verification;
   OFG-S1.4 independence-target design gate; OFG-S6.4 noted Principle-9 exception).

**Consequences:**
- v3's food-forest design surfaces are now formula-driven and test-backed, matching the
  prior app's *intent* without inheriting its dead mockup code (the dead
  `features/plan/{CanopySimulatorCard,GuildBuilderCard}.tsx` were left untouched per
  the no-deletion rule).
- 11 of 12 selectable primaries now carry an encoded objective layer; only Nursery as a
  *primary* remains universal-only (its catalogue is secondary-only).
- The CSA/scopeNotes precedent keeps verbatim source fidelity while carrying the CSRA
  fiqh caution into generic OLOS catalogues -- reusable for any future catalogue.
- **New debt:** the 5 newer primary catalogues (HMS/EDU/CON/MGD/OFG) are guarded only by
  TypeScript compile-time enforcement -- they are absent from the `ALL_AUTHORED` arrays
  in `catalogues.test.ts` and `shortTitle.test.ts`, so the runtime conformance rubric
  (ref format, checklist bounds, gate/handoff presence, shortTitle derivation) does not
  exercise them. Closing this requires widening `OBJECTIVE_REF`
  (`/^(U|RF|RES|EV|AG|WELL|SILV|ORCH|NRS)-S[1-7]\.\d+$/`) to add `HMS|EDU|CON|MGD|OFG`
  and adding the five primaries to both arrays. Deferred to a dedicated follow-on slice.

See [[log/2026-06-02-olos-food-forest-adoption]], [[entities/shared-package]],
[[entities/web-app]].
