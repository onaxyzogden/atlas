# Design: Chronic / Multi-Cycle Co-Occurrence Detector (slice #3 of 3)

**Status:** approved (T3.1-T3.7 complete; verified live via preview_eval)
**Date:** 2026-06-03
**Branch:** `feat/atlas-permaculture` (not pushed)
**Plan:** `C:\Users\MY OWN AXIS\.claude\plans\velvet-doodling-sun.md` (approved)
**Parent / north star:** `stages/design-observation-log-review.md` (slice #2) deferred
"the chronic / multi-cycle detector that unions live open clusters with this
ledger". This slice builds it -- the first real consumer of the slice #2 ledger.

## Problem

Slice #1 (`design-protocol-cooccurrence-detection-review.md`) is a derived VIEW over
currently-OPEN review flags: a structural verdict the moment >=2 distinct protocols
co-deviate in one `season:cycle` bucket -- but it dissolves when the flags resolve.
Slice #2 (`design-observation-log-review.md`) preserves the past as an append-only
ledger of flag CLOSURES. Neither alone answers the capital-relevant question: is a
structural failure CHRONIC -- the same protocol pair co-deviating in the SAME season
across MULTIPLE cycles? A chronic verdict argues for re-earthworking / re-siting water
at the structural layer (redesign), not nudging a threshold (retune). It cannot be
computed without unioning the live present (slice #1) with the historical past
(slice #2). This slice is that union.

## Amanah gate

Benign agronomic land-stewardship synthesis -- a farm "structural medical record".
Read-only verdicts; the steward still decides (flag-not-mutate preserved). No riba /
gharar. No CSRA / advance-purchase framing. No cost / capital / yield-as-return
semantics (Scholar-gated, permanently out). Existential / destocking-bearing verdicts
carry ihsan/rifq weight (a wrong carrying-capacity assumption cost the animals) and
sort first. The retention amendment (below) is a deliberate, documented amendment of
the slice #2 unbounded-retention covenant: its intent was *no silent erasure of audit
history*, not *infinite storage* -- preserved by making all pruning steward-initiated,
observable (returns the pruned rows), never automatic, and chronic-aware. Cleared.

## Steward-settled decisions

1. **Scope = detector + BOTH read surfaces** (Plan banner + Observe card).
2. **Chronic rule delegated to the coordinator's expert call** (see below).
3. **Retention / pruning IS in scope** -- a conscious amendment of the slice #2 covenant.

## The chronic rule (expert decision)

A chronic verdict is a **co-deviating template PAIR that recurs in the SAME season
across >= 2 distinct cycles.**

- **Per-PAIR, not connected-component merge.** The pair is the verdict atom. Merging
  overlapping pairs by connected component would falsely over-claim `{A,B}@c1,2` +
  `{B,C}@c3,4` as one `{A,B,C}` spanning cycles 1-4. Per-pair is honest and also
  surfaces the common deviant when pairs overlap.
- **Season-scoped.** Spring water-stress != autumn water-stress (different regimes,
  different verdicts). Detection never crosses seasons.
- **"Consecutive" is a strength modifier, not a hard gate.** Strict consecutive-cycle
  gating is too brittle for noisy agronomic observation -- one quiet cycle would mask a
  genuinely chronic failure. `consecutive` and `spanCycles` feed the sort, not the
  emit test.

## Architecture

### Pure detector (`packages/shared/src/constants/protocol/chronicDetection.ts`)

`ChronicVerdict` is a plain TS interface (NOT zod -- a derived view, never persisted),
mirroring `CoOccurrenceCluster`. `detectChronicVerdicts(liveClusters, history)`:

1. Reconstruct historical occurrences from `history`: group by `bucketKey`, EXCLUDE
   undated records (`cycleNumber === undefined` -- cannot be ordered, same conservative
   rule slice #1 uses). A bucket with >= 2 distinct `sourceTemplateId` is one
   occurrence; each template carries its OWN objectiveId / depth / existential (a
   per-template `Map`, so enumerating pair (A,B) in a 3+-template bucket never leaks a
   third template C's attributes into the pair).
2. Convert live clusters to the same occurrence shape with `hasOpen:true`; exclude
   undated.
3. Union by `(season, cycleNumber)` -- one occurrence per cycle so a bucket never
   double-counts (live + historical of the same key merge; `hasOpen` if any live).
4. Per season, enumerate every unordered template pair across occurrences; accumulate
   `season -> pairKey -> { cycles, objectiveIds, deepestDepth, existential, hasOpen }`.
5. Emit one verdict per pair with `cycles.size >= CHRONIC_RECURRENCE_THRESHOLD (2)`.
6. Sort by deterministic tuple, descending:
   `(containsExistential, containsOpen, occurrenceCount, DEPTH_RANK[dominantDepth],
   consecutive, spanCycles)`, then `signatureKey` ascending as total-order tiebreak.
   `weight` is a populated diagnostic field, not the sort key.

Reuses `DEPTH_RANK` / `DEPTH_THEME` by import. `buildChronicSummary` emits ASCII, no
causation laundering, IHSAN_PREFIX when existential.

### Cross-store hook (`apps/web/src/store/chronicVerdicts.ts`)

`useChronicVerdicts(projectId, currentBucket?)` selects TWO stable roots directly --
`useReviewFlagStore(s => s.byProject)` + `useObservationLogStore(s => s.records)` -- and
does ALL derivation in ONE `useMemo` (open + dormancy filter copied from
`useCoOccurrenceClusters`; `detectCoOccurrenceClusters(open)`; filter history by
project; `detectChronicVerdicts`). Module-level `EMPTY_VERDICTS`. NEVER an inline-filter
selector (the Zustand-v5 fresh-array re-render hazard).

### Read surfaces (siblings -- shipped slice-#1 components untouched)

- **Plan:** `v3/plan/strata/ChronicVerdictBanner.tsx` (+ `.module.css`), presentational
  (`{ verdicts, expanded, onToggle, onSelectObjective }`), `return null` when empty,
  mounted in `PlanStratumShell.tsx` directly ABOVE the co-occurrence banner, wired to the
  existing `handleCoOccurrenceSelectObjective` -> `navigateToObjective`. Heavier
  amber/gold structural tier. Per-objective deep-link buttons.
- **Observe:** `v3/observe/dashboard/ChronicSynthesisCard.tsx` (+ `.module.css`),
  self-fetches `useChronicVerdicts(projectId)`, READ-ONLY (passive "Redesign in Plan"
  text, NO buttons -- Observe synthesizes, does not act), mounted in
  `UnifiedLandStateSurface.tsx` above the co-occurrence card.

### Retention amendment (`observationLogRetention.ts` + store action)

- `OBSERVATION_LOG_RETENTION_CYCLES = 12` (>> the 2-cycle detection minimum; the
  chronic-protection, not this constant, is the safety mechanism).
- Pure `partitionExpiredRecords(records, keepWithinCycles, protectedRecordIds)` -- a
  record is KEPT if undated, OR within its season's most-recent `keepWithinCycles`
  distinct cycles, OR its id is in `protectedRecordIds`. Seasons never cross-protect.
- Pure `chronicProtectedRecordIds(history, verdicts)` -- a record is protected iff some
  verdict matches on season scope + cycleNumber membership + templatePair leg.
- `observationLogStore.pruneProjectRecords(projectId, keepWithinCycles?)` -- derives
  `verdicts = detectChronicVerdicts([], projectRecords)` (ledger-only), protects via the
  mapper, partitions, sets `[...others, ...kept]`, RETURNS `pruned`. NO auto-trigger;
  steward-initiated only; `append` / persist config untouched.

## Known boundary (documented, bounded)

Prune-protection is **ledger-only** (`detectChronicVerdicts([], projectRecords)`), by
deliberate plan design (pruning is a maintenance op over the ledger). Consequence: a
chronic verdict detectable *solely* via a still-OPEN live cluster (its other leg not yet
closed into the ledger) is NOT prune-protected until that flag closes. This is bounded
and low-risk: the default window keeps the most-recent 12 distinct cycles regardless of
protection, so reaching such a record requires a steward to run a sweep with an
unusually tight window AND a >12-cycle-span open pair. When the live flag closes it
becomes a ledger record and the pair becomes ledger-chronic -> fully protected
thereafter. Disclosed, not silently omitted; revisit only if stewards report it.

## Testing

- **Detector (shared, bounded forks):** 18 specs incl. the no-transitive-over-merge
  regression and the 3-template/3-objective pair-grain regression.
- **Retention (shared):** 13 partition specs + 7 mapper specs (straddle-boundary,
  season-scoped recency, undated-always-kept).
- **Hook (web):** union + below-threshold + referential stability.
- **Banner (web):** 8 specs; **Card (web):** 4 specs incl. the read-only invariant
  (no role=button).
- **Prune (web):** 6 specs incl. chronic-contributing record retained outside window.
- **Preview gate (`preview_eval`, port 5200; `preview_screenshot` unavailable --
  DISCLOSED):** imported the real store + detector modules; seeded 2 OPEN flags
  (cycle 2) + 2 ledger records reconstructing `{A,B}@spring:1`; asserted exactly one
  union verdict `cycleNumbers:[1,2]`, `containsOpen:true`; negative control (remove the
  historical leg) -> 0 verdicts; exercised live `pruneProjectRecords` and confirmed a
  ledger-chronic pair survives outside the window while an old unprotected record is
  pruned and returned; restored all store + localStorage state.

## Out of scope (later slices)

- Display grouping / capping of many per-pair verdicts from a wide co-deviation.
- Automatic / scheduled pruning (capability ships here; trigger stays steward-initiated).
- Backfill of pre-slice-#2 closures (ledger accrues forward from empty).
- Cross-season chronic (a failure migrating seasons) and numeric / phenological
  enrichment.

## Definition of done

A pure `detectChronicVerdicts` unions live clusters with historical records and emits
per-pair, season-scoped chronic verdicts (>= 2 cycles) with an ihsan overlay and a
deterministic sort; a stable `useChronicVerdicts` feeds an actionable Plan banner + a
read-only Observe card (slice-#1 components untouched); a chronic-aware,
steward-initiated `pruneProjectRecords` + pure `partitionExpiredRecords` bound ledger
growth without erasing a ledger-detectable verdict or any undated row (a documented
amendment of the slice-#2 covenant). shared + web tsc clean for slice-3 files (foreign
errors excepted); all specs green (bounded forks); verified via `preview_eval`
(disclosed); ProtocolConfirmationFlow + spine + slice-#1 components untouched; no
deletions; ASCII-only; not pushed unless asked.

## Implementation outcome (as-built, 2026-06-03 -> approved)

Shipped as specced. Commits (feat/atlas-permaculture, not pushed): `9aae593f` (T3.1
detector), `fa51aaf5` (T3.2 hook), `47e603a7` (T3.3 Plan banner), `d344bf23` (T3.4
Observe card), `c9a33381` (T3.5 retention helper), `df6405d9` (T3.6 prune action).
One code-quality catch during T3.1 (a flat per-occurrence objective/depth aggregate
leaked a third template's attributes into an enumerated pair; fixed via a per-template
`Map` + 2 regression tests, re-review APPROVED). Foreign tsc errors recorded as
exceptions: a foreign commit `29662ef3` (per-stratum standing-protocol catalogue) and
import-only `v3/plan/spine/` carry pre-existing tsc errors in files this slice never
touched; all slice-3 files are type-clean and all slice-1/2/3 specs (51 shared + 78 web)
are green.
