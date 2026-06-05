# 2026-05-29 -- Plan Tier Spine: focusedQuestion in place of card titles + remove redundant route-echo pill and tier header

Steward reviewed the Plan Tier Spine (screenshot + saved HTML) and asked for two
related card-surface cleanups, shipped as two explicit-path commits in one session
arc. Both are presentation-only follow-ups to
[[decisions/2026-05-27-atlas-plan-tier-shell-phase1]] (Slice 1.5/1.6), siblings to
the same week's [[log/2026-05-29-plan-tier-detail-panel-hide-empty-map]] and
[[log/2026-05-29-plan-tier-shell-detail-panel-1-1-2]] shell tweaks.

## Change A -- remove two redundant elements (`11c9ecee`)

4 files in `apps/web/src/v3/plan/tiers/`:

- `PlanTierShell.tsx` / `.module.css` -- deleted the route-echo breadcrumb pill
  (`<p data-testid="plan-tier-route-echo">`) and its orphaned `.routeEcho` rule.
  It duplicated the objective title already shown in the detail panel.
- `ObjectiveColumn.tsx` / `.module.css` -- deleted the tier `<header>` (Tier N /
  title / summary) and its orphaned `.header` / `.eyebrow` / `.title` / `.summary`
  rules. It repeated tier identity the left spine (`TierSpine`) already carries.
  Removed in all column modes (2- and 3-column) per steward AskUserQuestion
  ("remove everywhere"). The `tier` prop stays referenced (`tier.id` filter,
  `tier.title` aria-label), so no unused binding.

## Change B -- focusedQuestion in place of title on cards (`6bc75f64`)

Each `PlanTierObjective` carries both a terse `title` and an inviting
`focusedQuestion` (`packages/shared/src/constants/plan/tierObjectives.ts`). The
steward wants the question to occupy the headline slot on the card surfaces.
Scope confirmed via AskUserQuestion ("Both card types"):

- `NextUpCard.tsx` / `.module.css` -- `focusedQuestion` now renders in the
  `.title` h3; the separate `.question` element and its CSS rule are gone.
- `ObjectiveCard.tsx` / `.module.css` -- same swap in the compact body span; the
  `.question` element + rule are gone, and its single-line ellipsis clamp
  (`-webkit-line-clamp: 1`) is ported onto `.title` so the longer question stays
  one tidy line in the compact row.
- aria-labels deliberately KEEP the short `title` (concise, stable screen-reader
  identifier; the long question makes a noisier SR announcement).

## Out of scope (intentional)

- `ObjectiveHeader.tsx` (detail-panel header) UNCHANGED -- still shows the title
  (h1) plus its question, matching the steward's mockup where the panel reads
  "Set zones and sectors". Header explicitly excluded from the "both card types"
  scope.
- Objective data model, routing, stores, schema, seeds -- untouched.
- `TierSpine` keeps tier name/number (the surviving tier-identity surface).

## Verification

`cd apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` -> exit 0
(this IS the web `lint` script; `noUnusedLocals` would catch any orphaned binding),
with all 8 files restored. Live `preview_eval` against project `d2708c91`:

- NextUpCard (`t1-land-reading`): h3 text == the objective's focusedQuestion;
  no `.question` element; aria-label retains the title.
- ObjectiveCard (`t0-project-foundation`, both objectives): headline span ==
  focusedQuestion; computed `-webkit-line-clamp: 1` confirmed; no `.question`.
- ObjectiveHeader (`t1` + `t3-zones-sectors`): h1 still the title ("Read the land
  baseline...", "Set zones and sectors"); question line retained.
- Carried-over Change A re-confirmed on both views: route-echo pill absent
  (`routeEchoPresent: false`), ObjectiveColumn `<header>` absent
  (`columnHasHeader: false`).

Screenshot **not captured** -- the preview tab was backgrounded this session
(`document.hidden === true`), which pauses paint and times `preview_screenshot`
out at 30s (same hidden-tab limitation noted in the sibling column-width entry).
Verification rests on the DOM assertions above; a visual can be captured once the
steward focuses the preview tab.

## Branch state

`feat/atlas-permaculture`. Two explicit-path commits (`11c9ecee`, `6bc75f64`) of
exactly the 8 plan-tier files; this log detail file + the `log.md` pointer land in
a third wiki commit. `git fetch origin` divergence probe before any push per
[[feedback-commit-immediately-on-rebased-branches]] -- no divergence (origin at
`78256b7c`); local is ahead by the two parallel-session sub-slice commits
(`528c70c8`, `c1830618` -- per-type objective schema / projectType backfill) plus
these. Heavy foreign WIP from parallel sessions (fieldActionStore, financialStore,
capitalPartnerSummary, DesignMap / DiagnoseMap / OperateMap, MaterialSubstitutions,
graphify-out/*, etc.) left uncommitted per [[feedback-no-deletion]]. No ADR -- a
presentation-only copy/visibility tweak, too narrow for a standalone record
(precedent: the sibling 05-29 shell entries shipped without ADRs); the Phase 1 ADR
remains canonical for Slice 1.5/1.6 rationale. CSRA model untouched; ASCII-only copy.
