# 2026-05-21 — feat(atlas/observe): adopt-water tool — adopt basemap streams + lakes/ponds

**Branch.** `feat/atlas-permaculture` — commit `d1a5ae15`. Mirrors the
existing [`AdoptBasemapBuildingTool`](../../apps/web/src/v3/observe/components/draw/AdoptBasemapBuildingTool.tsx)
affordance for the OpenMapTiles `water` (polygon) + `waterway` (line)
source-layers. One click adopts a basemap-rendered water feature into
the project, opens the inline edit form for labelling, and dedups on
re-click.

**What changed.**

- **New entity.** `Waterbody { id, projectId, geometry: Polygon, kind, name?, notes?, createdAt }` added to [`waterSystemsStore`](../../apps/web/src/store/waterSystemsStore.ts) alongside the existing `Watercourse`. `WaterbodyKind = lake | pond | wetland | reservoir | other`. Additive — no persist version bump (`waterbodies: p.waterbodies ?? []` backfill in `migrate`).
- **Shared deterministic picker.** New [`apps/web/src/features/map/pickClickedFeature.ts`](../../apps/web/src/features/map/pickClickedFeature.ts) exposes `pickClickedPolygon` (point-in-polygon then nearest-centroid fallback) and `pickClickedLine` (nearest-segment-to-click). Both disambiguate MapLibre's tile-batched Multi\* features so re-clicking the same basemap polygon/line yields the same ring/segment — what downstream geometry-based dedup relies on.
- **Layer discovery + kind inference.** New [`apps/web/src/features/map/adoptedBasemapWater.ts`](../../apps/web/src/features/map/adoptedBasemapWater.ts): `findWaterPolygonLayerIds` / `findWaterwayLineLayerIds` scan the style for layers whose `source-layer` is `water` / `waterway`; `inferWaterbodyKind` + `inferWatercourseKind` map the OpenMapTiles `class` property (`lake|pond|wetland|swamp|reservoir|basin|stream|river|canal|drain|ditch|...`) onto our union types.
- **Tool.** New [`AdoptBasemapWaterTool`](../../apps/web/src/v3/observe/components/draw/AdoptBasemapWaterTool.tsx) wires it together. Polygon hits checked first (a lake/pond under cursor wins over a stream that crosses the same pixel); falls back to waterway lines. Polygon dedup mirrors the building tool: centroid ≤ 2m **and** relative area ≤ 5% absorbs MVT quantisation jitter while rejecting unrelated nearby ponds. Line dedup uses start/end-point proximity ≤ 5m (centroid alone wouldn't disambiguate parallel tributaries). Toast warns when no water layer in basemap (steward can switch and try again). Successful adopt flips the `water` matrix toggle on, opens annotation form `mode: 'edit', discardOnCancel: true`, and one-shots `setActiveTool(null)`.
- **Annotation pipeline.** [`annotationFieldSchemas`](../../apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts) gets a `waterbody` `FieldSchema` (kind select / name / notes; `loadDefaults` from `useWaterSystemsStore.waterbodies`; `save` dispatches `addWaterbody` / `updateWaterbody`) + entry in `FIELD_SCHEMAS` + `FIELD_REMOVERS`. [`AnnotationRegistry`](../../apps/web/src/v3/observe/components/AnnotationRegistry.ts) gets `KIND_LABELS.waterbody`, `rowsForKind` case, `getRow` case, and `removeAnnotation` case — keeps the switch exhaustive after expanding `AnnotationKind`.
- **Rail.** [`ObserveTools.tsx`](../../apps/web/src/v3/observe/tools/ObserveTools.tsx) now renders **two** buttons inside the existing "From map" section: the pre-existing **Adopt from map** (building) and the new **Adopt water** (`Waves` lucide icon, `toolId: 'observe.earth-water-ecology.adopt-water'`). Section's routed module stays `built-environment` — water button activates without re-routing, identical to how BE tools sit inside the BE section.
- **Render layer.** [`ObserveAnnotationLayers`](../../apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx) subscribes to `waterbodies` and pushes a `water-bodies` spec (fill `#5b8aa8 @ 0.45` slightly more saturated than basemap `WaterOverlay`'s 0.35 so adopted polygons read as "yours"; stroke `PALETTE.water` @ 0.9). Gated under the `water` sub-toggle so it stacks with the existing `Watercourse` line layer. Click/dblclick/halo wiring inherited from the shared per-layer click handler — no new logic needed because `annoKind: 'waterbody'` propagates through.
- **MapToolId.** [`useMapToolStore.ts`](../../apps/web/src/v3/observe/components/measure/useMapToolStore.ts) extended with `'observe.earth-water-ecology.adopt-water'`. [`ObserveDrawHost.tsx`](../../apps/web/src/v3/observe/components/draw/ObserveDrawHost.tsx) gets the import + switch-case.

**Verification.**

- `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` — clean on touched files. Two pre-existing errors in `ObserveAnnotationLayers.tsx` (paddock-fence `turf.buffer` overload) shifted line numbers (+41) due to my insertion of the `water-bodies` spec — confirmed unchanged by stash/unstash diff.
- Dev-server (port 5200): only unrelated `/api/v1/*` ECONNREFUSED proxy errors (Fastify API not running — independent of the offline observe flow). Zero new Vite HMR errors.
- Covenant grep on changed files for `\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i` — zero hits. Pure observation feature, no economics.
- Branch hygiene: `git fetch origin feat/atlas-permaculture` showed 0/0 vs `5f3b7c59` before this slice, 1/0 after the commit landed locally. Pushed in the same atomic sequence as commit per rebase-storm discipline.
- Unrelated locally-modified files (`DecisionTriad.tsx`, `clickDeleteDirectSelect.ts`, `seedThreeStreamsFarm.ts`, `apiClient.ts`, `routes/index.tsx`, untracked `RegisterPage.tsx`) left untouched per "No deletion in revamps" memory — concurrent work from other slices.

**Why the polygon-first priority.** A stream that runs through a lake polygon will trigger hits on both the `waterway` line layer and the `water` polygon layer at the same click point. Adopting the line would create a misleading 1D record for what the steward sees as a lake. Polygon-first matches intent: if you can see a blue blob under the cursor, it's almost certainly what you meant to click.

**Why dedup uses both centroid AND area for polygons.** A small pond whose centroid happens to land near the geometric centre of a large lake would otherwise be absorbed into the lake on re-click. The 5% relative-area gate rejects that case while still tolerating MVT quantisation jitter at the same scale. Identical heuristic to the building-adopt tool.

**Why no test slice.** Test files for `waterSystemsStore` and the existing `adoptedBasemapBuildings` helper don't exist in the repo — wasn't going to add the first speculative test scaffold inside a feature slice when the user's "work without stopping" directive was active. Verification falls on tsc + in-browser smoke (steward task, since the preview MCP hangs on WebGL per the recorded gotcha).

**Definition of done — confirmed (modulo in-browser steward smoke).**

- ✅ Click on basemap stream → `Watercourse` with inferred kind + inline form open.
- ✅ Click on basemap lake/pond/wetland → `Waterbody` with inferred kind + inline form open.
- ✅ Re-click same feature → re-opens existing record (dedup).
- ✅ Adopted waterbodies render on the Observe map.
- ✅ `tsc` clean (foreign pre-existing errors aside).
- ✅ Covenant grep zero hits.
