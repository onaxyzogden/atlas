# Observe Dashboard

**Type:** module (v3 Observe surface) · **Status:** active · **Surface:** Atlas web (`apps/web`)
**Path:** `apps/web/src/v3/observe/dashboard/` · **Branch:** `feat/atlas-permaculture`

The read-only synthesis layer of the three-stage reframe (**Plan** decides /
**Act** executes+collects / **Observe** synthesizes). Shipped as Phase 4 of the
OLOS UX spec ([[decisions/2026-05-28-atlas-observe-dashboard-phase4]]). Mounted
in the canvas slot by `ObserveDashboardLayout`, which branches between surfaces
on a `surface` discriminator set by `ObserveLayout` from the matched route.

## Surfaces

`ObserveDashboardSurface = 'unified' | 'domain' | 'temporal' | 'rollup'`
(`ObserveDashboardLayout.tsx`). An unresolved `domainId` falls back to Surface 1
so the steward never lands on a blank surface; the rollup surface is
objective-keyed and carries no `domainId` requirement.

- **Surface 1 -- `UnifiedLandStateSurface`** (`surface='unified'`, default).
  `LandStateSummary` freshness chips + BentoBox grid of 16 `DomainStatusCard`s
  backed by `useDomainSnapshots`. Header toolbar carries the **"Present"** entry
  (read-only `PresentationModeOverlay`) and the **"By objective"** entry to
  Surface 4 (2026-05-31).
- **Surface 2 -- `DomainDetailLayout` / `DomainObservationList`** (`surface='domain'`
  + valid `domainId`). Per-domain observation stream (seed/baseline, direct Act
  recordings, field-log projections), supersession control, evidence library,
  observation needs, cycle stamps. Each Act-emitted row shows the gold
  objective-title **provenance chip** ([[decisions/2026-05-31-atlas-observe-datapoint-objective-link]]).
  Now also carries an **`All / From Act / Baseline` source filter** (2026-05-31,
  below).
- **Surface 3 -- `TemporalLayerSurface`** (`surface='temporal'` + valid
  `domainId`). Inline-SVG `TemporalChart` (numeric + status), `CycleAnnotations`,
  `LocationFilter` clustering.
- **Surface 4 -- `ObjectiveRollupSurface`** (`surface='rollup'`, NEW 2026-05-31).
  Objective-centric Land State rollup; see below.

## Domain Detail "From Act" source filter (2026-05-31, `cb1e9159`)

`apps/web/src/v3/observe/dashboard/domain/`:

- `observationSource.ts` (NEW) -- pure classifier. `isVirtual(point)` (id
  `feed:`-prefixed field-log projection); `classifyObservationSource(point)`
  returns `'act'` when `isVirtual || sourceObjectiveId != null`, else
  `'baseline'`; `matchesSourceFilter(point, filter)`. One shared definition for
  the list + its test.
- `DomainObservationList.tsx` -- `useState<SourceFilter>('all')`; `useMemo` live
  counts (`all` / `act` / `baseline = all - act`); an `All / From Act / Baseline`
  segmented chip control above the `<ol>` (zero-count chip disabled); rows
  filtered by the active chip while `reverseSupersededBy` stays built from
  `view.all` so supersession partners resolve even when filtered out.
- `__tests__/observationSource.test.ts` (NEW) -- partition + counts invariants.

Rationale for the 3-way taxonomy: `From Act` deliberately groups direct
recordings AND field-log projections (each already carries its own per-row tag,
so a finer 4-way split would be redundant); `Baseline` is the null-objective seed
complement. Lowest-cognitive-load option that still tells the Plan->Act->Observe
loop story. ADR resolves the second named-deferred item of
[[decisions/2026-05-31-atlas-observe-datapoint-objective-link]].

## Surface 4 -- Objective rollup (2026-05-31, `ba1d5b8c`)

`apps/web/src/v3/observe/dashboard/rollup/`:

- `ObjectiveRollupSurface.tsx` -- props `{ projectId }`. Enumerates objectives
  via `useProjectObjectives(projectId)` (universal + typed); subscribes
  `useObserveDataPointStore((s) => s.byProject)` and `useMemo`-groups points with
  non-null `sourceObjectiveId` into a `Map` (newest-first by
  `Date.parse(capturedAt)`; never builds a new array in the selector);
  `useDomainSnapshots(projectId)` keyed by `UniversalDomain` for freshness; a
  `recordedOnly` toggle (default OFF) doubles the surface as a coverage overview;
  header reads "{recordedCount} of {n} objectives observed".
- `ObjectiveRollupCard.tsx` -- title from `objective.title`; primary domain via
  `getPrimaryDomainForObjective(objective)` -> snapshot freshness pill
  (`data-freshness` colour rules); first 3 observations
  (`formatActyTimestamp` + `readNote`) with "+K more"; empty state "No
  observations recorded yet." When the objective resolves a primary domain, the
  card also renders a **"View in Domain Detail"** deep-link
  (`ArrowUpRight` icon, `.detailLink`) that `navigate`s to that domain's Surface 2
  with `search: { source: 'act' }` -- pre-filtering the destination list to
  "From Act" (2026-05-31, `7ecf69f3`; see below).
- `ObjectiveRollupSurface.module.css` / `ObjectiveRollupCard.module.css` --
  BentoBox tokens, `auto-fill minmax(280px, 1fr)` grid, freshness `border-left`
  accent.

Chosen as a NEW surface (over cramming an objective column into the domain grid,
which has a different primary key, or a transient modal) because the per-objective
feed is browse-worthy standing content. Resolves the third named-deferred item of
the objective-link ADR -- surfacing the per-objective feed beyond the single Act
exec panel.

## Rollup -> Domain Detail deep-link (2026-05-31, `7ecf69f3`)

Closes the rollup -> detail navigation loop. The `ObjectiveRollupCard`
"View in Domain Detail" link carries a typed `?source=act` search param that
pre-filters the destination Domain Detail list to "From Act", so the steward
lands on exactly the Act-emitted observations the card summarized.

- `routes/index.tsx` -- `v3ObserveDashboardDomainRoute` gains a `validateSearch`
  that narrows `?source=` to the `SourceFilter` union (`'all' | 'act' | 'baseline'`,
  else `undefined`) -- a wrong key fails the build.
