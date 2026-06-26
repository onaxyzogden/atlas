# Showcase first-paint heavy-chunk eviction + bundle-budget guard

**Date.** 2026-06-26
**Branch.** `claude/compassionate-burnell-d27343` (local-only; no upstream —
no divergence with the externally force-pushed `feat/atlas-permaculture`).
**ADRs.** Resolves Open Followup #1 of
[[decisions/2026-05-21-atlas-showcase-bundle-split]]; new guard ADR
[[decisions/2026-06-26-atlas-bundle-budget-guard]].
**Entity touched.** [[entities/showcase-portal]] (Open Followup #1 flipped
from "tracked" to "resolved"; Build Pipeline gains the guard).
**Commit.** `04cd3489` (8 files, +439/-16), **not pushed**.

## What landed

Phase 3.5 "Prong B" gave the public showcase its own Vite entry
(`showcase.html`) so the authed app's heavy graph would stay out of first
paint — yet the bundle-split ADR's own verification recorded **~697 KB gzip**
still loading eagerly: `framework` 86 + `turf` 145 + `maplibre` 234 +
`panel-compute` 53 + `panel-sections` 58 + `ecocrop-db` 109 + `showcase-app`
12. Open Followup #1 blamed the ~220 KB panel/ecocrop residue on `@ogden/shared`
barrel re-exports and set a "below 600 KB gzip" target. This session
instrumented the chunk graph to the actual edges, severed them, and locked the
result.

**Root cause — two static bridges (not the `@ogden/shared` barrel):**

1. **`src/lib/tokens.ts` co-located into `panel-sections`.** `tokens.ts` (a
   shared design-tokens leaf) was unassigned by `manualChunks`, so Rollup
   folded it into the lazy `panel-sections` chunk — one of the chunks that
   imports it. Because `showcase-app` *statically* imports `tokens.ts`, that
   fold created a static edge `showcase-app → panel-sections → panel-compute →
   @turf/turf + ecocrop-db`. Invisible in review: no showcase file imports a
   panel or the dataset; the bridge was a shared constant Rollup happened to
   park in the heavy chunk.
2. **`ShowcaseMap.tsx` statically imported.** `MapThumbnail.tsx` and the
   dev-only `showcase._capture.tsx` imported `<ShowcaseMap>` (which wraps
   `maplibre-gl`) at module scope, pinning maplibre's ~234 KB into first paint
   though the map only hydrates on click-to-explore.

**Fix (three parts; commit `04cd3489`):**

- **`vite.config.ts` `manualChunks`** — pin `src/lib/tokens.ts` to its own
  `foundation` chunk (so it is no longer co-located into `panel-sections`;
  `showcase-app` now imports only the 1.1 KB `foundation`), and pin
  `ShowcaseMap.tsx` to its own `showcase-map` chunk.
- **`src/routes/index.tsx`** — the three showcase routes in the authed router
  are now `React.lazy` + `Suspense` (a small `lazyRoute()` helper), so the
  authed `index.html` entry no longer statically pulls the showcase tree.
- **`MapThumbnail.tsx` + `showcase._capture.tsx`** — `<ShowcaseMap>` is now a
  dynamic `React.lazy(() => import(...).then(m => ({ default: m.ShowcaseMap })))`
  wrapped in `Suspense`, so `showcase-map` (and maplibre) load only on the
  explore gate.

Rollup invariant on record: a module *assigned* to a chunk by `manualChunks`
cannot be split out by a later dynamic `import()`, and an *unassigned* shared
leaf is folded into whichever single chunk imports it — so severing each edge
required an explicit chunk rule, not merely a dynamic call site.

**Result.** `dist/showcase.html` eager closure is now exactly
`modulepreload-polyfill` (0.4) + `framework` (83.9) + `foundation` (1.1) +
`showcase-app.js` (12.7) + `showcase-app.css` (10.6) = **108.7 kB gz**
(Node-gzip; ~100 kB JS-only). `maplibre`, `turf`, `ecocrop-db`,
`panel-compute`, `panel-sections` are all **absent** from first paint.
**~697 KB → ~109 KB gz** — far past the 600 KB target Followup #1 set; the
panel/ecocrop residue is gone, not merely trimmed.

