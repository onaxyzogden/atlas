# 2026-05-31 -- Act Record-observation emits an ObserveDataPoint; exec header contained; rail shows checklist progress

**Status:** accepted · **Branch:** `feat/atlas-permaculture` · **Surface:** Atlas web
**Commits:** `6e5ff3bc` (Slice 1) -> `63c23ce8` (Slice 2) -> `79c8c05f` (Slice 3)
**Entity:** [[entities/act-tier-shell]] · **Log:** [[log/2026-05-31-act-tier-shell-record-observation]]

## Context

Three operator follow-ups on the production Act tier-shell execution panel. The
headline decision is Slice 1: the "Record observation" button was a disabled stub.
Wiring it realizes the stage reframe recorded across the Act tier-shell ADRs --
**Plan decides / Act executes and collects / Observe synthesizes read-only**. The
Act surface is where a steward completes an objective's checklist and captures
field evidence; on completion it should emit a persisted observation that the
read-only Observe layer can synthesize.

## Decisions

1. **Act objective completion writes an `ObserveDataPoint`.** On click,
   `handleRecord` builds a `manual_observation` data point
   (`statusOutput: 'clear'`, `locationGeometry: null`, `cycleId: 0`,
   `measurementValue` = objective title + joined saved notes,
   `capturedBy: 'act-tier'`) and calls `useObserveDataPointStore.recordDataPoint`.
   This is the first **write** from the Act tier-shell into the Observe substrate,
   crossing the Act->Observe stage seam in the direction the reframe intends
   (Act produces, Observe consumes read-only). It is add-only: Act never edits or
   reads-back Observe state to drive its own UI.

2. **Domain link via `getPrimaryDomainForObjective`, not objectiveId.**
   `ObserveDataPoint` is keyed by `domainId` (a `UniversalDomain`), so the point
   is linked to the objective's primary Observe domain
   (`getPrimaryDomainForObjective(objective): UniversalDomain | null`), exactly
   the type the schema requires (TS-safe; no invalid-domain path). **Accepted
   consequence:** because the link is by domain not objective, the panel's
   "This need's activity" feed cannot be filtered to THIS objective's
   observations; it stays as the static empty state, and post-record feedback is
   a session-local `recorded` relabel only. Per-objective activity wiring is
   deferred (named in the log).

3. **Two-axis enable gate.** The button enables only when the checklist is
   complete AND every REQUIRED evidence descriptor is satisfied
   (`isEvidenceSatisfied`: photo count >= target / confirm true / note saved) AND
   the objective resolves to a non-null primary domain. The progress BAR stays
   checklist-only ("{done}/{total} steps") -- it is a checklist gauge, not the
   record gate, and conflating them would mislead.

4. **Rail progress is checklist-derived, markers stay field-action-derived
   (Slice 3).** A new pure `computeChecklistProgress` feeds only
   `ActTierObjectiveRail`; `ActTierMapMarkers` keeps `computeObjectiveProgress`
   (field actions). Rationale: the rail card mirrors the panel the steward is
   about to open (checklist), so "No tasks yet" for a populated checklist was
   simply wrong; map markers legitimately represent logged field work and must
   not be reframed. Two progress signals, each sourced from where its consumer's
   semantics live.

5. **Contained exec header (Slice 2)** mirrors the objective rail's
   `.railPanel`/`.railHeader` -- a CSS/JSX-only grouping decision, no behaviour
   change, taken for visual parity across the two rails.

## Alternatives considered

- **Emit on every checklist toggle** (rejected): noisy, would write partial
  observations; the record is an explicit steward act of completion.
- **Link the data point by objectiveId** (rejected): the `ObserveDataPoint`
  schema is domain-keyed by design (Observe synthesizes by domain); adding an
  objective foreign key is a schema change out of this slice's scope.
- **Reuse field-action progress for the rail** (rejected): that is the bug --
  field actions and checklist items are different substrates.

## Consequences

- The Act tier-shell now has a live Act->Observe production path; the Observe
  dashboard will surface these points by domain.
- `recorded` is ephemeral (page session) -- a steward who reloads loses the
  relabel though the data point persists. Acceptable; named as deferred.
- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