- The param threads `ObserveLayout` (`useSearch({ strict: false })`, cast
  extended with `source?`) -> `ObserveDashboardLayout` (`initialSource` prop,
  forwarded only in the `domain` branch) -> `DomainDetailLayout`
  (`initialSourceFilter` prop; passed to the list AND folded into its key
  `${domainId}:${initialSourceFilter ?? 'all'}` so re-entering the same domain
  via a fresh deep-link re-applies the pre-filter) -> `DomainObservationList`
  (`useState<SourceFilter>(initialSourceFilter ?? 'all')`).
- Manual chip changes after mount still win (the seed only sets the initial
  state). Verified live: clicking the card link lands on `?source=act` with the
  "From Act" chip pressed; toggling to "All" sticks (no snap-back).

## Shared display helpers

`apps/web/src/v3/observe/dashboard/observationDisplay.ts` (2026-05-31) --
`readNote(mv: unknown): string | null` and `formatActyTimestamp(iso): string`,
extracted from `ActTierExecutionPanel.tsx` (behavior byte-identical) so the Act
exec panel feed and the rollup card share one definition. Pure, no React/store
deps. (Act importing across into Observe is the established allowed direction.)
The Act panel's switch to the shared helpers (its local copies removed) was
initially deferred as tangled with foreign WIP, then landed via the out-of-band
rebase `0e028508` -- the Act exec panel now imports `readNote` /
`formatActyTimestamp` from this module, foreign refactor left untouched.

## Routes

- `observe/dashboard` -- Surface 1 (Unified)
- `observe/dashboard/$domainId` -- Surface 2 (Domain Detail)
- `observe/dashboard/temporal/$domainId` -- Surface 3 (Temporal)
- `observe/dashboard/rollup` -- Surface 4 (Objective rollup, 2026-05-31)

All registered static-prefix-first in `routes/index.tsx`, component
`ObserveLayout`, which derives the `surface` discriminator from the path.

## Dependencies

- `useObserveDataPointStore` (`store/observeDataPointStore.ts`) -- `byProject`,
  `getByObjective` / `getByDomain` selectors
- `useDomainSnapshots` (`dashboard/useDomainSnapshot.ts`) -- per-domain freshness
- `useProjectObjectives` (`plan/strata/useProjectObjectives.ts`) -- per-project
  objective catalogue
- `@ogden/shared` -- `getPrimaryDomainForObjective`,
  `findObjectiveAcrossCatalogues`, `ObserveDataPoint`, `UniversalDomain`

## Shell selection: dashboard vs lens (2026-06-02, `f7e164f2`)

`ObserveLayout` (`apps/web/src/v3/observe/ObserveLayout.tsx`) selects an Observe
**shell** per-project via `getObserveShellMode(projectRecord)` (default
`'dashboard'`), with `ObserveShellToggle` flipping + persisting `observeShellMode`:

- **`'dashboard'`** -- the 4-surface synthesis layer documented above
  (`apps/web/src/v3/observe/dashboard/**`). Default and **byte-untouched** by the
  promotion below.
- **`'module-bar'`** -- as of 2026-06-02 this branch renders the promoted
  **observational-lens dashboard** (`apps/web/src/v3/observe/lens/`,
  `ObserveLensDashboard`, mock-backed) instead of the legacy 16-domain module
  bar. As of the same day's follow-up (`bcb0ea2b`) the branch mounts the lens
  **full-bleed** -- a `position:absolute; inset:0` container (NOT `StageShell`),
  mirroring the working standalone route, with `ObserveShellToggle` floating
  above. (The earlier rails/tray-`null` `StageShell` mount confined the
  zoom wrapper to a sub-viewport box; see the fill fix below.) The prior
  dual-shell body is preserved verbatim as `ObserveDualShellLayoutLegacy` (still
  holds the real dashboard render path AND the preserved legacy module-bar
  assembly -- no-deletion). The lens UI is enlarged by a single CSS true-zoom
  wrapper (`zoom: 12/7 ~= 1.714x`) so its smallest 7px source font paints at
  12px. Still mock-backed -- no `ObserveDataPoint`/`useDomainSnapshot`/MapLibre
  wiring yet. Lens identity is sourced from the shared `OBSERVE_LENSES`. Also
  exposed chrome-free at `/v3/prototype/observe-lens`.
  ([[decisions/2026-06-02-atlas-observe-lens-module-bar-promotion]];
  [[log/2026-06-02-atlas-observe-lens-promotion-truezoom]]).

### Lens fill fix + chrome restructure (2026-06-02, `bcb0ea2b`)

Operator review of the promotion reported the lens rendered in a box smaller
than the viewport (`C.bg` gutters right and bottom) and asked to rearrange the
chrome. Two changes, both mock-backed, dashboard shell byte-untouched:

- **Fill.** The true-zoom wrapper sized the zoom box at `width/height:
  calc(100%/Z)`, assuming the older Chromium semantics where `zoom` scales the
  box's footprint back to 100%. This engine resolves the percentage box to fill
  its parent and `zoom` only magnifies internal lengths -- so the division
  double-shrank the UI to ~58% of the viewport. Fixed by setting the zoom box to
  `width/height: 100%` (`ObserveLensDashboard.tsx`); it now fills edge-to-edge
  while every length still renders `Z` larger (min font 12px). Paired with the
  full-bleed `ObserveLayout` mount above (the `StageShell` grid/flex context was
  a second confinement source).
- **Chrome.** `CycleTimelineBar` gains a `vertical` always-expanded
  left-sidebar mode (spiral + cycle header + Now/Observe-active callout +
  plan-review/stale/ageing signals). `DomainsView` gains a `horizontal`
  scroll-x top-bar mode (rich lens cards -- icon, label, freshness, obs count,
  summary, "View all observations ->" deep-link -- now the sole lens selector;
  card click drives `activeLens`, re-click resets to `all`). The `LensBar` pill
  row is removed from the root JSX; `LensBar` and the old left `DomainsRail`
  mount are left defined-but-unused (no-deletion). `IntelligencePanel` unchanged
  on the right (300px). ([[decisions/2026-06-02-atlas-observe-lens-fill-restructure]];
  [[log/2026-06-02-atlas-observe-lens-fill-restructure]]).

