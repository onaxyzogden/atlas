# 2026-05-16 — fix(plan): auto-design paddocks contained to steward-tagged livestock zones + parcel-clip + equal-area


The steward reported **Generate site design** stamped draft paddocks
**outside the area drawn and deemed suitable for livestock** — "the
only consideration currently is the zone." Code-verified root cause,
three compounding defects: (1) `GenerateSiteDesignBar` built
`AllocatorZone[]` *without* `permacultureZone`, so the existing
`permacultureRingRange` hard-veto in `zoneAllocator` was dead code in
production (always `undefined`) and the paddock interventions' `[3,4]`
gate never fired; (2) `scoreZone` hard-vetoed only `avoidedCategories`
— every other category scored `0` but stayed a candidate, so once the
livestock zone filled, strips spilled elsewhere; (3) no parcel /
suitability containment existed anywhere (no parcel field on
`AutoDesignInput`; `stripSubdivide` clipped only to the zone;
`commitDrafts` wrote geometry with zero clipping). **Amplifier:**
`ringSeedGenerator` seeds Z4 as a full, non-parcel-clipped Mollison
annulus with `defaultCategoryForZ(4) = 'livestock'`; that giant
"livestock" zone won the allocator's area tiebreak and paddocks tiled
it far outside the parcel — precisely "the only consideration is the
zone." Additionally the steward required generated paddocks **roughly
equal size**; the old equal-bbox-width bands collapsed to slivers
wherever a zone narrowed.

Steward-confirmed decision: (1) "Suitable for livestock" is an
explicit per-zone **opt-in toggle** on drawn ecology zones — not
category/ring/draw-tool derived; (2) containment is **strict +
parcel-clipped** — paddocks only land in tagged zones, never spill,
geometry always clipped to the parcel; (3) within one set
`(max − min) / max ≤ 0.10`. Because any zone with
`suitableForLivestock !== true` (including the ring-seeded Z4
`livestock` annulus, which carries no flag) gets **no** paddocks, the
reported amplifier collapses by construction.

Fix (pure-engine first, one narrow UI surface): optional
`suitableForLivestock?: boolean` on `LandZone` + `AllocatorZone`
(optional-field pattern → **no `ogden-zones` persist bump**); strict
allocator veto in `scoreZone` after the `avoidedCategories` veto
(`affinity.preferredCategories?.includes('livestock') &&
zone.suitableForLivestock !== true` → `return null`, the existing
hard-veto contract → no spill, non-livestock unaffected); the call
site now maps `permacultureZone` + `suitableForLivestock` into
`AllocatorZone[]` (reviving the dead ring veto as defence-in-depth)
and passes `parcelBoundary`; `runAutoDesign` clips `zone ∩ parcel`
(reusing `parcelPolygon` / `toPolygonFeature` / `intersectPolys`)
**before** subdivision for the `tile-strip` template only (null
region → existing `emptyGeometryInterventionIds` path, no new UI);
`stripSubdivide` rewritten to place each inter-strip boundary by
bisecting the sweep coordinate (fixed 28 iterations, pure + no RNG)
until cumulative clipped area reaches `k/n` of the polygon's true
area — `(max−min)/max ≤ 0.10` now holds by construction on irregular
polygons. `edge-line` fences + `centroid/fill/bbox` keep their
zone-geometry input (smallest blast radius; parcel-clipping those is
a noted follow-up).

**Verification.** `cd apps/web && npx tsc --noEmit` — exit 0. vitest
**892/892** (70 files): new/extended pure-engine coverage —
`zoneAllocator` (livestock vetoed when flag `undefined`/`false`,
allocated when `true`, non-livestock unaffected), `stampers`
(`(max−min)/max ≤ 0.10` on a right-triangle, acre-count + determinism
preserved), `runAutoDesign` (the **real, unmocked** pipeline: real
catalog → sequencing → strict-veto allocator → parcel clip →
equal-area subdivide; all `tile-strip` drafts within `zone ∩ parcel`,
per-group `≤ 0.10`, zero drafts when the suitable zone is outside the
parcel, determinism). **One initial failure was a wrong test
assumption, not an implementation bug** — evidence-gathered via a
throwaway diagnostic: `makeGoalTree()` never selects
`cattle-rotational-grazing` / `small-ruminant-paddock`; its
`tile-strip` livestock infrastructure is `silvopasture-alley` +
`integrated-stock-cropland`. The engine was provably correct (zone
area 19,782,951 → exactly half 9,891,475 when parcel-clipped; every
strip equal; all `within parcel`). Fix: the test's `isPaddock` helper
now keys on the `tile-strip` **template** — the plan's actual
contract — not catalog IDs this goal tree doesn't produce; diagnostic
file removed. Edited modules serve HTTP 200 from Vite; ZonePanel
wiring confirmed on disk (the served esbuild transform splits the JSX
text child so a `curl | grep` of the literal is a false negative).
**Live screenshot walkthrough not obtainable** — the preview
screenshot tool returns black frames for this WebGL/MapLibre app
(even the landing page) and the steward flow needs login → project →
hand-drawn polygon → ring seeding → multi-step Goal Compass; disclosed
rather than faked (project rule), the integration tests assert the
steward's exact invariants with numeric precision the eye cannot
match.

ADR: `wiki/decisions/2026-05-16-atlas-paddock-livestock-containment.md`.
Refines `2026-05-14-auto-design-pipeline.md`; interacts with
`2026-05-15-atlas-zone-generator-seam-ring-seeding.md` (the reported
amplifier).

**Committed this session:** the 11 fix files (`zoneStore.ts`,
`autoDesign/types.ts`, `ZonePanel.tsx`, `zoneAllocator.ts`,
`GenerateSiteDesignBar.tsx`, `runAutoDesign.ts`,
`stampers/stripSubdivide.ts`, and the four `__tests__` files
`fixtures.ts` / `zoneAllocator.test.ts` / `stampers.test.ts` /
`runAutoDesign.test.ts`) **plus** these 3 wiki pages (ADR + this log
entry + index). The other concurrent in-progress working-tree files
(graphify-out re-extraction, the v3 plan canvas/draw set, concentric /
ZonesOverlay / zoneSizeGuide / MapCanvas / routes/index, the deleted
`zoneEmphasisStore`) were **scoped out** and remain uncommitted —
deliberately not `git add -A`.
