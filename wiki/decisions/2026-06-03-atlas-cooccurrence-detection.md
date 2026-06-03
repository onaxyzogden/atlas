# ADR: Cross-protocol co-occurrence detection is a derived read-model over open review flags, surfaced on Plan + Observe

**Date:** 2026-06-03
**Status:** accepted (T1-T6 complete; verified live via preview_eval)
**Branch:** `feat/atlas-permaculture` (commits `37ff5502`, `7e809728`, `f0cb88ce`, `0c85ceda`, `b6336e2`, `5987bb1`; **not pushed**)

## Context

The protocol-downstream-objective Review-flag feature (Tier 1 + Tier 2, DONE) raises
a non-destructive amber **Review** flag on a downstream Plan objective when a
confirmed field-protocol activation **deviates** from the steward-authored
`expectedRate`. Its parent design doc named **cross-protocol co-occurrence** as
"the north star": a single flag says "nudge this threshold," but when MULTIPLE
distinct protocols deviate together in one temporal window, the cluster is a
**root-cause-collapse** verdict -- the deep design assumption (carrying capacity,
water budget) sits below what the design assumed. v4 deliberately stamped the
`season`/`cycleNumber` temporal bucket on every flag from day one so this detection
would not be a painful retrofit, but explicitly deferred the detection itself.
This ADR records building it.

## Decision

**1. Detect on co-DEVIATION, not co-firing.** Key on >= 2 distinct protocols each
holding an OPEN review flag in the same `season:cycle` bucket. Co-activation
(firing) is usually the design working -- the whole v4 thesis -- so it is NOT the
signal. Interpretation is DERIVED from the constituent flags' existing `depth` +
objective metadata (generic, low-maintenance, open to surprise), with a thin
curated overlay only for `emergency-destocking`-bearing (existential) clusters.

**2. Derived read-model -- no new persistence.** A `CoOccurrenceCluster` is a TS
interface (no zod schema), a VIEW computed on read over currently-open flags. No
new store, no persist migration, no separate lifecycle. A verdict dissolves the
moment the steward resolves/dismisses its constituent flags. This honors the
"Observe synthesizes read-only" stage covenant and avoids a parallel state machine
that could drift from the flags it summarizes.

**3. Both surfaces, one hook.** A single `useCoOccurrenceClusters` hook feeds an
ACTIONABLE Plan-view banner (shell-level, cross-stratum, deep-linking to
objectives) AND a READ-ONLY Observe synthesis card. One pure detection fn + one
hook keeps the two render paths from drifting; both surfaces are thin presentational
consumers.

**4. Conservative temporal grouping.** `detectCoOccurrenceClusters` EXCLUDES any
flag with `window.cycleNumber === undefined` -- missing temporal info must never
form a false `unknown:0` cluster. `cycleNumber` is the reliable axis; season alone
is ambiguous across years. Two flags from the SAME `sourceTemplateId` (e.g.
tighten + loosen) do NOT form a cluster -- only >= 2 DISTINCT templates do.

**5. Existential weighting (ihsan).** Clusters containing an `existential` flag
(`emergency-destocking`) sort first (`weight += 100`) and carry an explicit
welfare-implicated summary prefix: a wrong carrying-capacity assumption cost the
animals (rifq). Amanah-aligned, not a cosmetic accent.

**6. Shell banner omits `currentBucket` deliberately.** Mounted at
`PlanStratumShell` (cross-stratum / cross-domain), there is no single `domainId`,
so `getCurrentCycle` cannot supply a meaningful `cycleNumber`. A season-only bucket
is a VERIFIED no-op for `isFlagDormantByWindow` (it returns false whenever the
current cycleNumber is absent, by its own season-fallback rule). So the shell passes
no bucket and shows every currently-open cluster; window-dormancy filtering remains
on the domain-scoped Act/Observe surfaces where a real cycle exists. Documented in
code so a later reader does not "add the missing bucket."

## Consequences

- The verdict is always honest to the live flag set -- it cannot show a cluster
  whose flags are resolved, and it needs no migration or backfill.
- The Zustand v5 fresh-array re-render hazard is avoided: the hook mirrors
  `useReviewFlagCountsByObjective` exactly (stable `select(s => s.byProject)` +
  `useMemo` + module-level `EMPTY_CLUSTERS`), never an inline-filter selector.
- The amber `#e8a958` token is reused from `DesignTensionBanner` -- no new palette.
- **T4 caveat (CLOSED by T6):** the planned full-shell mount test HANGS (the
  `PlanStratumShell` router/store dependency surface is intractable to mock
  without the mount stalling). A hanging test poisons CI, so it was NOT
  committed; at the T4 commit the integration rested on web `tsc --noEmit`
  EXIT 0 + the T3 component test. The T6 `preview_eval` gate then drove the real
  shell in-browser and confirmed the banner mounts/expands/deep-links, closing
  the gap empirically. Recorded, not hidden.
- **T5/T6 complete:** the Observe read-only `CoOccurrenceSynthesisCard` shipped
  (`b6336e2`; ASCII-comment fixup `5987bb1`) and the feature is now surfaced on
  BOTH read surfaces. The T6 live preview gate (below) confirmed positive +
  negative-control behaviour on both surfaces.

## Verification

- Shared + web `tsc --noEmit` clean (web at 8 GB heap, EXIT 0) -- zero errors in
  the co-occurrence files, `PlanStratumShell`, or `UnifiedLandStateSurface`.
- Bounded `--pool=forks` sweep: 8 files / 56 tests green (four new co-occurrence
  specs + prior review-flag / Objective suites) -- no regression.
- **Live preview gate (T6), `preview_eval` DOM port 5200** (`preview_screenshot`
  unavailable on this Windows setup -- DISCLOSED). For MTC (`projectId: 'mtc'`),
  after backing up `localStorage['ogden-review-flags']`: a positive fixture (2
  open flags, distinct templates, same `cycleNumber: 1`, one existential)
  rendered the Plan `cooccurrence-banner` (expand -> ihsan summary, existential
  row, 2 deep-links) AND the Observe `cooccurrence-synthesis-card` (0 buttons/
  links = read-only confirmed live, existential flag, "Resolve in Plan" pointer);
  a negative control (same template x2) rendered NEITHER surface. Original store
  state + the Observe shell-toggle mode were restored afterward.

Explicit-path commits; foreign working-tree WIP untouched
([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]);
fetched + 0-behind/111-ahead before the T4 commit; not pushed
([[project-branch-rebase]]); CSRA untouched ([[fiqh-csra-erased-2026-05-04]]);
ASCII-only copy. Follows the protocol-deviation flag line
([[decisions/2026-06-03-atlas-deviation-flag-universal-objective-retarget]],
[[decisions/2026-06-03-atlas-deviation-flag-tier2-event-driven-routing]]).
Design doc: `stages/design-protocol-cooccurrence-detection-review.md`.
Log: [[log/2026-06-03-atlas-cooccurrence-detection-T1-T4]].
Entities: [[entities/protocols-dashboard]], [[entities/observe-dashboard]].
