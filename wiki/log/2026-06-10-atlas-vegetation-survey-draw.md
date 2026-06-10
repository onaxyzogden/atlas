# 2026-06-10 — Vegetation-community draw-on-map survey: s2-ecology-c1 auto-% from polygons

**main** (committed in a combined slice with concurrent slope-survey + wiki work, on the
operator's explicit "commit everything now"; **not pushed**). Converted the `s2-ecology-c1`
"Vegetation survey" decision from an inline Tier-0 checklist (toggle 7 community types +
hand-type a % of site) into a **draw-on-map rail-takeover** — the first of the draw-on-map
surveys (the slope survey, `s2-terrain-c2`, mirrors it). While the Act map is loaded the right
rail lists the 7 vegetation communities, the bottom tray offers a polygon draw tool, and each
community's **% of total site area** is computed automatically from drawn polygon acreage with an
"Unclassified / not yet surveyed" remainder. ADR:
[[decisions/2026-06-10-atlas-vegetation-survey-draw]]; entity [[entities/act-tier-shell]].

**Three confirmed design decisions** (operator, before building):
1. **Draw-only, % auto** — manual toggle + percent entry removed for `mode === 'vegetation'`
   only; the other 4 ecology subtasks (species / corridors / connectivity / waterHabitat) stay
   inline and unchanged.
2. **Dedicated survey layer** — drawn polygons live in a NEW `vegetationSurveyStore`
   (semantically "observed existing vegetation"), **not** the Plan `designElementsStore`, so they
   never appear as designed elements on the Plan map.
3. **Single tool + in-panel community picker** — one `act.ecology.veg-survey` map tool; the store
   carries `activeCommunity` (set by the panel row) and `VegetationSurveyDrawHost` tags the
   completed polygon with it. (The slope survey later inverted this to six per-class tools with
   no `activeClass`; both patterns now coexist deliberately.)

**Auto-% math.** `selectVegetationSurveyTotals(features, siteAcres)` is a pure selector:
per-community summed acres → `pct = siteAcres > 0 ? (acres / siteAcres) * 100 : 0`
(divide-by-zero guarded), plus `totalAcres`, per-community `count`, and
`unclassifiedPct = clamp(100 - Σpct, ≥ 0)`. Per-feature acreage =
`turf.area(geom) * 0.000247105` (same constant as design elements). `siteAcres` reads from
`project.location.acreage` — acreage lives on `ProjectLocation`, NOT `Project` (this was the root
cause of the only real typecheck error in the build, fixed `project?.acreage` →
`project?.location.acreage` in the panel + summary). On "Done" the totals encode back into the
existing `ecologyCommunities` FormValue (`['cleared::25', …]`) so the Tier-3 zone-allocation feed
and summary text keep working untouched; the draft-sync effect fires only when
`features.length > 0`, so an empty survey never clobbers legacy hand-typed values.

**New files:** `apps/web/src/store/vegetationSurveyStore.ts` (persisted `byProject` register +
ephemeral `active`/`activeProjectId`/`activeCommunity` takeover flags + `open`/`close`/
`setActiveCommunity`/`addFeature`/`removeFeature`/`updateGeometry` + `selectVegetationSurveyTotals`
+ `VEG_COMMUNITY_COLORS`; PERSIST_KEY `ogden-vegetation-survey`, version 1, `partialize` to
`byProject`); `apps/web/src/v3/act/ecology/{VegetationSurveyPanel,VegetationSurveyDrawHost,
VegetationSurveyLayer,VegetationSurveySummary}.tsx` (+ two `.module.css`).

**Edits (mirrored later by the slope-survey recipe):** `EcologyCapture.tsx` (export
`VEG_COMMUNITIES` as the single source of community keys/labels; drop the editable inputs for
`mode === 'vegetation'` only), `DecisionWorkingPanel.tsx` (`ecologyMode === 'vegetation'` route →
read-only computed summary + "Open map survey" button before the generic Ecology branch),
`ActTierShell.tsx` (`surveyActive` forces the map branch over the Tier-0 workbench, mounts
`VegetationSurveyLayer` + `VegetationSurveyDrawHost` as DiagnoseMap children, swaps
`VegetationSurveyPanel` into the right rail, mutual-exclusion with the sectors / as-built
takeovers), `actToolCatalog.ts` (`vegetation-survey` tool, `category: 'ecology-habitat'`,
`mapToolId: 'act.ecology.veg-survey'`), `useMapToolStore.ts` (`act.ecology.veg-survey` on the
`MapToolId` union), `objectiveActTools.ts` (`s2-ecology` override), `syncManifest.ts`
(`ogden-vegetation-survey` `byProject` blob — the coverage-guard test fails otherwise).

**Amanah:** ecological land-reading / measurement only — no riba, gharar, or ethical exposure.
Halal.

**Verified:** whole-tree `tsc --noEmit` clean (apps/web + packages/shared, exit 0; the only real
error — `Property 'acreage' does not exist on type 'Project'` — was root-caused to the
`ProjectLocation` type hierarchy and fixed, not patched away). The substantive promise
("percentages calculated automatically") is pinned by a NEW deterministic **13/13** unit suite
`apps/web/src/store/__tests__/vegetationSurveyStore.test.ts` on the bounded **forks** pool (per
[[feedback-vitest-bounded-runs]]): empty → 100% unclassified, single-community pct, multi-polygon
summing + count, independent communities + shrinking remainder, clamp at 0 when overdrawn,
divide-by-zero → 0% (not NaN/Infinity), ignores non-finite/negative acreage, plus byProject
mutations (id/createdAt assignment, removeFeature isolation, updateGeometry recompute, per-project
isolation) and ephemeral-flag behaviours (open clears community, close resets). The one path NOT
exercised live is the in-browser turf→% on a physically drawn polygon — `preview_screenshot` hit
the **known transient map-view hang** ([[project-screenshot-hang]]: dead `/api/v1` proxy +
MapLibre WebGL canvas), disclosed honestly rather than claimed; that path is the same pure
selector the 13 tests pin.

**Branch hygiene:** on **main**, the canonical line per [[project-structured-capture-on-main]].
The working tree was being mutated by ≥2 concurrent sessions during close (the Exit/Adaptive
captures self-committed mid-session as `e297bd1d`/`40bd6e01`; the slope survey landed in shared
files alongside this work). On the operator's explicit "commit everything now" the whole
uncommitted tree was committed as one slice; **not pushed** (push still requires the operator's
go-ahead).
