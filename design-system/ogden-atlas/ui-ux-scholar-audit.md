# Atlas/OLOS — UI/UX Design Scholar Audit

**Date:** 2026-04-23
**Source:** Consultation with "Modern UI/UX Design Scholar" NotebookLM notebook (`995a59d1-be39-4173-9709-473f2665e64b`)
**Scope:** Audit only — no code changes. Dark-mode-first priority.
**Intended use:** Input to a subsequent implementation plan for P0/P1 items.

---

## Context

Atlas/OLOS is a geospatial land-intelligence SPA (React 18 + TypeScript + MapboxGL) whose UI shell (icon sidebar, right-rail panels, overlay system, dark mode) was assembled across the Solar/Climate, Hydrology, Soil, and Site-Intelligence phases. Before adding more surface area, the Design Scholar was consulted for guidance across six UX domains. This document compares current state against that guidance so the next implementation slice is informed rather than speculative.

**TL;DR** — The codebase is already aligned on the big dark-mode principles (elevation by luminance, warm slate base, desaturated brand colors, right-rail progressive disclosure). The highest-leverage gaps are (a) hex tokens ought to migrate to OKLCH for predictable overlay perceived-brightness, and (b) native `title=` tooltips should be replaced with a delayed-tooltip primitive.

---

## 1. Information Architecture — "Perimeter Strategy"

**Principle** — Treat the map as the hero; UI recedes to a perimeter. Left sidebar = navigation spine; top ~50px reserved for global actions and breathing room; info flows top→bottom, left→right.

**Current state**
- Icon sidebar serves as spine — phase/domain accordion with color-coded icons, collapsible to icon-only strip (`apps/web/src/components/IconSidebar.tsx:106–324`).
- Map is flex-filled hero; right-rail + left tool spine sit at the edges (`apps/web/src/features/map/MapView.tsx`).
- `LeftToolSpine` floats at `top: 132px; left: 12px; z-index: 2` — does not occlude map canvas (z=1) (`apps/web/src/features/map/LeftToolSpine.tsx:54–100`).
- No dedicated 50px global-action bar; MapStyleSwitcher cluster floats top-right (`apps/web/src/features/map/MapStyleSwitcher.tsx`).

**Gap** — Top-chrome conventions not codified; contributors reach for ad-hoc floating clusters (`GaezMapControls`, `SoilMapControls`, style switcher) without a shared placement rule.

**Recommendation** — Document a top-chrome convention in `MASTER.md` (no component changes): "top-right = mode/style controls; top-left = selection/project identity; everything else belongs in the rail or a popover." Defer any actual shell restructuring.

**Priority:** P2 (documentation).

---

## 2. Visual Hierarchy & Overlay Color — OKLCH + Active Signifier

**Principle** — "Nothing screams so everything is heard." Use OKLCH for consistent perceived brightness across overlay hues. Keep UI chrome neutral so it doesn't compete with map imagery. Use a shimmer stroke (moving gradient border) for active state, not saturated fills that occlude data.

**Current state**
- Tokens are **hex-locked** with paired RGB variants for `rgba()` blending (`apps/web/src/styles/tokens.css:128`, earth `#7d6140`, sage `#527852`, water `#2a6180`).
- Semantic + domain tokens are rich: zone, structure, path, status, group-dashboard palettes (`tokens.css:165–210`).
- Overlay colors sourced from `semantic.primary`, `SOIL_RAMPS` + `rampGradientCss()`, `YIELD_GRADIENT_CSS`, and `suitabilityToRgba()` (`apps/web/src/features/map/SoilOverlay.tsx`, `GaezOverlay.tsx`).
- Active-state signalling = paint-property toggles (`map.setPaintProperty`) — no shared UI signifier for the *controlling* button/tool.

**Gap**
- No perceived-brightness guarantee across hues; a saturated soil-green and a saturated climate-blue at equal nominal lightness can read with different weight, undermining visual hierarchy when multiple overlays co-exist.
- No reusable "shimmer stroke" or equivalent signifier for the active tool/overlay control.

