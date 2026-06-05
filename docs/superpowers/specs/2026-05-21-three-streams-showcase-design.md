# Three Streams Showcase Portal — Design

**Date:** 2026-05-21
**Program:** Apricot-Lane-Inspired OLOS Showcase (Phase 3 of 5)
**Status:** design approved; forward-looking spec (the portal is net-new; substrate landed in Phase 2 via migrations 029 + 030).
**Branch:** `feat/atlas-permaculture`.
**Predecessors:** Phase 0 (blocker triage), Phase 1 ([[wiki/entities/three-streams-farm.md]] canon), Phase 2 ([[wiki/log/2026-05-20-atlas-phase-2-three-streams-demo-seed]] substrate), Task 2.7 ([[wiki/log/2026-05-20-three-streams-walkthrough-rerun]] verification).

## Goal

A public, no-account scrollytelling portal at `/showcase/three-streams` that lets cold visitors meet OLOS through the Three Streams Farm story. Three audience tiers (Dreaming / Transitioning / Stewarding) get their own sibling URL — each is a static, pre-rendered page that walks the visitor through the farm's Y0 → Y2 → Y5 → Y8 rehabilitation arc with narrative copy, interactive map embeds, and trajectory charts, ending in a tier-specific contact CTA.

Success = a cold visitor with no OLOS account lands on `/showcase/three-streams`, picks a tier, scrolls the full arc with sub-200ms first paint, sees real measured Y0→Y2 data alongside honestly-labelled Y5/Y8 projections, clicks at least one map embed to explore, and reaches an audience-appropriate Calendly / contact-form CTA. Substrate dependency: none beyond the already-seeded migrations. Runtime API dependency: none (static JSON snapshot baked into the bundle).

## Covenant boundary (non-negotiable)

**Apricot Lane attribution** must appear verbatim in the `<AttributionFooter>` rendered on every showcase page (hero, every tier, methodology):

> *"Inspired by farms like Apricot Lane Farms and the rehabilitation arc shown in The Biggest Little Farm; Three Streams Farm is a fictional Ontario operation."*

**Forbidden framing throughout all portal copy (CTAs, scenes, methodology pages, contact-form fields):**
- "CSRA" / "Community-Supported Regenerative Agriculture"
- "investor" / "investment" (the noun)
- "member" used in isolation to mean equity-holder
- "advance purchase" / "pre-purchase" / "salam" of any future yield
- "yield-share" / "return on investment" / "ROI" framed as a financial return

**Permitted alternatives** if capital framing ever surfaces in form copy:
- "capital partners & allies" (the ratified public-facing label, per `~/.claude/CLAUDE.md`)
- "charitable donation", "restricted donation", "qard ḥasan (interest-free loan)", "in-kind contribution", "sponsorship" (the permitted MTC capital channels)

Asserted by a verification step: `grep -riE "CSRA|investor|advance.purchase|yield.share|salam" apps/web/src/showcase/ apps/web/src/showcase/scenes/` ratchets at zero matches, run in CI.

**Truthfulness on projected data.** Y0 → Y2 charts render real measured data from the seeded `regeneration_events` (24 events on MDPI Y0/Y2 cadence; deltas: OM cropped +36%, bird richness +55%, earthworms +475%, infiltration +110%, pollinator visitation +360%). Y5 and Y8 charts extend the trajectory as forward projections — they must render with a **"Projected — see methodology"** badge, the tooltip on the badge linking to a methodology section that explains the projection source (canon doc + MDPI Apricot Lane Y5/Y9 sampling pattern).

## Brainstorm decisions (locked, 2026-05-21)

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Public data access | **Static JSON snapshot** baked into the bundle | Fastest first paint, no auth, CDN-cacheable; staleness irrelevant for a canon-locked showcase |
| 2 | Render model | **Selective SSG** for `/showcase/three-streams/*` only | Sub-200ms FCP + full SEO + rich-link previews; rest of app stays SPA |
| 3 | Scroll animation | **scrollama + framer-motion** (~30 kb total) | Standard narrative-step idiom, React-native transitions |
| 4 | Map reuse | **Hybrid** — thumbnail on scene enter, live `<ShowcaseMap>` on click | Buttery scroll perf + click-to-explore engagement signal |
| 5 | Scene composition | **MDX scenes** (markdown + JSX) | Copy-first authoring; interactive components drop in as JSX |
| 6 | Tier branching | **Hero chooser → 3 sibling SSG routes** `/showcase/three-streams/{dreaming\|transitioning\|stewarding}` | Per-tier shareable URLs + analytics + clean CTA per page |
| 7 | CTA terminus | **Calendly / contact form** per tier | No Phase 4 (template) dependency; conversation-first fits stewardship's high-touch nature |
| 8 | Y5 / Y8 data | **Forward-projected charts labelled "projected"** with methodology link | Truthful + completes the narrative arc |
| L | App layout | **Inside `apps/web`** (sibling to `features/`) | Reuses Vite + MapLibre + types; matches existing public-sibling-of-`appShellRoute` pattern |

