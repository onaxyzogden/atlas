# ADR: Act tier-shell objective markers use real field-action geometry (hide-until-real)

**Date:** 2026-05-31
**Status:** Accepted
**Branch:** `feat/atlas-permaculture` (commit `d0f22547`; not pushed)

## Context

The 2026-05-30 Act tier-shell promotion ([[decisions/2026-05-30-atlas-act-tier-shell-promotion]]) shipped one deliberately non-real bit: objective map pins were placed at a deterministic centroid-offset (`objectiveOffset`, copied verbatim from the throwaway `tier-prototype`), because `PlanStratumObjective` carries no geometry of its own. On a map, a synthetic dot is visually indistinguishable from a surveyed location -- it implies ground truth that does not exist. The promotion log flagged this for a real-geometry pass.

The only data in the model that links a coordinate to a specific objective is **`FieldAction`**, which carries both `planObjectiveId` and a nullable `locationGeometry` (`Point | LineString | Polygon`). Crops, zones, and structures carry geometry but have **no objective link**, so they cannot place an objective pin. This means many objectives -- including every objective on MTC's curated seed, which logs no `locationGeometry` -- have **no** geometry available.

That forces a decision: what does a pin do for an objective with no real location?

## Decision

**Hide until real.** An objective's pin is rendered only when at least one of its field actions carries valid geometry; the pin sits at the centroid of those geometries. Objectives with no geo-bearing field action render **no pin at all**. There is no synthetic fallback dot.

(Operator decision, confirmed via AskUserQuestion; the alternative -- a synthetic placeholder pin -- was explicitly rejected as map-misleading.)

Mechanics:
- A pure, store-free helper `objectiveMarkerGeometry.ts` reduces each geometry type to one representative `[lng, lat]` (Point -> coords; LineString -> vertex average; Polygon -> `polygonCentroid` from `lib/geo.ts`), with runtime guards so malformed coordinates yield `null` rather than NaN positions.
- `computeObjectiveMarkerPositions(objectives, actions)` groups actions by `planObjectiveId`, averages the non-null representative points per objective, and **emits an entry only when >= 1 valid point exists**. The returned `Record` is the sole source of marker positions; an absent key means no pin.
- `ActTierMapMarkers` skips any objective absent from that record (and tears down a stale marker by omission). `ActTierShell` computes the record with `useMemo` keyed on `[stratumObjectives, actions]`.

## Consequences

- **No misleading geometry.** Every rendered pin corresponds to real logged ground; absence of a pin honestly signals absence of a surveyed location.
- **MTC shows zero objective pins today** (its seed logs no `locationGeometry`) -- the correct observable result, not a regression. The positive real-centroid path is proven by 11 unit tests rather than by a live MTC preview.
- **Pins appear as field actions are logged.** As operators capture located field actions, the corresponding objective pins materialise automatically -- the map becomes richer with use rather than pre-populated with fiction.
- **`tier-prototype/` is untouched** ([[feedback-no-deletion]]); its `protoSeed` offset is unrelated to this shell.
- A future enhancement could derive objective geometry from linked Plan-layer drawings if such a link is ever added to the schema; until then, field actions are the only source.

Closes the marker-geometry deferral from [[decisions/2026-05-30-atlas-act-tier-shell-promotion]]. Log: [[log/2026-05-31-act-tier-shell-followups]].
