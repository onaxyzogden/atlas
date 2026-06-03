# Design: Cross-protocol co-occurrence detection (root-cause-collapse verdict)

**Status:** review (T1-T4 implemented; T5-T6 pending)
**Date:** 2026-06-03
**Branch:** `feat/atlas-permaculture` (not pushed)
**Parent:** `stages/design-protocol-downstream-objective-flags-review.md` (v4) names
cross-protocol co-occurrence as "the north star" (line 122); v4 stamped the
`season`/`cycleNumber` temporal bucket on every flag from day one specifically so
this detection would not be a painful retrofit, but deferred the detection itself.
This doc is that follow-on slice.

## Problem

A single review flag says "nudge this threshold." When MULTIPLE distinct protocols
deviate together in one temporal window, the cluster is a stronger signal than any
single edge: e.g. cover-trigger + re-entry-gate + emergency-destocking all deviating
in one season is not three faults, it is one verdict -- the carrying-capacity /
water-budget assumption sits below what the design assumed. The steward should see
the PATTERN and revise the deep assumption, not just the individual thresholds.

## Steward-settled decisions (2026-06-03)

1. **Detect on co-DEVIATION, not co-firing.** Key on >= 2 distinct protocols each
   holding an OPEN review flag in the same `season:cycle` bucket -- NOT on mere
   co-activation (firing is usually the design working). Interpretation is DERIVED
   from the constituent flags' existing `depth` + objective metadata, plus a thin
   curated overlay for destocking-bearing (existential) clusters.
2. **Derived read-model.** No new store, no persist migration, no separate
   lifecycle. A verdict is a VIEW over currently-open flags; it dissolves when the
   steward resolves/dismisses the underlying flags. Matches the "Observe
   synthesizes read-only" stage covenant.
3. **Both surfaces, one hook.** An actionable Plan-view banner (shell-level,
   cross-stratum) AND a read-only Observe synthesis card, both fed by the same
   derived hook `useCoOccurrenceClusters`.

## Amanah gate

Agronomic land-stewardship synthesis; benign, halal. No riba/gharar, no
CSRA/advance-purchase framing. Flag-not-mutate preserved (read-only synthesis; the
steward still decides). Clusters bearing `emergency-destocking` carry ihsan/rifq
weight (a wrong carrying-capacity assumption cost the animals) and sort first with
an explicit welfare-implicated prefix. Cleared.

## Architecture

### Pure detection (`packages/shared/src/constants/protocol/coOccurrence.ts`)

`CoOccurrenceCluster` is a TS interface (NOT a zod schema -- it is a derived view,
never persisted): `bucketKey`, `season?`, `cycleNumber?`, `templateIds[]` (>= 2
distinct), `objectiveIds[]`, `flagIds[]`, `dominantDepth`, `theme`,
`containsExistential`, `weight`, `summary`.

- `DEPTH_RANK`: threshold 0, soil 1, water 2, zones 3, structural 4 (the
  `FlagDepth` enum's declared rendering-weight order; deeper = heavier).
- `DEPTH_THEME`: threshold "Operational thresholds", soil "Soil & ecology", water
  "Water strategy", zones "Zones & sectors", structural "Structural design".
- `buildClusterSummary`: ASCII, no causation laundering. Base
  `"{N} protocols deviating together this {per}: points to {theme} ({M}
  objective(s))."` (per = season name if present else "cycle"). Existential
  clusters prefix `"Animal welfare implicated (ihsan): a carrying-capacity
  assumption may have cost stock. "`.
- `detectCoOccurrenceClusters(openFlags)`: (1) EXCLUDE any flag with
  `window.cycleNumber === undefined` (conservative -- missing temporal info must
  never form a false `unknown` cluster); (2) group by `temporalBucketKey`; (3) keep
  buckets with >= 2 distinct `sourceTemplateId` (two flags from the SAME template
  do NOT cluster); (4) build the cluster (dominantDepth = max DEPTH_RANK; dedup
  ids); (5) sort by `weight` desc (existential-bearing first). Pure, store-free --
  the caller does open/dormant filtering.

### Read hook (`apps/web/src/store/reviewFlagStore.ts`)

`useCoOccurrenceClusters(projectId, currentBucket?)` mirrors
`useReviewFlagCountsByObjective` EXACTLY (stable `select(s => s.byProject)` + a
`useMemo` keyed `[byProject, projectId, currentBucket]`, with a module-level
`EMPTY_CLUSTERS` constant -- never an inline-filter selector, which would trip the
Zustand v5 fresh-array re-render loop). Filters to `isOpenReviewFlag(f)` and, when
`currentBucket` is supplied, drops `isFlagDormantByWindow(f, currentBucket, per)`
where `per = f.expectedRate?.per ?? 'season'`. Returns
`detectCoOccurrenceClusters(openFlags)`.

### Plan-view banner (`apps/web/src/v3/plan/strata/CoOccurrenceVerdictBanner.tsx`)

Presentational (clusters injected, not fetched -- tests without the store). Props
`{ clusters, expanded, onToggle, onSelectObjective }`. Returns null when empty.
Mirrors `DesignTensionBanner`'s amber collapsible language (reuses the `#e8a958`
amber token -- no new palette). Collapsed: a count chip
(`data-testid="cooccurrence-banner"`, `"{N} structural verdict(s)"`). Expanded:
one row per cluster (theme + summary + a deep-link button per objectiveId,
`data-testid="cooccurrence-objective-link-${objectiveId}"`). Existential rows get
`data-existential="true"` + a heavier amber accent.

