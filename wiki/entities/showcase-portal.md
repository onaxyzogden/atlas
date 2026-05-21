# Showcase Portal
**Type:** app surface (public, static-prerendered)
**Status:** shipped (Phase 3, 2026-05-21) — followups open
**Path:** `apps/web/src/showcase/`, `apps/web/public/showcase/`, `scripts/snapshot-three-streams.ts`, `scripts/snapshot-scene-images.ts`, `scripts/prerender-showcase.ts`

## Purpose

Public scrollytelling portal at `/showcase/three-streams` plus three tier
sub-routes (`/dreaming`, `/transitioning`, `/stewarding`) that lets cold
visitors — no OLOS account, no boundary drawn, no auth handshake — meet the
platform through the Three Streams Farm Y0 → Y2 rehabilitation story
([[entities/three-streams-farm]]). Static-prerendered for sub-200ms first
paint and rich-link previews; the rest of the app stays SPA. Sibling
surface to `three-streams-farm` canon, not a feature of any signed-in
stage; replaces nothing — it is a new public marketing-grade outer ring
on the same Vite app.

## Architecture

1. **Static JSON snapshot** — `scripts/snapshot-three-streams.ts` runs
   `pg` against the seeded Postgres substrate (migrations 029 + 030 from
   [[log/2026-05-20-atlas-phase-2-three-streams-demo-seed]]) and emits
   `apps/web/public/showcase/three-streams.json` covering project, layers,
   designFeatures, regenerationEvents, spiritualZones, relationships. No
   live API, no auth, CDN-cacheable; staleness irrelevant because the
   canon is locked.
2. **MDX scenes** — `@mdx-js/rollup` + `remark-frontmatter` compile the
   14 MDX scenes (8 shared in `scenes/_shared/`, 2 per tier) into the
   bundle. Each scene exposes frontmatter (`id`, `title`, `mapState`,
   `metric`, `projected`) to the SceneEngine.
3. **SceneEngine** — `scrollama` (~10 kb) pins the scene viewport and
   fires step-enter/exit; `framer-motion` (~20 kb) handles the right-rail
   crossfade between map + chart + copy panels.
4. **Hybrid map** — `MapThumbnail` ships a static WebP per scene state
   (rendered once via `scripts/snapshot-scene-images.ts`); on click it
   hydrates to a live `<ShowcaseMap>` (extracted from `MapCanvas`,
   prop-driven, zero store reads). Keeps scroll perf at 60 fps and reserves
   live MapLibre for explore intent.
5. **Selective Playwright SSG prerender** —
   `scripts/prerender-showcase.ts` runs at postbuild, spins up a Playwright
   browser against the built `dist/`, and writes static HTML for exactly
   the 4 showcase routes under `apps/web/dist/showcase/three-streams/**`.
   Rest of the app stays SPA.
6. **Per-tier ContactCTA** — Calendly-placeholder + contact-form
   variants. **No Phase 4 (template-extraction) dependency**; this surface
   ships as a conversation-first terminus that Phase 4 will later swap to
   template-instantiation deep links.

## Public Surface

- 4 routes: `/showcase/three-streams`, `/showcase/three-streams/dreaming`,
  `/showcase/three-streams/transitioning`, `/showcase/three-streams/stewarding`.
- 1 build-output JSON: `apps/web/public/showcase/three-streams.json`
  (emitted by snapshot script, served as a static asset).
- N per-scene WebP under `apps/web/public/showcase/scenes/<scene-id>.webp`
  (+ `@2x` variants for retina), committed to git so CI doesn't need
  Playwright on each build.
- 4 prerendered HTML files under `apps/web/dist/showcase/three-streams/**`.
- **No new API route.** The existing `GET /api/v1/projects/builtins` is
  used elsewhere and unrelated to the portal.
- **No auth surface change.** Public, anonymous, no header / no cookie.

## Reused Substrate

- `regenerationMonitor/aggregate.ts` — pure aggregation function reused
  unchanged by `<MetricChart>` over the seeded `regenerationEvents`.
- MapLibre + MapTiler base style constants
  (`apps/web/src/lib/maplibre.ts`).
- `packages/shared/src/constants/system.ts` →
  `THREE_STREAMS_PROJECT_ID` sentinel — the snapshot script keys the
  Postgres read off the same UUID the in-app seeder uses.
- TanStack Router public-sibling-of-`appShellRoute` pattern, precedent
  set by `/landing`, `/login`, `/portal/$slug`, `/report-share/$token`.
- Shared package schemas (project / layer / designFeature / regenEvent
  shapes) — snapshot script and runtime read the same Zod types.
- Yeomans cap sequence and 8-year transformation arc — read straight off
  the canon ([[entities/three-streams-farm]]).

## Build Pipeline

- `pnpm snapshot:showcase` — Node + `pg`, emits `three-streams.json`
  from the live DB. Idempotent.