### Lens reshape onto the Act tier shell (2026-06-02, `3a7fdf57`..`3e1562d6`)

Operator ask: "reference the tier shell version of Act stage while planning to
use it as a template to format/shape the layout/proportions of the Observe
stage page." The `module-bar` lens was rebuilt on Atlas's **real shared
`StageShell`** (the same chrome Act uses) and the CSS true-zoom was dropped, so
the lens now renders at Act's natural proportions instead of a magnified box.
Mock-backed throughout; the `dashboard` shell stays byte-untouched. Four
explicit-path commits on `feat/atlas-permaculture` (not pushed):

- **`3a7fdf57` -- `ObserveLensSpine`** (`lens/ObserveLensSpine.tsx` +
  `.module.css`, NEW). An `ActTierSpine`-style top spine: a sticky gold-accent
  project-identity `.projectTile` + a `role="tablist"` of compact `.tier` tabs
  (a leading "All" tab + one per `LENSES`). A tab click calls
  `onSelectLens(isActive ? 'all' : id)` (same toggle semantics the old
  `DomainsView` strip had). CSS is a trimmed COPY of the Act spine classes (no
  cross-import across the Act/Observe boundary); tokens resolve from the app
  `tokens.css`. This becomes the sole lens selector.
- **`00c3c851` -- `RecentObservationsStrip`** (in `lens/components.tsx`). A
  horizontal, scroll-x "recent observations" strip for the StageShell **bottom
  tray** (Observe has no tools to put there). Filters `MOCK_OBSERVATIONS` by
  `activeLens` (`'all'` -> all), sorts a COPY ascending by a local `ageToHours`
  parser (never mutates the fixtures), and renders lens-coloured `TYPE_ICON`
  cards. Wired to the SAME `handleObsClick` / `selectedObs` the map uses, so a
  card click selects the matching map pin AND pops the IntelligencePanel
  "Selected Observation" block (zero new state).
- **`bf8ad76c` -- de-zoom rebake + rail-fill + bento cards** (`components.tsx`).
  With the zoom gone, every inline `fontSize: N` literal was remapped onto an
  Act-aligned ladder (smallest DOM chrome font now ~9-12px; the spiral SVG's
  in-`viewBox` `fontSize="7"` strings are left untouched -- they scale with the
  box, so touching them would double-scale). `CycleTimelineBar vertical` and
  `IntelligencePanel` now fill `width/height:100%`, drop their fixed widths
  (`260` / `300`) and edge borders, and each supplies its own bento card
  surface (mirrors Act's `.railPanel`) because StageShell rails draw no surface.
  The spiral SVG was made fluid (`width:100%` + retained `viewBox`).
- **`3e1562d6` -- rebuild `ObserveLensDashboard` on StageShell** + new
  `ObserveLensDashboard.module.css`. The `Z = 12/7` const and both zoom wrappers
  are deleted. The new root mirrors `ActTierShell`: `.lensShell` (flex column,
  `height:100%`, `position:relative`, `background: C.bg`) -> `TopBar` ->
  `ObserveLensSpine` -> `.shellWrap` (`flex:1 1 auto; min-height/min-width:0`)
  wrapping `<StageShell bottomPlacement="between-rails">` with four slots:
  `leftRail = CycleTimelineBar vertical`, `canvas = PseudoMap`,
  `rightRail = IntelligencePanel`, `bottomTray = RecentObservationsStrip`.
  `DomainDetailSlideUp` mounts as a **sibling** of `.shellWrap` (NOT StageShell's
  `overlay` slot, which sits inside the 8px padding) so its `position:absolute;
  inset:0` covers TopBar + spine + shell. CSS guard
  `.lensShell :global([data-stage-bottom]){min-width:0}` keeps the tray
  scrolling instead of widening the centre column.

`DomainsView` (with its `horizontal` prop), `LensBar`, and `DomainsRail` are now
fully unused but retained ([[feedback-no-deletion]]).

**Update 2026-06-03 ([[log/2026-06-03-atlas-observe-lens-right-rail-merge-self-railed]]):**
the StageShell now uses **three** slots, not four. Recent Observations moved out
of the `bottomTray` and into the right rail: `IntelligencePanel` gained an
optional `footer` rendered inside its single scroll body, and
`RecentObservationsStrip` gained a `vertical` mode (no bento card, `borderTop`
divider, full-width card column). `ObserveLensDashboard` now passes the vertical
strip as that footer and drops `bottomTray`, so Land Intelligence + Recent
Observations share one scroll and the map canvas runs taller. Separately, the
whole **Observe stage is now self-railed** -- `"observe"` was added to
`SELF_RAILED_STAGES` in both `V3ProjectLayout.tsx` and `DecisionRail.tsx`, so the
outer `LandOsShell` collapsible "Site Intelligence" rail
(`ObserveSiteIntelligenceRail` / `SiteIntelligencePanel`) no longer mounts in any
Observe mode; Observe is now a self-railed peer of Plan/Act. Those rail
components stay exported (still used by the dashboard/legacy surfaces' own rails;
[[feedback-no-deletion]]).

**Verified live** (port 5200; `tsc --noEmit` EXIT 0 after every slice, filtered
to `observe/lens`): both mounts render the identical reshaped component -- the
chrome-free debug route `/v3/prototype/observe-lens` AND the `module-bar` project
route (toggled via `ObserveShellToggle`). No `zoom` box anywhere; StageShell
grid measured `220px / 1fr / 240px` at the <=1200px preview viewport (Act-parity
responsive widths); 7 spine tabs; spine tab click re-filtered the strip 10 -> 2;
recent-obs card click set `selectedObs` and popped the IntelligencePanel selected
block; the Domain Detail slide-up rests at `top:48 / height:944 / transform:none`
fully covering TopBar+spine (its slide-in keyframe was throttled to its `from`
frame in the unfocused preview tab -- a render artifact, not a layout bug);
`ObserveShellToggle` round-trips module-bar <-> dashboard. Smallest HTML chrome
font >=9px (only the spiral SVG `viewBox` text reads 7px user-units, scaled by
the box). `preview_screenshot` timed out (the known transient hang,
[[project-screenshot-hang]]) -- proof is DOM / `getComputedStyle`, disclosed.
Regression: `git status` clean under `observe/dashboard/**`; `ObserveLayout.tsx`
untouched (the `module-bar` branch still wraps `<ObserveLensDashboard/>` in
`absolute; inset:0` + floating toggle); `DomainsView`/`LensBar`/`DomainsRail`
still exported. Supersedes the fill-restructure ADR's mount (full-bleed
`absolute` -> real StageShell) and zoom (true-zoom -> dropped) decisions.
([[decisions/2026-06-02-atlas-observe-lens-act-template-reshape]];
[[log/2026-06-02-atlas-observe-lens-act-template-reshape]]).

