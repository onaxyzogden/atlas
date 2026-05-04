# ADR: OBSERVE Phase 4b–4f Steward Annotation Rollup — Scoping

**Date:** 2026-05-02
**Status:** Proposed (scoping — not yet accepted)
**Scope:** `apps/web/src/store/visionStore.ts`,
`apps/web/src/store/site-annotations.ts` (and the five sub-stores it
backs: `useExternalForcesStore`, `useTopographyStore`,
`useEcologyStore`, `useSwotStore`, plus the soil-tests slice),
`apps/web/src/features/observe/ObserveHub.tsx` (Module 1 + Module 6
rollup), `DiagnosisReportExport.tsx`.

---

## Context

The OBSERVE-stage Phase 4 work shipped five steward-annotation
surfaces, each backed by an independent Zustand store:

| Surface | Phase | Store | File |
|---|---|---|---|
| HazardsLogCard | 4b | `useExternalForcesStore` | `features/observe/HazardsLogCard.tsx` |
| CrossSectionTool | 4c | `useTopographyStore` | `features/observe/CrossSectionTool.tsx` |
| FoodChainCard / SoilTestsCard | 4d | `useEcologyStore` (+ soil) | `features/observe/{FoodChainCard,SoilTestsCard}.tsx` |
| SectorCompassCard | 4e | `useExternalForcesStore` (sectors) | `features/observe/SectorCompassCard.tsx` |
| SwotJournalCard / DiagnosisReportExport | 4f | `useSwotStore` | `features/observe/{SwotJournalCard,DiagnosisReportExport}.tsx` |

Each card writes to its own store keyed by `projectId`. ObserveHub
reads them at line 105-117 and filters per-project for the dashboard
rollup. Module 1 (Human Context) at `ObserveHub.tsx:119-` reads
`visionStore` separately; the steward-survey + indigenous-regional
context lives there.

The gap captured in `.claude/plans/few-concerns-shiny-quokka.md`
Phase 8.4: **steward annotations don't roll up into `visionData`**.
A steward who has filled out 12 hazards, 4 transects, 6 ecology
observations, and a full SWOT journal still sees "vision" as just
the phase-notes + Moontrance fields they typed into Module 1.
The *site read* the steward built up over a season is invisible to
the vision-narrative read of the same project.

This is not a bug — vision and site-annotation are conceptually
distinct (vision = what the steward intends, annotation = what
they observed). But the diagnosis-report and Module 1 summary
readers benefit from an aggregate signal: "this project has 4 phase
notes + 12 hazards logged + 6 ecology observations + SWOT complete"
is a more useful readiness indicator than either dimension alone.

## Decision space

### D1. Aggregate shape — pull or push?

Two routes for surfacing annotation counts under vision-data:

1. **Pull-aggregator selector.** Read site-annotation stores from
   ObserveHub at render time, compute aggregate counts, pass into
   the same Module 1 summary that reads vision-data. No store
   changes. Aggregate is a derived view, not persisted state.
2. **Push-rollup mutation.** On every site-annotation write, mirror
   a counter into `visionData.annotationCounts`. Persisted state;
   single source of truth for downstream consumers.

**Tradeoffs.**
- Pull avoids store coupling — five annotation stores stay
  independent; vision store doesn't know they exist. Cost: every
  consumer that wants the rollup re-implements the same count
  logic.
- Push centralises the count logic but couples vision-store to all
  five annotation stores. Risk: counter drift if a write path
  forgets to update the rollup (already a concern with the existing
  `projectHazards` filter pattern).

**Recommendation:** **Pull-aggregator with a shared selector.**
Add `useObservationRollup(projectId)` to `store/site-annotations.ts`
exporting `{ hazardCount, transectCount, sectorCount, ecologyCount,
swotComplete, soilSampleCount }`. ObserveHub Module 1 + DiagnosisReport
both consume the same selector. No store coupling; one canonical
count source.

### D2. Vision-data field for annotation rollup

Should `VisionData` get a new optional field, or stay annotation-
agnostic with the rollup living entirely outside vision-store?

1. **Annotation-agnostic** (recommended). Vision stays scoped to
   intent; annotation rollup is a separate selector, joined at
   render time. Module 1 reads both and composes.
2. **`VisionData.annotationSummary?` field**. Persisted denormalised
   counter. Drift risk per D1 above.

**Recommendation:** **Option 1 — vision-data stays clean.** The
rollup is a render-time concern, not a persisted-intent concern.

### D3. Module 1 surface — what to actually show?

Today Module 1 surfaces 4 rows: phase notes, steward survey,
indigenous/regional, vision narrative. Annotation rollup options:

1. **New 5th row** — "Site observations: 12 hazards, 4 transects,
   6 ecology obs, SWOT complete".
