# 2026-06-10 -- Objective-scoped "Placed features" list in the Act right rail + sourceObjectiveId stamp

**Branch:** `main` (structured-capture line; OLOS-UI-adoption merged out-of-band).
**Commit:** `f3e2860a` -- 33 files, +1208 / -25, staged by explicit pathspec. **Not pushed.**
**Plan:** `the-displayed-area-calculations-sharded-charm` (APPROVED). All six phases (0-5) now complete.

## Brief

Operator, verbatim: *"when map features drawn/placed, present a list of the selected
objective's map features/elements in the right sidebar."* Selecting a Plan objective in
the Act tier and drawing features on the map left **no per-objective readout** of what
had been placed -- the canvas was opaque, and the right-rail objective detail
(`ActTierExecutionPanel`) showed only checklist / evidence / activity.

## What shipped

`ActTierExecutionPanel` gained a **"Placed features"** section between Checklist and
Evidence, listing exactly the features drawn for the selected objective:

- each row = swatch/icon . label . kind . area;
- **row-click** flies the Act canvas to the feature centroid (zoom 17);
- per-row **x** deletes from the feature's source store after `window.confirm`.

## The derive seam (core architecture)

Placed features are not objective-tagged in legacy data -- they are scoped by
`projectId` + Yeomans `phase` only. So "this objective's features" is **derived**:

```
getObjectiveActTools(objective)        // @ogden/shared -- catalogue-id strings
  -> ACT_TOOL_CATALOG[id].arm          // resolve to ActTool, skip unknowns
  -> filter(arm.kind === 'map')        // drop log/form/flow/zone-action arms
  -> arm.mapToolId                     // MapToolId[]
  -> matchedDescriptors(ids)           // NEW registry: literal-or-prefix match
  -> descriptor.list(projectId)        // store records of that kind
  -> records.map(descriptor.toRow)     // unified PlacedFeatureRow[]
```

Two net-new modules in `apps/web/src/features/shared/placedFeatures/`:

- `objectiveFeatureRegistry.ts` -- the single `mapToolId -> store` resolution that was
  previously buried in the DrawHost switches. A `PlacedFeatureDescriptor` per family
  carries `list` / `toRow` / bound `remove()`; matched by `MapToolId` literal or prefix.
  Built-env matches `observe.built-environment.*` OR `plan.structures-subsystems.be.*`
  (NOT the bare `...structure`). Covers **all 9** placed-feature stores (vs. the
  stage-scoped card's 3): crops, paddocks+fences, built-env V2, land-design, water
  systems (4 water tools -> `waterNodes`), zones, paths, veg survey, slope survey.
- `useObjectivePlacedFeatures.ts` -- the stable-snapshot derive hook (Zustand v5 rule:
  never return a fresh array from a selector). Unions the tool-derived rows with a
  forward-looking `sourceObjectiveId === objective.id` match.

`DiagnoseMap` (the Act canvas) gained the Map-Focus consumer effect mirroring
`DesignMap` -- without it the rail row-clicks no-op, since the focus store was only
consumed by `DesignMap` + `ProvePage`.

`usePlacedFeatures.ts` was touched to extend `centroidOf` for water-store records that
carry `center: [lng,lat]` + `swaleGeometry` (no plain `.geometry`), and to export the
shared `*ToRow` builders for the registry to reuse.

## Phase 5 -- provenance stamp (this session)

Every placed-feature record gained an optional additive `sourceObjectiveId?: string`:
the 8 web stores plus the shared `BuiltEnvironmentEntity` Zod schema (the field flows
into `CreateBuiltEnvironmentInput` automatically, since that type only omits
id/createdAt/updatedAt/serverId). Stamped at draw time from `ActTierShell`'s route-param
`objectiveId`, threaded through `PlanDrawHost` to all 12 derive-covered child tools, the
two survey hosts (`VegetationSurveyDrawHost`, `SlopeSurveyDrawHost`), `BeV2ExistingTool`,
and `useDesignElementDrawTool`. Non-derive-covered Plan tools (Structure, Guild,
Fertility, FlowConnector, Utility*, BufferRing, EcologicalNote, MonitoringTransect,
Slaughter/ColdChain/MarketNode, ScheduleMove) deliberately left unstamped.

Fully additive / back-compat: legacy + non-objective draws load `undefined` and still
derive in via the tool path; no schema or persist bump (`byKey` spreads whole records
structurally, so the optional field round-trips untouched). This lets the list later
tighten from derive-by-tools to exact per-objective without a geometry backfill.

## Verification

- `apps/web` `tsc --noEmit -p tsconfig.json` EXIT 0 (`NODE_OPTIONS=--max-old-space-size=8192`,
  read via `${PIPESTATUS[0]}` so the `| head` pipe did not mask the code).
- Bounded vitest (Windows -- never unbounded; default threads pool zombies at exit):
  `npx vitest run --pool=forks --testTimeout=20000 src/features/shared/placedFeatures`
  -- **31/31** green across 3 files (`objectiveFeatureRegistry.test.ts` 14 = registry
  resolution incl. prefix match + unknown->undefined + multi-store derive +
  log/form-only->[]; unchanged `usePlacedFeatures.test.ts` 14 + `PlacedFeaturesCard.test.tsx`
  3 proving legacy records still derive). See [[feedback-vitest-bounded-runs]].
- Preview walkthrough on `:5200` **deferred to next session** -- the one gate that
  type-check + unit tests cannot exercise (fresh draw under an armed objective lands with
  `sourceObjectiveId` set and the row appears live, row-click flies the canvas, x deletes).
  Map-view `preview_screenshot` can hang on the dead `/api/v1` proxy + WebGL canvas
  ([[project-screenshot-hang]]); verify via DOM/snapshot if so.

## Commit hygiene

The working tree carried unrelated in-flight work (an EcologyCapture cluster + the two
pre-existing `actToolCatalog.ts` / `objectiveActTools.ts` edits the operator asked to
leave alone). Staged ONLY the 33 placed-features files by explicit pathspec; the foreign
files remain unstaged. Not pushed (standing rule on `main`: push nothing without asking).

## Amanah

The feature enumerates, focuses, and (with confirm) deletes the steward's **own** map
placements -- land-reading + UI plumbing only. No riba, no gharar, no
`bay' ma laysa 'indak`. ([[fiqh-csra-erased-2026-05-04]])

## Links

Entities: [[entities/act-tier-shell]], [[entities/placed-features-card]].
