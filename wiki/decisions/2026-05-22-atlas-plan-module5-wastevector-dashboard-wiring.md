# Plan · Module 5 · WasteVector dashboard wiring (live data + shared validation hook)

**Date:** 2026-05-22 (follow-up)
**Stage:** Plan
**Module:** 5 — Soil Fertility & Closed-Loop
**Status:** Landed — Phases A–F committed (`ccd30abf`)
**Branch:** `feat/atlas-permaculture`
**Plan file:** `~/.claude/plans/i-d-like-for-this-async-quasar.md` (follow-up revision)
**Builds on:** `wiki/decisions/2026-05-22-atlas-plan-module5-wastevector-quantity-capture.md` (the data spine)

## Context

The data spine landed last session: `MaterialFlow` carries six optional
monthly-throughput fields and the authoring form captures them. What remained
was the *consumption* side — `WasteVectorDashboardView` still rendered ten inline
sample arrays and never received `project`, so it could not scope to data. This
decision records wiring five of the six panels to live, project-scoped store data
and the shared-hook extraction that gives the risks panel parity with the
`ClosedLoopGraphCard`.

## Decision

Thread `project` into the dashboard and convert the KPI strip, stream inventory,
flow map, processing methods, risks and interventions panels to `useMemo`-derived
views over the raw `materialFlows` / `fertilityInfra` slices. The scenarios row
stays sample-backed, now explicitly `(sample)`-tagged.

### Two locked choices

1. **NPK-recovery KPI = absolute kg/mo** — the sum of
   `nutrientN + nutrientP + nutrientK` over compost flows. An efficiency %
   was rejected: it would require a fabricated theoretical-yield denominator we
   do not store. The chip shows an em-dash until at least one compost flow
   carries an N/P/K value.

2. **Risks panel = full parity with `ClosedLoopGraphCard`** — achieved by
   extracting the card's node-assembly + orphan/dangling/isolated validation into
   a **shared hook**, `apps/web/src/features/plan/useClosedLoopValidation.ts`,
   that both surfaces consume. A single source of truth, so the card and the
   dashboard can never report different counts. The alternative (replicating the
   8-store subscription + validation in the dashboard) was rejected as a
   guaranteed future drift.

### Loop-efficiency formula

`efficiency(flows) = round(closedFlows / totalFlows × 100)`, where a closed flow
has both `sourceId` and `sinkId` pinned. Used identically by the KPI chip and the
flow-map badge. Em-dash when there are no flows.

### Flow-map adjacency model

One `useMemo` keyed on `(flows, projectInfra, endpointOptions)` so Bézier
coordinates stay reference-stable across re-renders:

- **Three-column** when `projectInfra.length > 0`: the processor column is
  pre-seeded from `fertilityInfra`; a flow endpoint pinned to an infra id lands
  in that column, every other endpoint lands in the source or destination column.
- **Two-column fallback** when no fertility infra exists: sources and
  destinations only, destinations rendered in the centre column slot.
- Each column is sorted by label and capped at 8 nodes; edges whose endpoints
  fall outside the cap are dropped. Edge colour = `MATERIAL_KIND_CONFIG[kind]`.
- Endpoint labels resolve pinned-feature name → free-text fallback →
  `(unpinned)`; the `Kind · ` prefix from `useFlowEndpointOptions` is stripped.

### Risk → severity → intervention mapping

| Category | Source | Severity | Pill |
|---|---|---|---|
| orphan fertility | `orphanFertility` | medium | `pillPartial` |
| fertility without feedstock | `fertilityWithoutFeedstock` | medium | `pillPartial` |
| dangling water/greywater flow | `vectors` missing an endpoint, water kind | high | `pillUnmet` |
| dangling flow (other) | `vectors` missing an endpoint | medium | `pillPartial` |
| isolated feature | `isolatedFeatures` | low | `pill` |

Interventions are a static `RISK_TO_INTERVENTION` map keyed by category id; one
deduped row per active category. Both panels cap at 4 rows and show
"No closed-loop issues detected" when every category is empty.

## Scope note — sample-array removal vs. the no-deletion rule

The nine sample arrays (`KPIS`, `SOURCES`, `PROCESSORS`, `DESTINATIONS`, `FLOWS`,
`STREAM_INVENTORY`, `PROCESSING_METHODS`, `RISKS`, `INTERVENTIONS`) were inline
placeholders inside this one view, not reusable stage components. Replacing them
with live derivations does **not** violate the no-deletion-in-revamps rule, which
protects legacy *stage components* that may be reused in unbuilt stages. `SCENARIOS`
is retained because `scenarioStore` has no closed-loop snapshot to derive from.

## Deferred

- **KPI deltas / trend arrows** — removed (no time-series source). A future
  snapshot store could reintroduce them.
- **Scenarios from a store** — needs a closed-loop snapshot in `scenarioStore`;
  out of scope and not authorised.
- **Time-series / historical throughput** — not modelled.

## Verification

- `tsc --noEmit` (apps/web, 8 GB heap) — clean against the four touched files;
  the only remaining errors are the three known pre-existing/out-of-scope ones
  (`StepBoundary.tsx:365`, `HostUnionContextMenu.test.tsx:58`,
  `HostUnionDrilldownCard.test.tsx:25`).
- `pnpm vitest run src/features/plan` — 29 passed (unchanged baseline).
- `vite build` — green (built in ~31s).
- **Parity check** — the `ClosedLoopGraphCard` diff is exactly the hook swap; the
  node-assembly + validation logic (including `usePhaseStoreCappedEntities`
  Yeomans capping) moved verbatim into the hook, so the card's counts are
  identical before/after.
- **Preview** — not attempted; still behind `/login` with the local `@ogden/api`
  down. Grounding rests on tsc/vitest/build per the plan's known-blocker clause.

## Files

- `apps/web/src/features/plan/WasteVectorTool.tsx` (modified — pass `project`)
- `apps/web/src/features/plan/WasteVectorDashboardView.tsx` (modified — Phases A–E)
- `apps/web/src/features/plan/useClosedLoopValidation.ts` (new — shared hook)
- `apps/web/src/v3/plan/cards/soil-fertility/ClosedLoopGraphCard.tsx` (modified — consume hook)

## Note on the out-of-band rebase

Per `[[feedback-commit-immediately-on-rebased-branches]]`, the verified slice was
committed the moment tsc/vitest/build passed (`ccd30abf`), staging only the four
owned files by explicit path. The working tree carries unrelated foreign WIP
(`capitalPartner*`, `EconomicsPanel*`, `ZoneSomSidebar*`, `UtilityPointTool*`,
several `v3/plan` files) which was deliberately left unstaged.
