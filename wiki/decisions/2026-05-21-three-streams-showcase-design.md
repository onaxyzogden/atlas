# Three Streams Showcase Portal — Design (Phase 3)

**Date.** 2026-05-21
**Status.** Ratified — shipped 2026-05-21 across commits `f70006d4..07ad078e` (5 commits on `feat/atlas-permaculture`, 0 pushed pending Task 18 user-approval gate).
**Spec source.** [`docs/superpowers/specs/2026-05-21-three-streams-showcase-design.md`](../../docs/superpowers/specs/2026-05-21-three-streams-showcase-design.md)

## Context

The Apricot-Lane-inspired OLOS showcase program shipped its first two
layers before this ADR: the Three Streams Farm canon
([[entities/three-streams-farm]], ratified Phase 1) and the Phase 2
loadable substrate (migrations 029 + 030 + client-side seeder,
[[log/2026-05-20-atlas-phase-2-three-streams-demo-seed]]). Both layers
serve a *signed-in* operator: load the showcase project, traverse
Observe → Plan → Act with everything populated.

The cold-visitor problem they don't solve: a Dreaming-tier person with
no land, a Transitioning-tier cash-crop operator, and a Stewarding-tier
land-org each land on the marketing surface needing a no-friction way
to see what 8 years of OLOS-guided stewardship looks like — without
creating an account, without drawing a boundary, without waiting for
the SPA bundle. The Phase 3 portal closes that gap with a static
prerendered scrollytelling surface reading from the Phase 2 substrate.

Subordinate constraints:
- Apricot Lane attribution must be **verbatim** on every public surface
  ([[entities/three-streams-farm]] §Covenant Framing).
- 2026-05-04 CSRA erasure remains binding
  ([[decisions/2026-05-09-atlas-csra-erasure]]); no capital framing on
  the showcase.
- No new API route, no auth surface change, no edits to
  modified-WIP `projectStore.ts`.
- Reuses Phase 2 substrate as the truth source — the portal must not
  invent data that the canon doesn't ratify.

## Decisions

The 9 brainstorm-locked choices, paraphrased from the spec
(§Brainstorm decisions):

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Public data access | Static JSON snapshot baked into the bundle | Fastest first paint, no auth, CDN-cacheable; canon is locked so staleness is irrelevant |
| 2 | Render model | Selective SSG for `/showcase/three-streams/*` only | SEO + sub-200 ms FCP on the showcase; rest of app stays SPA |
| 3 | Scroll animation | scrollama + framer-motion (~30 kb combined) | Standard narrative-step idiom + React-native transitions |
| 4 | Map reuse | Hybrid — static WebP thumbnail on scene enter, hydrate to live `<ShowcaseMap>` on click | Buttery scroll + click-to-explore engagement signal |
| 5 | Scene composition | MDX (markdown + JSX) | Copy-first authoring; interactive React drops in as JSX |
| 6 | Tier branching | Hero chooser → 3 sibling SSG routes `/dreaming \| /transitioning \| /stewarding` | Per-tier shareable URLs + per-tier CTA + per-tier analytics |
| 7 | CTA terminus | Calendly placeholder + contact-form per tier | No Phase 4 dependency; conversation-first fits Stewarding's high-touch nature |
| 8 | Y5 / Y8 charts | Forward-projected charts with explicit "Projected" label + methodology link | Truthful + completes the narrative arc; canon already ratifies Y5/Y8 as "projected" |
| 9 | App layout | Inside `apps/web` (sibling to `features/`) | Reuses Vite + MapLibre + types; matches existing public-sibling-of-`appShellRoute` pattern |

## Architecture

See [[entities/showcase-portal]] §Architecture and the spec
([§Architecture](../../docs/superpowers/specs/2026-05-21-three-streams-showcase-design.md))
for the full prose. Single-line summary:

> Postgres seed → snapshot script → static JSON + per-scene WebP →
> MDX scenes compiled by `@mdx-js/rollup` → scrollama-driven SceneEngine
> with framer-motion crossfades → static prerender of 4 routes via
> Playwright at postbuild → per-tier ContactCTA terminus.

## Covenant Discipline

- **CSRA erasure honored end-to-end.** No `CSRA` / `advance-purchase`
  / `yield-share` / `salam` / `riba` / `gharar` / `investor` / `ROI`
  string appears anywhere in `apps/web/src/showcase/` or in the 4
  prerendered HTMLs. The covenant ratchet test
  ([`apps/web/src/showcase/__tests__/covenant.test.ts`](../../apps/web/src/showcase/__tests__/covenant.test.ts))
  asserts zero hits and fails CI on any reintroduction.
- **Apricot Lane attribution verbatim** —
  *"Inspired by farms like Apricot Lane Farms and the rehabilitation
  arc shown in The Biggest Little Farm; Three Streams Farm is a
  fictional Ontario operation."* — present in `<AttributionFooter>` on
  every prerendered showcase HTML; the same test asserts the exact
  byte-string in all 4 files.
- **No brand co-mark, no "powered by", no partnership claim.** The
  attribution string is the only public co-occurrence of "Apricot Lane"
  and "Three Streams" anywhere in the codebase.

## Open Followups

Mirror of [[entities/showcase-portal]] §Open Followups; priority order
preserved:

1. **Bundle-split (Important).** Lighthouse mobile FCP 11.2 s / LCP
   11.5 s vs 1.5 s / 2.5 s budget. The showcase route ships the full
   authed-app bundle (~6 MB incl. Cesium ~4 MB + `projectStore` +
   panel-compute + panel-sections) that should not be on a public
   scroll surface. SSG promise honored for SEO; bundle-split promise
   from the spec unhonored. Phase 3.5 followup: separate Vite
   `rollupOptions.input` entry for showcase or `React.lazy` route
   components; exclude Cesium from the showcase chunk graph.
2. **FOUC on body-class scroll override (Nit; collapses with #1).**
   `body { overflow: hidden; }` from the authed-app shell is overridden
   by `body.showcase-scroll` via `useEffect`. Multi-second
   non-scrollable flash before hydration. Naturally fixed by #1, or
   by an inline `<head>` script flipping the class pre-hydration.
3. **tsc baseline (separate task).** 6 pre-existing TS errors
   (`StepBoundary`, `ObserveAnnotationLayers`, `vegetationResolver`,
   two test files, + uncommitted-foreign-WIP `CapitalPartnerSummaryExport`)
   block `pnpm build` auto-chain on `apps/web`. Out of scope for
   Phase 3; queue for a dedicated baseline-clear task.

## Reused Substrate

- `regenerationMonitor/aggregate.ts` (pure function) — reused unchanged
  by `<MetricChart>`.
- MapLibre + MapTiler base style constants in `apps/web/src/lib/maplibre.ts`.
- `THREE_STREAMS_PROJECT_ID` sentinel
  (`packages/shared/src/constants/system.ts`) — snapshot script and
  in-app seeder key off the same UUID.
- TanStack Router public-sibling-of-`appShellRoute` pattern
  (`/landing`, `/login`, `/portal/$slug`, `/report-share/$token`
  precedents).
- Phase 2 seeded substrate (migrations 029 + 030,
  [[log/2026-05-20-atlas-phase-2-three-streams-demo-seed]]) as the data
  truth source.
- Shared package Zod schemas (project, layer, designFeature,
  regenEvent) — snapshot script and runtime read the same types.
- 8-year transformation arc + audience-tier mapping straight from
  [[entities/three-streams-farm]].

## Out of Scope

- **Phase 4 template extraction.** ContactCTA will swap terminus when
  Phase 4 lands; portal scene shapes are stable.
- **Live-API portal variant.** Snapshot is the source for the
  foreseeable future; canon is locked.
- **Auth surface changes.** Portal is anonymous and stays anonymous.
- **D-track surfaces.** Capital-partner, financial-modelling, and
  related D-track features remain inside the authed app; portal does
  not surface D-track outputs.
- **Localization.** Single-locale (en-CA) for Phase 3.
- **Per-visitor parcel.** Visitor cannot bring their own parcel here;
  that's a Phase 4 template-instantiation entry point.

## Verification

- **Vitest.** Web suite **1772 / 1772** tests across **178 / 178**
  files, including the 14 new showcase-specific tests (snapshot loader,
  `<ShowcaseMap>`, `<MetricChart>`, `<ProjectedChart>`, MDX frontmatter
  parser, covenant ratchet, attribution exact-string).
- **Cold-visitor flow.** PASS — anonymous visitor lands on
  `/showcase/three-streams`, picks tier, scrolls Y0 → Y2 with map +
  metric + projected scenes, reaches ContactCTA. No console errors on
  the prerendered HTML on first-paint; hydration warning baseline
  (foreign WIP) unchanged.
- **SEO smoke.** PASS — prerendered `<title>`, `<meta name="description">`,
  Open Graph + Twitter card tags present on all 4 routes;
  `view-source:` confirms scene copy is in the static HTML, not
  hydration-deferred.
- **Covenant ratchet.** PASS — zero hits across showcase subtree and
  the 4 prerendered HTMLs.
- **Apricot Lane attribution exact-string ratchet.** PASS — verbatim
  byte-match in all 4 prerendered HTMLs.
- **Lighthouse.** **FAIL** on mobile FCP/LCP per Open Followup #1;
  tracked, not blocking ship. Desktop pass closer to budget but still
  over; same root cause (bundle weight).
- **tsc.** 6 pre-existing baseline errors on `apps/web`; **0 NEW**
  errors introduced by Phase 3. Direct `vite build` +
  `pnpm prerender:showcase` used as the workaround chain.

## Cross-links

- Entity page: [[entities/showcase-portal]].
- Canon source: [[entities/three-streams-farm]].
- Covenant boundary: [[decisions/2026-05-04-atlas-csra-erasure]].
- Phase 3 session log:
  [[log/2026-05-21-atlas-phase-3-showcase-portal]].
- Walkthrough that motivated the program:
  [[decisions/2026-05-20-olos-new-user-journey-walkthrough]].
- Spec ratified by this ADR:
  [`docs/superpowers/specs/2026-05-21-three-streams-showcase-design.md`](../../docs/superpowers/specs/2026-05-21-three-streams-showcase-design.md).
- Plan executed by this Phase:
  [`docs/superpowers/plans/2026-05-21-three-streams-showcase-portal.md`](../../docs/superpowers/plans/2026-05-21-three-streams-showcase-portal.md).