**Update 2026-06-03, spine detail + slide-up trigger (`77a6c256`,
[[log/2026-06-03-atlas-observe-spine-detail-slideup-restore]]):** the compact
`ObserveLensSpine` tabs were enriched back toward the old `DomainsView` cards.
Each lens tab now appends `· {lastObserved}` to its meta, shows a `▲ Divergence`
badge (`C.amber`) when `lens.divergence`, and a 2-line-clamped `lens.summary`
(70-char truncate). Detail-bearing lenses (`DOMAIN_DETAIL[lens.id]`) also render a
SIBLING **"View all observations ->"** button (inside a new `.tierWrap` column
beside the `role="tab"` filter button -- no nested `<button>`s) that opens the
existing `DomainDetailSlideUp`. `ObserveLensSpine` gained `onOpenDetail`, wired in
`ObserveLensDashboard` to the already-mounted `setDetailLens` (the spine is a
second caller; the IntelligencePanel "Domain Detail ->" path stays, additive).
CSS: `flex:1 1 0; min-width:116px` moved from `.tier` to `.tierWrap`; added
`.tierDivergence`, `.tierSummary`, `.tierDetail`. Verified live on both mounts
(`tsc` EXIT 0; 7 tabs, 6 detail buttons, Water divergence, slide-up opens + Back
closes, main-click still filters, no nested-button warning); `preview_screenshot`
hung ([[project-screenshot-hang]]) so proof is DOM/`getComputedStyle`.
`DomainsView` et al. remain exported ([[feedback-no-deletion]]).

**Update 2026-06-03, spine split -- top filter chips + bottom detail rail
(`7725cf94`, [[log/2026-06-03-atlas-observe-spine-split-filter-chips-detail-rail]]):**
the enriched spine's two jobs were split across two surfaces. `ObserveLensSpine`
is now a **minimal filter-chip bar** (icon + label + freshness dot; `.tier`
restyled as a `border-radius:999px` pill); it dropped `onOpenDetail` and all rich
markup (`.tierWrap`/`.tierMeta`/`.tierDivergence`/`.tierSummary`/`.tierDetail` and
the height-parity clone removed). The rich card content + slide-up trigger moved
DOWN into a new **`ObserveLensDetailRail`** mounted in StageShell's `bottomTray`
(`between-rails`), so it sits under the canvas between the full-height rails. The
rail is **detail-only**: 6 cards (no "All lenses" -- filter reset stays in the top
chip), each a single whole-card `<button>` carrying icon + dot + title + meta +
`▲ Divergence` + clamped summary + a button-styled **"View all observations ->"**
CTA (a tinted `.hint` pill, not a nested button). A whole-card click opens that
lens's `DomainDetailSlideUp` via the already-mounted `setDetailLens` (the rail
replaces the spine as the caller). StageShell unchanged (reused its existing
`bottomTray`/`between-rails` slot). Verified live (`tsc` EXIT 0; 7 top chips, 6
rail cards, `nestedButtons:0`, whole-card slide-up opens, console clean;
screenshot captured this session). `DomainsView`/`DomainsRail`/`LensBar`/`TopBar`
remain exported ([[feedback-no-deletion]]).

**Update 2026-06-03, lens polish -- project type, cool palette, cycle-rail trim
(`de054364`, `44f84255`):** four operator-driven UI tweaks on the `module-bar`
lens, mock-backed, dashboard shell byte-untouched.

- **Identity tile subtitle = project type(s).** `ObserveLensSpine` gained a
  `projectType` prop (fed `PROJECT.type`, e.g. "Regen Farm + Silvopasture"); the
  `.projectTileTypes` line now renders it in place of the static "Observe . Lens".
- **De-browned palette.** The lens prototype's `tokens.ts` `C` grayscale ladder
  (`bg`/`bg2`/`bg3`/`bg4`/`border`/`borderLight`) was retuned from the source
  concept's WARM olive grays (`#0F0F0D`/`#161613`/`#2A2A25` ...) to the app's COOL
  slate ladder (`bg2 == --color-surface #14191f`, `bg3 == --color-surface-alt`,
  `bg4 == --color-surface-raised`, `border == --color-border #242f3d`), so the
  Observe rails/cards stop reading brownish next to the cool app shell + the
  spine/detail-rail (which use `var(--color-surface)`). This is a deliberate
  reversal of the old tokens.ts "kept verbatim for pixel fidelity; reskin later"
  note -- it cools the WHOLE lens surface (canvas + cards), not just the two rails
  the operator flagged, for internal consistency. Accent hues
  (blue/green/amber/...) and fonts unchanged. Live: both rails compute
  `rgb(20,25,31)` (was warm `rgb(22,22,19)`).
- **CycleTimelineBar vertical rail: drop phase chips.** The Plan/Act/Observe
  chip row was removed from the vertical cycle header (the spiral already encodes
  phase position). The `phases` array stays (the spiral consumes it); the
  horizontal expanded panel keeps its own chip row (untouched).
- **CycleTimelineBar: enlarge the cycle spiral 60%.** New `SPIRAL_SCALE = 1.6`
  applied to the SVG's rendered box only (`height` 140->224, `maxWidth` 160->256);
  the `0 0 160 140` viewBox geometry is unchanged so the spiral scales uniformly.
  The ~240px rail column still bounds it (live rendered 232x224, was ~160x140).
  `spiralDiagram` is shared with the horizontal expanded panel, so it scales there
  too (not in the live route).

