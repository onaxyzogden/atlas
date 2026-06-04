# 2026-06-04 -- Act: adopt-from-map on read-existing objectives + draw snap-to-line/vertex

**Branch.** `feat/atlas-permaculture` (two explicit-path commits `9d0ddae2`,
`9728c923`, **not pushed**). Entity: [[entities/act-tier-shell]]. ADR:
[[decisions/2026-06-04-atlas-act-adopt-and-draw-snapping]]. Plan:
`~/.claude/plans/elements-of-this-concept-toasty-ember.md`.

## Change

Two operator requests, confirmed mid-implementation.

**Feature 1 -- bring back adopt-from-map (commit `9d0ddae2`, 2 files).** Pure
tool-catalogue data-wiring: the adopt tools already exist in Observe and the Act
tier-shell already mounts `ObserveDrawHost`, so "bring back" = catalogue + objective
ids only. Added `adopt-building` / `adopt-water` to `actToolCatalog.ts` and wired them
as the FIRST entry of the read-existing objectives in
`packages/shared/.../objectiveActTools.ts` (9 building-reading + 15 water-reading
objectives across all 12 land types' S2/S3). Adopt is a reading activity -> intentionally
NOT added to S4/S5 design objectives (verified `s4-water-strategy` has no adopt leak).

**Feature 2 -- snap-to-line/vertex for draw tools (commit `9728c923`, 8 files).**
Custom snap-enabled MapboxDraw modes reusing the `snapPoint.ts` math + the
`SharedVertexEditHandler` custom-mode precedent. `snapPoint.ts` gains an additive
`snapDrawPoint` (+ `lines`/`vertices` on `SnapTargets`; vertices beat edges within the
8 px radius; legacy `snapPoint` untouched). New `snapDrawModes.ts` wraps stock
line/polygon modes and rewrites `e.lngLat` on click/tap/mouse-move. `useMapboxDrawTool`
gains opt-in `snap?` / `getSnapTargets?` (default false = no behaviour change;
`draw_point` never snaps). New `usePlanSnapTargets` assembles targets from livestock
fences + paddocks, built-environment footprints + line runs, and the parcel boundary.
`FenceLineTool` / `PaddockTool` enable snap; `PlanDrawHost` threads `parcelBoundary`.

## Verification

- **tsc:** `apps/web` `npx tsc --noEmit` -> EXIT=0 (clean).
- **vitest** (bounded, `--pool=forks --testTimeout=20000`): `snapDrawPoint` (5) +
  `actToolCoverage` (17) + `act/asBuilt` (34) -> **56 passed**.
- **Live preview** (web dev server :5200, `/@fs/` Vite-bundle import): `snapDrawPoint`
  vertex/line/null behaviour correct; `snapDrawModes` exports the two mode names + the
  modes carry `onSetup`/`onClick`/`onMouseMove`; `useMapboxDrawTool` + `usePlanSnapTargets`
  + `PlanDrawHost` module graph resolves. Feature 1 resolution verified prior session via
  the same `/@fs/` technique. `preview_screenshot` hung on the WebGL map
  ([[project-screenshot-hang]]); relied on module + unit proof.

## Process / covenant

Two explicit-path commits; each staged only its named files by path
(`git diff --cached --name-only` confirmed the exact set against foreign WIP, left
untouched). Messages BOM-free UTF-8 via `[System.IO.File]::WriteAllText` + `git commit -F`,
ASCII-only, `Co-Authored-By: Claude Opus 4.8`. Branch fetched + divergence-checked
(0 behind), **not pushed** ([[project-branch-rebase]]). No-deletion respected (legacy
`snapPoint` + all components untouched; snap is purely additive). Commit-on-verify
([[feedback-commit-immediately-on-rebased-branches]]).
