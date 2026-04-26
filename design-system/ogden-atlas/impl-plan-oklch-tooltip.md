# Implementation Plan — §2 OKLCH + Shimmer Signifier, §6 Delayed Tooltip

**Date:** 2026-04-23
**Source audit:** [ui-ux-scholar-audit.md](./ui-ux-scholar-audit.md)
**Scope:** Execute the two P0 items from the audit. §4 (OKLCH-derived elevation) rides on §2 and lands in the same token file.
**Out of scope:** Sparkline primitive (§5), IA/panel docs (§§1, 3), public portal, mobile `SlideUpPanel`, accessibility audit.

---

## Context

The audit established two P0 gaps:
1. **§2** — hex-locked token system with no perceived-brightness guarantee across overlay hues, and no shared active-state signifier for tool/overlay buttons.
2. **§6** — every icon-only control in the app (sidebar phases, left tool spine, map controls) leans on native `title=` tooltips with browser-variable delay and no dark-mode styling.

These two are foundational and visible — they unlock the rest of the design-system work and are the most noticeable UX polish gaps. The audit already confirmed the codebase is aligned on dark-mode elevation and brand desaturation, so this slice can focus narrowly.

**Open questions now resolved:**
- No tooltip library is in `apps/web/package.json` → **hand-roll** a small primitive. No new dependency.
- No `browserslist` configured → Vite 6 default (Chromium 107+) is below OKLCH's Chrome 111 floor → **ship OKLCH with hex fallbacks via CSS custom-property cascade** (not `@supports`, which fragments too many rules).

---

## Strategy

### §2 — Token alias layer, not a rewrite

Introduce a **new** `:root` block in `tokens.css` that declares OKLCH values as *additional* custom properties. Keep every existing `--color-*` hex token in place. Migrate *high-value* surfaces (overlay hues, elevation tiers) to reference the OKLCH values. Leave zone/structure/path palettes on hex for now — they're working and not on the critical visual-hierarchy path.

**Why alias, not rewrite:** Every consumer (`panel.module.css`, `HydrologyPanel.module.css`, `SolarClimatePanel.module.css`, `RailPanelShell.module.css`, `ScoresAndFlagsSection.tsx`, ~30 CSS modules total) already reads `--color-bg`, `--color-surface`, etc. A rewrite is churn without benefit. Instead:

```css
/* tokens.css — new block at top of :root */
:root {
  /* OKLCH primitives — L(lightness) C(chroma) H(hue) */
  --l-bg:       15;     --l-surface:    21;     --l-raised:    27;    --l-popover: 33;
  --c-neutral:  0.012;  --h-neutral:    60;  /* warm-neutral base */
  /* ... */
}
:root[data-theme="dark"] {
  --color-bg:             oklch(var(--l-bg)%      var(--c-neutral) var(--h-neutral));
  --color-surface:        oklch(var(--l-surface)% var(--c-neutral) var(--h-neutral));
  --color-surface-raised: oklch(var(--l-raised)%  var(--c-neutral) var(--h-neutral));
  /* fallback: keep the existing hex line above as the same property — the OKLCH line
     shadows it in modern browsers, hex wins in older ones via the cascade of the
     last-valid declaration. */
}
```

That pattern — **hex line, OKLCH line second** — lets Chrome 107–110 fall back to hex automatically (the OKLCH line parses as invalid, browser discards it) while Chrome 111+ honors OKLCH. No `@supports` blocks needed.

### §2 — Shimmer active signifier

Single utility class in `utilities.css`:

```css
.signifier-shimmer {
  position: relative;
  isolation: isolate;
}
.signifier-shimmer::before {
  content: '';
  position: absolute; inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: conic-gradient(from var(--shimmer-angle, 0deg),
    var(--color-primary) 0%,
    var(--color-accent) 33%,
    var(--color-primary) 66%,
    var(--color-primary) 100%);
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  animation: shimmer-rotate 3s linear infinite;
  pointer-events: none;
  z-index: -1;
}
@property --shimmer-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes shimmer-rotate { to { --shimmer-angle: 360deg; } }
@media (prefers-reduced-motion: reduce) { .signifier-shimmer::before { animation: none; } }
```

Apply by toggling the class on active overlay-toggle buttons (`GaezMapControls`, `SoilMapControls`) and on the active tool in `LeftToolSpine`. No per-component CSS.

