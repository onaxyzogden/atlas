# Phase 3.5 — Showcase Bundle Split

**Date.** 2026-05-21
**Branch.** `feat/atlas-permaculture`
**ADR.** [[decisions/2026-05-21-atlas-showcase-bundle-split]]
**Entity touched.** [[entities/showcase-portal]] (Open Followup #1 flipped
from "tracked" to "addressed"; #2 collapsed-with-#1).

## What landed

Two-pronged fix to the Phase 3 Lighthouse failure
(FCP 11.2 s / LCP 11.5 s vs 1.5 s / 2.5 s budget):

- **Prong A — route-aware bootstrap gating** (commit `26228a53`, landed
  earlier in this session). `apps/web/src/main.tsx` now dynamic-imports
  `./app/bootAuthed.js` only when the path is not `/showcase/*`.
  `bootAuthedShell()` carries the pre-split lines 24–91 verbatim
  (projectStore + 4 seeders + connectivityStore + `bootAuth()` await +
  `siteDataSync` + `syncService` + auth-change subscribe). Showcase
  paths skip the whole authed graph at runtime.

- **Prong B — second Vite rollup input** (this commit). Added
  `apps/web/showcase.html` as a second entry beside `index.html`.
  Loads `apps/web/src/showcase-entry.tsx`, which mounts a
  showcase-only TanStack Router from `apps/web/src/showcase/router.tsx`
  (only `showcaseRoute`, `showcaseTierRoute`, `showcaseCaptureRoute`,
  plus a catch-all redirect to `/showcase/three-streams`). No
  `appShellRoute`, no `LoginPage`, no `LandingPage`, no V3 pages
  reachable from the showcase entry's static graph. The main router in
  `apps/web/src/routes/index.tsx` keeps the global TanStack `Register`
  module augmentation; the showcase router uses inferred local typing.

  Vite config changes:
  - `rollupOptions.input` extended with `showcase` alongside `main`.
  - `manualChunks` extended with `showcase-app` (anything under
    `src/showcase/` + `src/showcase-entry.tsx`) and `showcase-vendor`
    (scrollama, framer-motion, @mdx-js runtime).
  - Inline plugin `showcaseEntryRewrite` registers
    `configureServer` + `configurePreviewServer` middleware that
    rewrites bare `/showcase/*` paths (no file extension in the last
    segment) to `/showcase.html`. Keeps Vite dev + preview + Playwright
    prerender chain working with the multi-entry MPA.

## Verification

- **tsc.** 6 pre-existing baseline errors on `apps/web`
  (StepBoundary, ObserveAnnotationLayers ×2, vegetationResolver, two
  test files); **0 NEW** errors from either prong.
- **Production build.** `pnpm --filter @ogden/web exec vite build`
  succeeded. Emitted both `dist/index.html` and `dist/showcase.html`;
  postbuild Playwright prerender produced the 4 showcase HTMLs
  unchanged.
- **Bundle isolation (the load-bearing win).** `dist/showcase.html`
  preload graph: `framework` (86 KB gzip) + `turf` (145) + `maplibre`
  (234) + `panel-compute` (53) + `panel-sections` (58) + `ecocrop-db`
  (109) + `showcase-app` (12) = **~697 KB gzip**.
  **`cesium` (1098 KB gzip) absent. `main` (557 KB gzip) absent.**
  Both Phase 3 marquee leaks eliminated.
- **Vitest showcase suite.** 10 passed / 4 skipped across 8 test files
  (snapshot loader, ShowcaseMap, MetricChart, ProjectedChart, MDX
  frontmatter, covenant ratchet, Apricot Lane attribution
  exact-string). No new failures.

## Remaining followups (Phase 3.5+)

1. `panel-compute` / `panel-sections` / `ecocrop-db` chunks (~220 KB
   gzip combined) still in the showcase preload graph despite zero
   direct imports from `apps/web/src/showcase/**`. Reachable
   transitively via `@ogden/shared` barrel re-exports. Tuning
   `manualChunks` or splitting the shared barrel into deeper subpath
   exports would drop the showcase entry below the 600 KB target.
   Tracked; not blocking — Cesium absence is the architectural win.
2. **Lighthouse not yet re-measured.** Bundle inspection confirms the
   architectural fix; the live Lighthouse run is the verification gate
   the Phase 3 spec called for. Deferred to a session with the preview
   server bootable.

## Covenant & branch discipline

- No CSRA / advance-purchase / yield-share framing introduced or
  re-introduced. `apps/web/src/showcase/__tests__/covenant.test.ts`
  ratchet still ratchets at zero.
- Apricot Lane attribution verbatim string unchanged in
  `<AttributionFooter>` across the 4 prerendered HTMLs.
- Branch `feat/atlas-permaculture` was rebased out-of-band between
  Prong A commit and Prong B work; Prong A preserved in linear history
  (commit `26228a53`) and verified before staging Prong B.
- Per-task explicit-path commits; no `git add -A`; no `--no-verify`.

## Commit shape

- Prong A: `feat(web): Phase 3.5 Prong A — route-gate authed-app bootstrap`
  (`26228a53`, earlier this session).
- Prong B (this commit):
  `feat(web): Phase 3.5 Prong B — second Vite entry + showcase-only router`.
