# Landing feature

Public marketing page for Atlas at `/`. Unauthenticated-only — authenticated visitors are redirected to `/home` by `routes/index.tsx:landingRoute.beforeLoad`.

## Files

- `LandingPage.tsx` — composes sections; no AppShell wrapper.
- `sections/LandingNav.tsx` — sticky 64-px nav with translucent-to-solid scroll state.
- `sections/HeroBoxBreak.tsx` — two-column hero; map right, copy left, overlapping Site card + suitability badge ("Breaking the Box" pattern).
- `sections/HeroMapCanvas.tsx` — lazy-mounted, non-interactive MapLibre instance using the same `MAP_STYLES.satellite` tiles as `features/map`. Falls back to a gradient background if no `VITE_MAPTILER_KEY` is configured.
- `sections/HeroSiteCard.tsx` — Site Intelligence preview (address + 3 score chips).
- `sections/PillarsBento.tsx` — 7-pillar asymmetric bento grid.
- `sections/PathToExcellenceCTA.tsx` — secondary CTA on parchment surface.
- `sections/LandingFooter.tsx` — 4-column footer on warm-dark surface.

## Design tokens

Landing reuses `styles/tokens.css` exclusively (`--color-earth-*`, `--color-sage-*`, `--space-*`, `--radius-*`, `--text-*`, `--shadow-*`). No landing-specific palette. Fira Sans headings (no serif added).

## Out of scope (deferred)

Trust logo marquee, clickable use-case switcher, evidence-of-intelligence scroller, before/after comparison, pricing teaser. Planned follow-up.

## Accessibility

- Respects `prefers-reduced-motion` (hero hover disabled, nav scroll still functional).
- All interactive elements keyboard-reachable; visible `:focus-visible` outlines.
- Map is decorative (`aria-hidden`); the adjacent `HeroSiteCard` conveys the same data as text.
