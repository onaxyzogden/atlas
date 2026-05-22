# 2026-05-22 — Re-home the captured-map export into the Plan Vision canvas

**Branch:** `feat/atlas-permaculture`
**Commit:** `838aa115`
**Plan:** `~/.claude/plans/fix-the-white-background-crispy-mccarthy.md`

## What & why

The captured-map PDF export — the floating `MapSheetExportControl` dropdown
offering **Master Plan · Base Map · Zone Map · Planting Plan** (PDC Phase A5 +
Phase B) — was **orphaned by the 7-stage→3-stage nav retirement**. Its only
mount was inside `DesignPage.tsx`'s `DesignMap` render-prop (`DesignPage.tsx:257`),
and `/design` now `beforeLoad`-redirects to the v3 `PlanLayout`. `PlanLayout`
mounted **neither** the export control **nor** a capture-ready map: only
`DesignMap` set `preserveDrawingBuffer: true`, and `DesignMap` is used solely by
the unrouted `DesignPage`. So a feature with green unit tests
(`MapSheetExportControl.test.ts` 10/10, `plantingPlan.pdfTemplate.test.ts` 3/3)
was unreachable in the shipped product.

This was discovered while attempting the long-deferred captured-map export
live-preview verification (the prior plan's Part 2). Verification turned up a
real regression, so per the plan's "if verification surfaces a real bug, stop
and re-plan" gate the task pivoted from pure verification to a scoped re-home
(steward-chosen: **"Re-home export into Plan now"**).

## Changes (single commit `838aa115`, 2 files, +16)

- **`apps/web/src/v3/plan/canvas/VisionLayoutCanvas.tsx`** — mounted
  `<MapSheetExportControl map={map} projectId={projectId} />` inside the
  `DiagnoseMap` render-prop. **Vision is the default Plan design surface** (the
  one that carries the zones / crop areas / guilds the sheets capture), so this
  is the faithful analogue of the retired DesignPage's design canvas. The
  control hard-codes `position:absolute; top:12; left:12`; that slot is free —
  `MapToolbar` and `BaseMapCard` are bottom-left, `DesignToolRail` is the right
  edge.

- **`apps/web/src/v3/components/DiagnoseMap.tsx`** — added
  `preserveDrawingBuffer: true` to the `new maplibregl.Map({...})` constructor.
  `captureMapImage`'s `toDataURL` reads real pixels only when the WebGL drawing
  buffer is retained; otherwise the browser clears the backbuffer after
  compositing and the export PNG is near-blank even though tiles show on screen.
  Because **both** Plan surfaces (Vision via `VisionLayoutCanvas` + Current) and
  **Observe** all share `DiagnoseMap`, this one change makes every map surface
  capture-ready for free. (Mirrors the original `preserveDrawingBuffer` set on
  `DesignMap` in Phase A1 `ffa66469`.)

No store / schema / registry / API / server-template change — `api.exports.generate`
and the PDF templates already exist and are tested.

## Verification

Live (Claude Preview, port 5200), authed past the client-side guard
(`localStorage ogden-auth-token='dev'`), on `/v3/project/mtc/plan` (default
Vision view). **All UI checks done via DOM eval** because `preview_screenshot`
times out on this WebGL page (known backgrounded-tab rAF-throttle hang) — no
visual claimed, per the preview-verification rule:

- **Control mounted:** the **"Export sheet ▾"** trigger renders on the Plan
  Vision canvas.
- **Dropdown opens** and renders all four sheet options: Master Plan, Base Map,
  Zone Map, Planting Plan.
- **`preserveDrawingBuffer: true` confirmed live** on the running Plan map via
  `map.painter.context.gl.getContextAttributes().preserveDrawingBuffer === true`.

- **Capture readback BLOCKED in this env (reported, not claimed working):** even
  with `preserveDrawingBuffer` confirmed active and `map.areTilesLoaded() === true`,
  `map.getCanvas().toDataURL()` returns a near-blank PNG (6590 chars). Drawing
  the WebGL canvas onto a 2D canvas and sampling `getImageData` showed **1
  distinct color (`0,0,0,0`), zero non-transparent pixels** across all 164,274
  px — a fully transparent buffer. This is the **headless / software-WebGL wall**
  the plan anticipated: the on-screen compositor shows tiles but the readback
  buffer is empty. It is an **environment limitation, not a code defect** —
  `preserveDrawingBuffer: true` is the documented fix for hardware WebGL. Also
  `map.loaded()` never flips true here (`isSourceLoaded` is false for every
  source incl. `maptiler_planet`), consistent with the software-WebGL/headless
  preview.

- **typecheck:** `cd apps/web && npm run typecheck` — (see commit gate; root
  turbo `npm run typecheck` fails with an env-only "cannot find binary path"
  error and was not used).

## Stage C — server PDF round-trip: deferred

`apps/api` (port 3001) was not running (console showed repeated
`ECONNREFUSED` sync errors), so the full `api.exports.generate` → 200 + PDF blob
round-trip was not exercised live. Server-side PDF rendering is already covered
by `plantingPlan.pdfTemplate.test.ts` + the `mapSheet` / `masterPlan` template
tests. No file was downloaded to disk (download = explicit-permission action).

## Scope guards

- Staged **only** the 2 edited files by explicit path. The working tree carried
  concurrent-session foreign WIP (EconomicsPanel, CapitalPartnerSummaryExport,
  capitalPartner, ZoneSomSidebar, `.claude/launch.json`) — left untouched for
  its owners per [[feedback-no-deletion]].
- Committed immediately after live UI verification per
  [[feedback-commit-immediately-on-rebased-branches]] (branch is rebased
  out-of-band); fetch + divergence check first (`1 ahead / 0 behind`).

## Part 1 (rail-highlight pattern) — confirmed already shipped

The prior plan's Part 1 (apply the `effectiveSectionId` single-section-highlight
pattern to the remaining rails) was found **already complete** in commits
`fc0938b8` (cross-rail highlight: Observe + both mini rails) + `1f14c3de`
(URL-persist picked section), both ancestors of HEAD. No code was needed.

## Follow-ups

- Capture round-trip (`captureMapImage` → non-blank PNG → `api.exports.generate`
  200) still needs a **hardware-WebGL browser + running API + seeded project** to
  fully close — the unit tests cover the server path meanwhile.
- Optionally also mount the export on the Plan **Current** view's `DiagnoseMap`
  render-prop (it is now capture-ready too) if stewards want it there as well;
  left to Vision-only for now to avoid a duplicate control.
