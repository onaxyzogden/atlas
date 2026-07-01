# Atlas Showcase Bundle Split — Phase 3.5

**Date.** 2026-05-21
**Status.** Ratified — Prong A landed in commit `26228a53` (`feat(web): Phase 3.5 Prong A — route-gate authed-app bootstrap`); Prong B landed in this session on `feat/atlas-permaculture`. **Open Followup #1 resolved 2026-06-26** (see § Update — 2026-06-26).
**Spec source.** Phase 3.5 section of the in-session plan file (`flickering-thacker`); follows Open Followup #1 from
[[decisions/2026-05-21-three-streams-showcase-design]] and [[entities/showcase-portal]] § Open Followups.

## Context

Phase 3 shipped `/showcase/three-streams` as static prerendered HTML, but
Lighthouse mobile reported FCP **11.2 s** / LCP **11.5 s** against the
1.5 s / 2.5 s budget the spec promised. Phase 1 exploration found the
leak was not in `apps/web/src/showcase/**` (zero foreign imports — no
`cesium`, no authed-app stores, no `MapView`) but in `main.tsx` itself,
which side-effect-imported the entire authed-app boot graph on every
route: `projectStore` (~358 KB chunk) + four seeders + `connectivityStore`
+ a blocking `bootAuth()` await + `siteDataSync` + `syncService`. For a
cold visitor on `/showcase/three-streams`, all of it was dead weight.

## Decision

Two-pronged fix. Both prongs ship together — one without the other
doesn't move the bundle.

### Prong A — Route-aware bootstrap gating

Extract the authed-app bootstrap from `main.tsx` into a new module
`apps/web/src/app/bootAuthed.ts` exporting `bootAuthedShell()`. Replace
the unconditional side-effect imports in `main.tsx` with a route check:

```ts
const isShowcase =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/showcase/');
if (!isShowcase) {
  const { bootAuthedShell } = await import('./app/bootAuthed.js');
  await bootAuthedShell();
}
```

Behaviour preserved for non-showcase paths verbatim — `bootAuthedShell`
contains lines 24–91 of the pre-split `main.tsx` unchanged.

Cheap data-safety-critical work (`migrateLegacyBlob` /
`cleanupArchivedV3`) stays at the top of `main.tsx` because both
functions early-exit on null localStorage checks and run for every
path.

### Prong B — Second Vite rollup input

Add `apps/web/showcase.html` as a second entry alongside `index.html`.
The showcase HTML loads `apps/web/src/showcase-entry.tsx`, which mounts a
showcase-only TanStack Router instance from
`apps/web/src/showcase/router.tsx`. The showcase router registers only
`showcaseRoute`, `showcaseTierRoute`, `showcaseCaptureRoute`, plus a
catch-all that redirects to `/showcase/three-streams`. No `appShellRoute`,
no `LoginPage`, no `LandingPage`, no V3 pages are reachable from the
showcase entry's static import graph.

`apps/web/vite.config.ts` changes:
- `rollupOptions.input` now has `main` + `showcase`.
- `manualChunks` extended with `showcase-app` (everything under
  `src/showcase/` + the showcase entry) and `showcase-vendor` (scrollama,
  framer-motion, @mdx-js runtime).
- Inline plugin `showcaseEntryRewrite` registers `configureServer` +
  `configurePreviewServer` middleware that rewrites bare `/showcase/*`
  paths (no file extension) to `/showcase.html` so Vite's SPA-style
  fallback serves the right HTML in dev and preview. Required for the
  Playwright prerender chain in `scripts/prerender-showcase.ts` to keep
  working.

Type-registration discipline: the main router in
`apps/web/src/routes/index.tsx` keeps ownership of the global
`@tanstack/react-router` `Register` module augmentation. The showcase
router uses inferred local typing from `createRouter()`'s return.

## Verification

- **tsc.** 6 pre-existing baseline errors on `apps/web` (StepBoundary,
  ObserveAnnotationLayers ×2, vegetationResolver, two test files); **0
  NEW** errors introduced by either prong.
- **Production build.** `pnpm --filter @ogden/web exec vite build`
  succeeded; emitted `dist/index.html` + `dist/showcase.html`; postbuild
  prerender produced the 4 showcase HTMLs unchanged.
- **Bundle isolation (core win).** `dist/showcase.html` script tags pull:
  `framework` (86 KB gzip) + `turf` (145) + `maplibre` (234) +
  `panel-compute` (53) + `panel-sections` (58) + `ecocrop-db` (109) +
  `showcase-app` (12). Total ~697 KB gzip pre-interactive.
  **`cesium` (1098 KB gzip) is absent.** **`main` (557 KB gzip) is
  absent.** Both were the marquee leaks in the original Phase 3 build.
