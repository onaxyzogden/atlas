# 2026-05-14 — Observe slide-up: Plan/Act-parity hero headers


Refactored all 21 Observe page hero blocks onto a single new
`apps/web/src/v3/observe/components/ObserveHero.tsx` that renders
`<header data-stage="observe">` → `.heroTag` (`Observe · Module N · <Label>`) /
italic `.title` (per-card tab label) / `.lede`, matching Plan/Act's hero
contract verbatim. `ObserveHero` derives module index + label from
`OBSERVE_MODULES`/`OBSERVE_MODULE_LABEL`/`OBSERVE_MODULE_CARDS`; optional
`moduleOverride` covers dual-host `CartographicDetail`. Plumbed
`moduleOverride="sectors-zones"` + `sectionIdOverride` through
`ModuleSlideUp.tsx`'s renderCard switch for the Sectors-&-Zones host;
preview confirmed both Cartographic instances render with the right
module eyebrow (Module 4 · Topography vs Module 6 · Sectors & Zones).
Dropped 3 decorative `hero*.png` imports per the "strict Plan/Act
parity, no images" call, and deleted now-orphaned `.heroRow` / `.heroArt`
rules from `_shared/stageCard/observeExtras.module.css`. `tsc --noEmit
-p apps/web` clean for Observe; pre-existing errors in `plan/draw/tools`
and `plan/draw/__tests__/dimensionGeometry.test.ts` left alone. PNG
files themselves left on disk pending an asset sweep. Full ADR:
[decisions/2026-05-14-atlas-observe-hero-plan-act-parity.md](decisions/2026-05-14-atlas-observe-hero-plan-act-parity.md).
