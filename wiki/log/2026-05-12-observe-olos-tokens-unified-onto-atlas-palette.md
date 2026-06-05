# 2026-05-12 — Observe `--olos-*` tokens unified onto atlas palette


**Closed.** Follow-up to the same-day observe-port retirement. The 16
co-located Observe `.module.css` files still referenced the `--olos-*`
namespace (49 occurrences across 10 distinct tokens); those declarations
lived only in the deleted generated stylesheet plus the unimported sibling
`apps/atlas-ui/src/styles.css`. References with fallbacks rendered flat;
references without (`--olos-green`, `--olos-font-display`, `--olos-panel`,
`--olos-focus-ring`, …) silently dropped the property. Per-file token swap
applied across `_shared/components/` (SurfaceCard, ActionCard, ProgressRing,
NextStepsPanel, ModuleSummaryCard, ModuleCard, MetricStrip, InsightSidebar),
`components/AnnotationListCard`, `modules/topography/` (SeasonalSolarStrip,
ElevationProfileChart, ElevationHistogram, AspectCompass), and
`modules/macroclimate-hazards/` (SunPathDiagram, MonthlyClimateChart,
HazardRiskMatrix). Atlas palette adopted over OLOS (`--olos-green` →
`var(--color-sage-600)`, `--olos-gold-bright` → `var(--color-gold-brand)`,
`--olos-cream` → `var(--color-earth-100)`, `--olos-muted` →
`var(--color-panel-muted)`, etc.); `--olos-focus-ring` shorthand restructured
to `2px solid var(--color-focus-ring)` at its two callsites. No `.tsx` edits.
Pre-flight grep `var(--olos-` → 0 matches in `apps/web/src/`. Typecheck
clean. Preview restarted, Topography slide-up + charts render with atlas
sage/gold/earth tones replacing the previously broken/fallback-grey output.
Full record:
[wiki/decisions/2026-05-12-atlas-observe-token-unification.md](decisions/2026-05-12-atlas-observe-token-unification.md).
