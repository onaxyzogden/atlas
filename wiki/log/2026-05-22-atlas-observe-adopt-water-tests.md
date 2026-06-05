# 2026-05-22 — Adopt-water follow-up: pure-function tests for picker + kind-inference

**Branch.** `feat/atlas-permaculture`. Test-only follow-up to the
[adopt-water tool slice](2026-05-21-atlas-observe-adopt-water-tool.md)
(commit `d1a5ae15`). Closes the test-coverage gap on the four new pure
helpers shipped with that slice; seeds the first test files under
`apps/web/src/features/map/__tests__/`.

## What changed

- **New.** [`apps/web/src/features/map/__tests__/pickClickedFeature.test.ts`](../../apps/web/src/features/map/__tests__/pickClickedFeature.test.ts) — 10 vitest cases pinning the deterministic ring/segment picker:
  - `pickClickedPolygon`: plain `Polygon` identity passthrough; `MultiPolygon` with click inside ring A → returns ring A; click outside every ring → nearest-centroid fallback (the "tall basemap building under pitch" path documented in the JSDoc); empty `MultiPolygon` → `null`; non-polygon (`Point`) → `null`.
  - `pickClickedLine`: plain `LineString` identity; `MultiLineString` with two parallel segments → picks the closer one; empty → `null`; degenerate 1-coord ring skipped, valid 2-coord segment wins; non-line (`Polygon`) → `null`.
- **New.** [`apps/web/src/features/map/__tests__/adoptedBasemapWater.test.ts`](../../apps/web/src/features/map/__tests__/adoptedBasemapWater.test.ts) — 12 vitest cases pinning the OpenMapTiles `class` truth table:
  - `inferWaterbodyKind`: `lake → lake`, `pond → pond`, `wetland → wetland`, `swamp → wetland` (collapse), `reservoir → reservoir`, `basin → reservoir` (collapse), `ocean → other` (unknown), plus `null` / `undefined` / `{}` / `{class: 123}` → `other`.
  - `inferWatercourseKind`: `stream → stream`, `river → stream` (collapse), `canal | drain | ditch → ditch`, plus unknown / missing → `other`.

## Coverage gap (documented)

`findWaterPolygonLayerIds` and `findWaterwayLineLayerIds` wrap
`map.getStyle()` and are **intentionally not covered** — mocking the full
MapLibre style API for what is effectively a one-line `source-layer`
filter would over-invest relative to the precedent set by
[`adoptedBasemapBuildings.ts`](../../apps/web/src/features/map/adoptedBasemapBuildings.ts)
(no test file at all). Real-world coverage for the discovery helpers
comes from the in-browser steward smoke walk skeletoned at
[2026-05-22-atlas-observe-adopt-water-smoke.md](2026-05-22-atlas-observe-adopt-water-smoke.md).
A `// Coverage gap:` header at the top of `adoptedBasemapWater.test.ts`
records this rationale in-source so the next reader doesn't add the
helpers thinking they were overlooked.

## Verification

- `cd apps/web ; npx vitest run src/features/map` → **22 / 22 passed** across 2 files in ~1.7s.
- `cd apps/web ; NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` clean on touched files; pre-existing foreign-WIP errors elsewhere unchanged (paddock-fence `turf.buffer` overload, StepBoundary, vegetationResolver, HostUnion tests).
- Covenant grep on changed files for `\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i` — zero hits.
- Branch hygiene: `git fetch origin feat/atlas-permaculture` showed 0-behind / 1-ahead before commit (the click-delete fix from the prior session); pushed atomically after commit per [[feedback-commit-immediately-on-rebased-branches]].

## Why this is a separate slice

The pure helpers are testable without WebGL — but the implementation
slice committed under a "work without stopping" directive with a live
external-rebase risk on the branch. Splitting the tests into their own
commit keeps the implementation slice atomic on the wire and gives the
tests their own evidence trail.
