# D5 — Operating Dashboards & Adaptive Recommendations Design

**Date:** 2026-05-19
**Sub-project:** D5 (Operating dashboards & adaptive recommendations), the
**final** slice of Sub-project D per the ratified D0–D5 roadmap
([[2026-05-18-atlas-land-os-positioning-and-d-roadmap]]).
**Status:** design approved; forward-looking spec (D5 is net-new, not yet
implemented — like D4, unlike the retroactive D2/D3 specs).

## Goal

Close the operating loop. D0–D4 built the canonical single-writer WorkItem
spine and four pure engines over it: dependency/critical-path (D1),
resourcing conflicts (D2), budget variance (D3), field proof (D4). Each has
its own card, but nothing answers the operator's actual question — *"is this
project on track, and what should I do next?"* — without manually reading
four separate surfaces. D5 adds a single project health rollup that
**composes** the four existing engine outputs into four status lights plus a
ranked, deterministic, render-only recommendation list, each recommendation
deep-linking to the existing card that resolves it. Success = a steward
opens one card and immediately sees schedule/resourcing/budget/proof health
and a prioritised "do this next" list for an Apricot-Lane-complexity build,
with no new persistence, no DB migration, and no covenant drift.

## Covenant boundary (non-negotiable)

Strictly **operating analytics only**. Quoted from the roadmap ADR: "D3/D5
are project cost/budget tracking and operating analytics only; capital
formation, financing, advance-purchase, investor/equity, and yield-as-return
framing stay in Sub-project C under Scholar Council. No riba/gharar framing
in any D surface. CSRA / salam-style advance-purchase explicitly excluded."

D5's budget signal is **D3's operational drift surfaced verbatim** — D5
never re-derives, re-frames, or extends it toward cost-of-capital,
financing, investor, or yield-as-return language. Any drift toward
financing/capital framing is rejected back to Scholar-gated Sub-project C,
never patched into a D surface. Asserted by a test: the engine module pins
the D-series no-financing negative regex
(`/interest|riba|invest|equity|capital|financ|loan|yield|return|salam|gharar/i`)
over `JSON.stringify(computeOperatingHealth(...))`, consistent with the
D1–D4 precedent. Health/recommendations are derived at render only —
**never** written to `WorkItem.status` (single-writer-spine discipline,
the `suggestProofMatches` render-only precedent).

## Resolved design forks (operator-confirmed)

1. **Recommendation engine: deterministic rule-based.** Pure, testable
   rules over the four existing D-engine outputs + spine. No ML, no
   external/LLM calls. Each recommendation carries a fixed severity used
   for ranking (the "heuristic scoring" option folded down to a simple
   `high|med|low` enum + count tiebreak — no separate scoring model).
2. **Fully render-only, no store.** Health + recommendations are derived
   every render from the spine + the four engines (single source of
   truth). No new Zustand store, **no `syncManifest` entry**, no spine
   writes. Mirrors D1 (engine-only) and `suggestProofMatches`.
   Dismiss/snooze persistence is explicitly **deferred** (YAGNI; would be
   its own additive slice if ever justified).
3. **New dedicated Act card.** Own `act-operating-dashboard` manifest
   entry across the six mount points (exact D2/D3/D4 precedent), not an
   extension of `ActHub`.

## Architecture

Mirrors the D1–D4 spine discipline. D5 is the **composition** layer: it is
the only D engine that consumes other D engines' outputs rather than the raw
spine alone. It calls `analyzeWorkItemGraph` / `analyzeResourcing` /
`analyzeBudget` / `analyzeFieldProof` and **never re-implements** their
logic (notably: budget drift stays D3-owned — surfaced, not recomputed).

### 1. Pure engine — `packages/shared/src/lib/operatingHealth.ts` (new)

No React, no store imports, no I/O. Single entry point:

`computeOperatingHealth(input) → OperatingHealth` where `input` carries the
project `WorkItem[]` plus the already-computed results of the four engines
(graph analysis, resourcing analysis, budget analysis, field-proof
analysis). The card computes those four upstream results and passes them in;
the engine itself stays a pure composition with no transitive imports of the
stores.

