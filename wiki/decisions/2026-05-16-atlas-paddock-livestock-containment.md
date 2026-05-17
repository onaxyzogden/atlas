# 2026-05-16 — Auto-design paddock containment: steward opt-in + parcel clip + equal-area

**Status:** Accepted
**Branch:** `feat/atlas-permaculture`
**Owner:** Yousef
**Plan:** `~/.claude/plans/the-automatic-generation-of-purring-platypus.md`
**Refines:** `decisions/2026-05-14-auto-design-pipeline.md` (the `tile-strip`
allocator → stamper path), interacts with
`decisions/2026-05-15-atlas-zone-generator-seam-ring-seeding.md` (the
ring-seeded Z4 annulus is the reported amplifier).

## Context

The steward reported that **Generate site design** stamped draft paddocks
**outside the area drawn and deemed suitable for livestock** — "the only
consideration currently is the zone." The generator was unusable for siting
grazing infrastructure.

Root cause (code-verified, not inferred) — three compounding defects:

1. **`permacultureZone` silently dropped at the call site.**
   `GenerateSiteDesignBar` built `AllocatorZone[]` without
   `permacultureZone`, so the existing `permacultureRingRange` hard-veto in
   `zoneAllocator` was dead code in production (`zone.permacultureZone`
   always `undefined`). The paddock interventions' `[3,4]` ring gate never
   fired.
2. **The allocator greedily spilled into any non-avoided zone.** `scoreZone`
   only hard-vetoed `avoidedCategories`; every other category scored `0` but
   stayed a candidate, so once the livestock zone filled, strips were stamped
   elsewhere.
3. **No parcel / suitability containment existed anywhere.** No parcel field
   on `AutoDesignInput`; `stripSubdivide` clipped only to the zone;
   `commitDrafts` wrote geometry with zero clipping.

**Amplifier:** `ringSeedGenerator` seeds Z4 as a full, *non-parcel-clipped*
Mollison annulus with `defaultCategoryForZ(4) = 'livestock'`. That giant
"livestock" zone won the allocator's area tiebreak and paddocks tiled it far
outside the parcel — precisely "the only consideration is the zone."

Additionally the steward required generated paddocks to be **roughly equal
size**; the old `stripSubdivide` cut equal-*bbox-width* bands that collapsed
to slivers wherever a zone narrowed (the file header already conceded
"equal-area-ish").

## Decision

Steward-confirmed:

1. **"Suitable for livestock" is an explicit per-zone opt-in toggle** on
   drawn ecology zones — *not* derived from category, ring, or a separate
   draw tool.
2. **Containment is strict + parcel-clipped.** Paddocks may only land in
   zones the steward tagged suitable, never spill into any other zone, and
   the stamped geometry is always clipped to the parcel boundary.
3. **Paddocks are roughly equal size:** within one generated set,
   `(max − min) / max ≤ 0.10`.

This makes the gate an explicit opt-in: any zone with
`suitableForLivestock !== true` — including the ring-seeded Z4
`livestock`-category annulus, which carries no such flag — receives **no**
paddocks, collapsing the reported amplifier by construction.

## Implementation

Pure-engine first; one narrow UI surface.

- **Data model (no persist bump — optional-field pattern):**
  `LandZone.suitableForLivestock?: boolean` (`zoneStore.ts`);
  `AllocatorZone.suitableForLivestock?: boolean` (`autoDesign/types.ts`).
  Existing persisted zones load as `undefined` ⇒ not suitable.
- **Strict allocator veto** (`zoneAllocator.ts`, in `scoreZone` after the
  `avoidedCategories` veto): if
  `affinity.preferredCategories?.includes('livestock') &&
  zone.suitableForLivestock !== true` → `return null`. Keyed on catalog data
  already present — the three livestock interventions
  (`small-ruminant-paddock`, `cattle-rotational-grazing`,
  `permanent-perimeter-fence`) all declare `preferredCategories:
  ['livestock']`. `return null` is the existing hard-veto contract → no
  spill; non-livestock interventions are unaffected.
- **Call site** (`GenerateSiteDesignBar.tsx`): map `permacultureZone` +
  `suitableForLivestock` into `AllocatorZone[]` (reviving the
  already-written-but-dead ring veto/score as defence-in-depth), and pass
  `parcelBoundary: project.parcelBoundaryGeojson ?? null` into
  `runAutoDesign`.
- **Clip-then-subdivide** (`runAutoDesign.ts`): new optional
  `parcelBoundary` on `AutoDesignInput`; build the parcel once via
  `parcelPolygon` (reused from `zoneGenerators/parcelGeometry.ts`). For the
  `tile-strip` template only, substitute the stamp input with
  `intersectPolys(toPolygonFeature(zone.geometry), parcel)` (reused from
  `autoDesign/geo.ts`) **before** subdivision; null region (suitable zone
  fully outside the parcel) → skip → the intervention falls into the
  existing `emptyGeometryInterventionIds` path (no new UI).
