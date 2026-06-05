# 2026-04-24 — Lora-fallback removal sweep (typography drift)


Closes the typography drift flagged during the MASTER.md palette refresh
(2026-04-24, commit `593405f`). Removes the legacy `'Lora', Georgia, serif`
fallback chain from `font-family` declarations across `apps/web/src/`. The
fallback was dead at runtime (the `--font-display` / `--font-serif` tokens
are always defined in [tokens.css](../apps/web/src/styles/tokens.css)) but
documented an authoritative-display intent (Lora) that contradicts the
actual token (`'Fira Code', monospace`). Removing the fallback aligns code
with [MASTER.md](../design-system/ogden-atlas/MASTER.md) §Typography.

### Shipped
- **Pattern 1 — standard `--font-display` fallback** (19 module.css files,
  ~62 sites): `font-family: var(--font-display, 'Lora', Georgia, serif);`
  → `font-family: var(--font-display);`. Touched: ProjectTabBar,
  DashboardMetrics, MetricCard, DashboardPlaceholder, EnergyDashboard,
  CartographicDashboard, EducationalAtlasDashboard, CarbonDiagnosticDashboard,
  EcologicalDashboard, MapLayersDashboard, HerdRotationDashboard,
  LivestockDashboard, TerrainDashboard, GrazingDashboard, HydrologyDashboard,
  StewardshipDashboard, PaddockDesignDashboard, PhasingDashboard,
  MapView.module.css.
- **Pattern 2 — `--font-serif` variant** (1 file, 2 sites):
  HydrologyRightPanel.module.css.
- **Pattern 3 — hard-coded `'Fira Code'` prefix + Lora fallback** (4 files,
  4 sites): ForestHubDashboard, PlantingToolDashboard, NurseryLedgerDashboard,
  FieldworkPanel. The `'Fira Code'` prefix was redundant (it's what the
  token already resolves to); collapsed both prefix and fallback into bare
  `var(--font-display)`. Closes two drift items at once.
- **Pattern 4 — JSX inline literals** (2 files):
  [EnergyDemandRollup.tsx:140](../apps/web/src/features/utilities/EnergyDemandRollup.tsx)
  (`fontFamily` style) and
  [StewardshipDashboard.tsx:139](../apps/web/src/features/dashboard/pages/StewardshipDashboard.tsx)
  (SVG `<text fontFamily=...>` attr).

### Out of scope
- [Modal.module.css:119](../apps/web/src/components/ui/Modal.module.css)
  uses `var(--font-display, Georgia, serif)` — no Lora token, legitimate
  Georgia fallback, different drift class. Left as-is.

### Verification
- `grep "'Lora'" apps/web/src/` — zero hits (was 76 across 26 files).
- Preview eval on `localhost:5200` confirms `--font-display` resolves to
  `'Fira Code', monospace` and that `getComputedStyle(...).fontFamily`
  on five sample dashboard surfaces returns `"Fira Code", monospace`.
- `tsc --noEmit` on `apps/web` OOM'd with Node heap exhaustion
  (environmental — `--max-old-space-size` not bumped on this box). Edits
  are all CSS strings or one string-literal swap inside a style/SVG attr,
  so they cannot introduce TS errors. Deferred a clean tsc run to the
  next session that bumps Node heap.

### Outcome
27 files touched (26 source + wiki/log.md). 76 fallback occurrences removed.
No runtime change — the fallback never fired, since the tokens are always
defined. Documentation-code alignment restored.
