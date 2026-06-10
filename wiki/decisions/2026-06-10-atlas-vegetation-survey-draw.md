# 2026-06-10 — s2-ecology-c1 vegetation survey becomes a draw-on-map community survey with auto-%

**Status:** accepted · **Surface:** Atlas web (`apps/web`) · **Branch:** `main`

## Context

The `s2-ecology-c1` "Vegetation survey" decision made the steward toggle each of 7 vegetation
community types and **hand-type a percent-of-site** in the inline, map-less Tier-0 workbench
(`EcologyCapture` vegetation mode). Hand-entered percentages are guesswork, and there was no
spatial record of *where* each community sits. The operator asked for a draw-on-map workflow: the
right rail lists the 7 communities, the bottom tray offers a polygon draw tool, and **percentages
are computed automatically** as `summed polygon acres ÷ site acres × 100`.

## Decision

Reuse the existing **store-driven rail-takeover** pattern (the SectorsEditor / as-built popover
precedent on this module): a new `vegetationSurveyStore.open(projectId)` flips an ephemeral
`active` flag; `ActTierShell` then forces the map branch over the Tier-0 workbench, mounts a
survey map layer + draw host, and swaps a `VegetationSurveyPanel` into the right rail. Three
operator-confirmed design choices:

1. **Draw-only, % auto.** Manual toggle + percent entry is removed for `mode === 'vegetation'`
   **only**; the panel/summary display each community's auto-computed %. The other 4 ecology
   subtasks (species / corridors / connectivity / waterHabitat) stay inline and unchanged.
2. **Dedicated survey layer.** Drawn polygons live in a NEW `vegetationSurveyStore`
   (semantically "observed existing vegetation"), **not** the Plan `designElementsStore` — so they
   never surface as designed elements on the Plan map. Synced as `ogden-vegetation-survey`
   (persist v1, `byProject` only); registered in `syncManifest.ts` or the coverage-guard test
   fails.
3. **Single tool + in-panel community picker.** One `act.ecology.veg-survey` map tool; the store
   carries an `activeCommunity` set by the panel row, and `VegetationSurveyDrawHost` tags the
   completed polygon with it. (The sibling slope survey,
   [[decisions/2026-06-10-atlas-slope-survey-draw-tools]], later inverted this to six per-class
   tools with no `activeClass` — the armed tool encodes the class there. Both patterns coexist by
   design.)

## Consequences

- `selectVegetationSurveyTotals(features, siteAcres)` is the single pure auto-% selector:
  per-community summed acres → `pct = siteAcres > 0 ? (acres / siteAcres) * 100 : 0`
  (divide-by-zero guarded to 0%, never NaN), `totalAcres`, per-community `count`, and
  `unclassifiedPct = clamp(100 - Σpct, ≥ 0)` so the steward sees coverage gaps. Per-feature
  acreage = `turf.area(geom) * 0.000247105`.
- `siteAcres` is read from **`project.location.acreage`** — acreage lives on `ProjectLocation`,
  not `Project`.
- On "Done" the computed totals encode back into the **existing** `ecologyCommunities` FormValue
  (`['cleared::25', …]`), so the downstream Tier-3 zone-allocation feed + summary text are
  untouched. The draft-sync effect fires only when `features.length > 0`, so an empty survey
  never clobbers legacy hand-typed values; pre-existing hand-entered percentages simply display
  until re-surveyed (no geometry to back-fill).
- A new mutually-exclusive rail-takeover now coexists with the sectors editor and the as-built
  popover (opening one closes the others). The `vegetation-survey` catalogue id surfaces in the
  bottom tray only while the survey forces the map for `s2-ecology`.

Out of scope: a BaseMap toggle to show/hide survey polygons outside survey mode; merging with the
generic Observe `VegetationTool`/patch store (kept separate per decision #2); migrating
pre-existing hand-entered percentages into drawn polygons.

## Amanah

Ecological land-reading / measurement only — no riba, gharar, sale, advance-purchase, financing,
or CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Halal.

Log: [[log/2026-06-10-atlas-vegetation-survey-draw]]; entity [[entities/act-tier-shell]].
