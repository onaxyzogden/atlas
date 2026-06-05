# 2026-05-10 — Observe dashboards: delete now-inert CTA buttons (option B)


Follow-up to the 2026-05-09 slide-up restructure. The first pass left the
dashboard tile-card CTAs visible but stripped of click handlers (option A);
operator confirmed the silent CTAs felt like dead weight, so option B
shipped: all 14 buttons removed across the 6 dashboards. Commit `4105ba4`.

### Removed

- **Topography**: Open terrain detail · Open cross-section tool
- **Macroclimate**: Open page (solar) · See full climate analysis · Open
  page (hazards) · See full hazards log
- **Sectors**: Open Sector compass · Open Cartographic detail
- **SWOT**: View all entries · Open SWOT journal · View full report ·
  Open diagnosis report
- **Human Context**: `ModuleCardShell` action button (3 cards) +
  `FooterTabs` strips (3 cards) + helper component
- **Earth/Water/Ecology**: View all tests · Details · View all species

`ModuleCardShellProps` trimmed (`action`/`onAction` dropped) — was a
local interface, no external impact. Tabs row in `ModuleSlideUp` is now
the sole navigation surface.

### Verification

- TypeScript: `tsc --noEmit` clean (with `--max-old-space-size=8192`).
- Diff: 110 lines deleted across 6 files.
