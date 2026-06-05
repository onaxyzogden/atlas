# Phase 3 — Three Streams Showcase Portal

**Date:** 2026-05-21
**Branch:** `feat/atlas-permaculture`
**Commit range on-branch this session:** `f70006d4..07ad078e` (5 commits visible at session close; earlier 12 task commits absorbed by an out-of-band rebase mid-session — see *Note on commit history* below).
**Status:** Tasks 1-17 shipped; **Task 18 (push) deferred to explicit user approval**.

Phase 3 of the Apricot-Lane-inspired OLOS showcase program. Layers shipped
already: Phase 1 canon ([[entities/three-streams-farm]]) and Phase 2
substrate ([[log/2026-05-20-atlas-phase-2-three-streams-demo-seed]]).
This session adds a public scrollytelling portal on top of that
substrate ([[entities/showcase-portal]]).

## What shipped

An 18-task plan executed against the Phase 3 spec
([`docs/superpowers/specs/2026-05-21-three-streams-showcase-design.md`](../../docs/superpowers/specs/2026-05-21-three-streams-showcase-design.md)).
Functional outcome:

- **4 public routes** prerendered as static HTML:
  `/showcase/three-streams`, `/showcase/three-streams/dreaming`,
  `/showcase/three-streams/transitioning`,
  `/showcase/three-streams/stewarding`. SEO-honest: `<title>`,
  `<meta>`, Open Graph, Twitter card present pre-hydration.
- **Snapshot pipeline.** `scripts/snapshot-three-streams.ts` reads the
  Phase 2 Postgres seed and emits
  `apps/web/public/showcase/three-streams.json`; loader + types live
  under `apps/web/src/showcase/data/`.
- **Hybrid map** — `scripts/snapshot-scene-images.ts` (Playwright)
  emits per-scene WebP committed under
  `apps/web/public/showcase/scenes/`; `<MapThumbnail>` swaps to live
  `<ShowcaseMap>` (extracted from `MapCanvas`, prop-driven, no store
  reads) on click.
- **Scene composition.** 14 MDX scenes (8 in `_shared/`: hero,
  y0-baseline, y1-water-cover, y2-current, y5-projected, y8-projected,
  methodology, cta; plus 2 per tier × 3 tiers = 6 tier-specific).
  Compiled via `@mdx-js/rollup` + `remark-frontmatter`. Frontmatter
  drives the SceneEngine (`scrollama`-pinned viewport; `framer-motion`
  crossfades; right-rail map ↔ chart ↔ copy panels).
- **Charts.** `<MetricChart>` reuses
  `regenerationMonitor/aggregate.ts` over seeded events;
  `<ProjectedChart>` renders Y5/Y8 forward points with an explicit
  "Projected" badge + methodology tooltip.
- **Per-tier ContactCTA.** Calendly-placeholder + contact-form
  variants. Phase 4 template-instantiation deep links will swap this
  later; ContactCTA shape is stable.
- **AttributionFooter** renders the binding Apricot Lane attribution
  string verbatim on every page.
- **Selective Playwright prerender** at postbuild
  (`scripts/prerender-showcase.ts`) writes the 4 static HTMLs under
  `apps/web/dist/showcase/three-streams/**`.
- **Covenant ratchet test** at
  [`apps/web/src/showcase/__tests__/covenant.test.ts`](../../apps/web/src/showcase/__tests__/covenant.test.ts):
  zero hits for `/CSRA|advance.purchase|yield.share|salam|riba|gharar|\binvestor\b|\bROI\b/i`
  across the showcase subtree and all 4 prerendered HTMLs;
  Apricot Lane attribution byte-exact match on all 4 pages.
- **`vite build` target** bumped to `es2022` (commit `900079e4`) to
  handle top-level-await in transitively bundled deps that the
  prerender chain needs.

### Commits visible on-branch at session close

| Commit | Task | Title |
|---|---|---|
| `f70006d4` | 13 followup | `fix(showcase): kill capture-route mapState drift + reconcile y5/y8 zoom` |
| `6073916d` | 14 | `feat(web): Task 14 — selective Playwright prerender for /showcase/three-streams + tiers` |
| `900079e4` | 14 (merged) | `fix(web): bump vite build target to es2022 for prerender chain` |
| `b8b0a3fc` | 15 | `test(web/showcase): Task 15 — covenant copy ratchet + Apricot Lane attribution exact-string` |
| `07ad078e` | 16 | `docs: Phase 3 Task 16 — end-to-end verification artefacts` |

**Note on commit history.** Tasks 2-12 were committed earlier in the
session as their own per-task commits, then absorbed by an
out-of-band rebase on `feat/atlas-permaculture` mid-session
(documented protocol — branch is force-pushed externally; see
[[user-memory/project_branch_rebase]]). The 5 commits above are what
survived into the current tip; the substrate they reference
(snapshot script, scenes, components, MDX wiring) is all on-disk and
verified by the vitest suite. The task ledger in the plan file
remains the source of truth for what was *done*.

## What's left

