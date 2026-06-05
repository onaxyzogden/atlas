# Observe lens -- reshape onto the Act tier shell (drop the true-zoom)

**Date:** 2026-06-02
**Status:** accepted
**Branch:** `feat/atlas-permaculture` (not pushed)
**Supersedes (in part):** [[decisions/2026-06-02-atlas-observe-lens-fill-restructure]]
(its full-bleed `absolute; inset:0` mount and its whole-UI true-zoom are both
reversed here)
**Builds on:** [[decisions/2026-06-02-atlas-observe-lens-module-bar-promotion]]
**Entity:** [[entities/observe-dashboard]]
**Log:** [[log/2026-06-02-atlas-observe-lens-act-template-reshape]]

## Context

Operator ask, verbatim: *"reference the tier shell version of Act stage while
planning to use it as a template to format/shape the layout/proportions of the
Observe stage page."*

After the promotion (`f7e164f2`) and the fill fix (`bcb0ea2b`), the `module-bar`
Observe lens rendered as a single self-contained component inside a CSS
`zoom: 12/7 (~1.714x)` box: `TopBar` -> horizontal `DomainsView` lens strip ->
flex body (`CycleTimelineBar` 260 | `PseudoMap` 1fr | `IntelligencePanel` 300).
Every source px was authored tiny (smallest font 7px) and magnified at paint. It
was NOT built on Atlas's shared stage chrome, so it did not inherit Act's grid,
gaps, responsive rail widths, tokens, or floating-card aesthetic.

The **Act tier shell** (`apps/web/src/v3/act/tier-shell/ActTierShell.tsx`) is the
template: outer `.tierShell` (flex column, `height:100%`) -> `<ActTierSpine/>`
(`flex:0 0 auto`) -> `.shellWrap` (`flex:1 1 auto; min-height/min-width:0`)
wrapping `<StageShell bottomPlacement="between-rails">`, with the modal a sibling
after `.shellWrap`.

## Decisions

Three confirmed via AskUserQuestion during planning:

1. **Reuse the REAL `StageShell`** (`apps/web/src/v3/_shell/StageShell.tsx`,
   `bottomPlacement="between-rails"`) + an `ActTierSpine`-style spine row --
   literally share Act's chrome, not a look-alike. No edits to StageShell.
2. **Drop the zoom.** Render at Act's real proportions: rail widths come from
   StageShell (240/260 desktop, responsive 220/240 @<=1200, 200/220 @<=1000,
   both rails hidden @<=820); the 7px-era font literals are rebaked onto an
   Act-aligned ladder. This reverses the true-zoom decision of the prior two
   ADRs.
3. **Bottom tray = a new "recent observations" strip** (Observe has no tools);
   the lens selector moves into the top spine.

### Load-bearing facts that shaped the build

- StageShell **rails draw no surface** -- `.left`/`.right` are bare flex
  containers with `> * { flex:1 1 auto; min-width:0 }`. So rail content MUST be
  `width:100%` (a fixed `width:260` + `flexShrink:0` fights the grid) and MUST
  supply its own bento card (surface/border/radius), mirroring Act's
  `.railPanel`. Applied to `CycleTimelineBar vertical` and `IntelligencePanel`.
- StageShell's `overlay` slot renders inside `.layout`'s 8px padding -- too
  inset to cover the TopBar/spine. So `DomainDetailSlideUp` is mounted as a
  **sibling** of `.shellWrap` under a `position:relative` `.lensShell`, where its
  `absolute; inset:0` covers the whole surface (matches Act's sibling-modal
  pattern and today's full-bleed slide-up).
- The de-zoom rebake touched ONLY inline `fontSize: N` literals. SVG attribute
  `fontSize="N"` strings live in `viewBox` coordinate space and scale with the
  box -- bumping them would double-scale, so they were left alone. The
  `RecentObservationsStrip` was authored fresh at de-zoomed sizes and excluded.
- Both mounts (`/v3/prototype/observe-lens` debug route AND the `module-bar`
  project branch) render the SAME `ObserveLensDashboard`, so keeping ALL shell
  composition inside that component keeps the two mounts identical;
  `ObserveLayout.tsx` is untouched.

## Implementation (4 explicit-path commits)

| Commit | What |
|---|---|
| `3a7fdf57` | NEW `ObserveLensSpine.tsx` + `.module.css` -- ActTierSpine-style lens-tab spine (copied Act spine classes; sole lens selector). |
| `00c3c851` | `RecentObservationsStrip` in `components.tsx` -- scroll-x recent-obs bottom tray; `ageToHours` parser sorts a fixture COPY; wired to shared `handleObsClick`/`selectedObs`. |
| `bf8ad76c` | De-zoom rebake (fonts -> Act ladder), rail-fill 100% + own bento cards, fluid spiral SVG. |
| `3e1562d6` | Rebuild `ObserveLensDashboard` on StageShell(between-rails) + NEW `ObserveLensDashboard.module.css` (`.lensShell`/`.shellWrap` + `[data-stage-bottom]` min-width guard); delete `Z` + both zoom wrappers; sibling slide-up. |

`DomainsView` (incl. its `horizontal` prop), `LensBar`, `DomainsRail` left
defined-but-unused ([[feedback-no-deletion]]).

## Verification

- `tsc --noEmit` (atlas web `lint` IS tsc -- no ESLint) EXIT 0 after each slice,
  output filtered to `observe/lens` to isolate from foreign WIP test errors.
- Live (port 5200), both mounts identical: no `zoom` box; StageShell grid
  `220px / 1fr / 240px` at the <=1200px preview viewport (Act-parity responsive);
  7 spine tabs; spine click re-filtered the strip 10 -> 2; recent-obs card click
  set `selectedObs` + popped the IntelligencePanel selected block; the Domain
  Detail slide-up rests `top:48 / h:944 / transform:none`, covering TopBar+spine
  (its slide-in keyframe was throttled to the `from` frame in the unfocused
  preview tab -- a render artifact, not a layout bug); `ObserveShellToggle`
  round-trips module-bar <-> dashboard. Smallest HTML chrome font >=9px (only the
  spiral SVG `viewBox` text reads 7px user-units).
- `preview_screenshot` timed out (the known transient hang) -- proof is DOM /
  `getComputedStyle`, disclosed ([[project-screenshot-hang]]).
- Regression: `git status` clean under `observe/dashboard/**`; `ObserveLayout.tsx`
  untouched; `DomainsView`/`LensBar`/`DomainsRail` still exported.

## Consequences

- The `module-bar` Observe lens now inherits Act's exact layout system -- floating
  bento rails at 240/260 (responsive), natural Act-ladder type (no zoom), a map
  canvas, and a horizontal recent-observations tray between full-height rails.
- **Accepted trade-off:** at <=820px StageShell hides BOTH rails (Act parity), so
  the cycle timeline + intelligence panel drop on narrow viewports; map + spine +
  strip remain. Not diverging from Act here.
- Still mock-backed -- no `ObserveDataPoint`/`useDomainSnapshot`/MapLibre wiring;
  that and making the lens the global Observe default remain deferred.
- Not pushed ([[project-branch-rebase]]); foreign WIP untouched; CSRA model
  untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only.
