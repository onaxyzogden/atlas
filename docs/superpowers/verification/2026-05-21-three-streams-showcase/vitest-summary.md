# Phase 3 Task 16 — Vitest summary

## 1. Showcase test suite

Command:
```
pnpm --filter @ogden/web exec vitest run src/showcase
```

Result:
```
Test Files  8 passed (8)
     Tests  14 passed (14)
  Duration  2.44s
```

Files:
- `src/showcase/__tests__/snapshot.test.ts` (1) — snapshot loader contract
- `src/showcase/__tests__/covenant.test.ts` (6) — forbidden vocab grep +
  Apricot Lane attribution exact-string in 4 prerendered HTMLs
- `src/showcase/__tests__/ShowcaseMap.test.tsx` (1)
- `src/showcase/__tests__/MetricChart.test.tsx` (1)
- `src/showcase/__tests__/ProjectedChart.test.tsx` (1)
- `src/showcase/__tests__/MapThumbnail.test.tsx` (1)
- `src/showcase/__tests__/AttributionFooter.test.tsx` (2)
- `src/showcase/__tests__/SceneEngine.test.tsx` (1)

All showcase tests **PASS**.

## 2. Full web vitest (no-regression)

Command:
```
pnpm --filter @ogden/web exec vitest run
```

Result:
```
Test Files  178 passed (178)
     Tests  1772 passed (1772)
  Duration  64.07s
```

NEW failures introduced by Phase 3: **0**.
Pre-existing failures: **0**.
Showcase tests included in the 178 / 1772 count.

Non-fatal noise observed (long-standing, not Phase 3):
- `[OGDEN] Failed to fetch builtin samples` — happy-dom can't reach
  `localhost:3000` (api not running during web tests); test falls back to
  local sample, passes.
- `SessionExpiredBanner` act() warning — pre-existing.
- `scrollama error: no step elements` — emitted by SceneEngine when rendered
  empty in jsdom; test still asserts the wrapper renders.

## 3. Full api vitest (no-regression)

Command:
```
pnpm --filter @ogden/api exec vitest run
```

Result:
```
Test Files  61 passed | 1 skipped (62)
     Tests  669 passed | 3 skipped (672)
  Duration  16.98s
```

NEW failures introduced by Phase 3: **0**.
Pre-existing skips: 1 file / 3 tests (long-standing).

## Verdict

Phase 3 introduces **no new test failures** in either web or api packages.
Showcase suite (14 tests) passes cleanly.
