# ADR: The module-bar Observe lens reads live project data by default behind a per-project Live/Mock toggle

**Date:** 2026-06-03
**Status:** accepted (Phases 1-5 complete; verified live via preview_eval)
**Branch:** `feat/atlas-permaculture` (Phase commits `471452df`, `17aa6e42`, `ee3af9b1`+`38a6cfee`, `ed2dca01`, `9aab6bb0`; **not pushed**)

## Context

The promoted "observational lens" Observe shell (`apps/web/src/v3/observe/lens/`,
the `module-bar` shell) was entirely mock-backed: every consumer imported the
static Millbrook fixtures from `mockData.ts` (`LENSES`, `DOMAIN_DETAIL`,
`MOCK_OBSERVATIONS`, `PROJECT`, `CYCLE`, `FRESHNESS`, `TYPE_ICON`). Only the lens
IDENTITY layer (`OBSERVE_LENSES` from `@ogden/shared`) was live. Meanwhile the
real Observe dashboard already had a live substrate -- `useObserveDataPointStore`
(persist key `ogden-observe-data-points`) + `useDomainSnapshots(projectId)` -- and
builtins are seeded with real points (`seedMtcObserveDataPoints('mtc')`). The lens
showed Millbrook on every project including MTC. The operator chose: **maximal**
live wiring; **default = live** (mock becomes the escape hatch); toggle
**persisted per-project** (mirroring `ObserveShellMode`).

## Decision

**1. Resolve ONE `LensDataBundle` at the dashboard root, expose via context.**
Rather than prop-drill a data source through the deep tree (PseudoMap,
IntelligencePanel, CycleTimelineBar, DomainDetailSlideUp, spine, detail-rail all
consumed mock directly), the dashboard resolves a single render-ready bundle and
exposes it via `LensDataContext` / `useLensData()`. Every lens component reads the
bundle through the context, so the source swaps at the root with zero deep edits.
`mockData.ts` stays intact -- it is re-packed into the `mock` bundle
(`mockBundle.ts`), unchanged byte-for-byte.

**2. Pure-mapper-first live bundle.** `liveBundle.ts` exports pure functions
(`buildLiveLensBundle` over plain data, `computeDomainRollups`,
`buildObservationPins`) plus a thin `useLiveLensBundle(projectId)` hook. The pure
core is unit-testable with no React and no stores -- proven valuable when the
hook's persisted-store dependencies would otherwise have broken node tests
(the suite runs under `happy-dom`).

**3. Honest graceful degrade -- live carries no numeric series.** Seeded
`ObserveDataPoint.measurementValue` is only `{ label, note }` (schema types it
`unknown`). There is NO live numeric source for the specialised visualizations
(wind rose, pH bars, infiltration, slope, capacity, consent) or for the
cycle-spiral Plan/Act/Observe PHASE timing. So the live bundle emits a new
`{ type: 'none' }` specialised variant for every lens (an added member of the
`Specialised` union -- `DomainDetail.specialised` stays REQUIRED, not optional),
and `components.tsx` renders an honest empty-viz note that falls back to the
captured data-point list. Cycle phase boundaries are NOMINAL (plan 0-22 / act
22-72 / obs 72-100), documented in code; the spiral keeps real observation ticks
and real stale/ageing domains. The mock bundle never uses the `none` variant.

**4. Everything with a real source IS wired.** Project identity tile
(`projectRecord.name` / `findProjectType(...).label`); per-lens count / freshness /
last-observed / divergence (aggregated over `OBSERVE_LENSES.domains` via the same
freshness logic as `useDomainSnapshot`); map pins (active point geometries
projected into the padded `[0.08, 0.92]` bbox, y-inverted; no-geometry points get
a deterministic index scatter); recent-observations list; detail slide-up rows;
summary + keyData + planRevision alert (derived from counts + `latestStatus` +
divergent statuses). Freshness over a lens = worst freshness among its
data-bearing domains; divergence priority = `high` if any
`major_constraint`/`potential_disqualifier`, else `medium`.

**5. Per-project persisted source, default live, no backfill.**
`projectStore` gains `ObserveLensDataSource = 'mock' | 'live'`, an
`observeLensDataSource?` field on `LocalProject`, a `getObserveLensDataSource`
getter returning **`'live'`** by default, a builtins-allowlist entry (so the
steward can flip a builtin sample), and a persist **version bump 8 -> 9 with a
no-op migration** -- an undefined value resolves to the live default at read time,
so existing persisted projects land on live automatically.

**6. New toggle mirrors `ObserveShellToggle`; debug route forces mock.**
`ObserveLensDataSourceToggle` is a segmented Live/Mock pill (lucide `Radio` /
`FlaskConical`), stacked just below `ObserveShellToggle` in the lens canvas
(`top: 56px`). `ObserveLayout`'s module-bar branch threads `projectId` +
`dataSource` into `ObserveLensDashboard` and wires the toggle's `onChange` to
`updateProject`. `ObserveLensDashboard` picks
`bundle = (dataSource === 'mock' || !projectId) ? mockBundle : liveBundle`;
`useLiveLensBundle` is called UNCONDITIONALLY (rules of hooks) and discarded when
mock is chosen. The chrome-free debug route `/v3/prototype/observe-lens` has no
project context, so it renders `ObserveLensDashboard` prop-less -> mock-forced.

## Consequences

- The lens now reflects each project's real captured observations out of the box;
  Millbrook fixtures are one click away as a design/escape reference.
- The bundle indirection means a future third source (e.g. a server-synced
  snapshot) is a new builder + a toggle option, not a deep-tree refactor.
- The `none` specialised variant is the documented seam where richer live
  measurement series would later plug in (when `measurementValue` carries numbers).
- No-deletion respected: `DomainsView`/`DomainsRail`/`LensBar`/`TopBar` and the
  horizontal `RecentObservationsStrip` path stay exported; `mockData.ts` intact.

## Verification

- `apps/web` `tsc --noEmit` (8 GB heap) -> **EXIT 0**, zero errors anywhere
  (observe/lens, projectStore, ObserveLayout, the new toggle).
- Bounded `--pool=forks` `liveBundle.test.ts` -> **16/16 green** (lens aggregates,
  divergence rollup + priority, project totals/buckets, plan-revision trigger, pin
  projection in-bounds, nominal cycle, the `none` specialised degrade).
- **Live preview gate, `preview_eval` DOM port 5200** (`preview_screenshot` hung
  again -- [[project-screenshot-hang]] -- DISCLOSED; DOM reads used as proof):
  - `/v3/project/mtc/observe` renders **Live by default** -- project "Moontrance
    Creek" + real type label, the live `across N/M domains` summary format, NOT
    Millbrook; both radiogroups present ("Observe navigation shell" + "Observe
    lens data source"), "Live" active.
  - Toggle -> **Mock** restores Millbrook fixtures; persisted
    `observeLensDataSource: 'mock'` at store **version 9**; survives a full reload
    (still Mock after `location.reload()`).
  - Toggle back -> **Live** round-trips (Moontrance returns, Millbrook gone,
    persisted `'live'`).
  - Debug route `/v3/prototype/observe-lens` is **mock-forced** ("Millbrook Farm",
    no data-source toggle -- no project context).

Explicit-path commits; foreign working-tree WIP untouched
([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]);
Phase 5 staged + committed atomically after Phase 3's staged files were absorbed
into a foreign out-of-band commit ([[project-branch-rebase]]); not pushed. CSRA
model untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.
Entity: [[entities/observe-dashboard]]. Log:
[[log/2026-06-03-atlas-observe-lens-live-data-toggle]].
