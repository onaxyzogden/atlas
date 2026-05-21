# 2026-05-21 — Habitat-feature unification into Plan design elements (Slices 1-3 landed, Slice 4 partial, wiped by external rebase)

**Branch.** `feat/atlas-permaculture`.

## Why

Sub-project **A2** (`HabitatAllocationCard` + `FeatureInventoryPanel`)
let the steward declare habitat commitments — owl/nest boxes, hawk/raptor
perches, hedgerows, insectary strips, brush piles, snags, wildlife ponds
— into `useHabitatFeatureStore`. The schema had an optional
`geometry?: Point | LineString` field, but no UI ever populated it: the
form was count/length scalars only. Habitat features were therefore
invisible to the map, the B5 beneficial-organism audit, the A3
biodiversity monitor, the Goal Compass criterion forecast, and the D0
work-item spine.

The chosen direction (steward decision): **unify habitat features into
design-element subtypes**. The 9 habitat types become first-class
`DesignKind` values under a new `habitat` category in
[`elementCatalog.ts`](../../apps/web/src/v3/plan/canvas/elementCatalog.ts),
placed via the existing Plan `DesignToolRail` pattern. `habitatFeatureStore`
is retained as a soft-deprecated legacy path; B5 math, A3 monitor, Goal
Compass forecast and the D0 spine all consume the unified design-element
kinds going forward. Covenant: additive, ecologically-framed; no
financial plumbing, no riba / gharar / CSRA / salam framing; stewardship
sovereignty preserved (user places features, system never auto-infers).

## What landed

The session executed against the plan
[`~/.claude/plans/habitat-features-need-a-lively-oasis.md`](../../.claude/plans/habitat-features-need-a-lively-oasis.md).
The five-slice phasing was followed; the first three slices were
committed and typechecked + vitest-green at the time of commit. After
this session's commits landed, an external interactive rebase replayed
the branch onto a new base and the three slice commits were dropped from
the resulting history (the canonical failure mode the
[[feedback-commit-immediately-on-rebased-branches]] memory was written
about — committed work survives rebases unless the rebase explicitly
drops the picks, which here it did). Slice-by-slice content is recorded
below so the work can be re-applied cleanly when the rebase storm
settles.

### Slice 1 — Catalog + tokens + tool dispatch (`43dd56a9`, dropped)

- Added `'habitat'` to `DesignCategory` union in
  [`elementCatalog.ts`](../../apps/web/src/v3/plan/canvas/elementCatalog.ts).
- Added 7 new first-class habitat kinds (hedgerow / pond / shrub remain
  in their existing categories, already counted by B5):
  - `owl-box` (point, phase `trees`, `defaultSpacingM: 30`)
  - `raptor-perch` (point, phase `trees`, `defaultSpacingM: 50`) —
    collapses the redundant `hawk_perch` + `raptor_perch` pair.
  - `nest-box` (point, phase `trees`, `defaultSpacingM: 8`)
  - `brush-pile` (point, phase `soil`)
  - `snag` (point, phase `trees`, `defaultSpacingM: 15`)
  - `insectary-strip` (line, phase `soil`, `draw_line_string`)
  - `wetland-edge` (polygon, phase `water`, `draw_polygon`)
- Added 6 `COLORS.habitat*` token entries (Box, Perch, Brush, Snag,
  Insectary, Wetland).
- Lucide icons reused: `Bird`, `Eye`, `Sprout`, `TreeDeciduous`,
  `Flower2`, `Waves`.
- **Discovery (against plan assumption):** tool dispatch is NOT fully
  catalog-driven. Required explicit switch cases in
  [`useToolIdToElementKind.ts`](../../apps/web/src/v3/plan/canvas/useToolIdToElementKind.ts)
  (7 cases mapping `plan.habitat-allocation.<kind>` → kind string), a
  new template-literal arm in `MapToolId`
  ([`useMapToolStore.ts`](../../apps/web/src/v3/observe/components/measure/useMapToolStore.ts)),
  and a new `'habitat-allocation'` entry in `TOOL_GROUPS`
  ([`PlanTools.tsx`](../../apps/web/src/v3/plan/PlanTools.tsx)) with 7
  `ToolItem` entries.