### §6 — `<DelayedTooltip>` primitive

Hand-rolled React component, ~80 LOC, no deps:
- Uses `useRef` + `setTimeout` for 800ms enter delay, 120ms exit delay (prevents flicker on mouseover-scan).
- Uses `Popover API` (browser support since Chrome 114, Safari 17, Firefox 125) with an `@supports` fallback to fixed-position portal for the (rare) older-Chromium users.
  - **Actually** — simpler: use a fixed-position portal (`ReactDOM.createPortal` → `document.body`) with manual positioning via `getBoundingClientRect()` + `scrollX/Y`. No Popover-API special-casing, no `@floating-ui` dep. Atlas tooltips are short labels (≤30 chars) anchored in predictable screen positions; we don't need collision detection.
- Mounts to `aria-describedby` for accessibility; respects `prefers-reduced-motion`.
- Takes `{label, placement?: 'right'|'top'|'bottom', delayMs?: number, children}`.

Replace `title=` usages in `IconSidebar.tsx`, `LeftToolSpine.tsx`, and the tool/control buttons (`MeasureTools.tsx`, `CrossSectionTool.tsx`, `MapStyleSwitcher.tsx`, `ViewModeSwitcher.tsx`, `HistoricalImageryControl.tsx`, `TerrainControls.tsx`). Leave `title=` on form inputs and text-overflow truncation cases (different UX pattern).

---

## Files to change

**New files:**
- `apps/web/src/components/ui/DelayedTooltip.tsx` — primitive + CSS module
- `apps/web/src/components/ui/DelayedTooltip.module.css`
- `apps/web/src/components/ui/__tests__/DelayedTooltip.test.tsx` — vitest + @testing-library (deps already present)

**Modified tokens/styles:**
- `apps/web/src/styles/tokens.css` — add OKLCH primitive block + alias the 4 elevation tiers, the 4 overlay semantic colors (primary, accent, success, warning/error, info). Keep hex fallbacks.
- `apps/web/src/styles/dark-mode.css` — replace the 3 hand-tuned elevation hex values with OKLCH references (keep hex as fallback per strategy above).
- `apps/web/src/styles/utilities.css` — add `.signifier-shimmer` + `@keyframes shimmer-rotate` + `@property --shimmer-angle`.

**Consumers updated:**
- `apps/web/src/components/IconSidebar.tsx` — swap `title=` → `<DelayedTooltip>` on phase header + sub-item buttons.
- `apps/web/src/features/map/LeftToolSpine.tsx` — swap `title=` → `<DelayedTooltip>`; add `signifier-shimmer` class when a tool is active.
- `apps/web/src/features/map/MeasureTools.tsx`, `CrossSectionTool.tsx`, `MapStyleSwitcher.tsx`, `ViewModeSwitcher.tsx`, `HistoricalImageryControl.tsx`, `TerrainControls.tsx` — `title=` → `<DelayedTooltip>`.
- Overlay toggle buttons inside `GaezOverlay.tsx`/`SoilOverlay.tsx` panels (or their control components) — add `signifier-shimmer` class on active.

**Total:** 3 new files, ~14 modified. No backend changes, no store shape changes.

---

## Phased execution

### Phase 1 — OKLCH token foundation (`tokens.css` + `dark-mode.css`)
- Add OKLCH primitives block + alias the four elevation tiers in both light and dark modes.
- Add OKLCH variants for the five semantic colors used by overlays (primary, accent, success, warning, info).
- Hex fallbacks stay.
- **Gate:** `pnpm --filter @ogden/web build` succeeds; visual diff of map + one panel shows no regression in light or dark mode.

### Phase 2 — Shimmer signifier utility
- Add `.signifier-shimmer` + keyframes + `@property` to `utilities.css`.
- Apply to one tool button in `LeftToolSpine` as proof.
- **Gate:** Active tool shows rotating border, still click-through, no layout shift, `prefers-reduced-motion` freezes animation.

### Phase 3 — `<DelayedTooltip>` primitive
- Implement component + CSS module.
- Write vitest tests: delay timing, portal mount, `aria-describedby`, exit-delay flicker prevention.
- **Gate:** Tests pass; manual check on one `IconSidebar` button.

