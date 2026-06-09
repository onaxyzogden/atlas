# ADR: OLOS UI/UX trust copy -- central copy module + 10 mentor-register rewords

**Date:** 2026-06-09
**Status: accepted**

## Context

`OLOS_UIUX_Suggestions.md` (operator brief, theme "This Thinks The Way I
Think") proposed 10 changes to make the v3 Plan -> Act -> Observe tier system
read like a land-stewardship mentor rather than project-management software.
The thesis: trust is earned in small moments where copy correctly anticipates
what the steward already knows about their land.

Exploration established three facts that shaped the approach:

1. **User-facing copy was inline JSX with no central home** -- strings scattered
   across `v3/plan`, `v3/act`, `v3/observe`. The brief assumed a "terminology
   spec" existed; it did not.
2. **Suggestion 4's plumbing already existed** -- `fieldActionStore`
   `markSubmitted` / `markVerified` already emit an Observe feed entry via
   `appendObserveFeedFor`. The gap was *visible reflection*, not data flow.
3. **Suggestions 6 and 10 carry a heavy data tail** (terrain auto-detection;
   future-cycle metric callbacks) explicitly out of scope this pass.

**Operator-locked scope:** (1) all 10 suggestions; (2) depth = "copy + light
wiring" -- DEFER genuinely new data work; (3) structure = EXTRACT user-facing
copy into a central copy module.

## Decision

**New module `apps/web/src/v3/copy/`** -- per-surface files behind a barrel
(`index.ts` / `plan.ts` / `act.ts` / `observe.ts` / `shared.ts` + `__tests__/`).
It lives in **`apps/web`, NOT `packages/shared`** -- it is React-surface chrome;
`packages/shared` stays UI-string-free. Static strings -> frozen `const`
objects (mirrors the existing `HEADLINE` / `STATUS_LABEL` idiom); parameterized
copy -> pure, store-free, unit-testable functions
(`revisionHeadline(priority, cycleTitle?)`, `revisionSupporting({...})`,
`domainUnansweredQuestion(domain)`, `feedsFallback(names)`,
`observeSignalConfirmation(domainLabel|null)`, `decisionCount(done,total)`).

**Per-suggestion landing:** (1) language audit -> static strings moved to the
module, reworded to land vocabulary; (2) first-Plan-entry sequence line; (3)
concrete "feeds into" consequences via the `feedsFallback` chrome template
(authored per-item `feedHint`/`feedNote` stay in seed); (4) first verified Act
task -> visible Observe-signal confirmation reading the existing `feedKey` (no
new feed plumbing); (5) mentor-register locked-tier popover; (6) site-survey
unlock line (copy variants land; selection wired only where a signal is one hop
away); (7) philosophical post-divergence in-sheet confirmation; (8) per-domain
Observe empty-state question (`DOMAIN_QUESTION` Record exhaustive over all 16
`UniversalDomain`s, compiler- + test-enforced) on the one card-shaped surface
with room; the 5 compact "Not yet observed" label cells got the short land
reword `OBSERVE_COPY.notYetRead` ("Not yet read"); (9) ecological
revision-banner framing ("The land is asking you to look again"); (10)
cycle-name echo (functions accept a cycle title, called with `null` where not
in scope).

## Scope held

- **Seed-data boundary NOT crossed.** Structural ids (`feedsInto`) and authored
  per-item captions (`feedHint`, `feedNote`) stay in
  `packages/shared/src/constants/plan/`; only chrome templates (the
  `"Feeds {names}"` fallback) moved to the copy module. Moving authored content
  would duplicate the seed and create two sources of truth.
- **String discipline:** double-quoted TS literals (apostrophes need no
  escaping), ASCII-only; arrows/icons stay in JSX, never in copy strings.

## Deferred (recorded, not skipped)

- **Suggestion 6:** terrain auto-detection / site-analysis -- copy variants
  exist; `'default'` selected (no site signal one hop away at the shell).
- **Suggestion 10:** future-cycle metric references ("infiltration improved by
  12mm/hr"); cycle title is not in scope at `PlanRevisionBanner` (summary lacks
  it) nor `DomainStatusCard` (props lack it) -> passed `null`, functions no-op.
- **Suggestion 4:** navigation into Observe / live cross-surface highlight
  beyond the confirmation copy.

## Verified

Web `tsc` EXIT 0 (8GB heap; the `typecheck` script adds
`--max-old-space-size=8192` -- raw `tsc --noEmit` OOMs ~3.5GB). Bounded
`--pool=forks` suites ([[feedback-vitest-bounded-runs]]): copy-module pure
functions incl. the 16-domain exhaustiveness guard + null-cycle graceful
omission; Phase-2 `DecisionWorkingPanel` (55) + `fieldActionStore.observeWiring`
(6); Phase-3 Observe/copy (264); full suite 4354 pass / 1 pre-existing fail.
DecisionWorkingPanel preview screenshot confirmed the Act copy live
("WORKING ON", "Capture this decision in your own words.", "Feeds Observe:...",
"WHY THESE? (optional)", "Record this decision", "Not ready -- needs more
observation"). The Observe dashboard could NOT be live-previewed (dead dev API
on :3000, no project in localStorage, `/v3` 404) -- verified via typecheck +
tests instead, reported honestly per CLAUDE.md (no screenshot, no claim).

## Branch note

On `main` (canonical; the Phase 1+2 structured-capture delta was merged
out-of-band `763415ee`). All copy work committed/working on `main`; **nothing
pushed** -- pushing/committing on `main` requires an explicit operator ask
([[project-structured-capture-on-main]], [[project-branch-rebase]]).

A concurrent session was building Phase-3a S2 land-reading captures into the
SAME three contended wiring files (`DecisionWorkingPanel` /
`ActTierZeroWorkbench` / `DecisionList`); they hunk-staged around this session's
`copy/` WIP (see [[log/2026-06-09-atlas-act-tier0-phase3a-land-reading]]).

**Pre-existing out-of-band failure flagged (not mine, not fixed):**
`workbenchAffordances.test.ts` expects `ev-s1-legal-governance` `showGroups`
false but HEAD source has it `true` -- confirmed via `git show HEAD` it is not
in this session's change surface; would require an ask to touch.

## Consequences

- A future language audit has ONE auditable home; reword = edit one module, not
  a JSX grep across three surfaces.
- Tests assert against copy-module constants, never rendered literals, so copy
  changes touch one place.
- The `apps/web` vs `packages/shared` split is now a documented rule: shared
  stays UI-string-free.

## Amanah

Pure land-stewardship copy reword -- no capital, sales-channel, advance-purchase
or financing framing touched; no riba / gharar / `bay' ma laysa 'indak`; no CSRA
/ salam ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).
Cleared without Scholar-Council routing.

Log: [[log/2026-06-09-olos-uiux-copy-module]]; entities
[[entities/act-tier-shell]], [[entities/observe-dashboard]].