### Slice 2 — Inline metadata schema (`933c0709`, dropped)

- Added optional `habitatMetadata?` field directly on `DesignElement`
  in [`designElementsStore.ts`](../../apps/web/src/store/designElementsStore.ts):
  ```ts
  habitatMetadata?: {
    mountingHeightM?: number;
    heightM?: number;
    approxHeightM?: number;
    cavityCount?: number;
    notes?: string;
  };
  ```
- **Scope decision:** the original plan called for a per-kind inline
  popover; scoped down to schema-only because the four downstream
  consumers (B5, A3, Goal Compass, D0) score by presence + geometry,
  not metadata. A future slice can wire a kind-specific popover via
  `useInlineFormStore` without breaking the schema.

### Slice 3 — B5 audit math + functional catalog (`ac11dfa6`, dropped)

- Extended `BeneficialStructureKind` union in
  [`beneficialFunctionCatalog.ts`](../../apps/web/src/features/biodiversity/beneficialFunctionCatalog.ts)
  with the 7 new kinds.
- Added 7 new `BENEFICIAL_STRUCTURE_FUNCTIONS` entries, each carrying
  cited categories + rationale + citation (Cornell Lab NestWatch,
  Audubon Working Lands, USDA NRCS, USDA Forest Service PNW-GTR-181,
  Xerces CSP 422). Preserves the B5 cite-every-claim covenant.
- Extended `BeneficialHabitatOverall` in
  [`beneficialHabitatMath.ts`](../../apps/web/src/features/biodiversity/beneficialHabitatMath.ts)
  with `owlBoxCount`, `raptorPerchCount`, `nestBoxCount`, `brushPileCount`,
  `snagCount`, `insectaryStripLengthM`, `wetlandEdgeAreaM2`.
- Extended the structural-element loop with 7 new arms; updated
  `structuralPoints` formula:
  ```
  hedgerowM/100 + pondM²/500 + shrubs
    + owlBoxes + raptorPerches + nestBoxes + brushPiles + snags
    + insectaryStripM/100 + wetlandEdgeM²/500
  ```
- Score envelope unchanged (still `min(40, structuralPoints * 4)`
  clamped by the existing 0-100 cap; effect on existing projects is
  monotonic increase, never decrease).
- Tests added in
  [`beneficialHabitatMath.test.ts`](../../apps/web/src/features/biodiversity/__tests__/beneficialHabitatMath.test.ts)
  (21/21 green) and
  [`beneficialFunctionCatalog.test.ts`](../../apps/web/src/features/biodiversity/__tests__/beneficialFunctionCatalog.test.ts)
  (16/16 green) — "covers all 7 new habitat kinds with cited
  categories" test added explicitly.

### Slice 4 — Commitments selector + A3 panel + A2 read-only block (uncommitted, wiped)

- New module
  [`apps/web/src/features/biodiversity/habitatCommitments.ts`](../../apps/web/src/features/biodiversity/habitatCommitments.ts)
  exporting:
  - `HabitatCommitmentKind` (10-kind union)
  - `HABITAT_COMMITMENT_KINDS`, `HABITAT_COMMITMENT_LABELS`,
    `HABITAT_COMMITMENT_UNIT` records
  - `HabitatCommitmentTally` interface
  - `selectHabitatCommitments(designElements)` — full grouped tally
    including zero-rows
  - `selectPlacedHabitatCommitments(designElements)` — non-zero rows
- New test
  [`__tests__/habitatCommitments.test.ts`](../../apps/web/src/features/biodiversity/__tests__/habitatCommitments.test.ts)
  (10/10 green): empty input, point/line/polygon kinds, aggregation,
  unknown kinds ignored, hedgerow/pond/shrub joined.
- `BiodiversityMonitorCard.tsx`: new "Planned habitat commitments"
  sub-panel placed above the existing observed-outcomes rows.
