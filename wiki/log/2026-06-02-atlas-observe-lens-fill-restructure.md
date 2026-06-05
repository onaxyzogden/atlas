# 2026-06-02 -- Observe lens: fix viewport fill + restructure chrome

**Branch:** `feat/atlas-permaculture` (explicit-path commit `bcb0ea2b`, 3 files;
**not pushed**). Follow-up to the same day's promotion
[[log/2026-06-02-atlas-observe-lens-promotion-truezoom]] (`f7e164f2`).

## What

Operator review of the promoted module-bar lens reported it rendered confined to
a sub-viewport box (`C.bg` gutters right + bottom) and asked to rearrange the
chrome: `CycleTimelineBar` -> left sidebar, `DomainsView` -> horizontal top bar,
remove `LensBar`. Both addressed, mock-backed, dashboard shell byte-untouched.

## Scope (operator gates)

AskUserQuestion answers fixed the layout: left sidebar = **full, always-
expanded**; top bar = **rich cards, horizontally scrollable**; right
`IntelligencePanel` = **kept unchanged** (300px). Standing constraint: **no live
data**; keep the true-zoom (min source font 7px -> 12px painted).

## Landed (3 files)

- **`ObserveLensDashboard.tsx`** -- zoom box `width/height: calc(100%/Z)` ->
  `width/height: 100%` (the calc assumed the older zoom-scales-the-box Chromium
  semantics and confined the UI to ~58%; this engine fills the percentage box
  and zoom only magnifies internal lengths). Root JSX restructured: removed
  `<LensBar/>`; added a horizontal `<DomainsView horizontal/>` strip under
  `TopBar`; replaced the left `<DomainsRail/>` with `<CycleTimelineBar vertical/>`
  as the first body child. Imports swapped `DomainsRail`/`LensBar` -> `DomainsView`.
- **`components.tsx`** -- `DomainsView` now `export`, gains `horizontal?` (scroll-x
  row of `width:240` cards; header hidden in horizontal). `CycleTimelineBar`
  gains `vertical?` (260px always-expanded left column: cycle header, full
  spiral, Now/Observe callout, signals; spiral + signals extracted to
  `spiralDiagram`/`cycleSignals` consts reused by both orientations). Added
  `type CSSProperties` import. `LensBar`/`DomainsRail` left defined-but-unused
  (no-deletion).
- **`ObserveLayout.tsx`** -- `module-bar` branch drops `StageShell` for a
  full-bleed `position:absolute; inset:0` container (`ObserveLensDashboard` +
  floating `ObserveShellToggle`); the `StageShell` grid/flex context was a
  second confinement source. `ObserveDualShellLayoutLegacy` byte-untouched.

## Verified

- **Typecheck:** `node --max-old-space-size=8192
  ../../node_modules/typescript/bin/tsc --noEmit` from `apps/web` -> EXIT 0.
- **Live DOM (real Vite :5200, `preview_eval`), module-bar project
  (`/v3/project/.../observe`):** after a full reload (source truth, not an eval
  mutation) -- zoom box rect 1266x916 fills the outlet; **0 `C.bg`
  (rgb(15,15,13)) gutter hits across 75 edge samples** (full midline + vertical
  centerline); min source font 7px -> 12px painted; `lensBarPillRowFound:false`;
  8 "View all observations" deep-links present; left rail = CycleTimelineBar
  (CYCLE 1 / spiral / Now-Observe-active), center = PseudoMap rect, right =
  IntelligencePanel (Plan Review Required / Millbrook stats).
- **Selection:** read `ObserveLensDashboard`'s `activeLens` hook from the React
  fiber -- a top-bar card click moved it `all` -> `climate`. (Re-click-to-`all`
  is the same unmodified ternary; synthetic clicks on nested card nodes were
  unreliable to target, but the primary path is proven.)
- **Screenshot captured** (after two transient `preview_screenshot` timeouts,
  disclosed; succeeded on retry post-reload): full-bleed lens, Foundation/
  Climate/Water rich cards on top, vertical cycle rail with spiral on the left,
  PseudoMap center, IntelligencePanel right, no pill row.
- **Regression:** `git status --short -- apps/web/src/v3/observe/dashboard/`
  empty -> dashboard shell byte-unchanged. Per-file diffs audited: only my
  intended hunks, no foreign hunks. Staged set == exactly my 3 files.

## Discipline

Explicit-path commit on the externally-rebased branch (upstream 33 behind, 0
ahead at commit time; fetched first); heavy foreign WIP in the working tree left
untouched; not pushed ([[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]]); `LensBar`/`DomainsRail`
retained though unused ([[feedback-no-deletion]]); mock-backed scope held; CSRA
model untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only.

ADR [[decisions/2026-06-02-atlas-observe-lens-fill-restructure]]; predecessor
[[log/2026-06-02-atlas-observe-lens-promotion-truezoom]]; entity
[[entities/observe-dashboard]].
