# 2026-05-12 — observe-port path C: tightened consumer audit + revised phase plan


**Motive.** Phase 1 (built-environment) finding revealed the
[`scripts/map-observe-port-consumers.py`](../scripts/map-observe-port-consumers.py)
scanner was matching every identifier-shaped token inside every
quoted string — false positives like `'sprout'` (ICON_MAP key)
counted as a `.sprout` class consumer. Before continuing with
phases 2–7 the audit needed to be honest.

**Change.** Rewrote the scanner to look only at JSX-style consumption:

- `className="literal"` / `className='literal'` — whitespace-split
  the literal into class tokens.
- `className={...expr...}` — extract every quoted/backtick string
  slice from the expression, strip `${...}` template interpolations
  (those are CSS-module identifier refs, not bare classes), then
  whitespace-split the remainder.
- `clsx(...)`, `classnames(...)`, `cn(...)` calls — same string-slice
  extraction over the call's argument list.

**Result.** Real-consumer count drops from **154 → 90** (-42%);
orphan count rises from 891 → **955** out of 1045 (91% orphan).

**Revised per-module list:**

| Module | Real classes | Consumer .tsx |
|---|---:|---|
| built-environment | **0** | — |
| sectors-zones | **0** | — |
| swot-synthesis | **0** | — |
| earth-water-ecology | 2 | 5 small viz components |
| human-context | 7 | `CapacityOrbit.tsx`, `MoodboardUploader.tsx` |
| macroclimate-hazards | 23 | `HazardHotspotsMap`, `HazardRiskMatrix`, `MonthlyClimateChart`, `SunPathDiagram` |
| topography | 23 | `AspectCompass`, `ElevationHistogram`, `ElevationProfileChart`, `SeasonalSolarStrip`, `SlopeLegendStrip`, `TerrainSnapshot` |

**Surprise: 37 classes consumed outside Observe modules.** The
`apps/web/src/v3/observe/_shared/components/` cluster (ActionCard,
ChipList, ModuleSummaryCard, InsightSidebar, MetricStrip,
ModuleCard, NextStepsPanel, ProgressRing, SurfaceCard, DataTable,
FormFields, AnnotationListCard) consumes patterns like
`.action-card`, `.chip-list`, `.dashboard-module-card`,
`.insight-sidebar`, `.metric-band`, `.module-art`, `.surface-card`.
These are atlas-wide shared chrome, not per-module. A handful of
features-tree files also dip in (`.good`, `.green`, `.high`,
`.warning` in access/climate/portal/rules cards).

**Revised phase plan:**

1. ~~built-environment~~ — no-op (confirmed phase 1).
2. **sectors-zones** — no-op (confirmed by audit).
3. **swot-synthesis** — no-op (confirmed by audit).
4. **earth-water-ecology** — 2 classes (`.compact`,
   `.is-empty`) across 5 component files. Trivial.
5. **human-context** — 7 classes, 2 component files
   (`CapacityOrbit`, `MoodboardUploader`).
6. **macroclimate-hazards** — 23 classes, 4 component files.
7. **topography** — 23 classes, 7 component files.
8. **NEW: observe `_shared/components/`** — 30+ classes across the
   atlas-wide Observe chrome cluster. Add `_shared/components` to
   the cleanup before deletion because `observe-port.css` cannot
   be deleted while these consume it.
9. **stragglers in `features/`** — `.good`, `.green`, `.high`,
   `.warning` in 4 unrelated cards. Inline these as small local
   helpers and drop the cross-tree coupling.
10. **finalize** — delete `observe-port.css`, the `.observe-port`
    wrapper class on `ModuleSlideUp.tsx:136`, and the
    `scripts/scope-observe-styles.mjs` generator. Update Observe
    README.

**Outcome.** Audit tool rewritten and committed. Phase 1 confirmed
no-op; phases 2 and 3 are also no-ops per the tightened audit.
Phases 4–10 carry the real work. Plan revised but not executed.
