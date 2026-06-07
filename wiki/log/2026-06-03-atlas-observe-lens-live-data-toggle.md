# 2026-06-03 -- Observe lens: wire onto live project data, default live, behind a per-project Live/Mock toggle

**Branch.** `feat/atlas-permaculture` (five explicit-path phase commits
`471452df`, `17aa6e42`, `ee3af9b1`+`38a6cfee`, `ed2dca01`, `9aab6bb0`; rebased
out-of-band, divergence-checked, **not pushed**). Plan:
`~/.claude/plans/c-users-my-own-axis-downloads-olos-obse-sunny-mitten.md`.
ADR: [[decisions/2026-06-03-atlas-observe-lens-live-data-toggle]].
Entity: [[entities/observe-dashboard]].

The `module-bar` "observational lens" Observe shell
(`apps/web/src/v3/observe/lens/`) was 100% Millbrook-fixture-backed. This work
wired it onto each project's live `ObserveDataPoint` substrate, made **live the
default**, and added a per-project persisted **Live/Mock** toggle (mock = escape
hatch). Delivered in five phases.

## Phase 1 -- Bundle type + context + mock bundle (`471452df`)

Added the `LensDataBundle` interface (`lens/types.ts`) =
`{ project, lenses, domainDetail, observations, cycle, freshness, typeIcon }`
reusing existing shapes; new `lens/lensData/LensDataContext.tsx`
(`LensDataProvider` / `useLensData()`, throws without a provider); new
`lens/lensData/mockBundle.ts` re-packing the `mockData.ts` exports byte-for-byte.
No behaviour change.

## Phase 2 -- Consumers read the bundle (`17aa6e42`)

`components.tsx`, `ObserveLensSpine.tsx`, `ObserveLensDetailRail.tsx` swapped
their direct `mockData.js` DATA imports for `useLensData()`; `ObserveLensDashboard`
wrapped the tree in `<LensDataProvider bundle={mockBundle}>`. Render byte-identical
(still mock, now via context). Legacy `DomainsView`/`DomainsRail`/`LensBar`/`TopBar`
kept exported ([[feedback-no-deletion]]).

## Phase 3 -- Live bundle builder + unit test (`ee3af9b1` + `38a6cfee`)

New `lens/lensData/liveBundle.ts`: pure mappers (`buildLiveLensBundle`,
`computeDomainRollups`, `buildObservationPins`) + a thin `useLiveLensBundle(projectId)`
hook reading `useObserveDataPointStore.byProject` + `useProjectStore`. Mirrors the
`useDomainSnapshot` freshness logic (freshness over ALL points incl superseded;
counts/latest over active only). Pins project active geometries into a padded
`[0.08,0.92]` y-inverted bbox; no-geometry points -> deterministic `scatter(i)`.
Per-lens freshness = worst among data-bearing domains; divergence priority `high`
on any `major_constraint`/`potential_disqualifier`. Project totals/buckets,
planRevision from severe latest statuses; cycle window from min/max `capturedAt`,
elapsed clamped to 180, NOMINAL phase bounds. Reuses mock `FRESHNESS`/`TYPE_ICON`
config. New `__tests__/liveBundle.test.ts` (16 tests) feeds the real MTC seed
bundle (`buildBuiltinObserveDataPoints('mtc', MTC_OBSERVE_BUNDLE)`, 10 points, no
geometry) through the pure mappers.

