# 2026-05-14 — Observe slide-up: Plan/Act-parity hero headers

## Context

Plan/Act stage module pages render a 3-part hero (`<header class={card.hero} data-stage="…">` → `.heroTag` eyebrow + italic `.title` + `.lede`). Observe pages rendered only the lede (sometimes paired with a decorative `heroArt` PNG) — no eyebrow, no title — even though `_shared/stageCard/stageCard.module.css` already defined an `observe` `data-stage` gradient variant and the `.heroTag`/`.title` rules. User asked for parity.

## Decision

- Introduced `apps/web/src/v3/observe/components/ObserveHero.tsx`: a single `<header data-stage="observe">` component that derives module index + label from `OBSERVE_MODULES`/`OBSERVE_MODULE_LABEL` and the per-card title from `OBSERVE_MODULE_CARDS`. Eyebrow format `Observe · Module N · <Module label>` matches Plan's eyebrow shape. Optional `moduleOverride` prop covers the dual-host `CartographicDetail`.
- Refactored all 21 Observe page hero blocks to use `<ObserveHero sectionId="…" lede="…" />`; export buttons that previously lived inside the hero row were moved into a sibling `btnRow` outside the new `<header>`.
- Plumbed `moduleOverride="sectors-zones"` + `sectionIdOverride="observe-sectors-zones-cartographic"` through `ModuleSlideUp.tsx`'s `renderCard` switch for the Sectors-&-Zones host of `CartographicDetail`; the Topography host needs nothing (its sectionId resolves to topography first in `OBSERVE_MODULES`).
- Dropped 5 `heroLandscape`/`heroTerrain`/`heroSunscape` PNG imports (the 3 distinct asset paths) per the user's "strict Plan/Act parity → no decorative images" call. Removed the now-orphaned `.heroRow` / `.heroArt` rules from `_shared/stageCard/observeExtras.module.css`. PNG files left on disk pending an asset sweep.

## Verification

- `tsc --noEmit -p apps/web` clean for Observe (NODE_OPTIONS=`--max-old-space-size=8192`; pre-existing errors in `plan/draw/tools/WaterCatchmentTool.tsx` and `plan/draw/__tests__/dimensionGeometry.test.ts` are unrelated).
- Preview: opened the slide-up for Sectors & Zones and Topography in turn, switched to the Cartographic tab in each. DOM inspection confirmed both eyebrows render correctly:
  - Sectors & Zones host → `Observe · Module 6 · Sectors & Zones` / `Cartographic`
  - Topography host → `Observe · Module 4 · Topography` / `Cartographic`
- Screenshot tool timed out twice during capture (preview window unresponsive after the second click sequence) — verification rests on the DOM text returned via `preview_eval`, not on a visual snapshot.

## Out of scope

- The slide-up *chrome* header (`Observe · module` + module label inside `ModuleSlideUp.tsx`) was already at parity — not touched.
- Consolidating `apps/web/src/v3/observe/components/ModuleSlideUp.tsx` with the shared `_shared/moduleNav/ModuleSlideUp.tsx` (tracked separately under the 2026-05-08 atlas-v3-map-layout-standardization wiki entry).
- Deleting the 3 orphaned hero PNG asset files themselves.
- Copy edits to any lede string.

## Files

**New:** `apps/web/src/v3/observe/components/ObserveHero.tsx`
**Edited (21 pages):** all of `apps/web/src/v3/observe/modules/**/*.tsx` except `CartographicDetail`'s two host sites
**Edited (host switch):** `apps/web/src/v3/observe/components/ModuleSlideUp.tsx` (one case branch)
**Edited (CSS cleanup):** `apps/web/src/v3/_shared/stageCard/observeExtras.module.css`