## Architecture

### Build-time pipeline (new)

1. **`scripts/snapshot-three-streams.ts`** — reads from Postgres (the seeded substrate from migrations 029 + 030), emits `apps/web/public/showcase/three-streams.json` with `{ project, layers, designFeatures, regenerationEvents, spiritualZones, relationships }`. Idempotent. Run via `pnpm snapshot:showcase` or as a `prebuild` hook on the web app.
2. **`scripts/snapshot-scene-images.ts`** — Playwright-driven render of each scene's map state to `apps/web/public/showcase/scenes/<scene-id>.webp` (plus `@2x` for retina). One-time per scene-state change; outputs committed to git so CI doesn't need Playwright.
3. **Selective SSG step** — `vite-plugin-ssg` (preferred; alternative: `vite-plugin-prerender` or hand-rolled Playwright prerender stage) emits static HTML for `/showcase/three-streams`, `/showcase/three-streams/dreaming`, `/transitioning`, `/stewarding`. The rest of the app remains SPA; SSG runs only against the showcase route subtree.

A one-hour spike at the start of execution will validate the chosen SSG plugin against the existing Vite config; fallback to hand-rolled prerender if friction is high.

### Runtime composition

New directory: **`apps/web/src/showcase/`** (sibling to `features/`).

```
apps/web/src/showcase/
  routes/
    showcase.tsx                  # hero + tier chooser (TanStack public route)
    showcase.$tier.tsx            # per-tier scrollytelling page
  scenes/
    _shared/                      # scenes that appear in every tier
      hero.mdx
      y0-baseline.mdx             # real seeded data
      y1-water-cover.mdx          # real seeded data
      y2-current.mdx              # real seeded data — anchor scene
      y5-projected.mdx            # "Projected" badge + methodology link
      y8-projected.mdx            # ditto
      methodology.mdx             # explains projection source
      cta.mdx                     # tier-aware CTA shell
    dreaming/                     # 3–4 tier-specific scenes
      vision.mdx
      first-steps.mdx
    transitioning/
      conversion-mechanics.mdx
      water-and-cover.mdx
    stewarding/
      monitoring-instrumentation.mdx
      adaptive-stewardship.mdx
  components/
    SceneEngine.tsx               # scrollama wrapper; reads scene manifest
    ShowcaseMap.tsx               # extracted from MapCanvas, prop-driven, no store reads
    MapThumbnail.tsx              # static <img> + click → mount ShowcaseMap
    MetricChart.tsx               # reuses regenerationMonitor/aggregate.ts
    ProjectedChart.tsx            # same shape + "Projected" badge + tooltip
    TierChooser.tsx               # hero CTA buttons routing to /{tier}
    ContactCTA.tsx                # tier-specific Calendly embed or contact form
    AttributionFooter.tsx         # Apricot Lane attribution string + canon back-link
  data/
    snapshot.ts                   # loader for /showcase/three-streams.json
    sceneManifest.ts              # ordered list of scenes per tier
    projectedTrajectories.ts      # hand-authored Y5/Y8 chart points
  styles/
    showcase.module.css           # scoped styles (no leakage into app)
```

### Route wiring

In `apps/web/src/routes/index.tsx`, add as **public siblings of `appShellRoute`** (same pattern as `/landing`, `/login`, `/portal/$slug`, `/report-share/$token`):

```ts
const showcaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/showcase/three-streams',
  component: ShowcasePage,
});
const showcaseTierRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/showcase/three-streams/$tier',
  component: ShowcaseTierPage,
});
```

No auth guard. No app-shell chrome. No project-store mount.

### Public surface impact

- **No new API routes.** `GET /api/v1/projects/builtins` unchanged. The snapshot is a static asset.
- **No auth changes.** The RBAC plugin and detail/layers/regen routes remain auth-gated as today.
- **One new static asset family** under `/apps/web/public/showcase/`.

