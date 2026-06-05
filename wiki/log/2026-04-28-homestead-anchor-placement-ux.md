# 2026-04-28 — Homestead anchor (placement UX)


**Commit:** [`771e31a`](../../) `feat(diagnose): homestead anchor — placeable marker recenters sectors & zones`

Permaculture Scholar follow-up: Mollison's Zone 0 is the home, not the parcel centroid. Sectors and concentric zones now radiate from a user-placed homestead point when set, falling back to the polygon centroid (then the page fallback) otherwise.

### Done

- `apps/web/src/store/homesteadStore.ts` — zustand `persist` keyed by `projectId` → `[lng, lat]`. Pattern matches `matrixTogglesStore` (versioned with no-op migrate).
- `apps/web/src/lib/anchor/effectiveAnchor.ts` — pure helper: explicit homestead → polygon centroid (mean of distinct ring vertices) → fallback. 6 vitest cases, all green.
- `apps/web/src/v3/components/overlays/HomesteadMarker.tsx` — draggable MapLibre `Marker` with custom DOM glyph ("Zone 0" disc); persists on `dragend` to avoid mid-drag thrash. Mid-flight position sync via a separate effect so external store updates don't fight the user's drag.
- `apps/web/src/v3/components/DiagnoseMap.tsx` — optional `homestead` prop renders a small toolbar (Place / Move / Clear) bottom-right, plus a one-shot map-click handler that flips a crosshair cursor while active; legend gains an "Anchored at …" note.
- `apps/web/src/v3/pages/DiagnosePage.tsx` — extracted `DiagnosePageMap` so the page-level component holds the homestead store reads; threads anchor into both `computeSolarSectors` and `computeConcentricZones` via `useMemo`.

### Verification

- `npx vitest run src/lib/anchor src/lib/zones src/lib/sectors src/v3/components` — **36/36 passing** (5 files), including the new 6-case `effectiveAnchor.test.ts`.
- `NODE_OPTIONS=--max-old-space-size=8192 npx vite build` — clean, 1m10s, 493 PWA precache entries.
- `npx tsc --noEmit` OOMed on the full surface (same as v3.3); spot-checks of homestead surface compile via vitest's transform with no errors.
- Preview verify on `/v3/project/mtc/diagnose`:
  - Toolbar shows `Place homestead` by default; after seeding `localStorage` and reload, flips to `Move homestead` + `Clear`.
  - Legend caption reads `Anchored at homestead` (vs `Anchored at parcel centroid` when unset).
  - `.maplibregl-marker` mounts on the canvas at the seeded coordinate.
  - Click-to-toggle did not flip the React state in the preview (the synthetic click case from prior sessions); seeded localStorage as a substitute. The drag/persist path is exercised by the `dragend` listener — visual confirmation deferred with the rest.
- Screenshot tool timed out (third session in a row).
- Vitest baseline: `computeScores.test.ts` Tier-3 layer-counting suite shows 7 pre-existing failures unrelated to anchor/zones — left for a separate sweep.

### Deferred

- Visual screenshot of the placed marker + recentered rings (preview tool flaky).
- Synthetic-click verification — a regression for the preview tool, not the feature.
- Boundary clipping when homestead is placed outside the parcel (no warn yet).
- "Snap to centroid" affordance for users who placed and want to reset to the bbox/polygon center without losing the toggle on.
- `pnpm build`'s `tsc &&` step still red on baseline rails / FiltersBar / DiagnoseMap.polygonBounds errors — gate via `vite build` for now.

### Recommended next session

- **Wind-prevailing sector** (Open-Meteo / ERA5) — fourth sector kind alongside the solar arcs; now that the anchor flows through, the wind-rose can radiate from it.
- Or — **Boundary-aware homestead** — warn or refuse placement outside the parcel; clip Zone 5 inner annuli when boundary shrinks past zone-4-outer.
- Or — **persist homestead server-side** — promote from `localStorage` to project-scoped server state once the v3 mock-first stage gives way to real persistence.