- **Vitest.** Showcase suite (snapshot loader, ShowcaseMap, MetricChart,
  ProjectedChart, MDX frontmatter, covenant ratchet, Apricot Lane
  attribution exact-string) green; no new failures.

## Open Followups (Phase 3.5 → Phase 3.5+)

1. **`panel-compute` / `panel-sections` / `ecocrop-db` are still in the
   showcase preload graph.** These chunks (~220 KB gzip combined) are
   not used by any showcase scene but are reachable transitively through
   `@ogden/shared` re-exports. Tuning the `manualChunks` rules or
   splitting the `@ogden/shared` barrel into deeper subpath exports
   would drop the showcase entry below the 600 KB gzip target the
   Phase 3 spec set. **RESOLVED 2026-06-26** (§ Update below): the actual
   bridge was `src/lib/tokens.ts` being Rollup-co-located into
   `panel-sections` — not the `@ogden/shared` barrel — plus a static
   `ShowcaseMap` import pinning maplibre; both severed. First paint
   ~697 KB → ~109 KB gzip, now guarded
   ([[decisions/2026-06-26-atlas-bundle-budget-guard]]).
2. **Lighthouse not yet re-measured.** Bundle inspection confirms the
   architectural fix; a live Lighthouse run (production build,
   throttled 4G) is the verification gate the spec called for. Deferred
   to a session with the preview server bootable.

## Update — 2026-06-26 (Prong B follow-through: heavy-chunk eviction + budget guard)

Open Followup #1 is **resolved**, and the win is now guarded. Full narrative
in [[log/2026-06-26-atlas-showcase-bundle-budget-guard]]; guard rationale in
[[decisions/2026-06-26-atlas-bundle-budget-guard]].

**Root cause (the residue was not the barrel).** Two static bridges, not the
`@ogden/shared` re-exports, kept the heavy graph eager:
1. `src/lib/tokens.ts` (a shared design-tokens leaf) was unassigned by
   `manualChunks`, so Rollup co-located it into the lazy `panel-sections`
   chunk. `showcase-app` statically imports `tokens.ts`, so that fold created
   a static edge `showcase-app → panel-sections → panel-compute → @turf/turf
   + ecocrop-db`.
2. `ShowcaseMap.tsx` (wrapping `maplibre-gl`) was statically imported by
   `MapThumbnail.tsx` and `showcase._capture.tsx`, pinning maplibre's ~234 KB
   into first paint though the map only hydrates on click-to-explore.

**Fix (commit `04cd3489`).** `vite.config.ts` `manualChunks` pins
`src/lib/tokens.ts → foundation` and `ShowcaseMap.tsx → showcase-map`; the
three showcase routes in `src/routes/index.tsx` became `React.lazy`; and
`<ShowcaseMap>` became a dynamic `import()` at both call sites. Rollup
invariant on record: a module *assigned* to a chunk by `manualChunks` cannot
be split out by a dynamic import, and an *unassigned* shared leaf is folded
into whichever chunk imports it — so each edge needed an explicit chunk rule,
not only a dynamic call site.

**Result.** `dist/showcase.html` first paint is now `framework` 83.9 +
`showcase-app.js` 12.7 + `showcase-app.css` 10.6 + `foundation` 1.1 +
`modulepreload-polyfill` 0.4 = **108.7 kB gz** (Node-gzip; ~100 kB JS-only).
`maplibre`, `turf`, `ecocrop-db`, `panel-compute`, `panel-sections` all
**absent**. **~697 KB → ~109 KB gz** — well past the 600 KB target.

**Guarded.** `apps/web/scripts/check-bundle-budget.mjs` + `bundle-budget.json`
(`showcase-initial`, ceiling 115.0 kB) + npm `bundlesize` / `bundlesize:update`
+ `BUNDLE_BUDGET.md` fail CI if any heavy chunk re-leaks (≥53 kB > the ~6 kB
headroom). See [[decisions/2026-06-26-atlas-bundle-budget-guard]].

**Still open:** Followup #2 (live Lighthouse re-measure) — unchanged.

## Covenant & Branch Discipline

- No CSRA / advance-purchase / yield-share framing introduced.
- Apricot Lane attribution verbatim string unchanged in
  `<AttributionFooter>`.
- `feat/atlas-permaculture` rebased out-of-band between Prong A commit
  and Prong B work; verified Prong A preserved in linear history
  (commit `26228a53`) before staging Prong B.
- Per-task explicit-path commits; no `git add -A`; no `--no-verify`.

## Cross-links

- Entity: [[entities/showcase-portal]]
- Phase 3 design: [[decisions/2026-05-21-three-streams-showcase-design]]
- Phase 3.5 log: [[log/2026-05-21-atlas-phase-3.5-bundle-split]]
