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

## Notes

- `ObserveDataPoint` carries `sourceObjectiveId` (nullable FK, persist v2) -- the
  link every Act-emitted point uses for the provenance chip, the source filter,
  and the rollup grouping ([[decisions/2026-05-31-atlas-observe-datapoint-objective-link]]).
- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