Output `OperatingHealth`:
- `lights: { schedule: Light; resourcing: Light; budget: Light; proof: Light }`
  where `Light = 'ok' | 'warn' | 'alert'`. Pure threshold functions:
  - **schedule** — `alert` if any critical-path item blocked or DAG cyclic;
    `warn` if any overdue or any blocked non-critical item; else `ok`.
  - **resourcing** — `alert` if any equipment double-booking; `warn` if any
    crew over weekly cap (no equipment conflict); else `ok`.
  - **budget** — `alert` if ≥1 D3 drift item *and* project variance band
    `mid` over planned `high`; `warn` if ≥1 drift item only; else `ok`.
  - **proof** — `alert` if proof-closure ratio < 0.5 over done items;
    `warn` if any done item unproven; else `ok` (no done items ⇒ `ok`).
- `recommendations: Recommendation[]` —
  `{ id, severity: 'high'|'med'|'low', kind, message, sourceSignal, targetCard }`.
  `targetCard ∈ { 'act-plan-tracker' | 'act-resourcing' | 'act-budget' |
  'field-proof' }`. Deterministic rules (each fires only on its trigger,
  absent otherwise):
  - cyclic DAG → `high`, resolve dependency cycle → `act-plan-tracker`.
  - blocked critical-path item(s) → `high`, unblock prerequisite →
    `act-plan-tracker`.
  - equipment double-booking(s) → `high`, reschedule overlap →
    `act-resourcing`.
  - crew over weekly cap → `med`, rebalance assignment → `act-resourcing`.
  - budget drift item(s) → `med`, review over-variance work (D3 operational
    framing only) → `act-budget`.
  - overdue item(s) not blocked → `med`, advance schedule →
    `act-plan-tracker`.
  - done items unproven → `low`, capture field proof → `field-proof`.
  Ranked by `severity` (high→med→low) then descending affected-item count.
  Empty list ⇒ caller renders an explicit "on track" state.
- `counts: { blocked, critical, overdue, equipmentConflicts, overCapacity,
  budgetDrift, unproven, doneTotal }` — the integers the lights and the
  card's at-a-glance numbers read from (no recomputation in the card).

Defensive on missing/empty data (no items ⇒ all `ok`, no recommendations).
Never reads or writes `WorkItem.status`. Barrel-exported from
`packages/shared/src/index.ts` immediately after `./lib/fieldProof.js`.
Inferred `OperatingHealth` / `Recommendation` / `Light` types exported.

### 2. Surface — `apps/web/src/features/act/OperatingDashboardCard.tsx` (new)

One `useMemo` over project-scoped `workItemStore` items + `crewMemberStore`
members + `workItemBudgetStore` actuals + `proofEventStore` events → runs the
four D-engines on the project slice → passes their results into
`computeOperatingHealth`. Render-only; zero write paths. Three blocks:
- **Health lights** — four labelled `ok/warn/alert` indicators, each with
  its driving count from `counts` (e.g. "Schedule — 2 blocked, 1 overdue").
- **Bottleneck / alert list** — the `alert`/`warn` drivers expanded to the
  specific offending items (read from the upstream engine results already in
  scope).
- **Recommendations** — the ranked `recommendations`, each row showing
  `severity` + `message` and a deep-link affordance to its `targetCard`
  (the existing card/route that resolves it; `field-proof` resolves to the
  tracker card where `FieldProofPanel` is mounted). Empty ⇒ explicit "On
  track — no action needed" state.

Same density/tokens as the D2/D3 cards; reuse `stageCard.module.css` (no new
CSS file; substitute closest existing classes where exact names differ, as
D4 did — no invented classes).

### 3. Registration — append-only, exact D2/D3/D4 precedent

One new `act-operating-dashboard` entry per the six mount points:
`v3/act/types.ts`, `ActModuleSlideUp.tsx`, `DashboardRouter.tsx`,
`ActHub.tsx`, `navigation/taxonomy.ts`, `stage-navigator/stageModules.ts`
(lazy-registered like D3's `act-budget` / D4's surface). **No
`syncManifest.ts` change** (render-only, no store). No `PlanModule`/union
change, no exhaustive-switch contract (the Act manifest is an open list,
confirmed for D2–D4). Pre-flight protocol: grep for the mounted card at each
point, not just the manifest line, before editing.