- **Task 18 — push gate.** Awaiting explicit user approval per the
  rebased-out-of-band protocol. Local branch is N commits ahead of
  `origin/feat/atlas-permaculture`; divergence count reported after
  the Task 17 commit lands.
- **Followup 1 — Bundle-split (Important).** Lighthouse mobile
  FCP 11.2 s / LCP 11.5 s vs 1.5 s / 2.5 s budget. Recommend Phase 3.5
  task: separate Vite `rollupOptions.input` entry for showcase or
  `React.lazy` route components; exclude Cesium from the showcase
  chunk graph.
- **Followup 2 — FOUC on body-class scroll override (Nit).** Collapses
  with Followup 1; alternate is an inline `<head>` script flipping
  `body.showcase-scroll` pre-hydration.
- **Followup 3 — tsc baseline (separate task).** 6 pre-existing TS
  errors block `pnpm build` auto-chain on `apps/web`. Direct
  `vite build` + `pnpm prerender:showcase` used as workaround
  through Phase 3.

## 8-decision brainstorm spine

Locked at session start (mirrors the spec); each line is the choice
that ended that branch of debate, in the order they were resolved:

1. **Public data access:** static JSON snapshot — no live API, no auth.
2. **Render model:** selective SSG on the showcase route subtree
   only; rest stays SPA.
3. **Scroll animation:** scrollama + framer-motion (~30 kb).
4. **Map reuse:** hybrid — WebP thumbnail → live `<ShowcaseMap>` on
   click.
5. **Scene composition:** MDX scenes (markdown + JSX).
6. **Tier branching:** hero chooser → 3 sibling SSG routes
   (`/dreaming`, `/transitioning`, `/stewarding`).
7. **CTA terminus:** Calendly / contact-form per tier — **no Phase 4
   dependency**.
8. **Y5 / Y8 data:** forward-projected charts with explicit "Projected"
   label + methodology link.

(Decision 9 in the spec — "App layout inside `apps/web`" — was a
location-only ratification, not a substantive design fork.)

## Apricot Lane attribution discipline

Binding string, present in `<AttributionFooter>` on every showcase
page and asserted byte-exact in the covenant test:

> *"Inspired by farms like Apricot Lane Farms and the rehabilitation
> arc shown in The Biggest Little Farm; Three Streams Farm is a
> fictional Ontario operation."*

Covenant ratchet at
[`apps/web/src/showcase/__tests__/covenant.test.ts`](../../apps/web/src/showcase/__tests__/covenant.test.ts).
Forbidden-vocab regex:
`/CSRA|advance.purchase|yield.share|salam|riba|gharar|\binvestor\b|\bROI\b/i`.
Zero hits across the showcase subtree and the 4 prerendered HTMLs.

## Verification snapshot

- **Vitest.** 178 / 178 files, **1772 / 1772** tests green
  (includes 14 new showcase-specific tests).
- **Cold-visitor flow.** PASS — anonymous, no boundary, no auth;
  scroll Y0 → Y2 → Y5/Y8 projected → ContactCTA on all 3 tiers.
- **SEO smoke.** PASS — `<title>`, meta description, OG, Twitter card
  present in static HTML pre-hydration on all 4 routes.
- **Covenant ratchet + Apricot Lane attribution exact-string.** PASS.
- **Lighthouse mobile.** FAIL — FCP 11.2 s, LCP 11.5 s (budget
  1.5 s / 2.5 s); tracked as Followup 1, not blocking ship.
- **tsc.** 6 pre-existing baseline errors on `apps/web`; **0 NEW**
  introduced by Phase 3.

## Notes for next session

- **Phase 3.5 bundle-split task.** Open as a discrete sprint;
  Lighthouse pass is the acceptance criterion. Concrete options on
  the table: separate `rollupOptions.input` entry for the showcase,
  or `React.lazy` route-level code-split with manual chunk hints.
  Cesium exclusion is the main lever (~4 MB drop).
- **Phase 4 template extraction.** Will swap the `<ContactCTA>`
  terminus from Calendly/contact-form to template-instantiation
  deep links. ContactCTA component shape is the right contract; no
  scene rewrites needed.
- **tsc baseline-clear.** Queue as its own task — out of scope for
  Phase 3, blocks the cleaner `pnpm build` chain.

## ADR back-links

- Design ADR: [[decisions/2026-05-21-three-streams-showcase-design]].
- Entity page: [[entities/showcase-portal]].
- Canon source: [[entities/three-streams-farm]].
- Phase 2 substrate this portal reads from:
  [[log/2026-05-20-atlas-phase-2-three-streams-demo-seed]].
- Covenant boundary:
  [[decisions/2026-05-09-atlas-csra-erasure]].
- Walkthrough that motivated the program:
  [[decisions/2026-05-20-olos-new-user-journey-walkthrough]].
- Spec ratified: [`docs/superpowers/specs/2026-05-21-three-streams-showcase-design.md`](../../docs/superpowers/specs/2026-05-21-three-streams-showcase-design.md).
- Plan executed: [`docs/superpowers/plans/2026-05-21-three-streams-showcase-portal.md`](../../docs/superpowers/plans/2026-05-21-three-streams-showcase-portal.md).