**Guard (new; locks the win).** `apps/web/scripts/check-bundle-budget.mjs`
(zero-dep, `node:` builtins only) parses the built entry HTML for eager assets
(`<script type=module src>` + `<link rel=stylesheet href>` under `/assets/`),
gzip-sums them, and fails CI if the total exceeds the ceiling in
`apps/web/bundle-budget.json`. The `showcase-initial` budget is locked at
**115.0 kB** (117760 B; `current + max(5%, 2 KiB)` headroom, far below the
smallest heavy chunk ~53 kB, so any re-leak trips it). npm `bundlesize`
(check) / `bundlesize:update` (re-lock — the deliberate ratchet escape hatch).
Docs in `apps/web/BUNDLE_BUDGET.md`. Full rationale in
[[decisions/2026-06-26-atlas-bundle-budget-guard]].

## Verification

- **tsc.** `corepack pnpm --filter @ogden/web typecheck` — **0 NEW** errors
  over the 6-error foreign baseline the bundle-split ADR records.
- **Production build.** `corepack pnpm --filter @ogden/web build` succeeded;
  `dist/showcase.html` inspected — only the five eager assets above; every
  heavy chunk absent.
- **Guard, both directions.** `bundlesize` = `showcase-initial 108.7 kB <
  115.0 kB ✔ (6.3 kB headroom)`, exit 0. Negative test: a deliberately lowered
  ceiling produced `✖ OVER`, exit 1; `bundlesize:update` recomputed and
  restored the ceiling. Bite and pass both proven.
- No visual pass needed — a build-graph change only; the rendered showcase DOM
  is byte-identical (same `showcase-app` / `showcase-app.css`).
  > **Correction (2026-06-26, via PR #53 CI).** This "DOM byte-identical"
  > claim was **wrong for the MapThumbnail click path**, and the affected unit
  > tests were not run. Making `<ShowcaseMap>` a `React.lazy` import (commit
  > `04cd3489`, above) moved it behind a `Suspense` "Loading map…" fallback, so
  > on click the live map now resolves on a **microtask** rather than
  > synchronously. `showcase/__tests__/MapThumbnail.test.tsx` asserted
  > synchronously (`getByTestId`) and broke — caught not here but by CI on
  > PR #53, and fixed in `97c815e6` (`await findByTestId`). The vitest suite
  > should have been run after the lazy edit, not inferred green from tsc +
  > build. Full account: [[log/2026-06-26-atlas-pr53-merge-conflict-resolution]].

## Remaining followups

1. **Lighthouse not re-measured** (carried from the bundle-split ADR's
   Followup #2). The architectural win is confirmed by bundle inspection plus
   the guard, but a live throttled-4G Lighthouse run still needs a bootable
   preview server. Deferred.
2. **Residual `index.html` → `showcase-app` edge.** The authed entry still
   modulepreloads `showcase-app` via a shared `index.css` import; deliberately
   left (it does not affect the showcase entry's first paint, which is what the
   guard protects). An optional `main-initial` budget — the JSON array already
   supports a second entry, and `BUNDLE_BUDGET.md` shows the stub — could guard
   the authed entry later.

## Covenant & branch discipline

- Pure build-tooling / bundle-splitting — **no capital/sale/financing/
  advance-purchase surface**. The showcase covenant copy ratchet
  (`apps/web/src/showcase/__tests__/covenant.test.ts`) and the verbatim Apricot
  Lane attribution are untouched and still green. No CSRA/salam
  ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Amanah
  CLEAR.
- Commit `04cd3489` on the local-only `claude/compassionate-burnell-d27343`
  (no upstream → no divergence with the externally force-pushed
  `feat/atlas-permaculture`); **not pushed** (operator controls pushes);
  explicit-path `git add`; temporary chunk-graph instrumentation deleted before
  commit. This wiki update is a separate doc commit, same discipline.

## Commit shape

- Fix + guard (this commit): `04cd3489` — `apps/web/vite.config.ts`,
  `src/routes/index.tsx`, `src/showcase/components/MapThumbnail.tsx`,
  `src/showcase/routes/showcase._capture.tsx`,
  `scripts/check-bundle-budget.mjs` (new), `bundle-budget.json` (new),
  `package.json` (bundlesize scripts), `BUNDLE_BUDGET.md` (new).

Builds on [[log/2026-05-21-atlas-phase-3.5-bundle-split]]; entity
[[entities/showcase-portal]]; touches [[entities/web-app]].
