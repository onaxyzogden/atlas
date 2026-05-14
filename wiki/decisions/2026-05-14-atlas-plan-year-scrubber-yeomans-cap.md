# 2026-05-14 — Plan year scrubber subsumes Year 1 / Year 5 view tabs

## Context

The Plan stage's `PlanPhaseTabs` top strip exposed five tabs:
`Current Land · Vision Layout · Year 1 · Year 5 · 3D Terrain`. The two
"Year" tabs were `phase-1` and `phase-2` in the `PlanView` union, and
their only job was to drive `PHASE_VIEW_CAP` — the Yeomans Scale of
Permanence cap that filters which design elements (and which
phaseStore-tagged entities, via the 2026-05-12 adapter) render on the
canvas and in module cards.

The temporal year scrubber landed 2026-05-13 (see
`2026-05-13-atlas-temporal-slider.md`) as a bottom-canvas Year 1..50
control for canopy maturity. On 2026-05-14 it gained a dedicated
summon toggle on the same `PlanPhaseTabs` strip, which made the
existing `Year 1` / `Year 5` tabs redundant: the steward already had
a continuous year axis a click away. The redundancy was the steward's
read of the surface (literal words: "Year 1 and Year 5 from the
floating toolbar since it is now redundant").

The steward chose the deeper migration: **transfer the Yeomans-cap
role off the two tabs and onto the scrubber's `currentYear`, then
delete the tabs entirely** rather than leave the union populated with
unreachable values.

## Decision

1. **`PlanView` shrinks to three values**: `'current' | 'vision' |
   'terrain3d'`. `'phase-1'` and `'phase-2'` are removed.
2. **`PHASE_VIEW_CAP` is deleted.** Replaced by a pure function in
   `apps/web/src/v3/plan/types.ts`:
   ```ts
   export function yeomansCapForYear(year: number): PhaseKey | null {
     if (year <= 2) return 'water';      // matches old Year 1 tab
     if (year <= 5) return 'buildings';  // matches old Year 5 tab
     return null;                        // Year 6+ → uncapped
   }
   ```
   Thresholds chosen so behaviour at the two prior tab landings is
   bit-identical: cold-load lands at Year 5 (existing default in
   `temporalScrubStore`) which caps at `buildings`, matching the old
   `phase-2` landing.
3. **Five cap consumers migrated** to subscribe to
   `useTemporalScrubStore((s) => s.currentYear)` and derive the cap via
   `yeomansCapForYear`:
   - `apps/web/src/v3/plan/usePhaseCappedEntities.ts`
   - `apps/web/src/v3/plan/usePhaseStoreCappedEntities.ts`
   - `apps/web/src/v3/plan/canvas/layers/DesignElementLayers.tsx`
   - `apps/web/src/v3/builtEnvironment/layers/DesignElementExtrusionLayer.tsx`
   - `apps/web/src/v3/builtEnvironment/layers/DesignElementScenegraphLayer.tsx`
4. **`PlanViewBadge`** appends `Year N · capped at <PhaseKey>` to the
   active-view label, replacing the per-tab year-string labels. The
   cap surface stays legible on every Plan module slide-up even
   without the tabs.
5. **`PlanLayout.isVisionCanvas`** simplifies to
   `view === 'vision' || view === 'terrain3d'`.
6. **`view` props** on `DesignElementLayers`,
   `DesignElementExtrusionLayer`, `DesignElementScenegraphLayer` are
   retained where other code paths (origin-view scoping, etc.) still
   consume them; only the cap-derivation line changed.

## Out of scope

- **`BuildPhase` entity ids `'phase-1' | 'phase-2'`** in
  `beSchemaRegistry.ts` are an unrelated domain (BuildPhase entity
  identifiers, not `PlanView`) and were not touched.
- **`phaseStore.DEFAULT_PHASES`** keeps seeding `yeomansCap` per
  entity. Only the view-side cap derivation moved; the entity-side
  tag and the phasing-matrix Yeomans-chip control remain.
- **Pixel-perfect tick alignment** over the native range thumb's
  ~8 px inset would require a custom slider. The
  `TemporalScrubSlider` tick row now positions labels at
  `((y - 1) / 49) * 100%` with `translateX(-50%)` — close enough that
  Year 5 / 15 / 30 read as aligned with the thumb while staying on
  the native input.

## Stakes

- Stewards lose the one-click Year 1 / Year 5 landings, but gain a
  continuous Yeomans axis from Year 1 through Year 50 instead of two
  hard-coded landings.
- Any persisted Plan-stage local React state pointing at `phase-1` /
  `phase-2` would be type-invalid — `activeView` is component-local
  `useState`, not persisted, so it always cold-loads at `'current'`
  and no migration is required.
- The `view` prop on the three layer components is now effectively
  unused for cap derivation but retained for per-view origin scoping
  / future restoration if the tabs ever return.

## Verification

- `tsc -p apps/web --noEmit` clean.
- Preview at `/v3/project/mtc/plan` shows
  `Current Land · Vision Layout · 3D Terrain · Year scrub` with no
  Year 1 / Year 5 pills.
- Tick row positions in the DOM (verified via preview_eval):
  `1 @ 0%`, `5 @ 8.16%`, `15 @ 28.57%`, `30 @ 59.18%`, `50 @ 100%`.

## Related

- `2026-05-13-atlas-temporal-slider.md` — original scrubber ADR.
- `2026-05-12-plan-phasestore-yeomans-adapter.md` — adapter that
  consumes the new year-driven cap on the entity side.