- `pnpm snapshot:scenes` — Playwright, emits per-scene WebP. Run
  on-demand when scene map states change; outputs committed.
- `pnpm prerender:showcase` — Playwright, emits the 4 static HTMLs.
  Wired as a postbuild step on `apps/web`.
- `vite build` target bumped to **`es2022`** to handle top-level-await
  in transitively-bundled deps required by the prerender chain
  (commit `900079e4`).
- Lighthouse + covenant ratchets run CI-side; vitest covers MDX
  frontmatter parsing, snapshot loader, `<ShowcaseMap>`, `<MetricChart>`,
  `<ProjectedChart>`, and the covenant copy ratchet
  (`apps/web/src/showcase/__tests__/covenant.test.ts`). Phase 3 closes
  with **14/14** showcase tests green and the full web suite at
  **1772/1772**.

## Open Followups

The portal ships functional + SEO-honest, but three followups are open
and tracked here as the headline outstanding work:

1. **Bundle-split (Important).** Lighthouse mobile pass returned
   **FCP 11.2 s / LCP 11.5 s** against a **1.5 s / 2.5 s** budget — 7-8×
   over. The showcase route currently ships the full authed-app bundle
   (~6 MB including Cesium ~4 MB + `projectStore` + panel-compute +
   panel-sections) that has no business on a public scroll surface. The
   SSG promise is honored end-to-end for SEO and meta-tag crawl, but the
   bundle-split promise from the spec is unhonored. Recommended Phase 3.5
   followup: a separate Vite `rollupOptions.input` entry for the
   showcase, or `React.lazy` route components; exclude Cesium from the
   showcase chunk graph entirely. Until this lands, the prerendered HTML
   is fast, but the hydrated JS is slow.

2. **FOUC on body-class scroll override (Nit; collapses with #1).** The
   authed-app shell sets `body { overflow: hidden; }`; the showcase
   routes apply a `body.showcase-scroll` override via `useEffect` after
   first paint. With the current bundle weight there is a multi-second
   non-scrollable flash on the prerendered HTML before hydration unlocks
   scroll. Fix collapses naturally once #1 drops bundle weight; alternate
   is an inline `<head>` script that flips the class before hydration.

3. **tsc baseline (separate task).** 6 pre-existing TS errors block
   the `pnpm build` auto-chain on `apps/web` (`StepBoundary`,
   `ObserveAnnotationLayers`, `vegetationResolver`, two test files,
   plus the uncommitted-foreign-WIP `CapitalPartnerSummaryExport`).
   Workaround used through Phase 3: direct `vite build` +
   `pnpm prerender:showcase`. Out of scope for Phase 3; queue for a
   dedicated baseline-clear task.

## Notes

**Apricot Lane attribution (binding, verbatim).** The string

> *"Inspired by farms like Apricot Lane Farms and the rehabilitation
> arc shown in The Biggest Little Farm; Three Streams Farm is a
> fictional Ontario operation."*

appears in `<AttributionFooter>` on every prerendered showcase HTML; the
covenant ratchet test
([`apps/web/src/showcase/__tests__/covenant.test.ts`](../../apps/web/src/showcase/__tests__/covenant.test.ts))
asserts the exact byte-string in all 4 prerendered files. No partnership
claim, no brand co-mark, no "powered by" / "in association with"
construction.

**Covenant copy ratchet.** The same test enforces that the regex
`/CSRA|advance.purchase|yield.share|salam|riba|gharar|\binvestor\b|\bROI\b/i`
returns zero hits across the entire `apps/web/src/showcase/` subtree
and the 4 prerendered HTMLs. The 2026-05-04 CSRA erasure
([[decisions/2026-05-09-atlas-csra-erasure]]) is honored end-to-end on
this surface. Capital framing is absent from the showcase by design —
the only conversation handle is "schedule a call" / "send a note."

**Phase 4 successor.** Phase 4 (template extraction + clone flow) will
swap the per-tier `<ContactCTA>` terminus from Calendly/contact-form to
template-instantiation deep links (Dreaming → sample boundary template;
Transitioning → bring-your-own-parcel template; Stewarding stays
conversation-first). The ContactCTA component shape is the right
contract for that swap; no scene rewrites needed.

**ADR back-links.**
- Design ADR: [[decisions/2026-05-21-three-streams-showcase-design]].
- Phase 3 session log:
  [[log/2026-05-21-atlas-phase-3-showcase-portal]].
- Canon source: [[entities/three-streams-farm]].
- Phase 2 substrate this portal reads from:
  [[log/2026-05-20-atlas-phase-2-three-streams-demo-seed]].
- Covenant boundary: [[decisions/2026-05-09-atlas-csra-erasure]].
- Spec the design ratifies:
  [`docs/superpowers/specs/2026-05-21-three-streams-showcase-design.md`](../../docs/superpowers/specs/2026-05-21-three-streams-showcase-design.md).