### Phase 4 — Replace `title=` on shell controls
- `IconSidebar` → `LeftToolSpine` → map tool buttons (in that order, small commits).
- Leave `title=` on form inputs + truncation-overflow cases.
- **Gate:** Preview shows consistent dark-mode tooltips with 800ms delay across sidebar + tool spine + map controls. No regressions in keyboard focus behavior.

### Phase 5 — Apply `signifier-shimmer` to overlay toggles
- `GaezMapControls`, `SoilMapControls` active state → shimmer class.
- **Gate:** Toggling an overlay reveals the rotating border on its control; no flicker on overlay load.

---

## Verification

1. `pnpm --filter @ogden/web lint` (tsc noEmit) — must pass.
2. `pnpm --filter @ogden/web test` — new `DelayedTooltip.test.tsx` must pass, no other regressions.
3. `pnpm --filter @ogden/web build` — production build succeeds.
4. **Preview verification** using the preview_* tools:
   - `preview_start` → navigate to map view.
   - `preview_snapshot` of sidebar with a hovered phase button → confirm tooltip appears after 800ms delay.
   - `preview_inspect` on `--color-bg` computed value → confirm OKLCH resolved in modern preview Chromium.
   - Toggle GAEZ overlay → `preview_screenshot` showing the shimmer border on the active control.
   - `preview_console_logs` → no warnings about invalid CSS or unknown custom properties.
   - Switch theme to light → confirm no visual regressions in site-intelligence panel.
5. Spot-check no hex fallback is orphaned: grep for any `--color-bg:` still reading the old hex line, ensure the cascade is correct.

---

## Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OKLCH values look subtly different from existing hand-tuned hex | Med | Low | Start with L/C/H values reverse-computed from existing hex (`oklch(from #1a1611 l c h)` via devtools) so Phase 1 is visually identical. Changes come later, deliberately. |
| Shimmer animation causes paint cost on low-end machines | Low | Med | `@property` + `conic-gradient` is GPU-accelerated in modern Chromium; `prefers-reduced-motion` disables. Applied only to 1–2 active buttons at a time. |
| Tooltip portal breaks focus trap inside rail panel | Low | Med | Portal to `document.body`, use `aria-describedby` not `aria-labelledby`, don't move focus. Test with keyboard tab order. |
| `title=` removal regresses Windows narrator/screen-reader users | Low | Med | `DelayedTooltip` sets `aria-describedby` so assistive tech announces the label via the live region. Keep `aria-label` on icon-only buttons as primary name. |
| Browser < Chrome 111 (~5% of users) sees hex, not OKLCH | Cert. | Low | Intentional fallback — identical visual appearance because OKLCH values were reverse-computed from hex. |

---

## Token estimate

| Phase | Est. Tokens | Notes |
|---|---|---|
| Orientation (complete) | ~4,000 | Audit + deps check done |
| Planning (this doc) | ~3,000 | |
| Phase 1 — OKLCH tokens | ~4,000 | Mostly CSS |
| Phase 2 — Shimmer utility | ~2,000 | |
| Phase 3 — Tooltip primitive + tests | ~8,000 | Component + test file |
| Phase 4 — `title=` swaps | ~6,000 | ~10 files, mechanical |
| Phase 5 — Shimmer application | ~2,000 | |
| Verification (preview, build, tests) | ~5,000 | |
| **Total** | **~34,000** | |

Flag if any phase exceeds 50% of its estimate.

---

## Definition of Done

- OKLCH primitives declared and aliased into elevation + 5 semantic tokens; hex fallbacks retained.
- `.signifier-shimmer` utility added, respects `prefers-reduced-motion`, applied to `LeftToolSpine` active tool + overlay toggles.
- `<DelayedTooltip>` primitive implemented with vitest coverage.
- All `title=` attributes on `IconSidebar` phase/sub-item buttons and all map/tool control buttons replaced with `<DelayedTooltip>`.
- `pnpm --filter @ogden/web lint && test && build` all pass.
- Preview verification screenshots attached showing: (a) delayed tooltip on sidebar, (b) shimmer signifier on active overlay toggle, (c) unchanged dark-mode surfaces.

## Deferred (flagged for next session)

- Sparkline primitive (§5) — needs time-series data-shape decision with backend.
- OKLCH migration of zone/structure/path palettes (cosmetic — no perceived-brightness complaints).
- Panel decision-matrix doc (§3) and IA top-chrome convention doc (§1).
- Replacing `title=` on non-critical elements (form inputs, text truncation).
