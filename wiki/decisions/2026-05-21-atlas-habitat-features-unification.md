# ADR — Atlas: Habitat Features → Design Elements, Map-Placeable, Spine-Wired

**Date:** 2026-05-21
**Branch:** `feat/atlas-permaculture`
**Sub-project:** A2 ↔ B5 ↔ A3 ↔ D0 unification (habitat-feature placement
+ readout)
**Status:** Accepted — shipped in commits `f60a7eb3` (schema), `9e6d4a3e`
(store seam), `18231cb7` (spine seeder + tests), Commit D (host wiring), and
this ADR.
**Related:** [[2026-05-18-atlas-biodiversity-outcome-monitoring-a3]],
[[2026-05-19-atlas-b5-beneficial-organism-habitat]],
[[2026-05-20-atlas-b5-2-x-c-cover-crop-spine-completion]],
[[2026-04-28-atlas-permaculture-alignment-recs]]

---

## Context

Sub-project A2 lets the steward declare discrete habitat commitments —
owl/nest boxes, hawk/raptor perches, hedgerows, insectary strips, brush
piles, snags, wildlife ponds — but until this work-stream they lived in a
separate `habitatFeatureStore` with no geometry. The result: the placed
features were invisible to B5 (beneficial-organism audit, the
`computeBeneficialHabitatReport` envelope), A3 (biodiversity-outcome
monitor), the Goal Compass forecast, and the D0 work-item spine.

The stewardship-sovereignty covenant forbids auto-inferring habitat from
satellite imagery — the steward must *place* features deliberately. The
existing Plan `DesignElement` pattern already gives the user the right
ergonomics (palette → draw → inline-popover commit → store), so the right
move is to **promote habitat features into first-class `DesignKind` values**
under a new `'habitat'` category, rather than maintain a parallel
no-geometry store.

## Decision

Ship as five additive slices on `feat/atlas-permaculture`, all behind the
A-series additive covenant (`.passthrough()` schemas, no DB migration):

1. **Slice 1 — Catalog + tokens + tool dispatch.** Add seven habitat-only
   kinds (`owl-box`, `raptor-perch`, `nest-box`, `brush-pile`, `snag`,
   `insectary-strip`, `wetland-edge`) to `elementCatalog.ts` under a new
   `'habitat'` `DesignCategory`. `useDesignElementDrawTool` already
   dispatches by kind — no engine changes required.

2. **Slice 2 — Inline metadata schema field.** Add optional
   `habitatMetadata?` to `DesignElement` so the inline popover can carry
   per-kind details (mount-height, host-tree, target-species) without
   needing a new store. The bespoke per-kind popover is **deferred** —
   shipping with the generic inline popover is acceptable for the first
   release.

3. **Slice 3 — B5 math + functional catalog.** Extend
   `computeBeneficialHabitatReport` to credit the seven new kinds in the
   structural band. Catalog citations: Xerces Society, Cornell Lab of
   Ornithology, UC IPM, USDA NRCS, Audubon (mirrors the B5 ADR).

4. **Slice 4 — `habitatCommitments.ts` selector + A3 sub-panel + A2
   read-only block.** A single read-only selector projects across both
   the legacy `habitatFeatureStore` (soft-deprecated) and the unified
   design-elements, so A2 (`HabitatAllocationCard`) and A3
   (`BiodiversityMonitorCard`) render identical commitment counts.

5. **Slice 5 — D0 work-item spine seeder.** Add
   `source:'habitat-feature'` to the `WorkItemSource` enum and ship a
   `habitatFeatureSpineSync` (pure builder + side-effecting push) that
   mirrors `coverCropSpineSync` 1:1: per habitat-category DesignElement
   emit one stable `hf__<id>` WorkItem with a verb-led title. Wire from
   `PlanLayout.tsx` via a signature-keyed `useEffect`.

## Posture

- **Additive, ecologically-framed.** No financial plumbing, no riba /
  gharar / CSRA / salam / investor / financing / cost-of-capital framing.
  Stewardship sovereignty preserved — the user places features; the
  system never auto-infers them.
- **Single-writer-spine.** `replaceHabitatFeatureRows` only mutates
  `source:'habitat-feature'` rows; every other source survives untouched.
  `overridden:true` rows survive regeneration (steward edits are
  sovereign).
- **A-series additive covenant.** Schema additions are `.optional()` and
  default-protected; the top-level `.passthrough()` keeps persisted blobs
  hydrating clean. No DB migration.

## Scope decisions

| Decision | Choice |
|---|---|
| Habitat features get geometry on the map | Yes — promoted to `DesignElement` kinds |
| `habitatFeatureStore` retired now | No — kept as soft-deprecated read path; full retirement is a separate ADR once the rebase storm settles |
| D2 (resourcing) seeder for habitat features | Deferred — rows ship with empty `materialsAuto` |
| D3 (costing) seeder for habitat features | Deferred — no `costRangeAuto` |
| ~~D1 predecessor auto-edges (e.g. "install owl box only after host tree planted")~~ | **Closed by Slice 8** — `habitatMetadata.hostTreeFeatureId` → `dependsOnAuto: ['tree__<hostId>']` projection. Tree-planting seeder (Slice 8-A) provides the dependency target id; `habitatFeatureDependencyGraph.seedHabitatFeatureDependencies` (Slice 8-B) validates the host as a placed vegetation-category point DesignElement and silently drops missing / non-vegetation / non-point hosts |
| Bespoke per-kind inline popovers | Deferred (Slice 2 ships generic popover) |
| 3D GLB models for habitat features | Out of scope (uses 2D layer styling) |
| Server persistence | Not needed — design-elements + WorkItems sync client-local |
| Hedgerow / pond / shrub emitted by spine seeder | No — already counted by existing design categories; seeder is strictly the 7 new habitat-only kinds (mirrors Slice 3 math envelope) |