**Recommendation**
- Stage OKLCH migration behind a token *alias* layer so existing `--color-*` consumers keep working while a new `--color-*-oklch` scale is introduced. Verify baseline browser support (Chromium 111+, Safari 15.4+, Firefox 113+) first.
- Introduce `--signifier-shimmer` as a shared `border-image`/animated `conic-gradient` util in `apps/web/src/styles/utilities.css`, applied by overlay toggle buttons and active tools in `LeftToolSpine`.

**Priority:** **P0** — foundation for §4.

---

## 3. Panel System — Rail vs Drawer vs Floating

**Principle** — Right-rail for deep-dive, opens only on selection (Progressive Disclosure). Popovers for non-blocking context; modals for blocking/commitment-heavy tasks. Never stack panels that occlude the map.

**Current state**
- `RailPanelShell` collapses to a ~32px vertical-label strip and expands on demand; rendered only when `activeView` is set (`apps/web/src/components/ui/RailPanelShell.tsx`, `.module.css:1–157`).
- Rail does not occlude the map (flex row; map fills remaining width) (`apps/web/src/features/map/MapView.tsx:102–145+`).
- Mobile fallback is `SlideUpPanel` (not rail) — good platform-aware split.
- Ad-hoc floating panels for layer controls (`GaezMapControls`, `SoilMapControls`) live outside any documented popover convention.

**Gap** — No decision matrix for rail vs popover vs modal, so new features default to "another floating panel."

**Recommendation** — Add a one-page decision matrix to `design-system/ogden-atlas/` alongside `MASTER.md`. No component changes.

**Priority:** P2 (documentation).

---

## 4. Dark Mode — Elevation by Luminance

**Principle** — Dark mode is not inverted light; surfaces get lighter as they elevate. Avoid pure black; use warm slate or tinted neutral. Desaturate brand colors so they don't burn against dark backgrounds.

**Current state (compliance stamp — already aligned)**
- Base `--color-bg: #1a1611` warm slate; surface `#2a2420`; raised `#342d26` — +6L per step, annotated "UX Scholar 2026-04-23" (`apps/web/src/styles/dark-mode.css:10–15`).
- Chrome lifted to `#1f1d1a` with 95% opacity for depth (`dark-mode.css:17–19`).
- Brand gold elevated for dark-mode prominence: `#7d6140 → #c4a265`, active `#e0b56d` for WCAG AA on small text (`dark-mode.css:32–33`).
- Status colors desaturated for dark mode: warning `#ca8a04 → #c4a044`, error `#c4493a → #c45a4a`, info `#5b8eaf → #6ea0bf`.
- Text is warm cream `#f2ede3`, muted `#9a8a74`, subtle `#7d6e5a` (`dark-mode.css:27–29`).

**Gap** — Elevation math is hand-encoded. New surfaces (popovers, toast, drawer) risk drift. Shadows are earth-tinted (`tokens.css:324–334`) and already follow the spirit, but not derived.

**Recommendation** — When OKLCH lands (§2), re-express the elevation scale as `oklch(L C H)` with L ∈ {15, 21, 27, 33} holding C and H constant. Any new elevation tier then picks the next L value deterministically.

**Priority:** P1 (rides on §2).

---

## 5. Dense Data Viz — Sparklines, Confidence vs Quality

**Principle** — Boring charts win: basic line/bar with clear grids beat "weird" custom viz. Use micro-charts (sparklines) inline with KPIs. **Separate Confidence (data provenance) from Quality (semantic status)** — monochromatic chips for confidence, semantic green/red only for quality.

**Current state**
- `ScoreCircle` (68px main suitability) + numeric score + `ConfBadge` (high/medium/low) + blocking flags (`OctagonX`) + layer-completeness dot row + collapsible sections by category (`apps/web/src/components/panels/sections/ScoresAndFlagsSection.tsx:125–412`).
- Panel data icons mapped via `LIVE_DATA_ICONS` (Mountain, Thermometer, Layers, Waves, Droplets) (`ScoresAndFlagsSection.tsx:42`).
- Confidence chips already monochromatic (`apps/web/src/styles/panel.module.css:237–252`) — quality uses semantic colors only ✓ (correct per principle).
- `DerivedAnalysesCard` (Tier-3) uses skeleton shimmer while computing (`ScoresAndFlagsSection.tsx:356–399`).
- **No sparklines; no time-series micro-charts** anywhere in the panel.

