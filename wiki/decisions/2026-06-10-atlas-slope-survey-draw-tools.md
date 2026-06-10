# ADR: s2-terrain-c2 slope distribution becomes a draw-on-map survey with six per-class tools

**Date:** 2026-06-10
**Status:** accepted

**Context:**
The `s2-terrain-c2` slope decision made the steward hand-type a percentage for each of six
slope classes (Flat / Gentle / Moderate / Steep / Very steep / Extreme), and the validity gate
required those to sum to ~100. That is guesswork divorced from the terrain. The vegetation
survey (`s2-ecology-c1`, Phase 3d) had already shipped a complete draw-on-map precedent:
a persisted `byProject` polygon store + ephemeral rail-takeover flag, a DrawHost, a map Layer,
a right-rail Panel, an inline Summary, and integration touch-points across `ActTierShell`,
`DecisionWorkingPanel`, `actToolCatalog`, `objectiveActTools`, `useMapToolStore`, and
`syncManifest`. The operator asked for the same treatment for slope: draw each class's extent,
auto-compute the percentages.

Two design questions were confirmed with the operator before building:
1. **Arming surface** — one tool with an in-panel class picker (veg-style), or one bottom-rail
   tool per class?
2. **Percentage basis** — % of drawn area (classes always sum to 100), or % of total site area
   (with an unclassified remainder)?

**Decision:**
1. **Six per-class bottom-rail draw tools** (`act.terrain.slope-flat` … `act.terrain.slope-extreme`).
   The active map tool itself encodes which slope class the next polygon joins, so the store has
   **no `activeClass`** (unlike `vegetationSurveyStore`). `SlopeSurveyDrawHost` reads the armed
   tool at completion time via `SLOPE_CLASS_BY_TOOL` and tags the polygon accordingly. Panel rows
   are a convenience second arming surface.
2. **% of total site area**, each class % = its drawn acres / `project.location.acreage`, with an
   "Unclassified / not yet surveyed" remainder = `max(0, 100 - sum)`. Consequence: the six class
   %s do not sum to 100 until the whole site is drawn, so the slope branch of `isTerrainValid` is
   **relaxed** from `|sum - 100| <= 2` to `slopeSum > 0` (>= 1 class allocated).

Drawing automates **only** the class % allocation. The compass `aspects` field is not drawable
and stays a manual inline multi-select in `SlopeSurveySummary`. Because `DecisionWorkingPanel`
passes `onChange={setDraft}` (whole-FormValue replace), every write from the summary emits both
`terrainSlope` and `terrainAspects` together; the slope-sync effect runs only when at least one
polygon exists, so a project with legacy hand-typed values is not clobbered by an empty survey.

**Consequences:**
- `terrainSlope` still encodes as `['flat::30', …]` (`key::pct`); `encode/decodeTerrain` and
  `summariseTerrain` are unchanged and stay honest for partial coverage.
- The six `slope-*` catalogue ids surface in the bottom tray only while the slope rail-takeover
  forces the map branch for `s2-terrain` (mirrors the veg-survey note) — they are not loose tools.
- Slope polygons live in their own `slopeSurveyStore` / map layer, deliberately NOT in the Plan
  `designElementsStore`, so they never render as designed elements. Synced as `ogden-slope-survey`
  (persist v1, `byProject` only; the takeover flag is partialized out).
- A third mutually-exclusive rail-takeover now exists (veg / sectors / slope, plus the as-built
  popover); opening the sectors editor closes all three.
- Aspect drawing and vertex-edit of existing slope polygons remain out of scope.

Supersedes the hand-typed slope entry in [[entities/act-tier-shell]] (Phase 3a land-reading
captures). Sibling precedent: the vegetation-survey takeover (`s2-ecology-c1`).
