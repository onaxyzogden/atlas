# 2026-05-19 — D5: operating dashboards & adaptive recommendations

**Status:** Implemented & verified (typecheck / vitest / `vite build` /
covenant grep); committed as **explicit-path per-task commits** on
`feat/atlas-permaculture` (three `feat(d5)` per-task + this `docs(d5)`
close), **not pushed** (branch rebased out-of-band; push is a separate
explicit instruction). Live-preview screenshot verification
disclosed-blocked by the known MapLibre/WebGL hang — surface wiring
verified statically instead. **D5 is the final ratified D slice; the
D-series (D0–D5) is complete.**
**Context source:** Approved Session Execution Plan for Sub-project D5
([[plans/2026-05-19-d5-operating-dashboards]]), executing the ratified
D0–D5 roadmap ([[2026-05-18-atlas-land-os-positioning-and-d-roadmap]]).
Builds directly on the four prior D engines —
[[2026-05-18-atlas-d1-dependency-critical-path]],
[[2026-05-18-atlas-d2-resourcing]],
[[2026-05-18-atlas-d3-budget-cost]],
[[2026-05-19-atlas-d4-field-proof]]. Those four engines each surfaced
their own card; nothing **composed** them into a single project-health
read with ranked next actions. D5 is that composition slice.

## Decision

Three user-confirmed binding design forks:

1. **Deterministic rule-based composition — no scoring model, no ML.**
   `computeOperatingHealth` is a pure function of the four engine
   results plus `now`. Four lights and seven recommendation rules each
   fire on an explicit threshold; ranking is `severity` (high→med→low)
   then occurrence-count descending. Fully reproducible, no opaque
   weighting.
2. **Strictly render-only — no store, no `syncManifest`, no schema, no
   DB migration, no spine-status mutation.** D5 adds **zero**
   persistence. The engine never reads or writes `WorkItem.status`
   (overdue is derived at call time from `scheduledEnd`); the card only
   *reads* the four existing stores. No `syncManifest` entry, no new
   Zod schema, no migration.
3. **A new dedicated card (`act-operating-dashboard`), append-only
   across the six mount points.** Unlike D4 (a child panel riding the
   existing `act-plan-tracker` mount), D5 is its own Act module card,
   registered by **append only** at all six mount points — never
   reordering or mutating an existing entry.

## Composition-over-re-derivation discipline

The engine **calls** the four D1–D4 results; it never re-derives their
logic. In particular the **budget signal is D3 drift surfaced
verbatim** — `budget.byItemId[*].drift` and the D3 `total.variance`
band are read as-is and never re-framed toward cost-of-capital,
financing, investor or yield language. The card mirrors
`BudgetCard.tsx`'s exact `actualsByItemId` mapping
(`{ actual, actualHrs }`) and `FieldProofPanel.tsx`'s exact five-store
`linkedEventsByItemId` + `domainEvents` derivation
(`analyzeFieldProof(..., 7)`), so the composed proof/budget counts
match the D3/D4 surfaces exactly rather than diverging via a parallel
mapping.

## The four lights (exact thresholds)

- **Schedule:** `alert` if graph cyclic OR any critical-and-blocked
  item; else `warn` if any overdue OR any blocked; else `ok`.
- **Resourcing:** `alert` if any equipment double-booking; else `warn`
  if any crew-week over capacity; else `ok`.
- **Budget:** `alert` if any item drift AND total variance.mid >
  planned.high; else `warn` if any drift; else `ok`.
- **Proof:** `alert` if done items exist AND proven/done closure ratio
  < 0.5; else `warn` if any unproven (claimed) item; else `ok`.

## The seven recommendation rules + ranking

`cycle` (high, → Plan tracker), `blocked-critical` (high, → Plan
tracker), `equipment-conflict` (high, → Resourcing), `over-capacity`
(med, → Resourcing), `budget-drift` (med, → Budget vs actuals),
`overdue` (med, → Plan tracker), `unproven` (low, → Field proof). Each
fires only on its own trigger. Sorted by `severity` rank then by
occurrence count descending — deterministic and stable.

## Render-only deep-link affordance (YAGNI)

Each recommendation shows its destination as a **labelled,
non-navigating hint** (`<span className={styles.pillUnmet}>→ Plan
tracker</span>` etc.). Cross-card navigation is deliberately **not
wired** — there is no established intra-Act navigation API and the spec
says render-only. **Dismiss / snooze of recommendations is explicitly
deferred** (no persistence in D5 by fork 2).

## Covenant & scope boundary

Strictly **operating analytics**. **Explicitly out:** cost, financing,
capital, investor/equity, advance-purchase, yield-as-return, riba,
gharar, salam framing — those stay in Scholar-gated Sub-project C. The
budget light is D3 drift surfaced verbatim, never re-framed. Enforced
by: (a) the engine's no-financing token regex test, (b) the
no-`status`-mutation invariant test (`Object.freeze` inputs), (c) the
card's `not.toMatch` financing-lexicon assertion over rendered
`textContent`, (d) the release-gate covenant grep over
`operatingHealth.ts` + `OperatingDashboardCard.tsx`. No DB migration,
no schema, no `syncManifest` entry, no spine mutation. Legacy
untouched.

## Scope delivered