Verified live on `module-bar` (`tsc --noEmit` EXIT 0 after both commits;
`getBoundingClientRect`/`getComputedStyle` proof). `preview_screenshot` hung again
([[project-screenshot-hang]]; the preview tab had also drifted to the `:3001` API
origin and was re-navigated to `:5200`) -- disclosed, DOM measurements used as
proof. Explicit-path commits on `feat/atlas-permaculture`, not pushed.
`DomainsView`/`DomainsRail`/`LensBar`/`TopBar` remain exported
([[feedback-no-deletion]]).

## Lens wired onto live data + Live/Mock toggle (2026-06-03, `471452df`..`9aab6bb0`)

The `module-bar` "observational lens" shell (`apps/web/src/v3/observe/lens/`) was
100% Millbrook-fixture-backed; it now reads each project's live `ObserveDataPoint`
substrate **by default**, with a per-project persisted Live/Mock toggle (mock =
escape hatch). Full rationale:
[[decisions/2026-06-03-atlas-observe-lens-live-data-toggle]]. Shape:

- **Bundle indirection.** The dashboard resolves ONE `LensDataBundle`
  (`lens/types.ts`) at the root and exposes it via `lens/lensData/LensDataContext`
  (`LensDataProvider` / `useLensData()`); every lens component reads the bundle
  through context instead of importing `mockData.ts`. `mockData.ts` is re-packed
  unchanged into `lens/lensData/mockBundle.ts` (the `mock` source).
- **Live builder.** `lens/lensData/liveBundle.ts` -- pure mappers
  (`buildLiveLensBundle`, `computeDomainRollups`, `buildObservationPins`) + a thin
  `useLiveLensBundle(projectId)` hook over `useObserveDataPointStore.byProject` +
  `useProjectStore`. Aggregates per-lens count/freshness/divergence over
  `OBSERVE_LENSES.domains` (same freshness logic as `useDomainSnapshot`), projects
  active geometries into a padded `[0.08,0.92]` y-inverted bbox (no-geometry ->
  deterministic index scatter), derives summary/keyData/planRevision, real cycle
  window with NOMINAL phase bounds. Unit-tested (`__tests__/liveBundle.test.ts`,
  16 tests over the real MTC seed, `happy-dom`).
- **Honest degrade.** Seeded `measurementValue` is only `{ label, note }` (schema
  `unknown`), so there is no live numeric series for the specialised viz (wind
  rose / pH / infiltration / slope / capacity / consent) or cycle phase timing.
  `types.ts` gained `NoSpecialisedData { type:'none' }` (new `Specialised` union
  member; `DomainDetail.specialised` stays required); the live bundle emits it for
  every lens and `components.tsx` renders an empty-viz note deferring to the
  captured-point list. The `none` variant is the documented seam for future
  numeric series.
- **Per-project source.** `projectStore` gained `ObserveLensDataSource =
  'mock'|'live'`, an `observeLensDataSource?` field, `getObserveLensDataSource`
  (default **live**), a builtin-allowlist entry, and persist **version 8 -> 9**
  (no-op migration; undefined resolves to live). New
  `dashboard/ObserveLensDataSourceToggle.tsx` mirrors `ObserveShellToggle`
  (Live/Mock, lucide `Radio`/`FlaskConical`), stacked below it (`top:56px`).
  `ObserveLayout` threads `projectId` + `dataSource` into `ObserveLensDashboard`
  and wires the toggle to `updateProject`; the chrome-free debug route
  `/v3/prototype/observe-lens` (no `projectId`) is mock-forced.

Verified live on `module-bar` (`tsc --noEmit` EXIT 0; `liveBundle` 16/16; MTC
defaults to live "Moontrance Creek", toggle -> Mock restores Millbrook + persists
across reload at version 9, debug route mock-forced). `preview_screenshot` hung
([[project-screenshot-hang]]) -- disclosed, `preview_eval` DOM reads used as proof.
Explicit-path commits on `feat/atlas-permaculture`, not pushed; Phase 3 files were
absorbed into a foreign out-of-band commit ([[project-branch-rebase]]) so Phases
4-5 stage+commit atomically.

## Specialised viz read live numbers via typed proof-slot bindings (2026-06-03, `db806872`,`7d1c910c`)

The `{ type:'none' }` degrade above is now a real read-side compiler: all SIX
specialised charts render live numbers, sourced from proof items already captured
in Act (`FieldActionProofItem.loggedResult`) -- no new capture UI. Full rationale:
[[decisions/2026-06-03-atlas-observe-lens-measurement-bindings]]. Shape:

- **Typed binding (producer, `@ogden/shared`).** NEW
  `schemas/observe/lensMeasurement.schema.ts` -- `MeasurementVizField` is a closed
  10-member enum keyed 1:1 to the viz arrays (`water.infiltrationData`,
  `water.sources`, `soil.phData`, `topography.elevationZones`,
  `topography.slopeBreakdown`, `climate.windRose`, `climate.microclimates`,
  `human.capacityBars`, `human.consentItems`, `infrastructure.suggestedTasks`),
  each with a Zod payload schema (`VIZ_FIELD_PAYLOAD`) + safe-read
  `parseLensMeasurement`. `ProofSchemaSlotSchema` gains an optional
  `measurementBinding {lens,vizField,zoneKey?,dimension?,order?}` (no migration --
  passthrough). `constants/fieldAction/proofSchemas.ts` adds `getMeasurementSlot`
  (over `BOUND_SLOTS_BY_ID`) + a NEW `observe-measurement` catalog entry (ten
  `logged_result` slots, one per vizField). Why typed not string-matched: a
  projected proof item lacks the slot label, `slotId` is not globally unique, and
  the rich rows need structured/directional fields a scalar cannot carry.
- **Read-side compiler (consumer, `apps/web`).** NEW pure store-free
  `lens/lensData/specialisedBuilders.ts` -- `SlotResolver` injected;
  `collectByVizField` groups a lens's proof items by resolved vizField;
  `parseRows<T>` flat-maps each row's `loggedResult` through the payload schema
  (Zod `.filter` does not narrow -> flatMap + inline ternary). Per-viz builders
  compute presentation read-side: infiltration min-max x + good/moderate/risk
  band, slope pct = areaM2/total, wind 8-bin compass histogram (freq=count,
  speed=mean m/s -> km/h), capacity threshold colour, conditional pH
  om/compaction. `buildSpecialisedForLens(lensId, proofItems, getSlot)` -> real
  union member when >=1 bound row resolves, else the honest `{ type:'none' }`
  (partial rows allowed). Wired in `liveBundle.ts` (`LiveBundleInput.getSlot?`
  defaulting to a no-op resolver; the hook passes `getMeasurementSlot`).