2. **Update existing rows** — phase-notes row already shows
   completion count; widen it to include all annotation
   dimensions. Single row, denser.
3. **Promote rollup to its own module** — Module 7 "Site Read
   Synthesis" reads the rollup + diagnosis-report state.

**Recommendation:** **Option 1.** Single new row, kept narrow.
Module 7 promotion is over-engineering for what's essentially a
status indicator.

### D4. Diagnosis-report carry-through

`DiagnosisReportExport.tsx` already reads all five annotation
stores directly (line 7 docstring). The rollup selector should
*replace* those reads — single source of truth for both
ObserveHub Module 1 and the report's "Annotations Summary"
section.

**Recommendation:** Refactor `DiagnosisReportExport` to consume
`useObservationRollup` for the summary block; keep direct store
reads only for the per-annotation detail tables (which need full
shape, not counts).

### D5. SWOT completion semantics

`swotComplete: boolean` in the rollup is fuzzy — what does
"complete" mean? Three definitions:

1. **At least one entry per bucket** (S/W/O/T all populated).
2. **Steward-marked complete** — explicit `markComplete()`
   action on the SWOT store.
3. **Threshold-based** — N≥3 entries per bucket.

**Recommendation:** **Option 2 (steward-marked).** Stewards
should drive completion semantics; threshold-based is paternalistic
and option 1 incentivises rubber-stamping single entries.

## Consequences

**Positive.**
- One canonical rollup selector across ObserveHub Module 1,
  Diagnosis Report, and any future surface (V3 Discover page,
  scoring engine, etc.).
- Vision-store stays scope-clean; intent and observation remain
  conceptually distinct in storage.
- SWOT explicit-completion action gives stewards a clear "I'm
  done with this dimension" affordance the current bucket-count
  display lacks.

**Negative.**
- D5's `markComplete()` action requires a SWOT-store schema
  bump and migration of existing SWOT entries (default
  `complete: false`).
- Pull-aggregator means every Module 1 render walks all five
  annotation stores — fine at current data sizes but a hot-path
  to watch as projects accumulate annotations.

**Neutral.**
- Phase 8.4 ships in two slices (selector + Module 1 row, then
  diagnosis-report refactor). Neither blocks any other Phase 8
  work; the entire arc is render-layer.

## Implementation slicing

1. **8.4-A** — D1 + D2: `useObservationRollup` selector in
   `store/site-annotations.ts`. No call-site changes yet.
2. **8.4-B** — D3: ObserveHub Module 1 5th row consuming the
   selector.
3. **8.4-C** — D5: SWOT `markComplete()` action + migration
   default. SWOT store schema bump.
4. **8.4-D** — D4: DiagnosisReportExport summary-block refactor
   onto the rollup selector.

## Open questions

- **Soil samples in the rollup.** `useProjectSoilSamples` is a
  separate read at ObserveHub line 103, sourced from a different
  store path than the four 4b–4f annotation surfaces. Include in
  the rollup selector or treat as a sixth dimension surfaced
  separately? Recommendation: include — stewards don't think of
  soil tests as conceptually distinct from ecology observations.
- **Cross-project rollups.** A steward managing 3 projects might
  want an "all my observations" view. Out of scope for 8.4 but
  worth flagging — rollup selector should accept `projectId`
  *or* `projectIds[]` from day one.
- **Rollup in scoring.** Should `computeScores.ts` read the
  rollup as a "site read completeness" input? Recommendation:
  **no.** Site-read completeness is a UX signal, not a design-
  quality signal. Out of scope for 8.4; revisit if Phase 9 wants
  a new readiness dimension.

## References

- Phase 4 surfaces:
  - `apps/web/src/features/observe/HazardsLogCard.tsx` (4b)
  - `apps/web/src/features/observe/CrossSectionTool.tsx` (4c)
  - `apps/web/src/features/observe/FoodChainCard.tsx` (4d)
  - `apps/web/src/features/observe/SoilTestsCard.tsx` (4d)
  - `apps/web/src/features/observe/SectorCompassCard.tsx` (4e)
  - `apps/web/src/features/observe/SwotJournalCard.tsx` (4f)
  - `apps/web/src/features/observe/DiagnosisReportExport.tsx` (4f)
- Stores:
  - `apps/web/src/store/site-annotations.ts`
  - `apps/web/src/store/visionStore.ts`
- ObserveHub aggregator: `apps/web/src/features/observe/ObserveHub.tsx:101-117`
- Plan entry: `.claude/plans/few-concerns-shiny-quokka.md` Phase 8.4
- Related ADRs:
  - `2026-05-02-section-response-envelope.md` — shared envelope
    pattern; rollup follows the same "one selector, many readers"
    discipline.
