# 2026-06-03 -- Observe spine: restore tab detail + slide-up trigger

**Branch:** `feat/atlas-permaculture` (explicit-path commit `77a6c256`, 3 files;
**not pushed**). Follow-up to the same day's right-rail merge
[[log/2026-06-03-atlas-observe-lens-right-rail-merge-self-railed]].

## What

Operator review of the module-bar lens: the compact `ObserveLensSpine` tabs had
lost two things the old `DomainsView` cards carried -- (1) richer per-lens detail
and (2) a direct trigger for the `DomainDetailSlideUp` pane (which, post-reshape,
was only reachable by filtering a lens then clicking "Domain Detail ->" in the
right IntelligencePanel). Operator: "bring back both."

## Scope (operator gates, via AskUserQuestion)

- Restore approach = **enrich the existing spine tabs** (keep the project
  identity tile + act-parity tablist); do NOT revert to the `DomainsView` strip.
- Slide-up trigger = **separate "View all observations ->" affordance** (main tab
  click keeps filtering; the link opens the pane) -- faithful to the old
  two-action `DomainsView` card.

## Landed (3 files)

- **`ObserveLensSpine.tsx`** -- new prop `onOpenDetail: (lensId: ObserveLensId)`.
  Each lens tab restructured into a `.tierWrap` div holding the existing
  `role="tab"` filter button + an optional SIBLING "View all observations ->"
  button (no nested `<button>`s). Tab body gains: meta `· {lastObserved}`, a
  `▲ Divergence` badge (`C.amber`) when `lens.divergence`, and a 2-line-clamped
  `lens.summary` (70-char truncation). The detail button renders only when
  `DOMAIN_DETAIL[lens.id]` exists, styled with `lens.color` (`+'0A'` bg, `+'30'`
  border, `color`), bottom-radius, `borderTop:none` -- and the tab's bottom
  corners are squared so the two visually connect (the old card pairing). The
  "All lenses" tab is wrapped for flex parity but has no detail/summary. Imports
  added: `DOMAIN_DETAIL`, `C`, type `ObserveLensId`.
- **`ObserveLensSpine.module.css`** -- `flex:1 1 0; min-width:116px` moved from
  `.tier` to new `.tierWrap` (column); `.tier` now `width:100%`. Added
  `.tierDivergence`, `.tierSummary` (`-webkit-line-clamp:2`), and `.tierDetail`
  (full-width, top divider, bottom radius, `focus-visible`).
- **`ObserveLensDashboard.tsx`** -- pass `onOpenDetail={setDetailLens}` to the
  spine. The `detailLens` state + `DomainDetailSlideUp` mount already existed
  (also fed by IntelligencePanel); the spine is simply a second caller. The
  IntelligencePanel "Domain Detail ->" path is left intact (additive).

## Verified

- **Typecheck:** `tsc --noEmit` from `apps/web` -> EXIT 0 (grep `observe/lens`
  clean).
- **Live DOM (real Vite :5200, `preview_eval`), module-bar
  `/v3/project/mtc/observe`:** 7 tabs; each lens tab shows obs `· last-observed`,
  Water shows `▲ Divergence`, 5 of 6 lenses show a summary (Infrastructure has
  none in the mock), all 6 lens tabs show "View all observations ->" while the
  "All lenses" tab does not. Clicking "View all observations ->" mounts the
  `DomainDetailSlideUp` (944px overlay with "View Timeline"); Back dismisses it.
  Main-click on a tab still filters (active tab + recent list 10 -> 1 for
  Climate). No `validateDOMNesting`/nested-button warning in the console (only
  the known dead-API AI/telemetry noise). Computed-style proof: the detail button
  connects to the squared tab bottom (both 137px wide, top radius 0, bottom
  radius 8px, `border-top:0`) and renders in the Water lens colour
  `rgb(74,130,164)`.
- **Debug route `/v3/prototype/observe-lens`:** identical -- 7 tabs, 6 detail
  buttons, 5 summaries, 1 divergence, slide-up opens. Both mounts identical.
- **Screenshot:** `preview_screenshot` hung (30s, twice) -- the known transient
  dead-renderer hang [[project-screenshot-hang]]; disclosed, relied on
  DOM/`getComputedStyle` proof, did NOT claim visual success.

## Discipline

Explicit-path commit on the externally-rebased branch (heavy foreign WIP left
untouched; not pushed -- [[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]]); `DomainsView`/`DomainsRail`/
`LensBar`/`TopBar` retained exported and the IntelligencePanel trigger kept
(no-deletion, [[feedback-no-deletion]]); mock-backed scope held; CSRA model
untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only.

Entity [[entities/observe-dashboard]]; predecessor
[[log/2026-06-03-atlas-observe-lens-right-rail-merge-self-railed]].