- **Pure engine** `packages/shared/src/lib/operatingHealth.ts` (new, no
  React/store) — `Light`, `RecommendationKind`, `Severity`,
  `TargetCard`, `SourceSignal`, `Recommendation`,
  `OperatingHealthCounts`, `OperatingHealth`, `OperatingHealthInput`;
  `computeOperatingHealth` (composes the four engine results into four
  lights + ranked recommendations + counts; pure, no input mutation).
  Exported from `@ogden/shared`. Tests:
  `src/tests/operatingHealth.test.ts` (12 — empty/on-track, each light
  threshold, ranking, no-input-mutation hard gate, covenant
  no-financing regex). Commit `bcdd6c70` (a follow-up out-of-band
  `7ca0b424` simplified `nowMs`/`countOf`/sort — behaviour-equivalent,
  tests still 12/12).
- **Render-only card**
  `apps/web/src/features/act/OperatingDashboardCard.tsx` (new) — reads
  the four stores (work-item / crew / budget-actuals / proof) plus the
  three extra proof-linkage stores (maintenance / livestock-move /
  nursery, mirroring `FieldProofPanel`), composes via the four
  `@ogden/shared` engines + `computeOperatingHealth`, renders hero +
  Health (four lights with counts) + Recommended-next-actions (ranked,
  render-only deep-link hints, "On track — no action needed." empty
  state). Tests:
  `src/features/act/__tests__/OperatingDashboardCard.test.tsx` (4 —
  on-track empty state, overdue rec deep-linking Plan tracker, four
  lights, no financing lexicon). Commit `22d80b8a`. The flexible lede
  prose was reworded to avoid `getByText` collision with the light
  labels (test is the locked spec; prose adapted to it).
- **Append-only six-mount registration** — `v3/act/types.ts`
  (`build` module array), `v3/act/ActModuleSlideUp.tsx` (lazy import +
  `renderActCard` case), `features/dashboard/DashboardRouter.tsx`
  (lazy import + `PanelShell` case), `features/act/ActHub.tsx` (action
  list), `features/navigation/taxonomy.ts` (NavItem,
  `dashboardOnly: true`), `components/stage-navigator/stageModules.ts`
  (`act-mod-implementation.itemIds`). Every edit is a pure append
  beside the existing `act-budget` anchor — no reorder, no mutation of
  any existing entry; no diff mixed D5 with non-D5 hunks. Commit
  `1fc68e34`.

## Verification

- `@ogden/shared` tsc exit 0, **fully clean**; web tsc exit 0,
  **fully clean** (no new error vs the pre-D5 baseline).
- Vitest: `@ogden/shared` **265/265 (19 files)** incl.
  `operatingHealth.test.ts` 12; web **1233/1233 (117 files)** incl.
  `OperatingDashboardCard.test.tsx` 4. **Zero failures.** The
  `layerFetcher` socket-error lines are the expected offline-fallback
  path (no API server in the test env), not failures — all 117 files
  green.
- `vite build` exit 0 (`✓ built in 41.85s`, PWA 721 precache
  entries). (`NODE_OPTIONS=--max-old-space-size=8192` — the default
  Node heap OOMs `vite build`; environment, not code; `tsc` had
  already passed.)
- Covenant release-gate grep over `operatingHealth.ts` +
  `OperatingDashboardCard.tsx`: every lexicon hit is a **negative
  covenant declaration** inside a doc-comment ("No
  riba/gharar/CSRA/salam, no cost-of-capital/financing/investor/yield
  framing"). **No real financing/capital field, value, user string, or
  logic.** PASS.
- Surface wiring verified statically: the six mount points each contain
  exactly one new `act-operating-dashboard` / `OperatingDashboardCard`
  entry appended beside the `act-budget` anchor; combined with web
  `tsc` exit 0, the card is wired and type-sound at every mount.
- Live-preview screenshot verification **disclosed-blocked** by the
  known MapLibre/WebGL hang (the card is deep behind the Act module
  slide-up; the D1–D4 preview hang recurs). Per the approved plan's
  screenshot-honesty fallback: **no screenshot claimed**; the
  six-mount static wiring + web `tsc` exit 0 + the 4 happy-dom card
  tests are the authoritative proof.

## Commit posture

Explicit-path per-task commits on `feat/atlas-permaculture`,
**explicit-path staging only** (never `git add -A`/`.`), **nothing
pushed**:

- `bcdd6c70` feat(d5): pure operating-health composition engine + tests
- `7ca0b424` refactor(d5): simplify nowMs, exhaustive countOf, stable
  rec sort (out-of-band, behaviour-equivalent)
- `22d80b8a` feat(d5): render-only OperatingDashboardCard composing the
  4 D-engines
- `1fc68e34` feat(d5): register act-operating-dashboard across the six
  mount points
- (this) docs(d5): ADR + session log for operating-dashboards slice

`wiki/index.md` deliberately **not modified** (left for its owner if
dirty, per the D2/D3/D4 ADR precedent — the index D5 entry is added as
a separate session-close step). Concurrent out-of-band streams on the
branch were **not touched**.

## Notes & deferred

- Live exercise of the dashboard surface **deferred** behind the WebGL
  preview hang — proven by construction (pure-engine 12 unit tests +
  4 happy-dom card tests + six-mount static wiring + tsc). Recommended
  as the first step of a future session with a working preview
  screenshot path.
- Dismiss / snooze of recommendations is an explicitly **deferred**
  out-of-scope boundary (would require persistence, which fork 2
  excludes from D5).
- Cross-card navigation from a recommendation is **deferred** (YAGNI —
  no established intra-Act nav API; render-only by spec).
- **D-series complete.** D0 (spine) → D1 (graph) → D2 (resourcing) →
  D3 (budget) → D4 (field proof) → D5 (operating dashboards) all
  ratified and implemented.