**Gap** — Trend/momentum data (P/PET ratio, seasonal aridity, monitoring drift, historical imagery delta) has no inline surface. A user reading a score has no sense of direction.

**Recommendation** — Introduce a small `Sparkline` primitive (SVG, no lib dep, ~50 LOC) reusable inside KPI rows. Input: `{values: number[], unit?: string, trend?: 'up'|'down'|'flat'}`. Color rule: neutral stroke + semantic accent *only at the endpoint dot*. Land it in `SiteIntelligencePanel` for climate seasonality first; expand per-section as data becomes available.

**Priority:** P1.

---

## 6. Progressive Disclosure — Newcomers vs Power Users

**Principle** — Use delayed tooltips (800–1000ms) so power users see only icons while newcomers get labels on hover. Thoughtful empty states double as onboarding. Skeleton/shimmer loaders + optimistic UI for responsiveness.

**Current state**
- Icon-only sidebar when collapsed, with phase-colored divider bars (`IconSidebar.tsx:106–324`) ✓
- Collapse chevrons throughout sections, managed by `useState` (`ScoresAndFlagsSection.tsx:118–127`) ✓
- `DashboardSectionSkeleton` and `Skeleton` shimmer in Tier-3 computing state ✓ (`SiteIntelligencePanel.tsx:622`, `ScoresAndFlagsSection.tsx:399`)
- Empty state: "Draw a property boundary to fetch site data" (`SiteIntelligencePanel.tsx:638`) ✓
- **Tooltips use native HTML `title=` attribute only** — no delay, no dark-mode-aware styling, no keyboard surface, inconsistent rendering across OS (`IconSidebar.tsx`, `LeftToolSpine.tsx`, map control buttons).

**Gap** — The single biggest UX polish gap in the whole app. Every icon-only control relies on the browser's variable-delay default tooltip.

**Recommendation** — Add a thin `<DelayedTooltip delay={800}>` primitive. First resolve open question below about whether `@floating-ui/react` is already a dep. Replace all `title=` usages on sidebar and tool-spine buttons in one pass.

**Priority:** **P0** visibility / P1 effort (small but widely-touching).

---

## Priority Summary

| # | Area | Priority | Effort |
|---|---|---|---|
| 2 | OKLCH tokens + shimmer signifier | P0 | M |
| 6 | Delayed tooltip primitive | P0 | S |
| 4 | OKLCH-derived dark elevation | P1 | rides §2 |
| 5 | Sparkline primitive | P1 | S |
| 1 | IA / top-chrome convention doc | P2 | S |
| 3 | Panel decision matrix doc | P2 | S |

## Deferred / open questions

- **Tooltip stack** — is `@floating-ui/react` (or `@radix-ui/react-tooltip`, or `ariakit`) already in `apps/web/package.json`? Answer determines build-or-adopt for `<DelayedTooltip>`.
- **OKLCH browser baseline** — confirm Atlas target matrix allows Chromium 111+, Safari 15.4+, Firefox 113+ as the floor; otherwise ship a `@supports` fallback or use a build-time conversion.
- **Sparkline data availability** — does the Site-Intelligence backend currently return time-series for any score, or is a data-shape change needed before the primitive is useful? If the latter, §5 moves to a cross-cutting plan with backend scope.

## What this audit does *not* cover

- Accessibility (contrast passes, focus rings, keyboard nav) — separate audit.
- Performance budgets for map + overlay stacking — separate audit.
- Public portal (`PublicPortalShell`) — has its own IA concerns; out of scope here.
- Mobile `SlideUpPanel` ergonomics — out of scope for this dark-mode-first pass.

---

*Next session: produce an implementation plan that executes §§2 + 6 (both P0) with §4 riding along, leaving §§1/3/5 queued.*