**Hazard realized (recorded, not hidden):** after `git add`-ing the Phase 3 files
an external rebase committed the branch and absorbed `liveBundle.ts` + `types.ts`
into a FOREIGN commit (`ee3af9b1`, "feat(act): wire off_grid objective->tool
overrides"); my own `38a6cfee` then only carried the 3-line test fix. Content is
intact in HEAD. Mitigation adopted for Phases 4-5: stage + commit **atomically**
in one command ([[feedback-commit-immediately-on-rebased-branches]],
[[project-branch-rebase]]).

**Test-env fix:** importing the seed builder pulls persisted stores that
auto-rehydrate at module load (`useProjectStore.persist.onFinishHydration`,
`rehydrateWithLogging`), which throw in the node env (`store.persist` undefined).
Resolved by running the suite under `// @vitest-environment happy-dom` (forks pool
keeps the teardown handle from leaking) rather than mocking each store. Three
`noUncheckedIndexedAccess` tsc errors on indexed access in the test fixed with `!`.

## Phase 4 -- Graceful specialised degrade (`ed2dca01`)

`types.ts` gained `NoSpecialisedData { type: 'none' }` as a new member of the
`Specialised` union (`DomainDetail.specialised` stays REQUIRED). `components.tsx`'s
`DomainDetailSlideUp` specialised switch gained a `type === 'none'` branch: an
honest "No structured measurements yet" note that defers to the captured
observation list on the right. Seeded `measurementValue` is only `{ label, note }`
(schema `unknown`), so there is no live numeric series for the wind rose / pH /
infiltration / slope / capacity / consent charts -- the live bundle emits `none`
for every lens. Mock path unchanged.

## Phase 5 -- Toggle plumbing + default live (`9aab6bb0`)

- `projectStore.ts`: `ObserveLensDataSource = 'mock' | 'live'` type;
  `observeLensDataSource?` field on `LocalProject`; `getObserveLensDataSource`
  getter (default **`'live'`**); `'observeLensDataSource'` added to the builtin
  `updateProject` allowlist; persist **version 8 -> 9** with a no-op migration
  (undefined resolves to live at read time -- no backfill).
- New `dashboard/ObserveLensDataSourceToggle.tsx` (+ `.module.css`): segmented
  Live/Mock pill (lucide `Radio` / `FlaskConical`) mirroring `ObserveShellToggle`,
  stacked below it (`top: 56px`).
- `ObserveLayout.tsx` module-bar branch: reads `getObserveLensDataSource`, threads
  `projectId` + `dataSource` into `<ObserveLensDashboard>`, mounts the new toggle,
  wires `onChange` to `updateProject(id, { observeLensDataSource })`.
- `ObserveLensDashboard.tsx`: accepts `{ projectId?, dataSource? }`; picks
  `bundle = (dataSource === 'mock' || !projectId) ? mockBundle : liveBundle`;
  `useLiveLensBundle` called unconditionally (rules of hooks), discarded when mock.
  The chrome-free debug route (no `projectId`) -> mock-forced.

## Verification

- **tsc:** `apps/web` `tsc --noEmit` (8 GB heap) -> EXIT 0, **0 errors** total.
- **vitest** (bounded, `--pool=forks`, 15 s timeout): `liveBundle.test.ts`
  **16/16** green.
- **Live preview, `preview_eval` DOM port 5200** (`preview_screenshot` hung --
  [[project-screenshot-hang]] -- disclosed; DOM reads used as proof):
  - `/v3/project/mtc/observe` defaults to **Live**: "Moontrance Creek" + real
    type, live `across N/M domains` summary, NOT Millbrook; both radiogroups
    present, "Live" active.
  - Toggle -> **Mock** restores Millbrook; persisted `observeLensDataSource:'mock'`
    at version 9; survives full reload.
  - Toggle back -> **Live** round-trips; persisted `'live'`.
  - `/v3/prototype/observe-lens` is **mock-forced** ("Millbrook Farm", no
    data-source toggle).

## Process / covenant

Explicit-path commits (staged exactly the intended files by name; never
`git add -A`; verified against a working tree full of foreign WIP, left
untouched). Phases 4 + 5 stage+commit atomic. Branch divergence-checked, **not
pushed** ([[project-branch-rebase]]). ASCII-only copy; apostrophe-free JS strings.
No-deletion respected ([[feedback-no-deletion]]); `mockData.ts` intact (feeds the
mock bundle). CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).

## Deferred

- Richer live specialised viz awaits a numeric `measurementValue` source; the
  `none` variant is the documented plug-in seam.
- Cycle phase boundaries stay nominal until a real Plan/Act/Observe schedule
  exists per project.