Mounted at the **shell** (`PlanStratumShell.tsx`), above the Observe-gap banner, so
one cross-stratum cluster renders once. `currentBucket` is INTENTIONALLY OMITTED at
this cross-stratum/cross-domain shell: window-dormancy is `cycleNumber`-keyed and
`cycleNumber` is domain-scoped (`getCurrentCycle` needs a `domainId`); a season-only
bucket is a verified no-op for `isFlagDormantByWindow` (returns false whenever the
current cycleNumber is absent). Dormancy filtering therefore stays on the
domain-scoped Act/Observe surfaces. Deep-links resolve each objectiveId via the
shell's existing `findPlanStratumObjectiveIn` + `navigateToObjective`. No spine
edits.

### Observe synthesis card (T5 -- PENDING)

`CoOccurrenceSynthesisCard.tsx` in `apps/web/src/v3/observe/...`, read-only (NO
Acknowledge/Resolve/Dismiss; a single passive "Resolve in Plan" text pointer),
`data-testid="cooccurrence-synthesis-card"`, mounted in the Observe synthesis
container.

## Status

| Task | State | Commit |
|---|---|---|
| T1 shared detection + type (TDD) | DONE | `37ff5502` |
| T2 `useCoOccurrenceClusters` hook (TDD) | DONE | `7e809728` |
| T3 Plan-view banner component (TDD) | DONE | `f0cb88ce` |
| T4 mount banner at Plan shell | DONE (caveat) | `0c85ceda` |
| T5 Observe read-only synthesis card | PENDING | -- |
| T6 verification + preview gate | PENDING | -- |

**T4 caveat (honest):** the planned full-shell mount test hangs -- the
`PlanStratumShell` router/store dependency surface is intractable to mock without
the mount stalling (the flagged feasibility risk materialized). The hanging test
was NOT committed (a hanging test poisons CI). T4 integration rests on **web tsc
EXIT 0** (the wiring is type-correct and compiles) + the committed T3 component
test + the deferred T6 live-preview gate. Disclosed, not papered over.

## Verification to date

- T1 shared suite green; T2/T3 web suites green (bounded `--pool=forks`); all
  prior review-flag suites still green at their commits.
- Web `tsc --noEmit` (8 GB heap) EXIT 0 after T4 -- zero errors in
  `PlanStratumShell` or the co-occurrence files.
- NOT browser-verified yet (T6). `preview_screenshot` unavailable on this Windows
  setup; the T6 gate will verify via `preview_eval` DOM (port 5200) and disclose.

## Deferred (explicit)

- Cross-window / multi-season trend (a cluster recurring across consecutive cycles
  = a chronic structural verdict). This slice is single-bucket.
- Curated multi-protocol signature copy beyond the derived theme + destocking
  overlay.
- Verdict dismissal memory (muting a cluster's banner without resolving its flags)
  -- intentionally omitted per the derived-read-model decision.
- Numeric-measurement enrichment, phenological-phase weighting, per-zone
  establishment granularity.