## Testing (TDD, as-built target)

1. `operatingHealth.test.ts` —
   - each light's `ok`/`warn`/`alert` boundary per axis (schedule,
     resourcing, budget, proof), including the empty-input all-`ok` case;
   - each recommendation rule fires on its trigger and is **absent** when
     the trigger is absent;
   - severity ranking order (high→med→low) and the count tiebreak;
   - `counts` integers match the engine inputs;
   - **no-`WorkItem.status`-mutation invariant** (engine output frozen /
     inputs unmodified);
   - **covenant no-financing regex** over
     `JSON.stringify(computeOperatingHealth(...))`.
2. `OperatingDashboardCard.test.tsx` (`// @vitest-environment happy-dom`) —
   mounts; lights + ranked recommendations render from seeded multi-signal
   project data; each recommendation's deep-link target is present; the
   "on track" empty state renders when no signals fire; **no cost/currency/
   financing string anywhere** on the rendered surface (covenant at the UI
   layer, mirroring the D2 `ResourcingCard` / D4 precedent).

## Verification

- `packages/shared` tsc exit 0, clean.
- `apps/web` whole-project tsc with
  `$env:NODE_OPTIONS='--max-old-space-size=8192'` — green = no NEW error vs
  the pre-D5 baseline (pre-existing out-of-band debt is not a D5
  regression).
- Two suites green: `operatingHealth`, `OperatingDashboardCard`.
- Covenant grep over the engine + `OperatingDashboardCard` rendered surface
  — zero financing/capital tokens outside the negative-assertion test.
- `vite build` ok (`--max-old-space-size=8192`).
- `OperatingDashboardCard` is plain React deep behind the Act module
  slide-up — tsc + suites are the authoritative gate. No browser screenshot
  claimed if the surface cannot be reached (screenshot-honesty rule;
  MapLibre/WebGL hang precedent from D1–D4).

## Commit posture

Explicit-path staging **only** — never `git add -A`/`.`. The working tree
carries concurrent out-of-band streams; each D5 file staged by exact path,
per-file diff inspected for D5 scope. The six registration-touch files are
shared hot files — fetch + `git rev-list --left-right --count HEAD...@{u}`
immediately before touching them; if a diff mixes D5 and non-D5 hunks,
surface as a blocker (no silent hunk-split). `wiki/index.md` may be dirty
with other streams — the D5 session-close ADR is a standalone commit,
leaving `wiki/index.md` to its owner if dirty (D2/D3/D4 precedent). No
force-push; push only on explicit instruction and only if fast-forward
(branch `feat/atlas-permaculture` is rebased out-of-band).

## Scope / risk boundary

- **Covenant (highest):** budget signal is D3's operational drift surfaced
  verbatim — no cost-of-capital/financing/investor/yield re-framing;
  enforced by the engine no-financing regex + a release-gate covenant grep
  over engine + card output.
- **Composition correctness:** D5 calls the four engines, never
  re-implements them — budget drift stays D3-owned. Mitigation: engine
  input is the upstream engines' typed results, not raw recomputation; unit
  tests pin rule firing against those typed inputs.
- **Render-only:** recommendations/health derived at render; no store, no
  `syncManifest` entry, no spine-status write — `suggestProofMatches`
  precedent; no-`status`-mutation invariant test pins it.
- **Additive only:** new isolated pure engine + one card + append-only
  six-point registration; no schema change, no DB migration, no
  `PlanModule`/exhaustive-switch change.
- **No-clobber:** D5 coexists with live out-of-band streams; strict
  explicit-path staging + pre-touch divergence re-check on every shared
  registration file mandatory.
- **Dismiss/snooze deliberately out:** recommendations are stateless every
  render (explicit YAGNI — avoids a new persisted slice and a stale-state
  concern; would be its own additive slice if ever justified).