- **Partial-degrade guards.** `types.ts` relaxes `PhRow.om?`/`compaction?`;
  `components.tsx` guards the `SoilSpecialised` OM/compaction spans so a pH-only
  row renders honestly. Mock payloads supply every field -> mock byte-unaffected.
- **Seed.** `builtinObserveDataPoints.ts` gains optional `proofs?` on
  `ObserveSeedRow`, threaded into real `FieldActionProofItem`s; MTC authors
  captures for one domain per lens (infiltration 46/24/9, slope
  12000/11000/5000 -> 43/39/18, wind SW/W/S/NW, capacity 45/70/30, partial pH).

Verified: `tsc` EXIT 0; bounded `specialisedBuilders.test.ts` + rewritten
`liveBundle.test.ts` green; live `preview_eval` on `/v3/project/mtc/observe`
(Live) shows all six real charts -- Water (infiltration + sources), Climate (wind
rose 8 petals + microclimates), Living (pH bars incl. Creek-edge partial),
Foundation (elevation zones + slope 43/39/18%), Human (capacity 45/70/30 +
consent), Infrastructure (suggested tasks HIGH/MEDIUM/LOW). `preview_screenshot`
hung ([[project-screenshot-hang]]) -- disclosed, DOM-proof. Commits P2 `db806872`,
P3 `7d1c910c` (P4 folded into P2), explicit-path, foreign WIP untouched, not
pushed. **Deferred:** the scalar/`dimension` capture mode is carried-but-unconsumed;
authoring bindings onto the REAL Act field-action schemas (beyond the demo
`observe-measurement` catalog entry) is a future producer task.

## Lens canvas renders a live MapLibre basemap + parcel + georeferenced pins (2026-06-04, `85bcd8b2`..`4debac08`)

The `module-bar` lens canvas was a decorative `PseudoMap` SVG scattering pins at
meaningless normalized `[0,1]` positions. It now renders a real **read-only MapLibre
basemap** with the parcel boundary + observation points at true coordinates when geometry
exists, falling back to `PseudoMap` otherwise. Full rationale:
[[decisions/2026-06-04-atlas-observe-live-map]]. Shape:

- **Typed map payload (`lens/types.ts`).** `BBox`,
  `ObserveMapMarker { id, lng, lat, lens, type, label, age }`, and
  `ObserveMapData { boundary, bbox, markers, demoGeometry }`, exposed as a nullable
  `LensDataBundle.map`. Built ONCE by a pure
  `buildObserveMap(points, parcelBoundary, nowMs, isDemoGeometry)` in `liveBundle.ts`
  (markers from georeferenced active points, null-geometry dropped; bbox from boundary
  else markers; **returns `null`** when neither boundary nor any georeferenced point
  exists -- the fallback signal). Mock bundle leaves `map:null` (Millbrook stays on
  PseudoMap). bbox hardened against non-finite coords + null GeoJSON features.
- **`ObserveMap` (`lens/ObserveMap.tsx`, NEW, ~199 lines).** A self-contained read-only
  MapLibre canvas (NOT a reuse of the heavy Plan/Act `MapCanvas`). Mount-only effect:
  `maplibregl.Map` (`style: hasMapToken ? MAP_STYLES.hybrid : ESRI_WORLD_IMAGERY_STYLE`,
  `bounds:bbox`, rotation disabled, `NavigationControl`); on `load` adds a `parcel`
  GeoJSON source + `parcel-fill`/`parcel-line` layers + sets `ready`. `reposition()`
  projects markers via `map.project()`; an SVG overlay (`pointerEvents:none`) renders the
  EXISTING pin language via the shared `ObservationPin`, a selection callout, and a
  `{demoGeometry && ...}` "SAMPLE LOCATION DATA" badge. Same `onObsClick`/`selectedObs`
  contract as PseudoMap; owns no draw/edit state.
- **`ObservationPin` extracted (`components.tsx`).** Exported pin component shared by both
  `PseudoMap` and `ObserveMap`; markup byte-identical to the old inline pin EXCEPT
  `pointerEvents:'auto'` on the `<g>`. PseudoMap unchanged, still exported
  ([[feedback-no-deletion]]).
- **Dashboard branch.** `ObserveLensDashboard` canvas slot =
  `bundle.map ? <ObserveMap .../> : <PseudoMap .../>`.
- **Seeded MTC demo geo.** `projectStore.ts` `MTC_PARCEL_BOUNDARY` (5-coord Polygon ~
  `[-80.10,44.30]`, Ontario placeholder) on `MTC_SEED.parcelBoundaryGeojson` +
  `hasParcelBoundary:true` + an idempotent `seedMtcDemo` backfill;
  `builtinObserveDataPoints.ts` adds a `location` to all 10 MTC rows. The `demoGeometry`
  flag drives the honesty badge -- MTC is sample data and says so.

tsc EXIT 0; bounded `observeMap.test.ts` + rewritten `liveBundle.test.ts` -> 32/32. **The
no-network preview sandbox cannot fetch the MapTiler/ESRI tiles**, so the basemap `load`
never fires and pins (gated on `ready`) do not paint live -- an environment limitation,
disclosed, not a code defect. DOM-proven: live MTC route renders `ObserveMap` (canvas +
controls + overlay + badge -> `bundle.map` branch, `demoGeometry` flowing); mock/geometry-
less route renders `PseudoMap` (no maplibre, no badge, 10 `ObservationPin` groups);
markers proven by unit tests; `preview_screenshot` hung ([[project-screenshot-hang]]).
Commits `85bcd8b2`/`1c72d8ea`/`6ad3df30`/`c16b165b`/`65650432`/`4e378eab`/`4debac08`; T5's
canvas swap was absorbed into the foreign WIP `0276a484` (verified by diff, secured as an
ancestor, re-apply if dropped); not pushed. `mockData.ts` intact; CSRA untouched
([[fiqh-csra-erased-2026-05-04]]).

