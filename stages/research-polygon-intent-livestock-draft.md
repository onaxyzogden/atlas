# Polygon-Intent → Auto-Generated Livestock Sub-Features (MVP Plan)

**Date:** 2026-05-14
**Project:** Atlas (OLOS) — Plan stage
**Objective:** Let a user draw a parent polygon on the Plan canvas, declare "livestock" intent + a small species/headcount form, and have OLOS auto-generate paddocks, per-paddock shelter, per-paddock water-point (snap or propose), fencing, and a rotation schedule — as a reviewable draft layer the user accepts or discards.

**Context Source:** Codebase exploration (2026-05-14) — feasibility doc at `~/.claude/plans/how-feasible-is-it-atomic-sutherland.md`.

---

## Context

The Plan stage already has nearly every primitive this feature needs:
- **MapboxDraw polygon drawing** wired through [useDesignElementDrawTool.ts](apps/web/src/v3/plan/canvas/draw/useDesignElementDrawTool.ts)
- **Design-element catalog** in [elementCatalog.ts](apps/web/src/v3/plan/canvas/elementCatalog.ts) with `paddock`, `shelter`, `water-tank` kinds
- **Goal Compass auto-scheduler** — [scheduleTasksToCalendar.ts](apps/web/src/v3/plan/engine/goalCompass/scheduleTasksToCalendar.ts) already takes intervention rows and writes Act-calendar tasks (used by `GeneratedPlanTab` and `DevelopPlanTab`)
- **Livestock data model** in [livestockStore.ts](apps/web/src/store/livestockStore.ts) — `Paddock` + `FenceLine` types, with `grazingCellGroup`, `species`, `stockingDensity`, `pastureQuality`, `scheduleASubcategoryBySpecies` (Manitoba AU helper)
- **Water-source distance rule** ready to reuse: [waterSource.ts](apps/web/src/features/livestock/waterSource.ts) — `nearestWaterSource()` + `bandForWater()` (≤100m good / ≤200m fair / >200m poor)
- **Paddock coherence auditor** [PaddockCellDesignCard.tsx](apps/web/src/features/livestock/PaddockCellDesignCard.tsx) — already flags solo paddocks, area imbalance, species incoherence; the generator should produce paddocks that pass this card by construction
- **Rotation schedule** computer in [RotationScheduleCard.tsx](apps/web/src/features/livestock/RotationScheduleCard.tsx)
- **AU/Schedule-A** rollup in [scheduleA.ts](apps/web/src/features/livestock/scheduleA.ts)
- **Claude API client** already in the backend at [ClaudeClient.ts](apps/api/src/services/ai/ClaudeClient.ts) — available for Phase 2 free-text intent if/when desired (MVP stays deterministic)

This means the MVP is **wiring + one new geometry routine + one draft-state layer**, not a green-field build.

---

## MVP Scope (livestock-only)

**In scope**
1. After a polygon is drawn, surface an "Intent" chip popover (Livestock / Orchard / Annual crops / Water harvesting / None). Only `Livestock` is wired in MVP; others are stubs.
2. Livestock intent collects: species (multi), total headcount per species, target rotation period (days), recovery period (days).
3. Strip-subdivision into N paddocks where N is derived from `recovery / rotation` (e.g. 30/3 = 10 paddocks). Equal-area strips along the polygon's longest edge using Turf.js.
4. For each paddock, emit:
   - A `paddock` row in `livestockStore` (one grazing-cell group shared by all generated paddocks)
   - A `shelter` point (paddock centroid; later refinable to windward edge)
   - A `water-point` (snap to nearest existing water utility/structure/node within 200m via `nearestWaterSource`; else emit a *proposed* water-tank design element flagged "infrastructure required")
   - `FenceLine` segments along paddock boundaries (`permanent`)
5. Generate Goal Compass intervention rows for the new commit list — fencing install, water-network extension, shelter build — and write them to the Act calendar via existing `scheduleTasksToCalendar`.
6. **Draft layer**: all generated elements get a `generated-draft` phase tag and render with a dashed/translucent style. User clicks **Accept** (promote phase) or **Discard** (cascade delete) before they become real.