### Map reuse (extraction work)

`ShowcaseMap.tsx` is a new component that internalises the MapLibre setup currently coupled inside `MapCanvas`. It takes plain props:

```ts
type ShowcaseMapProps = {
  boundary: GeoJSON.MultiPolygon;
  layers: ShowcaseLayer[];              // subset of project_layers shape, snapshot-derived
  features: DesignFeature[];            // designed-map features for this scene
  activeLayerIds: string[];             // which layers visible for this scene
  initialView?: { center: [number, number]; zoom: number };
  interactive?: boolean;                // false for thumbnail-on-mount, true after click
};
```

No store reads, no projectStore/uiStore/mapStore/authStore. The component imports MapLibre + MapTiler base style directly from the same constants `MapCanvas` uses. `MapCanvas` itself is **not** refactored — `ShowcaseMap` is a parallel component to avoid destabilising the authed app.

### Scene engine

`SceneEngine` mounts an ordered manifest of scenes (from `sceneManifest.ts`, derived from MDX front-matter), wires scrollama observers, and emits scene-active events. Each MDX scene receives standard context props (`{ snapshot, sceneIndex, isActive, tier }`) and is free to render arbitrary JSX including `<MetricChart>`, `<ProjectedChart>`, `<MapThumbnail>`.

MDX front-matter convention:

```mdx
---
id: y2-current
title: Year 2 — The Soil Begins to Breathe
tiers: [dreaming, transitioning, stewarding]
mapState:
  activeLayers: [soils, watershed]
  features: [hedgerow-north, riparian-buffer-*]
  view: { center: [-79.91, 43.56], zoom: 14 }
---
```

Tier-specific scenes use a single-tier value (e.g. `tiers: [dreaming]`); shared scenes list all three.

### Y5 / Y8 projected charts

`<ProjectedChart>` shares `<MetricChart>`'s visual shape but:

- Renders a **"Projected — see methodology"** badge on the chart frame.
- Tooltip on the badge links to the `methodology.mdx` scene (or anchor within the same page).
- Data points come from `data/projectedTrajectories.ts` — hand-authored values derived from the canon doc and MDPI Y5/Y9 sampling pattern, *not* from the snapshot.

### CTA per tier

`<ContactCTA>` renders one of three variants:

| Tier | Headline | Form |
|---|---|---|
| **Dreaming** | "Talk to us about starting your own land journey" | Calendly link (low-pressure intro call) |
| **Transitioning** | "Talk to us about converting your operation" | Contact form: name, email, current operation size (acres), current land use, biggest constraint |
| **Stewarding** | "Talk to us about long-horizon stewardship partnership" | Contact form: name, email, organisation, role, parcel-or-portfolio scale, time horizon |

Covenant guardrails (must thread through every CTA + form):
- No investor / member-in-isolation / CSRA / advance-purchase / yield-share framing.
- "Capital partners & allies" only if capital ever surfaces.
- Apricot Lane attribution string verbatim in `<AttributionFooter>` on every page.

## Reused substrate (do not rebuild)

- **`apps/web/src/features/plan/regenerationMonitor/aggregate.ts`** — pure function; reused verbatim by `<MetricChart>` against snapshot-derived events.
- **MapLibre + MapTiler base style constants** — same as `MapCanvas` uses; import directly.
- **`packages/shared/src/constants/system.ts:THREE_STREAMS_PROJECT_ID`** — sentinel UUID for the snapshot script.
- **`packages/shared/src/schemas/`** — type-share project + layer + design-feature + regen-event shapes between snapshot script and runtime.
- **TanStack Router public-sibling pattern** — `/landing`, `/login`, `/portal/$slug`, `/report-share/$token` are the precedent for non-authed routes.
- **`apps/web/src/pages/PortalPage.tsx`** (or wherever `/portal/$slug` mounts) — closest existing scrollytelling-adjacent precedent for the route shape.
- **Phase 2 seeded substrate** — migrations 029 + 030; no changes.

## Out of scope (Phase 3)