## Declared-intent read-side projection (2026-06-05)

The Human Systems lens **Vision & Project Intent** domain is fed only by persisted
`ObserveDataPoint`s, so real (non-builtin) projects -- which get zero seeded observe
points -- showed "Not yet observed" there even though their declared vision sits in
`metadata.visionProfile` (the Phase-2 wizard writes `landIdentity` statement,
`primaryOutcomes`, `budgetRange`, `timelineProgress`, `resourceConstraints`). A pure,
store-free `buildDeclaredIntentPoint(project)` (`liveBundle.ts`) now projects that
declaration into a single synthetic `DataPoint` (`type:'declaration'`,
`id:'declared-intent'`, `confidence:'low'`), framed as a DECLARATION, not a field
observation -- composed from the structured profile via the authoritative
`VISION_QUESTIONS` `id->label` vocabulary with a `humanizeOptionId` fallback.
`useLiveLensBundle` passes it (memoised on the project ref) into `LiveBundleInput`; in
the per-lens loop the `vision-intent` `keyData` value becomes "Declared" ONLY when that
domain has zero real observations (observed status always wins the headline), and the
point is prepended to the subdomain slide-up with the empty note cleared. A live-only
`LIVE_TYPE_ICON = { ...TYPE_ICON, declaration:<filled-diamond> }` is returned as
`typeIcon` (`mockData.ts` untouched).

**Honesty invariant (pinned by tests):** the declaration moves NO count -- lens
`observations`, `project.totalDataPoints`, `domainsMissingCount`/`CurrentCount`/
`AgeingCount`, per-lens `summary`/freshness all stay sourced from real points and are
byte-identical to the `declaredIntent:null` build. Projects with no vision keep the
honest "Not yet observed". tsc EXIT 0; bounded `liveBundle.test.ts` 29/29. Live
render-DOM proof blocked by the no-network sandbox renderer hang on the Observe mount
([[project-screenshot-hang]]) -- disclosed; the change adds no new component/branch
(generic renderers), so the unit-test proof over the real builder stands in. Commits
`4d55419d` (Phase 1) + `c05bdcf5` (Phase 2); not pushed. See
[[decisions/2026-06-05-atlas-observe-declared-intent]],
[[log/2026-06-05-atlas-observe-declared-intent]].

## OLOS UI/UX trust copy: Observe surface reword (2026-06-09)

Part of the 10-suggestion "This Thinks The Way I Think" reword that extracted
all v3 user-facing copy into the central module **`apps/web/src/v3/copy/`** (see
[[entities/act-tier-shell]] for the module rationale + Act side). On the Observe
surface:

- **Ecological revision banner (suggestions 9+10).** `PlanRevisionBanner.tsx`
  dropped its local `HEADLINE` const + `formatSupportingCopy` and consumes
  `revisionHeadline(priority, cycleTitle)` / `revisionSupporting({eventCount,
  domains, cycleTitle})`. The copy reframes events as "readings" --
  `critical` -> "The land is asking you to look again", `high` -> "Field
  evidence is pulling against your plan", `informational` -> "New observations
  since your last review". Cycle title is passed `null` (the summary carries no
  cycle title -- suggestion 10 future-cycle echo deferred; the function no-ops
  on null).
- **Per-domain empty-state question (suggestion 8).** `DomainStatusCard.tsx`
  renders `domainUnansweredQuestion(domainId)` (new `.emptyQuestion` CSS) when
  `observationCount === 0`, else the existing `purpose`. `DOMAIN_QUESTION` is a
  `Record<UniversalDomain,string>` exhaustive over all 16 domains
  (compiler- + test-enforced). This is the ONE card-shaped surface with room
  for a multi-sentence question.
- **Compact "Not yet read" reword (suggestions 1+8).** The 5 compact label
  cells where a full question will not fit -- `liveBundle.ts` (statusLabel
  default + KeyDatum), `mockData.ts` (FRESHNESS missing), `components.tsx`
  (stat-tile label + SVG ghost text) -- use the short land reword
  `OBSERVE_COPY.notYetRead` ("Not yet read") instead of "Not yet observed".

Verified via web `tsc` EXIT 0 (8GB heap) + 264 Observe/copy bounded
`--pool=forks` tests ([[feedback-vitest-bounded-runs]]); assertions reference
the copy-module constant, not rendered literals. The Observe dashboard could NOT
be live-previewed (dead dev API on :3000, no project in localStorage, `/v3`
404) -- reported honestly per CLAUDE.md, no screenshot claimed. ADR
[[decisions/2026-06-09-olos-uiux-copy-module]]; Log
[[log/2026-06-09-olos-uiux-copy-module]]. Amanah: pure copy reword, no finance
framing ([[fiqh-csra-erased-2026-05-04]]).

## Lens slide-up restyled toward the topography mockup (2026-06-10, `8918fec6`, `74b0235d`)

Two explicit-path, single-file commits on `main` (`apps/web/src/v3/observe/lens/components.tsx`;
not pushed) bring the `module-bar` lens `DomainDetailSlideUp` closer to the
`olos_observe_topography.html` reference. Three operator-confirmed constraints held across both:
**keep the cool app palette** (no `tokens.ts` retune -- the `de054364` cool-slate decision
stands), **slide-up only** (no rails/spine/canvas changes), and **keep the existing font/icon
stack** (Playfair Display + Unicode glyph icons; no Lora serif, no Tabler webfont). Structural
fidelity on the cool surface, deliberately not a warm pixel match.

- **Iteration 1 (`8918fec6`)** -- slide-up frame + entry colour convention. `TopographySpecialised`
  zone cards gain a 3px colour indicator bar (mockup `.zone-indicator`) + `C.textPrimary` name +
  right-aligned mono area; filter chips become pills (radius 16, `4px 12px`); **`DataPointRow`**
  entry icon tile + mono value are coloured by observation **type** (measurement=teal,
  trace/point=blue, logged/note=green) per the mockup data-log convention instead of the single
  lens colour -- shared by every lens slide-up, lens-colour fallback for unmapped types.
