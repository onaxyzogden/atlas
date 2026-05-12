# ADR: Observe `--olos-*` Tokens Unified onto Atlas Palette

**Date:** 2026-05-12
**Status:** accepted — shipped
**Branch:** `feat/atlas-permaculture`
**Follows:** [2026-05-12-atlas-observe-port-retired.md](2026-05-12-atlas-observe-port-retired.md)
**Related:** [2026-05-11-atlas-observe-human-context-reskin.md](2026-05-11-atlas-observe-human-context-reskin.md), [2026-05-06-atlas-observe-port-styling.md](2026-05-06-atlas-observe-port-styling.md)

## Context

The 2026-05-12 observe-port retirement deleted the generated
`apps/web/src/v3/observe/styles/observe-port.css` and migrated every consumer
into a co-located CSS Module. The migration intentionally left token names
untouched — every module continued to reference the `--olos-*` namespace via
`var(--olos-…)`. Those tokens had been declared inside the deleted generated
stylesheet. The only surviving `:root { --olos-*: … }` block lives in
`apps/atlas-ui/src/styles.css`, which is a **sibling Vite app**, not imported
by `apps/web`.

Net effect immediately after the retirement:

- References *with* fallbacks (e.g. `var(--olos-muted, #888)`) resolved to
  their fallback — visually flat, palette-disconnected from Plan / Act.
- References *without* fallbacks (`var(--olos-green)`,
  `var(--olos-font-display)`, `var(--olos-panel)`, `var(--olos-focus-ring)`,
  …) resolved to invalid → the CSS property was dropped — actively broken
  styling on charts, focus rings, hero typography, and panel surfaces.

49 occurrences across 16 `.module.css` files referenced 10 distinct
`--olos-*` tokens.

## Decision

Per-file token swap, adopt the atlas palette. Every `var(--olos-…)`
reference replaced with the closest token from
`apps/web/src/styles/tokens.css`. No bridge shim, no per-stage palette
extension. Outcome: Observe, Plan, and Act now consume a single token
namespace; the dangling `--olos-*` references in `apps/web` are eliminated.

User-confirmed direction: **adopt atlas palette** (atlas's earthier
sage/gold/earth tones) over preserving OLOS's brighter yellow-green/cream
palette — same direction as the 2026-05-11 Human Context reskin onto
shared stageCard primitives.

## Mapping

| OLOS token | Atlas replacement | Notes |
|---|---|---|
| `--olos-font-display` | `var(--font-display)` | Both = Cormorant Garamond. 1:1. |
| `--olos-font-ui` | `var(--font-sans)` | Both = Inter. 1:1. |
| `--olos-green` (#a5c736 bright yellow-green) | `var(--color-sage-600)` (#527852) | Earthier sage; matches `data-stage='observe'` hero family. |
| `--olos-gold-bright` (#d5a43a) | `var(--color-gold-brand)` (#d4af5f) | Near-identical hex. |
| `--olos-cream` (#f3e2c8) | `var(--color-earth-100)` (#f2ede3) | Warm off-white; InsightSidebar accent only. |
| `--olos-muted` (+ fallback `#888`) | `var(--color-panel-muted)` (#5a5443) | Used for both body-muted text and SVG chart axes/labels. |
| `--olos-border` (+ fallback `#d8d8d8`/`#b8b8b8`) | `var(--color-panel-card-border)` | SVG chart gridline strokes. |
| `--olos-text` (+ fallback `#222`) | `var(--color-panel-text)` (#1f231e) | HazardRiskMatrix hover-row text. |
| `--olos-card-bg` (+ fallback `#fff`) | `var(--color-panel-bg)` (#ffffff) | HazardRiskMatrix hover-row bg. |
| `--olos-radius-card` | `var(--radius-lg)` (12px) | Card radius. |
| `--olos-panel` | `var(--color-panel-card)` | SurfaceCard / NextStepsPanel body bg. |
| `--olos-line-soft` | `var(--color-panel-card-border)` | Card borders. |
| `--olos-focus-ring` (full shorthand `2px solid rgba(195,208,54,.95)`) | `2px solid var(--color-focus-ring)` | Atlas exposes the colour only; declaration restructured at each callsite. |

## Files

16 `.module.css` files under `apps/web/src/v3/observe/`:

- `_shared/components/`: SurfaceCard, ActionCard, ProgressRing,
  NextStepsPanel, ModuleSummaryCard, ModuleCard, MetricStrip, InsightSidebar
- `components/AnnotationListCard.module.css`
- `modules/topography/`: SeasonalSolarStrip, ElevationProfileChart,
  ElevationHistogram, AspectCompass
- `modules/macroclimate-hazards/`: SunPathDiagram, MonthlyClimateChart,
  HazardRiskMatrix

No `.tsx` changes were needed. `--olos-focus-ring` was restructured at its
two callsites (ActionCard, ModuleCard) because atlas exposes the focus-ring
colour as a colour token, not a full `outline` shorthand.

## Verification

- `grep -rn "var(--olos-" apps/web/src/` → 0 matches.
- `pnpm --filter @ogden/web typecheck` → clean.
- Dev preview restarted (clears stale HMR). Routes spot-checked:
  - `/v3/project/demo/observe/topography` — Topography slide-up renders;
    MetricStrip, hero, Terrain tab cards all visually consistent with
    Plan / Act (sage greens, gold-brand accents, panel-muted text).
  - SunPathDiagram, MonthlyClimateChart, ElevationProfileChart,
    ElevationHistogram, AspectCompass — chart strokes and axis labels
    render (previously broken or fallback-grey).
- Console errors: only the pre-existing button-in-button DOM-nesting
  warning from `ObserveModuleBar.tsx`, unrelated to this migration.

## Consequences

- One token namespace across the app — Observe, Plan, Act all consume
  `apps/web/src/styles/tokens.css`. Future palette tweaks are a single-file
  edit.
- The `:root { --olos-*: … }` block in `apps/atlas-ui/src/styles.css`
  remains as the OLOS reference but no longer affects `apps/web`.
- Visual identity continues the 2026-05-11 Human Context reskin direction:
  the earthier atlas palette is now the global Observe palette, not only
  the Human Context module.
- No bridge shim was created; future modules built in `apps/web` should
  reference atlas tokens directly. Anyone touching `apps/atlas-ui` may
  continue to use `--olos-*` tokens there — the two apps are independent.