- `FeatureInventoryPanel.tsx`: new read-only "Placed on map" summary
  block at the top of the panel (legacy scalar add-form retained
  intact below it as a soft-deprecated path).
- **Scope decision:** the plan's destructive `habitatFeatureStore`
  v1→v2 bridge migration was deliberately skipped; the legacy
  add-form continues to work and the bridge can be retired in a
  separate ADR once the parallel-session rebase storm settles.

### Slice 5 — D0 work-item spine seeder (not started)

- `habitatFeatureSpineSync.ts` planned to mirror `goalCompassSpineSync`
  diff/reconcile pattern with `overridden`-survives + `source`-guarded
  semantics. Not implemented this session.

## Verification at commit time

- `npm run typecheck` (apps/web) — exit 0 on each of the three
  committed slices.
- `npx vitest run src/features/biodiversity/__tests__/` —
  37/37 green (16 catalog + 21 math) after Slice 3; 47/47 green
  (16 catalog + 21 math + 10 selector) during Slice 4.
- Covenant grep across the new biodiversity files for
  `\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b` —
  no matches.

## Why it's not in HEAD now

After Slice 4 file writes, an external interactive rebase ran (initially
visible as `interactive rebase in progress; onto 968dd0bb` with 6 picks
done and 17 remaining, paused on a `wiki/log.md` merge conflict). The
rebase completed externally, the branch reset to a new HEAD
(`4745c5a3 docs(wiki): observe vertex edit + click-to-delete`) that
**does not contain** the three habitat-feature slice commits, and the
working tree was hard-reset, wiping the Slice 4 file edits and the two
new untracked files. Local now matches `origin/feat/atlas-permaculture`
exactly — nothing to push.

The commits `43dd56a9`, `933c0709`, `ac11dfa6` may still exist as
dangling objects in the git store (unreachable but not yet pruned), but
neither the reflog nor the active branch references them as of this
write. Re-applying the slices is straightforward against the plan
checked into `~/.claude/plans/`, plus this log entry, plus the four
modified consumer-facing files documented above.

## Follow-ups (next session)

1. **Re-apply Slices 1–4** against the current HEAD; commit each slice
   the moment it verifies (per `feedback_commit_immediately_on_rebased_branches`).
2. **Slice 5** — `habitatFeatureSpineSync.ts` (D0 work-item spine seeder).
3. **File ADR** `wiki/decisions/2026-05-21-atlas-habitat-features-unification.md`
   once Slice 5 lands.
4. **Retire legacy `habitatFeatureStore`** in a separate ADR once the
   rebase storm settles; bumps the persist key to `v2` with a one-shot
   migrate that either seeds geometry rows into `designElementsStore`
   or surfaces them as an amber "Place these legacy commitments" bridge
   strip per project.

## Files (canonical paths)

- New: `apps/web/src/features/biodiversity/habitatCommitments.ts`
- New: `apps/web/src/features/biodiversity/__tests__/habitatCommitments.test.ts`
- Modified: `apps/web/src/v3/plan/canvas/elementCatalog.ts`
- Modified: `apps/web/src/v3/plan/canvas/useToolIdToElementKind.ts`
- Modified: `apps/web/src/v3/observe/components/measure/useMapToolStore.ts`
- Modified: `apps/web/src/v3/plan/PlanTools.tsx`
- Modified: `apps/web/src/store/designElementsStore.ts`
- Modified: `apps/web/src/features/biodiversity/beneficialFunctionCatalog.ts`
- Modified: `apps/web/src/features/biodiversity/beneficialHabitatMath.ts`
- Modified: `apps/web/src/features/biodiversity/__tests__/beneficialFunctionCatalog.test.ts`
- Modified: `apps/web/src/features/biodiversity/__tests__/beneficialHabitatMath.test.ts`
- Modified: `apps/web/src/features/plan/BiodiversityMonitorCard.tsx`
- Modified: `apps/web/src/features/plan/habitatAllocation/FeatureInventoryPanel.tsx`