- **Equal-area subdivision** (`stampers/stripSubdivide.ts`, full rewrite):
  keep the count/axis logic (`n = clamp(round(areaM2/ACRE_M2), 2, 12)`,
  split the longer bbox axis), but place each inter-strip boundary by
  **bisecting the sweep coordinate** (fixed 28 iterations) until the
  cumulative clipped area reaches `k/n` of the polygon's true area. Pure +
  deterministic (no RNG) — same allocation ⇒ identical strips. `(max−min)/max
  ≤ 0.10` now holds by construction on irregular polygons.

## Consequences

- Strict opt-in **collapses the ring-annulus amplifier**: the Z4
  `livestock` ring carries no `suitableForLivestock` flag → zero paddocks
  there, which is the desired behaviour.
- Optional fields ⇒ **no `ogden-zones` persist version bump**.
- Equal-area `stripSubdivide` improves **every** `tile-strip` intervention
  (AMP paddocks **and** annual beds), not just paddocks — a desirable
  tightening; `stampers.test.ts` assertions are now stricter.
- **Scope boundary (smallest blast radius):** the parcel-clip + region
  substitution applies to `tile-strip` only. `edge-line` fences and
  `centroid/fill/bbox` keep their zone-geometry input (no behaviour change).
  Parcel-clipping fence lines and regeneration-fill drafts is a noted
  follow-up, not this bug.

## Files touched

- `apps/web/src/store/zoneStore.ts` — optional `suitableForLivestock`
- `apps/web/src/v3/plan/engine/autoDesign/types.ts` — `AllocatorZone` field
- `apps/web/src/features/zones/ZonePanel.tsx` — steward toggle (creation
  form + inline-edit row + zone-list chip + save path/dep array)
- `apps/web/src/v3/plan/engine/autoDesign/zoneAllocator.ts` — strict veto
- `apps/web/src/v3/plan/cards/goal-compass/GenerateSiteDesignBar.tsx` —
  map flag + `permacultureZone` + parcel into the run
- `apps/web/src/v3/plan/engine/autoDesign/runAutoDesign.ts` — clip
  `zone ∩ parcel` before subdivision (`tile-strip`)
- `apps/web/src/v3/plan/engine/autoDesign/stampers/stripSubdivide.ts` —
  equal-area bisection rewrite
- Tests: `__tests__/fixtures.ts`, `zoneAllocator.test.ts`,
  `stampers.test.ts`, `runAutoDesign.test.ts`
- Reused unchanged: `parcelPolygon` (`zoneGenerators/parcelGeometry.ts`),
  `toPolygonFeature`/`intersectPolys` (`autoDesign/geo.ts`)

## Verification

- `cd apps/web && npx tsc --noEmit` — exit 0.
- vitest **892/892** (70 files). New/extended pure-engine coverage:
  `zoneAllocator` — livestock intervention vetoed when
  `suitableForLivestock` is `undefined`/`false`, allocated when `true`,
  non-livestock unaffected; `stampers` — `(max−min)/max ≤ 0.10` on an
  irregular (right-triangle) polygon, acre-count formula and determinism
  preserved; `runAutoDesign` — drives the **real, unmocked** pipeline
  (real catalog → sequencing → strict-veto allocator → parcel clip →
  equal-area subdivide): all `tile-strip` drafts within `zone ∩ parcel`
  (`turf.booleanWithin`), per-group `(max−min)/max ≤ 0.10`, zero drafts
  when the suitable zone is fully outside the parcel, determinism.
- **One initial failure was a wrong test assumption, not an
  implementation bug.** Evidence-gathered via a throwaway diagnostic:
  `makeGoalTree()` never selects `cattle-rotational-grazing` /
  `small-ruminant-paddock`; its `tile-strip` livestock infrastructure is
  `silvopasture-alley` + `integrated-stock-cropland`. The engine was
  provably correct (zone area 19,782,951 → exactly half 9,891,475 when
  parcel-clipped; every strip equal; all `within parcel`). Fix: the test's
  `isPaddock` helper now keys on the `tile-strip` **template** — the
  plan's actual contract — instead of catalog IDs this goal tree doesn't
  produce. Diagnostic file removed.
- Edited modules serve HTTP 200 from Vite (no transform error); ZonePanel
  wiring confirmed on disk.
- **Live screenshot walkthrough not obtainable** — the preview screenshot
  tool returns black frames for this WebGL/MapLibre app (even the landing
  page), and the steward flow needs login → project → hand-drawn map
  polygon → ring seeding → multi-step Goal Compass. Disclosed rather than
  faked (project rule); the integration tests assert the steward's exact
  invariants with numeric precision the eye cannot match.

## Deferred

- Parcel-clip for `edge-line` fences + `centroid/fill/bbox`
  regeneration-fill drafts.
- The pre-existing `runAutoDesign.test.ts › routes livestock paddocks into
  the pasture zone` remains a guarded vacuous pass (`if
  (paddockDrafts.length)`) for this goal tree — left as-is (out of scope).
