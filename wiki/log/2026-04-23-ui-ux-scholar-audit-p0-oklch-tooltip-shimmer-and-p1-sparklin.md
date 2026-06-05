# 2026-04-23 — UI/UX Scholar audit: P0 (OKLCH + tooltip + shimmer) and P1 (sparkline)


### Context

Two-part session driven by `design-system/ogden-atlas/ui-ux-scholar-audit.md` (produced at start of 2026-04-23). Shipped the P0 items and the first P1 primitive.

### Part 1 — P0 (2026-04-23): OKLCH tokens, shimmer signifier, DelayedTooltip

**OKLCH elevation + semantic hues.** Added OKLCH primitives block in `apps/web/src/styles/tokens.css` (L steps 15.5 / 21 / 26.5 / 33, constant chroma + hue in warm-neutral space; separate L/C/H triples for primary/accent/success/warning/error/info). Wired overrides in `apps/web/src/styles/dark-mode.css` behind `@supports (color: oklch(0 0 0))`. Runtime-verified: `getComputedStyle(body).backgroundColor === "oklch(0.155 0.01 60)"`.

**Plan deviation:** Original plan proposed stacking hex + OKLCH declarations so older browsers would fall through. Custom-property values are strings, not colors — both store, `var(--color-bg)` resolves to the OKLCH string, and the invalid color computes to transparent on unsupporting browsers. Corrected with `@supports` gate.

**Shimmer signifier.** `.signifier-shimmer` utility in `apps/web/src/styles/utilities.css` — `@property --signifier-shimmer-angle` + conic-gradient border with mask compositing; `prefers-reduced-motion` disables the animation.

**DelayedTooltip primitive.** Discovered a feature-rich `<Tooltip>` at `apps/web/src/components/ui/Tooltip.tsx`. Built `DelayedTooltip.tsx` as ~30-line preset wrapper: 800 ms delay, `position="right"` default, `disabled` pass-through.

**Plan deviation:** Skipped unit tests — vitest config is `environment: 'node'` + `include: ['src/**/*.test.ts']`. Adding happy-dom + .tsx globs was out of scope.

**Rollout.** Replaced `title=` with `<DelayedTooltip>` and applied `signifier-shimmer` on active state across `IconSidebar.tsx`, `CrossSectionTool.tsx`, `MeasureTools.tsx`, `ViewshedOverlay.tsx`, `MicroclimateOverlay.tsx`, `HistoricalImageryControl.tsx`, `OsmVectorOverlay.tsx`, `SplitScreenCompare.tsx`.

### Part 2 — P1 (2026-04-24): Sparkline primitive + OKLCH elevation sweep

**Sparkline.** Zero-dep SVG micro-chart at `apps/web/src/components/ui/Sparkline.tsx` — neutral stroke, semantic accent as endpoint dot only (per Scholar §5). Props: `values: readonly number[]`, `width`, `height`, `stroke`, `accent`, `ariaLabel`. Default 60×18. Renders nothing for <2 points.

**Plumbing.** Extended `LiveDataRow` in `packages/shared/src/scoring/computeScores.ts` with `sparkline?: number[]` + `sparklineLabel?: string`. In `deriveLiveDataRows`, the Climate row pulls `climate.summary._monthly_normals`, sorts by month, extracts `precip_mm`, attaches as sparkline series (only when ≥3 finite values). Mirrored on local `LiveDataRow` in `apps/web/src/components/panels/sections/ScoresAndFlagsSection.tsx`; rendered `<Sparkline>` inside `liveDataRight` between value and classification chip.

**OKLCH elevation sweep.** Audited inline warm-neutral hex in `apps/web/src/**/*.tsx`. Most already used `var(--color-*, fallback)` pattern — only `apps/web/src/features/portal/PublicPortalShell.tsx:54` had a bare `background: '#1a1611'`, converted to `var(--color-bg, #1a1611)`. Decorative accents (hero gradients, brand gold text, map paint, canvas fills) intentionally left.

### Verification

- `tsc --noEmit` clean on both `apps/web` and `packages/shared`.
- Dev-server preview: body bg resolves to OKLCH, no console errors, Sparkline module resolves at runtime.
- Visual screenshot of sparkline on live Climate row deferred — authed project route with NOAA/ECCC normals not reachable from current dev session.

### Files changed

- `apps/web/src/styles/tokens.css` — OKLCH primitives.
- `apps/web/src/styles/dark-mode.css` — `@supports`-gated OKLCH overrides.
- `apps/web/src/styles/utilities.css` — `.signifier-shimmer` utility.
- `apps/web/src/components/ui/DelayedTooltip.tsx` — new.
- `apps/web/src/components/ui/Sparkline.tsx` — new.
- `apps/web/src/components/ui/index.ts` — exports.
- `apps/web/src/components/IconSidebar.tsx` — DelayedTooltip wraps.
- `apps/web/src/features/map/{CrossSectionTool,MeasureTools,ViewshedOverlay,MicroclimateOverlay,HistoricalImageryControl,OsmVectorOverlay,SplitScreenCompare}.tsx` — tooltip + shimmer.
- `apps/web/src/features/portal/PublicPortalShell.tsx` — bare hex → `var(--color-bg)`.
- `apps/web/src/components/panels/sections/ScoresAndFlagsSection.tsx` — `LiveDataRow.sparkline`, Sparkline render.
- `packages/shared/src/scoring/computeScores.ts` — `LiveDataRow.sparkline*`, climate precip series.
- `design-system/ogden-atlas/ui-ux-scholar-audit.md` — new audit doc.
- `design-system/ogden-atlas/impl-plan-oklch-tooltip.md` — new impl plan.

### Wiki updates

- 2 new ADRs: `2026-04-23-oklch-token-migration.md`, `2026-04-23-delayed-tooltip-primitive.md`.
- `wiki/entities/web-app.md` — UI primitives section updated.
- `wiki/index.md` — decision links appended.

### Deferred / follow-up

- Visual screenshot of sparkline on authed Climate row.
- Broader sparkline adoption (soil horizons, elevation profile, hydrology).
- `--l-popover` OKLCH tier (L=33) defined but not yet mapped to a `--color-*` surface.
- MeasureTools inner mode-selector `title=` left in place (compact popover, low discoverability value).

### Recommended next session

- ~~IA codification (§1) + panel decision matrix (§3) — P2 documentation in `design-system/ogden-atlas/`, codifying rail/popover/modal conventions.~~ **Landed in `c276c51`** as [`design-system/ogden-atlas/ia-and-panel-conventions.md`](../design-system/ogden-atlas/ia-and-panel-conventions.md); refreshed 2026-04-24 (see later entry). Or next H-tier audit item.