- **Phase 4** — reusable Ecosystem-Farm template extraction. CTA decision (#7 = contact form) decoupled this. Portal CTAs can switch to template-instantiation links once Phase 4 ships.
- **Live API for the portal** — JSON snapshot is the contract.
- **Auth changes** — RBAC plugin and detail/regen routes unchanged.
- **D-track surfaces** (D5 dashboards, livestock rotation card) — separately tracked; portal doesn't depend on them.
- **Localisation / i18n** — English-only v1.
- **A/B testing infrastructure** — analytics for tier-conversion can come later (Phase 5).
- **Soft acreage discrepancy** (159.7 measured polygon vs ~180 canon-narrative) — fix is a one-line canon update or polygon widen, tracked in Task 2.7 follow-up, not blocking the portal.
- **Capital framing of any kind** — Scholar-Council-gated; Sub-project C scope.

## Critical files reference

**New files (creates):**

- `scripts/snapshot-three-streams.ts`
- `scripts/snapshot-scene-images.ts`
- `apps/web/src/showcase/**` (full tree above)
- `apps/web/public/showcase/three-streams.json` (build output)
- `apps/web/public/showcase/scenes/*.webp` (build output, committed)

**Reads (do not modify):**

- [apps/api/src/db/migrations/029_builtin_three_streams_farm.sql](apps/api/src/db/migrations/029_builtin_three_streams_farm.sql)
- [apps/api/src/db/migrations/030_three_streams_regeneration_trajectory.sql](apps/api/src/db/migrations/030_three_streams_regeneration_trajectory.sql)
- `apps/web/src/features/map/MapCanvas` — pattern source for `ShowcaseMap`
- [apps/web/src/features/plan/regenerationMonitor/aggregate.ts](apps/web/src/features/plan/regenerationMonitor/aggregate.ts) — reused verbatim
- [packages/shared/src/constants/system.ts](packages/shared/src/constants/system.ts) — sentinel UUID
- [wiki/entities/three-streams-farm.md](wiki/entities/three-streams-farm.md) — canon for copy / methodology
- [apps/web/src/routes/index.tsx](apps/web/src/routes/index.tsx) — public-sibling-route pattern

**Surgical edits (additive only):**

- [apps/web/src/routes/index.tsx](apps/web/src/routes/index.tsx) — add `showcaseRoute` + `showcaseTierRoute` as `rootRoute` children.
- [apps/web/package.json](apps/web/package.json) — add deps: `scrollama`, `framer-motion`, `@mdx-js/rollup` (Vite MDX integration), `vite-plugin-ssg` (or alt validated by the spike).
- [apps/web/vite.config.ts](apps/web/vite.config.ts) — register MDX + SSG plugins.
- Root `package.json` — add `snapshot:showcase` + `snapshot:scenes` scripts.

## Verification (Phase 3 acceptance)

1. **Build pipeline**
   - `pnpm snapshot:showcase` produces `apps/web/public/showcase/three-streams.json` with valid `{ project (1), layers (6), designFeatures (~22), regenerationEvents (24), spiritualZones (2), relationships (8) }`.
   - `pnpm snapshot:scenes` produces one `.webp` per scene's `mapState`.
   - `pnpm --filter @ogden/web build` emits static HTML at `dist/showcase/three-streams/index.html` + `dist/showcase/three-streams/{dreaming,transitioning,stewarding}/index.html`.

2. **First paint**
   - Lighthouse mobile FCP < 1.5 s on `/showcase/three-streams` (cold cache, throttled 4G).
   - LCP < 2.5 s.
   - No network round-trip to `/api/*` for snapshot data.

3. **Cold visitor flow (no account)**
   - Visit `/showcase/three-streams` → see hero + tier chooser.
   - Pick "Dreaming" → land on `/showcase/three-streams/dreaming` → scroll through Y0 → Y2 → Y5 → Y8 with maps + charts → reach contact CTA.
   - Same flow for `/transitioning` and `/stewarding`.

4. **Map interactivity**
   - Each scene loads with thumbnail.
   - Clicking thumbnail mounts `<ShowcaseMap>` with correct layer/feature subset; pan + zoom work; no console errors.

5. **Y5 / Y8 honesty**
   - "Projected" badge visible on every Y5 / Y8 chart.
   - Tooltip / link reaches methodology explanation.

6. **Covenant copy review**
   - `grep -riE "CSRA|advance.purchase|yield.share|salam|riba|gharar|\\binvestor\\b" apps/web/src/showcase/` → zero matches.
   - Apricot Lane attribution string present verbatim in the `<AttributionFooter>` rendered on every prerendered HTML page (hero + 3 tiers + methodology).

7. **SEO / share previews**
   - `<title>`, `<meta description>`, OG image present in each prerendered HTML.
   - `curl -A "Slackbot" https://atlas.ogden.ag/showcase/three-streams` returns fully-formed HTML (not the SPA shell).

8. **No regression on the authed app**
   - Existing routes, auth flow, `MapView` untouched in behaviour.
   - `pnpm tsc --noEmit` and `pnpm vitest run` no worse than baseline.

9. **Wiki absorption**
   - `wiki/entities/showcase-portal.md` (new) — documents the portal as an entity.
   - `wiki/decisions/2026-05-21-three-streams-showcase-design.md` (new ADR mirroring this spec).
   - `wiki/log/2026-05-21-atlas-phase-3-showcase-portal.md`.
   - `wiki/log.md` prepend.

## Estimated cost

| Task | Effort | Notes |
|---|---|---|
| SSG plugin spike + selective prerender wiring | ~2 hr | Validate `vite-plugin-ssg` vs alternatives before scene work |
| Snapshot scripts (data + scene images) | ~3 hr | Playwright wiring for scene capture is the long pole |
| `ShowcaseMap` extraction from `MapCanvas` | ~2 hr | Decoupling from stores; testing in isolation |
| Scene engine + MDX + scrollama wiring | ~3 hr | Plugin setup + manifest convention + transition primitives |
| MDX scene authoring (8 shared + 6 tier-specific = 14 scenes) | ~4 hr | Copy is canon-derived; Apricot-Lane-inspired prose work |
| `MetricChart` / `ProjectedChart` / `MapThumbnail` | ~2 hr | Charts reuse `aggregate.ts`; thumbnail is a click-to-hydrate `<img>` |
| Tier chooser + ContactCTA per tier (Calendly + form) | ~2 hr | Three CTA variants + form fields per tier |
| Covenant copy review + Apricot Lane attribution placement | ~1 hr | Grep-based + manual pass |
| Wiki absorption (entity + ADR + log + index) | ~1 hr | |
| Per-task commits + divergence checks | ~30 min | Standard branch hygiene on `feat/atlas-permaculture` |
| **Total** | **~20–22 hr** | Likely 3 sessions; first = build pipeline + extraction, second = scenes + charts, third = polish + verification |

## Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Vite SSG plugin choice mismatches our setup | Medium | Medium | One-hour spike before scene work; fallback to hand-rolled prerender via Playwright if plugin friction is high |
| `MapCanvas` extraction breaks the authed app | Medium | High | Extract `ShowcaseMap` as a parallel component, not a refactor; legacy `MapCanvas` stays untouched; `ShowcaseMap` imports the same MapLibre setup constants |
| MDX build wiring conflicts with existing Vite config | Low | Medium | MDX plugins are well-established for Vite; add behind a flag if it destabilises |
| Playwright scene-capture is flaky in CI | Medium | Low | Pre-capture scenes once and commit `.webp` to git; regenerate manually when canon changes |
| Apricot Lane attribution wording drifts during MDX edits | Medium | Medium | Pre-commit grep ensuring exact-string presence in the portal subtree |
| Covenant copy creep (someone writes "investor" in a CTA) | Low | High | Verification step #6 grep; ratchet at zero in CI |
| `feat/atlas-permaculture` external rebase wipes uncommitted work | Medium | High | Per-task commits with fetch + divergence check after each (standing protocol) |
| Snapshot drifts from migration if migrations change post-snapshot | Low | Medium | Snapshot script reads from the live DB (not a static dump); CI runs snapshot post-migration |
| Selective SSG ships stale JSON if snapshot not regenerated | Medium | Low | `prebuild` hook in `apps/web/package.json` regenerates snapshot before every build |

## Next after Phase 3

- **Phase 4** — reusable Ecosystem-Farm template extraction. Portal CTAs (currently contact-form) can switch to template-instantiation links once Phase 4 ships.
- **Phase 5** — launch + observation + iteration. Add analytics, capture visitor feedback, queue Phase 3 refinements.
- **Phase 2.5** — livestock substrate (paddocks + rotation plan + moves) — still parked behind the parallel-session B-track work landing.

## Brainstorm provenance

This design is the post-brainstorm artifact of the 2026-05-21 Phase 3 brainstorm session. All 9 decisions (8 from the agenda fixed in the program-plan `Phase 3 Brainstorm Prep` block + 1 app-layout decision surfaced mid-brainstorm) were resolved via `AskUserQuestion` one-at-a-time per the `superpowers:brainstorming` skill cadence. Brainstorm transcript lives in the session log; the program plan at `~/.claude/plans/let-s-work-together-to-flickering-thacker.md` contains the broader multi-phase program context this spec slots into.
