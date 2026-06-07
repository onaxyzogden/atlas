# 2026-06-02 -- Act-rail source parity: provenance badge + source filter

**Branch:** `feat/atlas-permaculture`
**Commits:**
- `92a56e23` -- feat(act): show source-provenance badge on Act objective cards
  (`ActTierObjectiveCard.tsx` + `.objSource` in `ActTierShell.module.css`, +49).
- filter JSX/logic on `ActTierObjectiveRail.tsx` -- authored here but landed
  bundled inside the foreign commit `4e4b9b34` (the parallel session ran
  `git add` over the whole rail file, which also carried my uncommitted filter
  edits; see note below).
- `b6099414` -- style(act): add `.railFilterBar` / `.railFilterPill` to
  `ActTierShell.module.css`, completing the filter styling (+33).

## Context

Operator complaint (verbatim): "I'm not seeing any objectives pertaining to
plants or food forest or orchard even though they are selected as secondary
project types." Triaged across prior rounds to: source filter is "All"; the
viewed project is **record-bearing** (Moontrance Creek / Halton Hills resolve
10-48 objectives, `source:'record'`, secondaries in every stratum); operator
chose a durable code fix and then delegated the fix-target call to me ("As a
legendary biodynamics and permaculture and SaaS expert, what are your
thoughts?").

Amanah gate: land-stewardship planning UI; no riba/gharar. Clean.

## Root cause (proven, not assumed)

The resolve -> render pipeline is sound: Halton Hills resolves 48 objectives,
`source:'record'`, with orchard/silvopasture/residential secondaries scattered
~1-5 per stratum. The **Plan** `ObjectiveColumn` already renders secondaries
correctly (S4 shows 5 secondary cards; its "Secondary" filter isolates exactly
those 5 -- screenshot captured pre-compaction). The symptom lived entirely on
the **Act** surface (`ActTierObjectiveRail` inside the Act tier shell): it shows
ONE stratum at a time, and -- unlike the Plan column -- it had NO source badge
and NO source filter. A steward paging through strata saw mostly unlabelled
cards and concluded "no orchard objectives." There is no aggregate cross-stratum
view on either surface.

This is distinct from the no-record / Level-2 wizard bug (a bare `projectType`
string drops secondaries at resolution). That was a real but separate defect;
it has since been fixed by the parallel session in `eb84fafb`
("fix(wizard): treat legacy bare projectType as selected primary + backfill
record"). It does not apply to this record-bearing scenario.

## What shipped -- Act-rail source parity

1. **Provenance badge (`ActTierObjectiveCard`).** The card computes its own
   `getSourceTag(objective)` (the same pure helper the Plan column uses) and
   renders a pill above the domain eyebrow for primary / secondary objectives;
   universal carries no badge (baseline, keeps the rail uncluttered). Label is
   "Secondary - <TypeLabel>" (ASCII hyphen). Styled via new `.objSource` classes
   in `ActTierShell.module.css`: gold-brand for primary, a cool teal
   (`#8fc7d6` on `rgba(111,179,196,...)`) for secondary, so contributed
   enterprise objectives read as a distinct provenance class.
2. **Source filter (`ActTierObjectiveRail`).** Mirrors the Plan
   `ObjectiveColumn` filter: All / Universal / Primary / Secondary pills over
   the stratum's objective list. The bar only renders when the stratum actually
   mixes sources (`sourceKinds.size > 1`); an `effectiveFilter` guard prevents a
   sticky selection from hiding every card after the steward switches to a
   stratum lacking that source; an empty-state message ("No <kind> objectives in
   this stratum") covers a filtered-empty list. The filter is a pure view filter
   -- it never feeds progress, status, or the map markers. Pills styled with the
   Act theme tokens via `.railFilterBar` / `.railFilterPill` (the spine C/F
   tokens do not resolve outside `.olos-spine-root`, so they could not be
   reused).

## Verification

- **Typecheck:** `apps/web` full-package `tsc --noEmit` exit 0 after both the
  card edit (background `bf38xp1re`) and the rail-filter edit (background
  `byb1sa5u4`); no errors in the touched files.
- **Live (localhost :5200, real `preview_eval` DOM-read evidence):** on
  "Halton Hills" Act tier shell -- the badge renders on Act cards (S2 ->
  "Secondary - Orchard / Food Forest"; S4 -> orchard + 3x silvopasture +
  residential secondary badges with correct `data-kind`). The filter bar renders
  all four pills; clicking "Secondary" on a 7-card stratum narrows the list to
  exactly the one secondary card ("Climate & chill-hour fit",
  "Secondary - Orchard / Food Forest"), with the Secondary pill `data-active`.
- **Screenshot:** the badge was screenshot-confirmed pre-compaction (S4 scrolled
  view shows "SECONDARY - SILVOPASTURE" / "SECONDARY - RESIDENTIAL / LIVE-IN"
  labelled cards). For the filter, `preview_screenshot` timed out twice -- the
  documented Act-surface screenshot hang (dead API + map-bearing surface), NOT a
  defect in the change; reported honestly per the verification rule and backed by
  the robust DOM-read evidence above.

## Commit shape / foreign-WIP discipline

Explicit-path commits only (`git add --` the specific file(s); never
`git add -A`). The working tree carried heavy foreign WIP from parallel sessions
(financial engine, `DesignMap`/`DiagnoseMap`/`OperateMap`, many
`plan/strata/*.module.css`, `graphify-out/`, dozens of scratch `_*.txt`,
modified shared wiki pages) -- all left untouched. Mid-session the externally
rebased branch advanced twice and the foreign commit `4e4b9b34` swept my
then-uncommitted rail-filter edits into itself (it `git add`-ed the whole rail
file, which it owns); I verified this against HEAD rather than re-committing,
then shipped only the still-uncommitted `.railFilterBar` CSS as `b6099414`. A
`git checkout HEAD -- <rail>` to isolate hunks was correctly blocked by the
sandbox (would have discarded foreign WIP); I confirmed the work was already
committed instead of forcing it. Clean ownership split confirmed with the
parallel session's own log: they treat `ActTierShell.module.css` and
`ActTierObjectiveCard.tsx` as off-limits (mine) and keep their classes in
`ActTierObjectiveRail.module.css`. Commit-only -- NOT pushed (branch is
force-pushed/rebased externally; push is the operator's call).

## State after

A steward on a record-bearing project can now, on the Act surface, both see
which chosen project type contributed each objective (provenance badge) and
isolate the Secondary objectives (e.g. Orchard / Food Forest, Silvopasture) via
the source filter -- full parity with the Plan `ObjectiveColumn`. The original
"I see no orchard objectives" symptom is resolved for the record-bearing case;
the no-record case is covered separately by `eb84fafb`. ADR not warranted
(contained UI parity; mechanism documented here and on
[[entities/act-tier-shell]]).
