# 2026-06-10 — Slope-distribution draw-on-map survey: s2-terrain-c2 six per-class tools

**main** (surgical commit of this slice only; **not pushed**). Converted the `s2-terrain-c2`
slope decision ("Identify slope gradients and aspects across the site") from hand-typed
per-class percentages to a **draw-on-map survey** — the third rail-takeover after the
vegetation survey (`s2-ecology-c1`) and the sectors editor. The steward draws each slope
class's extent on the Act map; each class's **% of total site area** is computed automatically
from polygon acreage, with an "Unclassified / not yet surveyed" remainder. ADR:
[[decisions/2026-06-10-atlas-slope-survey-draw-tools]].

**Two confirmed design decisions** (operator, via question prompt before building):
1. **Six per-class bottom-rail tools** (`act.terrain.slope-flat` … `slope-extreme`), not the
   veg-style single tool + in-panel picker. The armed map tool encodes the class, so the store
   has **no `activeClass`**; `SlopeSurveyDrawHost` reads the armed tool at completion time via
   `SLOPE_CLASS_BY_TOOL`. Panel rows are a second arming surface (toggle on/off).
2. **% of total site area** (not % of drawn area), each class % = drawn acres /
   `project.location.acreage`, remainder = `max(0, 100 - sum)`. Consequence: the slope validity
   gate was **relaxed** from `|sum - 100| <= 2` to `slopeSum > 0` (>= 1 class allocated).

**Aspects stay manual.** Drawing automates only the class % allocation; the compass `aspects`
multi-select (reusing the now-exported `TerrainCapture.COMPASS_DIRS`) remains inline in
`SlopeSurveySummary`. Because `DecisionWorkingPanel` passes `onChange={setDraft}` (whole-
FormValue replace), every summary write emits **both** `terrainSlope` and `terrainAspects`
together; the slope-sync effect fires only when `features.length > 0`, so legacy hand-typed
values are never clobbered by an empty survey. `encode/decodeTerrain` round-trip `key::pct`
unchanged.

**New files:** `apps/web/src/store/slopeSurveyStore.ts` (persisted `byProject` register +
ephemeral `active`/`activeProjectId` takeover flag + `open`/`close` + `selectSlopeSurveyTotals`;
`SLOPE_CLASS_COLORS` graduated cool→hot ramp, `SLOPE_TOOL_BY_CLASS` + reverse `SLOPE_CLASS_BY_TOOL`);
`apps/web/src/v3/act/terrain/{SlopeSurveyDrawHost,SlopeSurveyLayer,SlopeSurveyPanel,SlopeSurveySummary}.tsx`
(+ `SlopeSurveyPanel.module.css`, `SlopeSurveySummary.module.css`).

**Edits (7 integration sites, mirroring the veg-survey recipe):**
- `TerrainCapture.tsx` — export `SLOPE_CLASSES`, `SlopeClass`, `COMPASS_DIRS`; relax the slope
  validity branch to `slopeSum > 0`.
- `DecisionWorkingPanel.tsx` — `terrainMode === 'slope' ? <SlopeSurveySummary…> :` before the
  generic `TerrainCapture` branch (mirrors `ecologyMode === 'vegetation'`).
- `ActTierShell.tsx` — `slopeOpen`/`slopeActive` (`active && activeProjectId === id &&
  objectiveId === 's2-terrain'`); `&& !slopeActive` in `showTierZeroWorkbench`; `SlopeSurveyLayer`
  + `SlopeSurveyDrawHost` as DiagnoseMap children; `slopeActive` branch in the `rightBody`
  precedence chain; slope `.close()` added to the sectors mutual-exclusion block.
- `actToolCatalog.ts` — six `slope-*` entries, `category: 'terrain-survey'`, `Triangle` icon;
  updated the "analysis-only OMITTED" comment (slope is now drawable).
- `useMapToolStore.ts` — six `act.terrain.slope-*` literals on the `MapToolId` union.
- `packages/shared/src/relationships/objectiveActTools.ts` — append the six ids to the
  `s2-terrain` override + update the gap comment (aspect stays the only non-drawable gap).
- `apps/web/src/lib/syncManifest.ts` — import `useSlopeSurveyStore`; register
  `blob('ogden-slope-survey', …, 'byProject', 1, …)`.

**Amanah:** topographic land-reading / measurement only — no riba, gharar, or ethical exposure.
Halal.

**Verified:** `packages/shared` `tsc --noEmit` clean; `apps/web` `tsc --noEmit` clean (the app's
`lint` npm script *is* `tsc --noEmit` — there is no separate ESLint gate for the app, so passing
tsc is the canonical lint pass); `actToolCoverage.test.ts` 17/17 on the bounded **forks** pool
(per [[feedback-vitest-bounded-runs]]) — confirms the six new catalog ids resolve. Live DOM
proof in the running dev app (port 5200, project `75cfb3ed…`, route
`/act/tier-shell/s2-terrain`): inline `SlopeSurveySummary` mounts (empty-state + "Open map
survey" + 9 aspect chips); clicking "Open map survey" renders the map canvas, the
`SlopeSurveyPanel` (6 class rows + Unclassified remainder), and all 6 bottom-tray draw tools
("Draw flat (0–2%)" … "Draw extreme (>30%)"); arming a panel row reactively flips its
`aria-pressed` to `true` and the panel hint to "Draw a polygon on the map…". `preview_screenshot`
timed out at 30s — the **known transient map-view hang** (stale API + MapLibre WebGL) per
[[project-screenshot-hang]], **not** a defect in this feature; the DOM-level evidence above
stands in for the image. The one piece not exercised live is the turf acreage→% on a physically
drawn polygon (the eval harness can't synthesize a mapbox-gl-draw completion) — the math is the
same pure selector as the production veg survey.

**Branch hygiene:** on **main**, the canonical line per [[project-structured-capture-on-main]].
Committed this slice on explicit request; **not pushed** (push still requires the operator's
go-ahead).
