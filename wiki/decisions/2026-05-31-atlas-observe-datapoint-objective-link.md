# 2026-05-31 -- ObserveDataPoint gains a sourceObjectiveId; per-objective activity feed; Observe provenance chip

**Status:** accepted · **Branch:** `feat/atlas-permaculture` · **Surface:** Atlas web + `@ogden/shared`
**Commits:** `389bff36` (Slice A schema+store) -> `67926c85` (Slice B Act feed) -> `66aee783` (Slice C Observe chip)
**Entity:** [[entities/act-tier-shell]] · **Log:** [[log/2026-05-31-act-tier-shell-objective-observation-link]]
**Supersedes:** decision #2 of [[decisions/2026-05-31-atlas-act-record-observation-emits-datapoint]] (in part)

## Context

The Record-observation flow shipped earlier the same day
([[decisions/2026-05-31-atlas-act-record-observation-emits-datapoint]]) writes a
persisted `ObserveDataPoint` keyed only by `domainId`. That earlier ADR's
**decision #2** fixed the link as domain-only and **listed "link by objectiveId"
as rejected** ("the `ObserveDataPoint` schema is domain-keyed by design; adding an
objective foreign key is a schema change out of this slice's scope"). Two
follow-ups were deferred *because* of that missing link:

1. The Act exec panel's "This need's activity" section was a hardcoded
   "No observations recorded." stub -- nothing on the data point pointed back to
   the objective that produced it, so it could not list THIS objective's own
   recorded observations.
2. On the Observe side, Act-emitted points appeared on the Domain Detail page
   (`DomainObservationList` groups by `domainId`) but gave no sign they came from
   completing a specific Plan objective -- so the Plan->Act->Observe loop was not
   *visibly* closed.

The operator has now explicitly requested that schema change, reopening the
rejected alternative. This ADR records the reversal and the resulting build.

## Decisions

1. **`ObserveDataPoint` gains a `sourceObjectiveId` foreign key
   (supersedes decision #2's "rejected" stance).** The schema adds
   `sourceObjectiveId: z.string().nullable().default(null)` immediately after
   `sourceFeedEntryId`, matching the two existing source FKs exactly (so the
   inferred OUTPUT type carries it as required `string | null` and `tsc`
   enumerates every literal that must add it). Operator-chosen field name:
   **`sourceObjectiveId`** (parity with `sourceActionId` / `sourceFeedEntryId`).

2. **The domain link STAYS; the objective link is added ALONGSIDE it, not as a
   replacement.** `domainId` remains the spatial/synthesis key the Observe
   dashboard groups by (decision #2's premise -- "Observe synthesizes by domain"
   -- is unchanged). `sourceObjectiveId` is pure *provenance*: it records which
   Plan objective produced the point, enabling per-objective filtering on the Act
   side and a provenance chip on the Observe side, without altering how Observe
   synthesizes. This is the narrow, surgical reversal: only the "no objective FK"
   clause of decision #2 is overturned; its domain-keying decision survives intact.

3. **Repeat recordings are allowed; the Record button does not lock.** Operator
   choice: the per-objective activity feed IS the persistent history, so the
   Record button stays re-armable (`disabled={!ready}` only -- the prior
   session-local `recorded` flag + its `useEffect` reset + the `|| recorded`
   relabel were removed). A new feed row is the confirmation that a record
   landed; recording again simply appends another row.

4. **The Act panel renders a per-objective activity feed.** `ActTierExecutionPanel`
   subscribes to `useObserveDataPointStore((s) => s.byProject)` and
   `useMemo`-filters by `sourceObjectiveId === objective.id`, newest-first
   (mirroring `useDomainPoints` to avoid the new-array-per-render selector
   pitfall). Each row shows a formatted `capturedAt` + an optional note read from
   `measurementValue`. The write path adds `sourceObjectiveId: objective.id` to
   the point literal.

5. **No supersession hazard -- confirmed, not worked around.**
   `computeSupersession` returns empty when the new point has no Point geometry
   and skips candidates with no geometry. Act observations are
   `locationGeometry: null`, so two same-domain Act observations for different
   objectives never supersede each other; the per-objective feed accumulates
   cleanly with no special-casing.

6. **Observe Domain Detail shows an objective-title provenance chip.**
   `DomainObservationList` resolves `findObjectiveAcrossCatalogues(sourceObjectiveId)?.title`
   and renders a gold accent pill in each row's `.rowHead` when it resolves.
   Domain-only / field-log rows (null `sourceObjectiveId`) are unaffected -- no
   raw id ever leaks.

## Alternatives considered

- **Keep the domain-only link, leave the feed static** (the prior ADR's
  position) -- rejected now that the operator has explicitly asked for the
  schema change; the static stub left the loop visibly open.
- **Replace `domainId` with `objectiveId`** -- rejected; Observe synthesizes by
  domain. The objective FK is additive provenance, not a new synthesis key.
- **Lock the Record button after one record** -- rejected per operator choice;
  the feed is the history, so repeat captures are first-class.

## Consequences

- Persist `version` bumped `1 -> 2` with a `migrate` that backfills
  `sourceObjectiveId: p.sourceObjectiveId ?? null` across `byProject` (keeps
  already-persisted user observations consistent with the new output type;
  correctness-cosmetic since reads tolerate `undefined`).
- Two new store selectors `getByObjective` / `getActiveByObjective` mirror the
  domain selectors.
- New conformance test `observeDataPointObjectiveLink.test.ts`: default-null
  backward-compat, field round-trip, and every `UNIVERSAL_PLAN_OBJECTIVES` id
  resolves a title (guards the Observe chip).

## Resolved / still-deferred

- **Resolved this round:** per-objective activity feed (was deferred by decision
  #2); visible Plan->Act->Observe loop closure via the Observe chip.
- **Still deferred (named):** enriching `routeToDataPoint` field-log projections
  with `sourceObjectiveId` from the source feed entry's objective (so field-log
  rows also get a chip); an "from Act" filter/section on the Observe Domain
  Detail surface; surfacing the per-objective feed anywhere beyond the Act panel +
  Observe domain list (e.g. a Unified Land State rollup).
- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
