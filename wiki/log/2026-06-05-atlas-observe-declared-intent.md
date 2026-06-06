# 2026-06-05 -- Observe lens: surface a project's declared vision as a read-side "Declared" Vision & Project Intent entry (no count inflation)

**Branch.** `merge/atlas-permaculture-to-main-2026-06-05` (formerly
`feat/atlas-permaculture`; explicit-path commits `4d55419d` Phase 1, `c05bdcf5`
Phase 2; **not pushed**). Plan:
`C:\Users\MY OWN AXIS\.claude\plans\c-users-my-own-axis-downloads-olos-obse-sunny-mitten.md`.
ADR: [[decisions/2026-06-05-atlas-observe-declared-intent]].
Entity: [[entities/observe-dashboard]].

The Observe identity tile showed a project's type/intent up top, yet the Human Systems
lens "Vision & Project Intent" domain read "Not yet observed" for real projects -- the
domain is fed ONLY by persisted `ObserveDataPoint`s, and wizard-created projects get
zero seeded observe points, while the declared vision sits unused in
`metadata.visionProfile`. This work projects that declaration into the domain read-side,
framed as a declaration (not a field observation), with a strict honesty invariant: no
observation count moves.

## Phase 1 -- pure composer + unit tests (`4d55419d`)

`liveBundle.ts`: NEW pure `buildDeclaredIntentPoint(project)` -- returns `null` unless
`metadata.visionProfile` has surfaceable content, else a single `DataPoint`
(`type:'declaration'`, `id:'declared-intent'`, `label:'Declared project intent'`,
`confidence:'low'`; `value` = free-text statement else joined outcome labels else
"Declared"; `notes` = composed `Vision:/Goals:/Budget:/Timeline:/Labour:` digest
omitting absent fields; `observedAt`/`recordedAt` via `calendarDate(updatedAt ??
completedAt)`). A flat `id -> label` map is built from the authoritative
`VISION_QUESTIONS` option vocabulary (`stage-zero/data/visionBuilderQuestions.ts`) with a
`humanizeOptionId` (`snake_case` -> "Snake case") fallback for wizard-local labour ids.
5 unit tests; not yet wired into the bundle (no behavioral change).

## Phase 2 -- wire into the vision-intent domain (`c05bdcf5`)

`liveBundle.ts`: `LiveBundleInput` gains optional `declaredIntent?: DataPoint | null`.
In `buildLiveLensBundle`'s per-lens loop, for the `vision-intent` domain with a non-null
`declaredIntent`: (a) the `keyData` row value becomes "Declared" + confidence 'low' ONLY
when that domain has zero real observations (observed status always wins the headline);
(b) the declared-intent point is prepended to the subdomain `points` and `emptyNote` is
cleared. A live-only `LIVE_TYPE_ICON = { ...TYPE_ICON, declaration: <filled-diamond> }`
is returned as the bundle `typeIcon` (mockData.ts untouched). `useLiveLensBundle` calls
`buildDeclaredIntentPoint(project)` (memoised on the project ref) and threads it in.

Honesty invariant held + pinned by explicit tests: an observed status always wins the
keyData headline, and the declaration touches NO count -- `project.totalDataPoints`,
`domainsMissingCount`/`CurrentCount`/`AgeingCount`, and every lens
`observations`/`freshness`/`summary` are byte-identical to the same build with
`declaredIntent: null`.

## Verification

- **tsc:** `apps/web` `tsc --noEmit` (`NODE_OPTIONS=--max-old-space-size=8192`) -> EXIT 0,
  0 errors (empty output + EXIT 0 confirmed explicitly).
- **vitest** (bounded, `--pool=forks --testTimeout=20000`): `liveBundle.test.ts` ->
  **29/29** green (5 composer + 5 wiring incl. the honesty invariant, plus the
  pre-existing suite). The ECONNREFUSED/`Failed to fetch builtin samples` stderr is
  benign store-hydration side effect under happy-dom, not a failure.
- **Live (disclosed DOM reads, port 5200).** Confirmed between renderer hangs: a real
  wizard-created project ("Phase 4 Smoke") carries `metadata.visionProfile` with exactly
  the composer's fields (validating the core plan assumption against real persisted
  state); a synthetic zero-observation clone was injected and its Observe route URL
  resolved. **The no-network sandbox renderer hangs on the Observe dashboard mount**
  (dead API at `localhost:3000` retry storm + a Vite HMR reconnect loop), recurring
  across two clean restarts -- `preview_eval`/`preview_screenshot` time out once the
  route mounts ([[project-screenshot-hang]]). Disclosed, not papered over: the change
  adds NO new component/branch (only data-shape changes to fields the existing
  `DataPointRow` + `keyData` renderers consume generically), so the deterministic
  unit-test proof over the real builder + render-path analysis stand in for the live
  paint -- same sandbox wall + disclosure precedent as
  [[log/2026-06-04-atlas-observe-live-map]].

## Process / covenant

Explicit-path commits (`git reset -q`; staged exactly `liveBundle.ts` + its test;
`git diff --cached` audited; foreign "epitaxy" WIP left untouched). Branch
divergence-checked, **not pushed** ([[project-branch-rebase]]); each phase committed the
moment it verified ([[feedback-commit-immediately-on-rebased-branches]]). `mockData.ts`
byte-untouched; `PseudoMap`/`ObservationPin` stay exported ([[feedback-no-deletion]]).
ASCII-only copy; apostrophe-free JS strings. CSRA model untouched
([[fiqh-csra-erased-2026-05-04]]). Amanah: a read-only projection of the steward's own
declared vision into a read-only lens -- clean.

## Deferred

- Live render-DOM (or screenshot) re-verification of the "Declared" row + slide-up in a
  network-capable preview environment.
- Optional Human-lens `summary` copy "Intent declared; no field observations yet." for
  the zero-observation-with-declaration case (zero count change) -- not implemented.
- Residual preview-only synthetic project "Declared Intent Live Check"
  (`live-declared-check`) in the sandbox browser localStorage (browser-local,
  non-builtin, never committed; cleared on the next hard reset).
