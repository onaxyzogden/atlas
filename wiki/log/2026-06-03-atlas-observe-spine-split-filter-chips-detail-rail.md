# 2026-06-03 -- Observe spine: split into top filter chips + bottom detail rail

**Branch:** `feat/atlas-permaculture` (explicit-path commit `7725cf94`, 5 files;
**not pushed**). Follow-up to the same day's spine enrich + slide-up restore
[[log/2026-06-03-atlas-observe-spine-detail-slideup-restore]].

## What

The enriched `ObserveLensSpine` tabs (from `77a6c256`) carried two jobs in one
top-bar place: each `.tier` tab both **filtered** and, via a sibling
"View all observations ->" button, **opened the `DomainDetailSlideUp`**. Operator
asked to split these into two surfaces: keep a minimal filter chip up top, move
the rich card content + slide-up trigger down into a horizontal rail "that fits
between the two left and right sidebars".

## Scope (operator gates, via AskUserQuestion)

- Bottom-card click = **whole card opens the slide-up** (no separate trigger
  button required for the action).
- Top chip content = **icon + label + freshness dot** (drop meta/divergence/
  summary from the top bar).
- Bottom rail scope = **all 7 incl. "All lenses"** -- the "All lenses" card was
  to clear the filter (it has no detail pane).

### Mid-execution operator amendments

After live review of the first cut, two follow-up tweaks:

- **Remove the "All lenses" card** from the bottom rail (filter reset already
  lives in the top "All lenses" chip; the rail is now detail-only, 6 cards).
- **Make "View all observations" read as a separate button again** (like the old
  `.tierDetail`): the CTA is restyled as a bordered, tinted pill. It stays a
  `<span>` (not a nested `<button>`) so the whole-card click still drives the
  slide-up -- no nested-interactive DOM.

## Landed (5 files)

- **`ObserveLensSpine.tsx` / `.module.css`** -- trimmed to a minimal filter-chip
  bar. Dropped the `onOpenDetail` prop; props are now `{ activeLens,
  onSelectLens, projectTitle }`. Each lens chip renders only the colored icon,
  `.tierTitle` label, and `.tierDot` freshness dot; `.tier` is restyled as a
  compact horizontal pill (`border-radius:999px`). Removed `.tierWrap`,
  `.tierMeta`, `.tierDivergence`, `.tierSummary`, `.tierDetail*`, and the
  invisible height-parity clone. Kept the sticky project-identity tile +
  `role=tablist` + gold `data-active` + re-click-resets-to-`all`.
- **`ObserveLensDetailRail.tsx` / `.module.css`** (NEW) -- horizontal
  `overflow-x:auto` rail of one rich card per lens (6 cards; no "All lenses").
  Each card is a single `<button>` (whole-card trigger) carrying icon +
  freshness dot + title + meta (`{observations} obs · {lastObserved}`) + amber
  `▲ Divergence` badge + 2-line-clamped summary + a button-styled
  "View all observations ->" CTA (`.hint`: tinted pill, `currentColor` border at
  the lens hue). Click opens that lens's slide-up via `onOpenDetail`; `data-active`
  highlights the active lens (gold). No nested buttons.
- **`ObserveLensDashboard.tsx`** -- imports `ObserveLensDetailRail`; drops
  `onOpenDetail` from the spine; passes
  `bottomTray={<ObserveLensDetailRail activeLens onSelectLens={handleLensChange}
  onOpenDetail={setDetailLens} />}` to the existing
  `<StageShell bottomPlacement="between-rails">`. The `detailLens` state +
  `DomainDetailSlideUp` sibling overlay and the right-rail IntelligencePanel /
  RecentObservationsStrip footer are unchanged; the rail is just a new caller of
  `setDetailLens`.

## Verified

- **Typecheck:** `tsc --noEmit` from `apps/web` -> EXIT 0 (grep `observe/lens`
  clean), re-run clean after the two amendments.
- **Live DOM (real Vite :5200, `preview_eval`/`preview_screenshot`), module-bar
  `/v3/project/<id>/observe`:** top bar = 7 compact filter chips (icon + label +
  dot, no meta/summary/detail button); bottom rail sits in the `.center` column
  under the canvas, between the full-height rails, = 6 rich cards (Foundation,
  Climate, Water, Living Systems, Human Systems, Infrastructure; no "All lenses").
  Each card carries the button-styled "View all observations ->" CTA;
  `nestedButtons: 0`. A whole-card click opens the `DomainDetailSlideUp`
  (slideUpPresent true after clicking Foundation). Console clean of React/
  nested-button warnings (only the known dead-API AI/sync noise).
- **Screenshot:** captured successfully this session (renderer responsive) --
  confirms the top chip row + the bottom card rail with the pill CTAs and the
  "All lenses" card removed.

## Discipline

Explicit-path commit on the externally-rebased branch (heavy foreign WIP left
untouched; not pushed -- [[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]]); `DomainsView`/`DomainsRail`/
`LensBar`/`TopBar` retained exported and the IntelligencePanel "Domain Detail ->"
trigger kept (no-deletion, [[feedback-no-deletion]]); StageShell unchanged (reused
its `bottomTray`/`between-rails` slot); mock-backed scope held; CSRA model
untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only. No ADR -- this is a UI
affordance restructure, no architectural change.

Entity [[entities/observe-dashboard]]; predecessor
[[log/2026-06-03-atlas-observe-spine-detail-slideup-restore]].
