# 2026-05-07 — AnnotationDragHandler crash fix + stage rail refactor + map/data improvements


**Branch:** `feat/atlas-permaculture` · **Type:** crash-fix / refactor / improvement · **Commit:** `88b6556`

**1 — AnnotationDragHandler crash fix (complete).** Prior commit fixed `ObserveAnnotationLayers.tsx` cleanup but the same Observe → Plan crash persisted. Root cause: `AnnotationDragHandler.tsx` had two cleanup effects calling MapLibre APIs (`map.off()`, `map.dragPan.enable()`, `map.getCanvas()`, `map.getLayer()`, `map.getSource()`) without try/catch. After `DiagnoseMap` calls `setMap(null); m.remove()`, React fires the old cleanup effects against the destroyed map (`map.style` is null → throws). Fixed by wrapping both cleanup blocks in `try { … } catch { /* map already removed */ }`.

**2 — Stage right-rail ownership refactor.** `LandOsShell.rail` made optional; when `undefined`/`null` the rail column is omitted entirely. `V3ProjectLayout` passes `undefined` rail for `SELF_RAILED_STAGES` (design / prove / operate). `DecisionRail` short-circuits for those stages. `DesignPage`, `OperatePage`, `ProvePage` each pass their stage-specific rail (`DesignRail`, `OperateRail`, `ProveRail`) to `StageShell.rightRail` directly, eliminating the detour through `DecisionRail`.

**3 — DiagnoseMap parcel boundary casing.** Added a second line layer (`diagnose-parcel-boundary-line-casing`) rendered below the main `#e6c34a` gold stroke. Dark casing (`#1f1a14`, 6px, 60% opacity) makes the boundary legible on satellite/bright basemaps where a thin tan line disappears into terrain.

**4 — Smart parcel-move detection in siteDataStore.** Added `lastCenter` + `lastCountry` fields to `SiteData`. `refreshProject` now detects when the parcel moved to a different area (different country OR centroid shift >1km) and clears `layers`, `isLive`, `liveCount`, `fetchedAt`, and `enrichment` — preventing wrong-jurisdiction data from persisting while the new fetch runs.

**5 — projectStore builtin re-seed preserves local UUID + user boundaries.** `applyBuiltinsToStore` now snapshots existing projects by `serverId` before re-seeding. It reuses the existing local UUID (keeps IndexedDB `boundary:<id>` entries valid) and detects user-customized boundaries (JSON inequality against canonical API geometry) to preserve them rather than overwriting with the builtin shape.

**6 — SiteIntelligencePanel country inference on refresh.** On boundary redraw, `handleRefresh` re-derives country from the centroid via `inferCountryFromLngLat()` so that a boundary moved from Ontario into Michigan routes to US endpoints rather than Canadian ones.

**7 — TypeScript strict fixes.** Non-null assertions (`!`) on array index access in `SeasonalEcologyStrip.tsx`, `derivations.ts`, and `derivations.test.ts` to satisfy `noUncheckedIndexedAccess`. `notes: null → ''` in test fixture to match updated `SoilSample` type.
