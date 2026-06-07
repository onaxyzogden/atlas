# 2026-06-03 -- Observe lens: recent-obs into right rail + Observe self-railed

**Branch:** `feat/atlas-permaculture` (two explicit-path commits, **not pushed**):
`bbc0a07e` (right-rail merge, 2 files) and `10d45335` (self-rail Observe, 2
files). Follow-up to the StageShell rebuild
[[log/2026-06-02-atlas-observe-lens-act-template-reshape]] and the TopBar/legend
refinements that preceded this session.

## What

Two refinements from the operator's live review of the reshaped module-bar
Observe lens (now on the real `StageShell`, on
`/v3/project/<id>/observe`):

1. **Move Recent Observations into the right sidebar.** Was: `IntelligencePanel`
   in the right rail + horizontal `RecentObservationsStrip` in the StageShell
   bottom tray. Now: Land Intelligence on top, Recent Observations as a vertical
   list beneath it, sharing one scroll; bottom tray removed; map canvas taller.
2. **Remove the expandable "Site Intelligence" panel.** This was NOT the lens --
   it was the outer `LandOsShell` collapsible rail (`DecisionRail` ->
   `StagePanel('observe')` -> `ObserveSiteIntelligenceRail` ->
   `SiteIntelligencePanel`, "Draw a property boundary to fetch site data").
   Removed for the whole Observe stage by making Observe self-railed like
   Plan/Act.

## Scope (operator gates, via AskUserQuestion)

- Right rail layout = **stack: Intelligence on top, Recent Observations vertical
  list below, one shared scroll**.
- Site Intelligence removal scope = **whole Observe stage** (Observe becomes a
  self-railed peer of Plan/Act).

## Landed (4 files, 2 slices)

### Slice 1 -- right-rail merge (`bbc0a07e`)
- **`components.tsx`** -- `IntelligencePanel` gains optional `footer?: ReactNode`,
  rendered INSIDE its single scroll body (the `flex:1; overflowY:auto` div) after
  the active view, so Land Intelligence and the recent list share one overflow
  ancestor. `RecentObservationsStrip` gains `vertical?: boolean`: no outer bento
  card, a `borderTop` divider, the header row, and a vertical column of
  full-width cards (`flexDirection:column`, cards `width:100%`, no `overflowX`).
  Default horizontal strip path byte-unchanged (no-deletion). Added
  `type ReactNode` import.
- **`ObserveLensDashboard.tsx`** -- right rail = `IntelligencePanel` with the
  vertical `RecentObservationsStrip` as `footer`; `bottomTray` slot dropped
  (`bottomPlacement="between-rails"` kept, harmless). Header comment updated
  (three slots, not four).

### Slice 2 -- self-rail Observe (`10d45335`)
- **`V3ProjectLayout.tsx`** + **`DecisionRail.tsx`** -- added `"observe"` to both
  `SELF_RAILED_STAGES` declarations. Effect: every Observe mode gets
  `<LandOsShell rail={undefined}>` (no outer collapsible rail, no 28px colEdge);
  `DecisionRail` also returns `null` for observe. `ObserveSiteIntelligenceRail` /
  `SiteIntelligencePanel` left exported and still mounted by the dashboard/legacy
  surfaces' own rails (no-deletion).

## Verified

- **Typecheck:** `tsc --noEmit` from `apps/web` -> EXIT 0 after each slice.
- **Live DOM (real Vite :5200, `preview_eval`), module-bar
  `/v3/project/mtc/observe`:** outer Site Intelligence rail GONE (0 asides
  matching "Site Intelligence"); single "Recent observations" header (no
  duplicate tray); recent list is a `flexDirection:column` of 10 full-width cards
  (204px in a 228px container, no `overflowX`); Intelligence + recent list share
  ONE `overflowY:auto` ancestor. Interactions intact: a recent card click
  highlights it (border `rgba(74,130,164,0.44)`, bg `...0.08`) and grows the
  Intelligence scroll body (selected-observation block, 774 -> 832 chars); a
  spine lens click (Climate) filtered the list 10 -> 1.
- **Debug route `/v3/prototype/observe-lens`:** same right-rail stack (header,
  shared scroll, column of 10 cards, Intelligence shares scroll) -- both mounts
  identical.
- **Console:** only the known dead-API `[SYNC]` ECONNREFUSED noise; no React
  render errors from the lens.
- **Screenshot:** `preview_screenshot` hung twice (30s each) -- the known
  transient dead-renderer hang [[project-screenshot-hang]]; disclosed, relied on
  DOM/`getComputedStyle` proof, did NOT claim visual success.

## Discipline

Explicit-path commits on the externally-rebased branch (heavy foreign WIP left
untouched; not pushed -- [[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]]); horizontal
`RecentObservationsStrip` path, `ObserveSiteIntelligenceRail`,
`SiteIntelligencePanel`, `TopBar` all retained exported ([[feedback-no-deletion]]);
mock-backed scope held; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]);
ASCII-only.

Entity [[entities/observe-dashboard]]; predecessor
[[log/2026-06-02-atlas-observe-lens-act-template-reshape]].
