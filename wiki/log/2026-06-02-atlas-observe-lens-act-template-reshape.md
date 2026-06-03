# 2026-06-02 -- Observe lens reshaped onto the Act tier shell (drop the true-zoom)

**Branch:** `feat/atlas-permaculture` (not pushed) · **Commits:** `3a7fdf57`,
`00c3c851`, `bf8ad76c`, `3e1562d6` (4 explicit-path slices)
**ADR:** [[decisions/2026-06-02-atlas-observe-lens-act-template-reshape]] ·
**Entity:** [[entities/observe-dashboard]]

## Ask

Operator: *"reference the tier shell version of Act stage while planning to use
it as a template to format/shape the layout/proportions of the Observe stage
page."* Rebuild the `module-bar` Observe lens on Atlas's real shared `StageShell`
(the chrome Act uses) and drop the CSS true-zoom so it renders at Act's natural
proportions. Three confirmed design gates: reuse the REAL `StageShell`
(`between-rails`) + an `ActTierSpine`-style spine; drop the zoom (rail widths
from StageShell, fonts rebaked to an Act ladder); bottom tray = a new "recent
observations" strip, lens selector in the top spine.

## What landed

- **`3a7fdf57` -- `ObserveLensSpine`** (NEW `lens/ObserveLensSpine.tsx` +
  `.module.css`). Sticky gold-accent project tile + `role="tablist"` of compact
  `.tier` tabs (leading "All" + one per `LENSES`); click ->
  `onSelectLens(isActive ? 'all' : id)`. CSS is a trimmed COPY of the Act spine
  classes (no cross-boundary import); tokens from app `tokens.css`. Sole lens
  selector.
- **`00c3c851` -- `RecentObservationsStrip`** (in `components.tsx`). Scroll-x
  recent-observations strip for the StageShell bottom tray. Filters
  `MOCK_OBSERVATIONS` by `activeLens`, sorts a COPY by a local `ageToHours`
  parser (fixtures never mutated), lens-coloured `TYPE_ICON` cards. Wired to the
  SAME `handleObsClick`/`selectedObs` as the map -> a card click selects the map
  pin AND pops the IntelligencePanel selected block (zero new state). A real
  `noUncheckedIndexedAccess` error on the regex capture (`m[1]`/`m[2]` are
  `string | undefined`) was fixed with a destructure + guard.
- **`bf8ad76c` -- de-zoom rebake + rail-fill + bento cards** (`components.tsx`).
  All inline `fontSize: N` literals remapped onto an Act ladder (smallest chrome
  font ~9-12px); the spiral SVG's in-`viewBox` `fontSize="7"` strings left alone
  (they scale with the box). `CycleTimelineBar vertical` + `IntelligencePanel`
  now fill `width/height:100%`, drop their fixed widths (260/300) and edge
  borders, and each supplies its own bento card surface (mirrors Act's
  `.railPanel`). Spiral SVG made fluid (`width:100%` + retained `viewBox`).
- **`3e1562d6` -- rebuild `ObserveLensDashboard` on StageShell** + NEW
  `ObserveLensDashboard.module.css`. Deleted `Z = 12/7` + both zoom wrappers.
  New root mirrors `ActTierShell`: `.lensShell` -> `TopBar` -> `ObserveLensSpine`
  -> `.shellWrap` -> `<StageShell bottomPlacement="between-rails">` with
  `leftRail = CycleTimelineBar vertical`, `canvas = PseudoMap`,
  `rightRail = IntelligencePanel`, `bottomTray = RecentObservationsStrip`.
  `DomainDetailSlideUp` is a sibling of `.shellWrap` (NOT StageShell `overlay`)
  so it covers TopBar+spine. CSS guard
  `.lensShell :global([data-stage-bottom]){min-width:0}`.

`DomainsView` (incl. its `horizontal` prop), `LensBar`, `DomainsRail` retained
defined-but-unused ([[feedback-no-deletion]]).

## Verification

- `tsc --noEmit` EXIT 0 after every slice (atlas web `lint` IS tsc), output
  redirected to a file -- NOT piped through `head` (a `head` pipe masks the real
  `PIPESTATUS`) -- and grepped for `observe/lens` to isolate my files from
  pre-existing foreign WIP test errors.
- Live (port 5200), both mounts render the identical reshaped component:
  - **debug route** `/v3/prototype/observe-lens`: no `zoom` box; StageShell grid
    `220px / 1fr / 240px` at the <=1200px preview viewport (Act-parity
    responsive widths); rails Cycle 220 / Land intelligence 240; 7 spine tabs;
    clicking the Foundation tab set `aria-selected` + re-filtered the strip
    10 -> 2; clicking the first strip card popped the IntelligencePanel "Selected
    Observation" block; the Domain Detail slide-up, with its animation stripped,
    rests `top:48 / h:944 / transform:none` covering TopBar+spine (its slide-in
    keyframe was frozen at the `from` frame -- `animationPlayState:running,
    opacity:0` -- because the unfocused preview tab throttles CSS animations;
    render artifact, not a layout bug). Smallest HTML chrome font >=9px; the only
    7px text is SVG `viewBox` `<text>` (scales with the box). No console errors.
  - **module-bar project route** (`/v3/project/<id>/observe`, toggled via
    `ObserveShellToggle`): `lensShell` mounted, 7 tabs, 0 zoom boxes, StageShell
    grid `220px / 671px / 240px`, bottom tray present, shell `left:0`. The 28px
    to the viewport edge is the module-bar's own decision rail
    (`gridCols: "1163px 28px 0px"`), not a lens gutter. `ObserveShellToggle`
    round-trips module-bar -> dashboard (lensShell removed).
- `preview_screenshot` timed out (the known transient hang, [[project-screenshot-hang]])
  -- did NOT claim visual success; proof is DOM / `getComputedStyle`.
- Regression: `git status` clean under `observe/dashboard/**`; `ObserveLayout.tsx`
  untouched; `DomainsView`/`LensBar`/`DomainsRail` still exported.

## Discipline notes

- Bash tool here is git-bash, not PowerShell -- commit messages written to a temp
  `_commitmsg_*.txt` and applied with `git commit -F`, then removed.
- My own helper `_rebake_fonts.py` removed at session close. (Many foreign
  `_*.py`/`_*.txt` scratch files already pollute the working tree -- left
  untouched.)
- Not pushed ([[project-branch-rebase]]); explicit-path staging; CSRA untouched
  ([[fiqh-csra-erased-2026-05-04]]); ASCII-only.
- **Wiki left uncommitted** at session close, matching the existing accumulated
  state (7 modified + several untracked observe-lens wiki files from the prior
  promotion/fill-restructure sessions were already uncommitted in the tree).
