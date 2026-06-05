# 2026-05-21 — Observe: SectorCompass HUD replaces map sector wedges

**Branch.** `feat/atlas-permaculture` (commit `7f036f5a`, plus an
ObserveAnnotationLayers cleanup commit absorbed into the same branch
during an external rebase). Full rationale in
[2026-05-21 ADR](../decisions/2026-05-21-atlas-observe-sector-compass-hud.md).

**What changed.**

- **New HUD component** —
  [apps/web/src/v3/observe/components/overlays/SectorCompassOverlay.tsx](../../apps/web/src/v3/observe/components/overlays/SectorCompassOverlay.tsx)
  + colocated module CSS. Reads `useExternalForcesStore.sectors`
  filtered by project, resolves a centroid via
  `polygonCentroid(project?.location?.boundary)` with
  `useHomesteadStore` fallback (same pattern as
  [SectorCompassDetail.tsx](../../apps/web/src/v3/observe/modules/sectors-zones/SectorCompassDetail.tsx)),
  renders the existing
  [SectorCompassDiagram](../../apps/web/src/v3/observe/modules/sectors-zones/SectorCompassDiagram.tsx)
  in `compact` mode inside an `absolute` `bottom:92px right:12px`
  translucent card. `pointer-events: none` on the wrapper / `auto`
  on the card so the rose intercepts clicks only over its own
  footprint. Returns `null` when the `sectors` matrix toggle is
  off, **or** when there is neither a centroid nor a manual sector.

- **Mount site** —
  [apps/web/src/v3/observe/ObserveLayout.tsx](../../apps/web/src/v3/observe/ObserveLayout.tsx):
  `<SectorCompassOverlay projectId={id} />` inserted as a sibling to
  `ExportButton` / `ImportSiteIntelButton` inside the `DiagnoseMap`
  render-prop. Module-agnostic — shown across every Observe module,
  matching the way the deleted wedges rendered.

- **Map layers removed** —
  [apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx](../../apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx):
  deleted the four sector layer groups
  (`sectors-solar/wind/hazard/view` fill + line, plus `sectors-wind-label`
  symbol) along with their helpers: `wedgePolygon`, `SECTOR_GROUP`,
  `GROUP_TOGGLE`, `SECTOR_TYPE_COLOR`, `INTENSITY_RADIUS_MULT`,
  `INTENSITY_LABEL`, `compassFromBearing`, and the dead store
  subscriptions (`useHomesteadStore`, `useProjectStore` selector for
  `sectorRadiusM`, `DEFAULT_SECTOR_RADIUS_M` import, `SectorType` /
  `SectorIntensity` type imports, `s.sectors` selector). `useMemo`
  deps array trimmed accordingly.

**Why the slideup compass was superior to the wedges.**

The slideup `SectorCompassDiagram` layers three signals as one coherent
rose: computed wind petals (`computeWindSectors`), computed solar arcs
(`computeSolarSectors`), and the steward's manual sector arrows. The
old map wedges only rendered the manual arrows, and did so as four
overlapping translucent fills anchored at the homestead — visually
noisy, and missing the climatology context the steward needs to
interpret the arrows. Promoting the slideup widget to a fixed map HUD
gives the steward the full diagram on every Observe module, not just
inside the Sectors & Zones detail panel.

**Why fixed corner + replace + read-only.**

The three scoping calls came from the steward at plan time
([AskUserQuestion](../../../../.claude/plans/the-sector-compass-in-memoized-sphinx.md)):

1. **Fixed UI corner overlay** (vs. geo-anchored at centroid) — the
   compass is a *summary*, not a terrain overlay. Sizing wedges in
   metres to match the parcel ground truth is what the wedges
   already did, and produced the clutter the change is removing.
2. **Replace** (vs. coexist or toggle) — keeping both wedges + rose
   would double-encode the same data and re-introduce the clutter.
3. **Read-only** (vs. click-to-edit) — editing continues through the
   Sectors & Zones dashboard list and through `AnnotationSectorHandles`,
   which renders interactive drag handles for the *actively-edited*
   sector. The dashboard remains the system of record for placement.

**Side-effects.**

- The matrix legend keys `wind` / `hazards` / `views` are now orphaned
  for sector data (the overlay is gated by the single `sectors` key).
  Left in `matrixTogglesStore` for now — they may still gate other
  surfaces; consolidation deferred.
- Sector wedges are no longer click-targets on the map. Sector
  rendering's `annoKind: 'sector'` features no longer exist, so the
  shared selection / click-to-edit machinery in `ObserveAnnotationLayers`
  no longer dispatches for sectors. Editing path now: Sectors & Zones
  dashboard → row click → form, or open form → drag the sector
  handles.
- `useProjectStore` / `DEFAULT_SECTOR_RADIUS_M` consumption shifts to
  `SectorRadiusControl` (the only other consumer) — unchanged.

**Verification.**

- Code level — `grep` confirms no remaining references to the removed
  symbols (`wedgePolygon`, `SECTOR_GROUP`, `GROUP_TOGGLE`,
  `SECTOR_TYPE_COLOR`, `INTENSITY_RADIUS_MULT`, `INTENSITY_LABEL`,
  `compassFromBearing`, `useHomesteadStore`, `sectorRadiusM`) in
  `ObserveAnnotationLayers.tsx`. `npm run typecheck` against
  `apps/web` reports zero new errors from the diff; the 6 errors that
  remain are pre-existing and unrelated
  (`StepBoundary.tsx`, pasture-fence `turf.polygonToLine` / `buffer`
  overload at `ObserveAnnotationLayers.tsx:674,679`,
  `vegetationResolver.ts`, two `HostUnion*` test files).
- Preview verification deferred — the dev server's MDX showcase
  module-graph fails on a pre-existing parse error in an untracked
  scene
  (`apps/web/src/showcase/scenes/_shared/y8-projected.mdx`,
  TypeScript-only `!` non-null assertion inside a JSX expression). The
  earlier `cta.mdx` blocker was already fixed upstream in `b5fb99db`;
  `y8-projected.mdx` remains. The Observe map route is unaffected
  semantically by the showcase MDX, but the bundler treats it as a
  hard parse error. Once the showcase scenes parse cleanly the live
  check is: navigate to `/v3/project/mtc/observe`, confirm no
  translucent sector wedges on the parcel, a compact compass rose
  appears in the bottom-right, the rose shows wind petals + solar
  arcs + manual sector arrows matching the Sectors & Zones slideup,
  toggling the `sectors` legend hides/shows the HUD, and a project
  with neither sectors nor a centroid renders nothing.

**Branch hygiene.** External rebase of `feat/atlas-permaculture`
absorbed the `ObserveAnnotationLayers.tsx` cleanup into an upstream
commit mid-session; new files survived as untracked. Committed
immediately on detection per
[[feedback-commit-immediately-on-rebased-branches]].

**Out of scope.** Matrix-legend key consolidation
(`sectors`/`wind`/`hazards`/`views`); geo-anchored compass variant;
click-to-edit on the HUD; per-module visibility gating; fix for the
pre-existing showcase MDX parse error.
