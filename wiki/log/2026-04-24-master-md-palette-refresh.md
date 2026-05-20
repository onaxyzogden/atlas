# 2026-04-24 — MASTER.md palette refresh


**Motive.** [`design-system/ogden-atlas/MASTER.md`](design-system/ogden-atlas/MASTER.md) was a 204-line auto-scaffold from 2026-04-01 documenting a generic green-on-white "Earth green + harvest gold" palette (`#15803D` primary, `#F0FDF4` background) with bright button/card specs and a "Community/Forum Landing" page pattern. None of it matched the shipping codebase, which has moved through OKLCH primitives (ADR 2026-04-23), the warm-neutral chrome migration (UX Scholar 2026-04-23), the `MapControlPopover` + `mapZIndex` extraction (commit `c276c51`), and the `DelayedTooltip` retrofit (commit `29bf499`). Doc-only session: rewrite MASTER.md to reflect what the app actually is.

**Orientation finding — typography divergence.** `tokens.css:287-289` declares `--font-display: 'Fira Code'` and `--font-serif: 'Fira Code'`. But ~20+ component CSS modules carry `font-family: var(--font-display, 'Lora', Georgia, serif)`. The Lora fallback never fires (`--font-display` is always set), but the chain implies a historical intent of Lora-display. Resolution path chosen this session: codify Fira Code / Fira Sans (per `tokens.css`) as authoritative; flag the Lora drift in §Deferred as a separate sweep.

**Surgical rewrite.** [`MASTER.md`](design-system/ogden-atlas/MASTER.md) grew 204 → 382 lines:

- **Color Palette** — replaced the 5-row hex table with: OKLCH primitives (elevation ladder + 6 semantic hue channels) per the OKLCH ADR; earth/sage/water/sand ramps (50–900); semantic tokens (`--color-bg`, `--color-text`, primary/accent/status/info); chrome neutrals (`--color-chrome-bg`, `--color-chrome-bg-translucent`, `--color-chrome-bg-overlay`, `--color-elevation-highlight`); two-gold convention (`--color-gold-brand` for brand vs `--color-gold-active` for active-state UI on dark chrome — AA-contrast rationale); identity scales (zone 13, structure 6, path 11, group 7, confidence 3, status 3); map rendering defaults; rgb-channel companions.
- **Typography** — codified Fira Code / Fira Sans per `tokens.css`. Added a "Known drift" sub-block explaining the Lora-fallback situation.
- **Spacing** — replaced t-shirt-keyed table (which is not in `tokens.css`) with the actual numeric `--space-1` … `--space-16` scale.
- **Shadow / radius / z-index / transitions** — reflected actual `tokens.css` values; cross-referenced `mapZIndex` to `lib/tokens.ts` and `ia-and-panel-conventions.md`.
- **Component Specs** — replaced literal `.btn-primary` / `.card` / `.input` / `.modal` blocks (never adopted by the shipping app) with pointers to canonical primitives: `panel.module.css`, `MapControlPopover` (panel/dropdown variants), `DelayedTooltip`, `.spine-btn`, `Modal.tsx` + `SlideUpPanel.tsx`.
- **Style Guidelines** — replaced "Organic Biophilic / Wellness app" framing with "Warm-neutral chrome over biophilic map data; brand moments in earth-gold; OKLCH-derived elevation; minimal shadow, max-blur translucency for map-tethered surfaces." Dropped the "Community/Forum Landing" pattern — doesn't match `LandingPage`.
- **Anti-Patterns** — kept the 9 foundational entries; appended 7 Atlas-specific from `ia-and-panel-conventions.md` §3 (hand-rolled `backdropFilter` chrome, bare `title=`, raw `zIndex` literals in `features/map/**`, hard-coded font-family, hard-coded ramp hex, `gold-brand` on dark chrome, `<div onClick>` for true interactives).
- **Pre-Delivery Checklist** — kept the 9 existing entries; appended OKLCH parity / two-gold / mapZIndex / DelayedTooltip / panel-chrome / `preview_eval` verification steps.
- **References + Revision history** — added matching the `ia-and-panel-conventions.md` convention; cross-referenced four sibling docs and three ADRs.

**Verification.** Spot-grepped every CSS variable claimed in the rewrite against `tokens.css` — all 22 less-common tokens (`--color-gold-active`, `--color-chrome-bg-overlay`, `--l-popover`, `--c-warm-neutral`, `--space-5`, `--shadow-inner`, `--z-map-loading-chip`, `--z-map-mobile-bar`, `--z-map-top`, `--color-info-500`, `--color-confidence-{high,medium,low}`, `--color-status-{good,moderate,poor}`, `--color-map-popup-bg`, `--color-map-label-halo`, `--color-elevation-highlight`, `--color-gold-brand`, `--color-text-subtle`, `--h-warm-neutral`) found in `tokens.css`. All five linked primitive files (`tokens.ts`, `dark-mode.css`, `MapControlPopover.tsx`, `DelayedTooltip.tsx`, `Modal.tsx`, `panel.module.css`) confirmed present. Cross-checked `accessibility-audit.md` to confirm no contradictions (it actively reinforces the OKLCH / DelayedTooltip / MapControlPopover foundation).

### Deferred

- **Lora-fallback removal sweep.** ~20+ component CSS modules carry `var(--font-display, 'Lora', Georgia, serif)`. Mechanical grep-and-replace to drop the Lora fallback (Fira Code is authoritative per `tokens.css`). Captured in MASTER.md §Deferred for a separate session.
- **OKLCH semantic uniformity tuning.** Current OKLCH L values were reverse-computed for visual parity, not yet tuned for perceptual uniformity (per OKLCH ADR Consequences). A future pass should tighten `--l-success` / `--l-warning` so they read at equal weight.
- **`design-system/pages/`.** MASTER.md routing references this dir for page-specific overrides; dir does not yet exist. Create when the first page needs a Master-overriding spec.

### Recommended next session

- **Lora-fallback removal sweep** (mechanical doc-aligning sweep — ~20 files; closes the typography drift flagged in MASTER.md §Deferred). Or the broader **map-overlay chrome migration completion** (5 remaining `backdropFilter`-bearing files in `features/map/**`, popover-vs-spine-btn classification before migration).