## Files

**Schema (commit A `f60a7eb3`):**
- `packages/shared/src/schemas/workItem.schema.ts` —
  `WorkItemSource` enum + `generatedFromHabitatElement?` provenance field

**Store seam (commit B `9e6d4a3e`):**
- `apps/web/src/store/workItemStore.ts` — `replaceHabitatFeatureRows`
  with override + cross-source preservation gate (1:1 mirror of
  `replaceCoverCropRows`)

**Seeder + tests (commit C `18231cb7`):**
- `apps/web/src/features/biodiversity/habitatFeatureSpineSync.ts` —
  `HABITAT_FEATURE_KINDS`, `habitatFeatureProvenanceId`,
  `seedHabitatFeatureWorkItems`, `pushHabitatFeaturesToSpine`
- `apps/web/src/features/biodiversity/__tests__/habitatFeatureSpineSync.test.ts` —
  11 tests across provenance / pure builder / preservation-gate

**Host wiring (commit D):**
- `apps/web/src/v3/plan/PlanLayout.tsx` — signature-keyed `useEffect`
  that re-pushes habitat-feature rows whenever the steward edits a
  habitat-category DesignElement

## Verification

1. **Typecheck:** `cd apps/web && npm run typecheck` — only pre-existing
   foreign errors remain (`StepBoundary.tsx(365,7)`,
   `TierChooser.tsx(12,*)`, `vegetationResolver.ts(86,29)`,
   `HostUnion*.test.tsx`). No new errors introduced by Slice 5.
2. **Tests green:**
   - `packages/shared` — 269/269 (schema + enum)
   - `apps/web` `workItemStore.test.ts` — 23/23 (preservation regression
     check)
   - `apps/web` `features/biodiversity` — 58/58 (11 new
     `habitatFeatureSpineSync` cases)
3. **Covenant grep** across new files: zero hits for `riba|gharar|csra|
   salam|investor|financing|cost-of-capital` outside the explicit
   disclaimer line in `habitatFeatureSpineSync.ts`.
4. **Smoke (deferred):** place an owl-box on the Plan canvas, open the
   work-item card — "Install owl box" appears under
   `source:'habitat-feature'`. Manual smoke deferred to next live dev
   session.

## Consequences

- **B5 score on existing projects is monotonic-increase.** New kinds add
  structural-band credit, none removed; the existing 0–100 envelope is
  preserved.
- **D0 spine carries a new source.** Goal Compass / cover-crop / rotation
  / habitat-feature rows now all live in `useWorkItemStore` with the same
  override-preservation contract.
- **D2 / D3 deferred.** ~~Habitat features ship with empty `materialsAuto`
  / no `costRangeAuto`.~~ **Closed by Slice 6 (2026-05-21):** the
  `habitatFeatureCatalog.ts` table now seeds per-kind kit lines
  (`materialsAuto`), low/mid/high project-cost bands (`costRangeAuto`),
  and per-element install labor (`laborHrs`) for all 7 habitat kinds.
  Point kinds carry flat per-element values; insectary-strip +
  wetland-edge scale by `safeLineLengthM` / `safePolygonAreaM2`.
  `habitatFeatureEconomicsMath.computeHabitatFeatureProgramEconomics`
  exposes the project- and per-kind labor + cost rollup for downstream
  cashflow. Citation backbone is the structured `HabitatSource[]` array
  (NRCS practice codes + extension orgs — Cornell NestWatch, Xerces,
  Audubon, UC IPM, USDA Forest Service, NRCS-WHC).
- ~~**D1 predecessor auto-edges deferred.**~~ **Closed by Slice 8
  (2026-05-21).** The auto-seam now exists end-to-end: (a) Slice 8-A-1
  added `'tree-planting'` to `WorkItemSource` + a
  `generatedFromTreeElement` provenance field +
  `replaceTreePlantingRows` store action; (b) Slice 8-A-2 shipped
  `treePlantingSpineSync` (one WorkItem per vegetation-category point
  DesignElement of the four tree-planting kinds — `oak-tree`,
  `pine-tree`, `apple-tree`, `shrub` — with stable id
  `tree__<designElement.id>`); (c) Slice 8-B added
  `habitatMetadata.hostTreeFeatureId?: string` to the inline schema +
  `habitatFeatureDependencyGraph.seedHabitatFeatureDependencies` (pure
  helper that validates the host as a placed vegetation-category point
  with a tree-planting kind) + projected the edge into
  `WorkItem.dependsOnAuto` via `seedHabitatFeatureWorkItems`. Missing /
  non-vegetation / non-point / non-tree-kind hosts silently collapse to
  `dependsOnAuto: []` — the habitat WorkItem stays valid, just
  unblocked. Stewardship sovereignty preserved: the user names the
  host; the system never auto-infers one. Line / polygon vegetation
  (hedgerow, orchard, silvopasture) remains out of scope for tree-
  planting WorkItem emission — those scale by length / area and ride
  the existing engine without auto-spine rows; a future S8-C may close
  that gap.
- **`habitatFeatureStore` is soft-deprecated.** Selector
  `habitatCommitments.ts` reads from both stores; new placements all flow
  through `DesignElement`. Full retirement of the legacy store is a
  separate ADR once branch stability returns.
- **Rebase-storm discipline held.** Slices 1–4 were verified at HEAD
  during plan-mode (no re-application needed). Slice 5 committed in five
  micro-commits (A schema → B store → C seeder → D host → E ADR) the
  moment each verified, per
  `~/.claude/memory/feedback_commit_immediately_on_rebased_branches.md`.
