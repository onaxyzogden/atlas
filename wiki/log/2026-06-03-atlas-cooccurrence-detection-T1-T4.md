# 2026-06-03 -- Cross-protocol co-occurrence detection: T1-T4 (Plan surface) shipped

**Branch.** `feat/atlas-permaculture` (explicit-path commits `37ff5502`, `7e809728`,
`f0cb88ce`, `0c85ceda`; **not pushed**).

**Feature.** The follow-on "north star" slice of the protocol-downstream-objective
Review-flag feature: when >= 2 DISTINCT protocols each hold an OPEN review flag in
the same `season:cycle` bucket, surface a single cross-cutting **root-cause-collapse
verdict** -- the deep design assumption (carrying capacity / water budget) sits
below what the design assumed -- instead of N isolated single-flag chips. Keys on
co-DEVIATION (open flags), not co-firing. Derived read-model: no new store, no
persist migration; a verdict dissolves when its constituent flags resolve. Two read
surfaces fed by one hook (Plan banner shipped; Observe card pending).

**Settled design** (see ADR
[[decisions/2026-06-03-atlas-cooccurrence-detection]]): detect on co-deviation;
derived view over open flags; both surfaces one hook; conservative grouping
(exclude `cycleNumber === undefined`, require >= 2 distinct `sourceTemplateId`);
existential (`emergency-destocking`) clusters sort first with an ihsan/rifq summary
prefix; shell banner omits `currentBucket` deliberately (cross-stratum has no single
domain/cycle; a season-only bucket is a verified `isFlagDormantByWindow` no-op).

**Implemented (subagent-driven, two-stage review per task: spec then quality).**
- **T1 (`37ff5502`)** `packages/shared/src/constants/protocol/coOccurrence.ts`:
  `CoOccurrenceCluster` TS interface (no zod -- derived view), `DEPTH_RANK`,
  `DEPTH_THEME`, `buildClusterSummary`, pure `detectCoOccurrenceClusters`. Barrel
  export added. Shared suite green.
- **T2 (`7e809728`)** `apps/web/src/store/reviewFlagStore.ts`:
  `useCoOccurrenceClusters(projectId, currentBucket?)` mirroring
  `useReviewFlagCountsByObjective` EXACTLY (stable `select(s => s.byProject)` +
  `useMemo` + module-level `EMPTY_CLUSTERS`) -- avoids the Zustand v5 fresh-array
  re-render loop. Filters `isOpenReviewFlag` + optional `isFlagDormantByWindow`
  (3-arg: flag, bucket, `per`). Web suite green.
- **T3 (`f0cb88ce`)** `CoOccurrenceVerdictBanner.tsx` + `.module.css` + test:
  presentational, default export, returns null when empty, mirrors
  `DesignTensionBanner` amber (`#e8a958`, no new palette); collapsed count chip
  (`cooccurrence-banner`) -> expanded rows with per-objective deep-link buttons
  (`cooccurrence-objective-link-<id>`); existential rows `data-existential`. Green.
- **T4 (`0c85ceda`)** `PlanStratumShell.tsx`: mounted the banner above the
  Observe-gap banner, fed by `useCoOccurrenceClusters(projectId)`; deep-links
  resolve via the existing `findPlanStratumObjectiveIn` + `navigateToObjective`.
  No spine edits, no status-derivation change. 33 insertions, 1 file.

**T4 caveat (disclosed).** The planned full-shell mount test HANGS -- the
`PlanStratumShell` router/store dependency surface is intractable to mock without
the mount stalling (the feasibility risk flagged in the plan materialized). A
hanging test poisons CI, so it was NOT committed (the implementer's draft test was
removed). T4 integration rests on **web `tsc --noEmit` EXIT 0** (the wiring is
type-correct and compiles -- zero errors in `PlanStratumShell` or the co-occurrence
files) + the committed T3 component test + the deferred T6 live-preview gate.
Honest, not papered over.

**An implementer subagent stalled** mid-T4 waiting on a backgrounded vitest run and
returned without wiring the shell (only its draft test landed). The coordinator
completed the small, well-scoped wiring directly (3 edits: imports, hook+state+
handler after `navigateToObjective`, render block) and verified by tsc -- within
coordinator-applied-fix scope.

**Verified.** Shared + web suites green at their commits (bounded `--pool=forks`
per [[feedback-vitest-bounded-runs]]); web `tsc --noEmit` (8 GB heap) EXIT 0 after
T4. **NOT browser-verified yet** -- T6 deferred; `preview_screenshot` unavailable on
this Windows setup ([[project-screenshot-hang]]), T6 will verify via `preview_eval`
DOM (port 5200) and disclose.

**Pending next session.** **T5** -- Observe read-only `CoOccurrenceSynthesisCard`
(no Acknowledge/Resolve/Dismiss; passive "Resolve in Plan" text;
`cooccurrence-synthesis-card`), mounted in the Observe synthesis container. **T6** --
shared+web tsc, full no-regression suite, `preview_eval` gate (inject 2 OPEN flags
distinct `sourceTemplateId` same `cycleNumber` on MTC -> assert banner + card +
deep-link; negative control single-template pair), persist + close.

Explicit-path commits, foreign WIP untouched ([[feedback-no-deletion]]); own
fetch + divergence-checked (0 behind / 111 ahead before T4;
[[feedback-commit-immediately-on-rebased-branches]]); not pushed
([[project-branch-rebase]]); CSRA untouched ([[fiqh-csra-erased-2026-05-04]]);
ASCII-only. ADR [[decisions/2026-06-03-atlas-cooccurrence-detection]]; design doc
`stages/design-protocol-cooccurrence-detection-review.md`. Builds on
[[decisions/2026-06-03-atlas-deviation-flag-universal-objective-retarget]].
Entities [[entities/protocols-dashboard]], [[entities/observe-dashboard]].