**Out of scope (Phase 2+)**
- Free-text intent parsing via Claude (the wiring slot will exist; classifier won't be implemented)
- Voronoi / contour-aware subdivision
- Orchard / crops / water-harvesting generators (interface only)
- Paddock DB persistence migration (paddocks stay in Zustand; design elements continue to use `design_features` table)
- Real-time recompute when user reshapes parent polygon

---

## Architecture

```
useDesignElementDrawTool.onComplete (polygon)
  → IntentPopover (new, in plan/draw/)
    → LivestockIntentForm collects { species[], headcount{}, rotationDays, recoveryDays }
      → generateLivestockPlan(parent, intent, siteContext)   // pure fn
          ├── subdivideStrips(parent, n) → Polygon[]
          ├── seedPaddockChildren(paddocks, intent, siteContext)
          │     → { paddocks, shelters, waterPoints, fences, proposedTanks }
          ├── buildInterventionRows(children, intent) → CompassRow[]
          └── return { drafts, interventions }
      → store.addLivestockDraft(drafts)
      → scheduleTasksToCalendar(interventions, …)
DraftReviewBar (new) → Accept | Edit | Discard
```

`generateLivestockPlan` is a pure function — testable without mounting the canvas.

---

## File plan

### New files
| Path | Purpose |
|---|---|
| `apps/web/src/v3/plan/draw/IntentPopover.tsx` | Chip menu shown after polygon completes |
| `apps/web/src/v3/plan/draw/LivestockIntentForm.tsx` | Species/headcount/rotation form inside popover |
| `apps/web/src/v3/plan/engine/generators/livestock/index.ts` | Public `generateLivestockPlan()` |
| `apps/web/src/v3/plan/engine/generators/livestock/subdivideStrips.ts` | Turf strip subdivision |
| `apps/web/src/v3/plan/engine/generators/livestock/seedChildren.ts` | Shelter / water / fencing seeding (calls `nearestWaterSource`) |
| `apps/web/src/v3/plan/engine/generators/livestock/buildInterventions.ts` | Compass rows for fencing, water, shelter |
| `apps/web/src/v3/plan/engine/generators/livestock/__tests__/subdivideStrips.test.ts` | Geometry unit tests |
| `apps/web/src/v3/plan/engine/generators/livestock/__tests__/seedChildren.test.ts` | Seeder unit tests (snap vs propose) |
| `apps/web/src/v3/plan/engine/generators/livestock/__tests__/generateLivestockPlan.test.ts` | End-to-end pure-fn test |
| `apps/web/src/store/generatorDraftStore.ts` | Holds draft sets keyed by generation-id; supports accept/discard |
| `apps/web/src/v3/plan/draw/DraftReviewBar.tsx` | Floating Accept / Discard / Edit bar |

### Files modified
| Path | Change |
|---|---|
| [useDesignElementDrawTool.ts](apps/web/src/v3/plan/canvas/draw/useDesignElementDrawTool.ts) | After polygon-kind = `paddock-area-intent`, surface IntentPopover instead of persisting directly |
| [elementCatalog.ts](apps/web/src/v3/plan/canvas/elementCatalog.ts) | Add a new kind `paddock-area-intent` (parent polygon for generation; geometry: polygon; category: grazing; phase: intent) |
| [livestockStore.ts](apps/web/src/store/livestockStore.ts) | Add `draft: boolean` field to `Paddock` and `FenceLine` (default false); persist; existing UI treats draft rows as visually distinct |
| [designElementsStore.ts](apps/web/src/store/designElementsStore.ts) | Add `phase: 'generated-draft'` value + selector helpers |
| [DesignElementLayers.tsx](apps/web/src/v3/plan/canvas/layers/DesignElementLayers.tsx) | Render `generated-draft` phase with dashed stroke + lower opacity |
| [PlanDrawHost.tsx](apps/web/src/v3/plan/draw/PlanDrawHost.tsx) | Mount IntentPopover + DraftReviewBar |

---

## Subdivision math (the one non-trivial algorithm)

```ts
// subdivideStrips.ts
// Input: parent Polygon + n (target paddock count)
// 1. Compute oriented bounding box (Turf: square + bearing of longest edge)
// 2. Rotate polygon so longest edge is along X-axis
// 3. Slice into n vertical strips of equal X-width
// 4. Intersect each strip with the rotated polygon (Turf.intersect)
// 5. Rotate strips back to original bearing
// 6. Filter out strips with area < 5% of parent (degenerate slivers)
// Output: Polygon[] of length ≤ n
```

Limitations (documented up front, not bugs):
- Concave polygons may produce a strip that splits into multiple disjoint pieces — keep only the largest piece per strip.
- Very irregular shapes: the user gets a **"Regenerate"** button to nudge to N±1 strips, plus manual vertex-drag on each paddock via the existing `PlanVertexEditHandler`.

---

## Paddock count derivation

```ts
function targetPaddockCount(rotationDays: number, recoveryDays: number): number {
  // Classic Voisin: paddocks needed = recovery / grazing-per-paddock + 1
  const n = Math.ceil(recoveryDays / rotationDays) + 1;
  return Math.min(Math.max(n, 4), 30); // clamp to sane bounds
}
```

Stocking-rate sanity check: after generation, compute total AU using existing `scheduleA.ts` helpers; if AU/ha exceeds the `pastureQuality` band's ceiling, surface a warning in the DraftReviewBar but don't block.

---

## Verification

End-to-end manual:
1. `pnpm dev` from repo root → open a project, navigate to Plan stage.
2. Pick the new "Paddock area (intent)" tool from the design element palette.
3. Draw a roughly rectangular polygon (~2 ha) on a project that already has a water tank inside it.
4. In the popover: cattle, 20 head, 3-day rotation, 30-day recovery.
5. Expect: **11 paddocks** drawn as dashed strips; shelters at centroids; water-points snap to the existing tank (band: good); fence lines on perimeters; Act calendar gains rows for "Permanent perimeter fence install", "Paddock water network", "Livestock shelter / windbreak".
6. Click **Accept** → paddocks lose the dashed style; `PaddockCellDesignCard` shows green or caution but no blocker findings.
7. Click **Discard** on a second generation → all draft rows and unscheduled Act tasks removed cleanly via existing `cascadeDelete`.

Automated:
- `subdivideStrips.test.ts` — areas sum to ≥98% of parent area; no overlaps; n strips returned for convex shapes.
- `seedChildren.test.ts` — when a `water_tank` utility is within 200m of all centroids, no proposed tanks emitted; when there's none within 200m, exactly one proposed tank emitted per disjoint cluster.
- `generateLivestockPlan.test.ts` — for a 2 ha rectangle with cattle/20/3/30: expect 11 paddocks, 11 shelters, ≥1 water point, fence line perimeter ≈ sum of paddock perimeters minus shared edges.
- `npm test` + `npm run lint` per project conventions.

---

## Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Strip subdivision looks ugly on irregular polygons | Med | Med | "Regenerate" button + manual vertex-drag; document limitations in popover help text |
| Generated paddocks fail `PaddockCellDesignCard` audit | Low | Low | Generator targets group coherence by construction (single group, equal areas, single species set) |
| Water-point snap radius (200m) wrong for a given project | Low | Low | Pull threshold from `WATER_BAND_THRESHOLDS_M.fair` directly — single source of truth already exists |
| Draft elements pollute other cards (e.g. capacity rollups) | Med | Med | All consuming selectors filter `phase !== 'generated-draft'` by default; opt-in flag where draft inclusion is desired |
| User clicks Accept then realises it's wrong | Med | Low | Each generation gets an id; `generatorDraftStore` keeps the last accepted batch reversible via the existing temporal-undo (zundo) middleware on `livestockStore` |
| Goal Compass rows duplicate if user generates twice | Med | Med | Tag intervention rows with `generationId`; replace-on-regenerate semantics |

---

## Staged execution

### Phase 1 — Pure geometry + generator (no UI)
- [ ] 1.1 `subdivideStrips.ts` + tests
- [ ] 1.2 `seedChildren.ts` + tests (calls existing `nearestWaterSource`)
- [ ] 1.3 `buildInterventions.ts` (reuses existing livestock Compass intervention ids from commit `357ea51f`)
- [ ] 1.4 `generateLivestockPlan()` orchestrator + end-to-end test
**Gate:** All three unit tests + the end-to-end test pass via `npm test`.

### Phase 2 — Draft state plumbing
- [ ] 2.1 Add `draft` field to `Paddock`/`FenceLine` in `livestockStore`; add `generated-draft` phase to design elements; update selectors
- [ ] 2.2 New `generatorDraftStore` with `commitDraft(id)` / `discardDraft(id)`
- [ ] 2.3 `DesignElementLayers` renders draft phase with dashed stroke
**Gate:** Existing Plan canvas still renders correctly with no drafts; smoke test confirms no regression.

### Phase 3 — UI surface
- [ ] 3.1 New `paddock-area-intent` element kind in catalog
- [ ] 3.2 `IntentPopover` + `LivestockIntentForm`
- [ ] 3.3 Wire `useDesignElementDrawTool` to surface popover on completion of `paddock-area-intent`
- [ ] 3.4 `DraftReviewBar` (Accept / Edit / Discard / Regenerate)
**Gate:** Manual verification flow above (steps 1–7) passes locally.

### Phase 4 — Compass integration
- [ ] 4.1 Pipe `buildInterventions` output through `scheduleTasksToCalendar`
- [ ] 4.2 Tag scheduled tasks with `generationId` for replace-on-regenerate
**Gate:** Act calendar shows the three intervention rows; regenerating replaces (not duplicates) them.

### Phase 5 — Polish
- [ ] 5.1 Stocking-rate warning in DraftReviewBar using `scheduleA.ts`
- [ ] 5.2 Help text on intent popover documenting limitations
- [ ] 5.3 `npm run lint` (must pass grounding gate + inline-refs auditor)
**Gate:** Full lint + test suite green.

---

## Definition of Done

A user can draw a polygon, choose "Livestock" intent, fill the small form, see a dashed-paddock draft layer with shelters, water snaps, fence lines, and three new Act calendar rows. Accept commits the layer; Discard removes it cleanly. `PaddockCellDesignCard` shows no blockers on accepted output. All new pure-fn modules have tests; lint + test suites are green.

---

## Deferred ideas (not for this PR)

- Free-text intent ("I want a few cattle and some chickens here") via existing `ClaudeClient`
- Orchard / annuals / water-harvesting generators behind the same `IntentPopover`
- Voronoi or contour-following subdivision
- DB-backed paddock persistence (`design_features` migration)
- Live recompute when parent polygon is reshaped post-acceptance
