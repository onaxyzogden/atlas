# 2026-05-31 -- Wizard chrome fixes: DecisionRail removal + whole-page scroll

**Branch:** `feat/atlas-permaculture` | **Commit:** `76499f4e` (2 files, +20/-6; not pushed)
**Entity:** [[entities/web-app]]

Two issues the operator reported on the live Project Creation Wizard, fixed on
`feat/atlas-permaculture`, commit `76499f4e`, NOT pushed (operator chose
commit-only: branch was 6 ahead / 0 behind origin, with 5 foreign WIP commits
below mine that must not be published).

## Fixes

- **Fix 1 -- DecisionRail leaked onto wizard steps 2/3.**
  `apps/web/src/v3/V3ProjectLayout.tsx` -- `activeFromPath` resolves `/wizard/*` to
  the "home" stage (not in `SELF_RAILED_STAGES`), so the generic DecisionRail
  rendered on every wizard step. Added an `isWizard` path check that forces
  `rail = undefined` on wizard routes; the global header + ProjectBundleBar still
  render.
- **Fix 2 -- whole page scrolled instead of the form section.**
  `apps/web/src/v3/project-wizard/ProjectWizardShell.module.css` -- `.shell`
  measured `height: calc(100vh - header)` but mounts below BOTH the app header AND
  the ProjectBundleBar inside an already-bounded `.outletHost`; the bundle-bar
  overshoot forced a page scroll. Changed to `height: 100%; min-height: 0` so it
  fills the bounded slot. The form column keeps its own
  `overflow-y: auto; min-height: 0`, so tall step content scrolls inside the column.

## Verification (live DOM via preview eval, localhost:5200)

- DecisionRail removal CONFIRMED -- `railPresent: false` on both `/wizard/vision`
  and `/wizard/team`; one run rendered real step-2 content (regions: Workspace
  content, Vision & Capacity, Project type selector, Secondary layer selector) with
  no rail region present.
- Whole-page scroll CONFIRMED fixed -- `pageScrollable: false` on both wizard routes.
- Web typecheck `TSC_EXIT=0`.

## Honesty note

The form-column internal-scroll behaviour is guaranteed by CSS construction
(`.form overflow-y:auto + min-height:0` inside the now-bounded `overflow:hidden`
shell) and by the prior-session seed-check measurement (shell-fits-viewport, page
non-scrollable), but a clean live tall-content overflow measurement
(`scrollHeight > clientHeight`) was NOT captured this session -- the headless
eval's deep dynamic-route rehydration via pushState was intermittent
(`shellSectionFound` flickered false on single-nav runs). Recorded as
structurally-sound, not pixel-measured, rather than overclaimed.
