# 2026-05-22 — Relocate the captured-map export into the DesignToolRail

**Branch:** `feat/atlas-permaculture`
**Commit:** `6aabbc07`
**Plan:** `~/.claude/plans/quiet-snuggling-tower.md`

## What & why

Follow-on to the prior re-home ([[log/2026-05-22-rehome-captured-map-export-plan-vision.md]],
`838aa115`), which mounted `MapSheetExportControl` as a floating green
**"Export sheet ▾"** pill at the **top-left** of the Plan **Vision** canvas only.
That restored reachability but left the export as a one-off floating control,
disconnected from the canvas's real control hub — the **DesignToolRail**
(right-edge vertical icon toolbar: Select / Pan / Draw / Duplicate / Zoom /
Layers), which renders on **both** the Current and Vision canvases.

The steward selected the pill + the rail and directed: *"this element/feature
should be placed as a button on the selected DesignToolRail."* This relocates
export into the rail as an icon button + popover, giving one consistent export
entry point co-located with the other map tools on every Plan canvas.

**Two locked steward decisions (AskUserQuestion):**
1. **Both canvases** — the export button shows on **both** the Current and
   Vision rails (Current gains export, which it never had). Because the rail
   already mounts on both surfaces, putting export *in the rail* delivers this
   with **zero `PlanLayout.tsx` edit**.
2. **Remove the pill (full relocation)** — the floating green pill is unmounted
   from Vision; the rail button fully replaces it. The legacy `DesignPage` keeps
   its own `MapSheetExportControl` mount untouched (no-deletion-in-revamps).

## Changes (single commit `6aabbc07`, 6 files, +232/−20)

- **`apps/web/src/v3/plan/MapSheetExportControl.tsx`** — **additive exports
  only** (+8/−8): added the `export` keyword to `SHEET_EXPORTS`, `SHEET_LABEL`,
  `SheetExportType`, `MapSheetType` so the rail + the new hook reuse them as the
  single source of truth. The default-export component **and** the pure builders
  (`buildMapSheetPayload` / `buildPlantingSchedule` / `buildPlantingPlanPayload`)
  stay exactly as-is — `DesignPage` and `MapSheetExportControl.test.ts` keep
  working unchanged.

- **`apps/web/src/v3/plan/useMapSheetExport.ts`** — **NEW** hook
  `useMapSheetExport(map, projectId)` returning
  `{ generatingType, error, downloadUrl, handleExport }`. Extracts the export
  state machine (mirrors the legacy `handleExport` verbatim: read zones /
  guilds / crops filtered by `projectId` → `captureMapImage(map)` → branch
  `planting_plan` vs map-sheet to the pure builders → `api.exports.generate` →
  `data.storageUrl`) so the rail doesn't re-implement it. **One-way import** of
  the builders from `MapSheetExportControl.js` — no cycle, since
  `MapSheetExportControl` does **not** import the hook. The pure builders remain
  the single tested source; only the thin async wrapper is shared.

- **`apps/web/src/v3/plan/canvas/DesignToolRail.tsx`** (+83) — mirrors the
  existing **Layers** popover precedent exactly: `useMapSheetExport(map,
  projectId)` + `exportOpen` state next to `layersOpen`. **Mutually exclusive**
  popovers (opening one closes the other); the click-outside effect's guard
  widened to `if (!layersOpen && !exportOpen) return;` and closes both. After a
  `css.divider`, a `DelayedTooltip label="Export sheet"` wraps a `css.btn`
  button (`data-active={exportOpen}`, `aria-haspopup="menu"`,
  `aria-expanded={exportOpen}`, `disabled` while generating, icon
  `Loader2`-spin while busy / `FileDown` idle). The popover renders a
  `role="menu"` with one `role="menuitem"` button per `SHEET_EXPORTS` entry
  (disabled while generating), an `Exporting {SHEET_LABEL[type]}…` status, the
  `error` text in red, and a **"Download PDF"** `<a target="_blank"
  rel="noopener noreferrer">` once `downloadUrl` is set — kept open through the
  async run so the link is reachable.

- **`apps/web/src/v3/plan/canvas/DesignToolRail.module.css`** (+66) — added
  `.popoverAction` (full-width left-aligned menu-item button, hover bg, disabled
  0.45), `.popoverStatus` (11px muted), `.popoverError` (red
  `rgba(220,38,38,0.9)` bg), `.popoverLink` (gold `var(--color-gold-brand)` bg,
  dark text), and a `.spin` / `@keyframes rail-spin` for the busy icon.

- **`apps/web/src/v3/plan/canvas/VisionLayoutCanvas.tsx`** (−13) — removed the
  `import MapSheetExportControl` and its
  `<MapSheetExportControl map={map} projectId={projectId} />` mount; replaced
  the comment block with a note that export now lives in the rail via
  `useMapSheetExport`. The rail (already rendered here) owns export.

- **`apps/web/src/v3/components/DiagnoseMap.tsx`** — **comment only**: the
  `preserveDrawingBuffer: true` rationale now names the DesignToolRail "Export
  sheet" button (via `useMapSheetExport`, on both Plan Current + Vision) plus
  the legacy `MapSheetExportControl`.

No store / schema / registry / API / server-template change.

## Verification

- **Unit:** `npx vitest run MapSheetExportControl` → **10/10 green** — the
  builder tests stay passing (only additive `export` keywords changed in that
  file).
- **Typecheck:** web tsc (8 GB `--max-old-space-size` node script) at the
  **3-error pre-existing baseline** (`StepBoundary.tsx`, two `HostUnion*`
  tests) — **no new errors** from any of the 6 files; the new hook's store
  reads don't trip `noUnusedLocals`.
- **Live preview deferred (stated, not claimed):** the standing Phase-C wall —
  running web + auth + seeded project + API `:3001` (down, `ECONNREFUSED`) +
  headless WebGL + MapTiler key, and `preview_screenshot` hangs on the WebGL
  canvas — blocks a live click-through of the rail button + popover and the
  capture round-trip. No visual claimed, per the preview-verification rule;
  unit tests + tsc are authoritative.

## Scope guards

- Staged **only** the 6 edited/new files by explicit path. Concurrent-session
  foreign WIP (`EconomicsPanel*`, `CapitalPartnerSummaryExport`,
  `capitalPartner*`, `ZoneSomSidebar*`, `MapCoordinateReadout*`, `MapCanvas`,
  `.claude/launch.json`) left untouched per [[feedback-no-deletion]].
- Committed immediately per [[feedback-commit-immediately-on-rebased-branches]]
  (branch is rebased out-of-band).
- Covenant clean — no capital framing touched; 3-item Observe/Plan/Act IA
  unchanged.

## Follow-ups

- The capture round-trip (`captureMapImage` → non-blank PNG →
  `api.exports.generate` 200) still needs a hardware-WebGL browser + running API
  + seeded project to fully close live — the unit tests cover the server path
  meanwhile (carried over from the prior re-home entry).