- **Iteration 2 (`74b0235d`)** -- the expanded `DataPointRow` proof-record (`isExpanded` subtree),
  eight edits A-H (18+/20-): seamless detail container (drop top divider, indent 52px);
  smaller/lighter/tracked proof-record label; mockup-spec pills (radius 6, font 10, lighter
  border); quote note as a left-bar accent (`border-left:2px`, radius `0 5px 5px 0`) not a full
  box; borderless uppercase Source/Plan-objective stacks (**wording preserved** -- "Plan objective",
  NOT the mockup's "Pre-objective"; restyle, not copy edit); one-line middot timestamp; tags
  radius 5 / font 9 / sans; neutral ghost "View on map" button. Supersession/divergence notices
  left unchanged (live semantic chrome, no mockup analogue).

`tokens.ts`/`mockData.ts` byte-untouched. tsc: `components.tsx` type-clean each iteration (the
only tree error, `useDesignElementDrawTool.ts(374,7) TS2554`, is foreign uncommitted WIP, pre-existing).
Iteration 1 DOM-proven live; **iteration 2 live proof NOT obtainable** -- the prototype renderer
hung on mount across three clean single-instance server starts ([[project-screenshot-hang]]), so
it rests on the audited diff + type-cleanliness + the presentational-only nature of the change,
disclosed per CLAUDE.md. Foreign "epitaxy" WIP left untouched.
[[log/2026-06-10-atlas-observe-slideup-topography-restyle]].

## Lens live path: all panels wired to real data (2026-06-10, `d0ad3866`..`bf9c773b`)

Four explicit-path commits on `main` (not pushed) close every remaining
mock/placeholder gap in the lens dashboard's LIVE bundle path
([[log/2026-06-10-atlas-observe-lens-live-panel-wiring.md]]):

- **P1 `d0ad3866` -- DataPointRow live fields.** `toDataPoint(p, ctx)` gained a
  `RowContext` (nowMs, prebuilt `supersedesById` reverse map, injected
  `resolveActionTitle`/`resolveObjectiveTitle`). Honest derivations: proof pills
  counted from `proofItems` by `proofType` (`document` deliberately excluded,
  commented); `sourceTask` from the FieldAction title map (feed-denormalized
  titles survive deletion); `planObjective` via `findObjectiveGlobally`;
  `supersedesId`; `divergenceAge`; exported `deriveConfidence(p)` (high =
  sensory/spatial AND data proof; low = zero proofs; else medium -- replaces the
  hardcoded `'medium'`, intended honesty change); real-metadata `tags`
  (sourceType / 'field log' / 'georeferenced'). The row's Source/Objective grid
  renders only when either resolves (mock rows always carry both -> unchanged).
- **P2 `a3ef3b32` -- field-log feed merge.** Pure exported
  `mergeFeedProjections(points, feedEntries, resolveDomain)`: dedupe on
  `sourceFeedEntryId`, project via the SHARED `routeToDataPoint` +
  `resolveDomainByObjectiveId`, drop unresolvable feedKeys. Live lens
  counts/pins/rows now match the dashboard's `useDomainPoints` union (intended
  behaviour change).
- **P3 `66337f16` -- real Timeline series.** The fabricated inline
  `TEMPORAL_DATA` const is deleted from `components.tsx`; `LensDataBundle` gained
  REQUIRED `temporal: Partial<Record<ObserveLensId, LensTemporal>>` (both
  constructors supply it; only two exist). NEW pure
  `lensData/temporalBuilders.ts` (`buildTemporalForLens(lensId, points, getSlot)`)
  charts candidate series from bound `logged_result` rows
  (`water.infiltrationData` / `soil.phData` / `climate.windRose` m/s -> km/h /
  `human.capacityBars`) and bound scalar `measurement` items (slot label + unit;
  unbound skipped -- slotIds not globally unique, charting them would fabricate
  trends). Cycle label from the carrying point's `cycleId` (0 -> 'Baseline'),
  one series per lens (most points wins, tie -> earliest first capture), null
  under 2 points. Mock visuals pixel-identical via `MOCK_TEMPORAL` moved
  VERBATIM into `mockBundle.ts`; TemporalView empty copy split ('all' -> "Select
  a lens...", lens-empty -> "No measurement series for this lens yet"). Pinned
  MTC outcome: temporal keys exactly [climate, human, living, water]; foundation
  + infrastructure honestly absent (bound viz fields are structural inventories).
- **P4 `bf9c773b` -- cycle number + history from `observeCycleStore`.**
  `LiveBundleInput.cycleStates?` (absent -> exact status quo) + pure exported
  `buildCycleHistory(points, cycleStates, nowMs)`: current cycle = k+1 where
  k = max(store counters, point stamps) -- fresh project still -> Cycle 1;
  history rows 0..k-1 (Baseline/Cycle N, per-cycle point counts, endedDaysAgo
  from the latest per-domain advance into the next cycle, fallback 0).
  Per-domain advances aggregated project-level; `cycle.history` is populated for
  contract completeness but currently unrendered. Hook subscribes
  `useObserveCycleStore((s) => s.byProject[projectId])`.

Verified: tsc EXIT 0 + bounded vitest 71/71 (`--pool=forks`,
[[feedback-vitest-bounded-runs]]) per phase AND re-run on the final committed
tree, incl. NEW `temporalBuilders.test.ts` (8) and end-to-end pins over the real
MTC seed. **Live DOM proof not obtainable** -- the sandboxed renderer wedged
mid-load on BOTH Observe mounts (live project route AND the map-free mock
prototype route) across three clean server starts with the API up
([[project-screenshot-hang]]) -- disclosed; static grep (no `TEMPORAL_DATA` in
`components.tsx`) + the pinned bundle tests stand in. Accepted mock micro-deltas:
the one mock row carrying `gpsTraces: 4` now shows its pill; empty-copy split on
never-charted lenses. Deferred: `document` proofs in pills; producer-side slot
bindings for unbound scalars; the temporal/history Baseline-vs-`Cycle ${id+1}`
label divergence (documented in code). `mockData.ts`/`tokens.ts` byte-untouched.

## Notes

- `ObserveDataPoint` carries `sourceObjectiveId` (nullable FK, persist v2) -- the
  link every Act-emitted point uses for the provenance chip, the source filter,
  and the rollup grouping ([[decisions/2026-05-31-atlas-observe-datapoint-objective-link]]).
- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
