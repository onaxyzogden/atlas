# 2026-05-24 — cp1252 mojibake repair across apps/web/src

**Branch.** `feat/atlas-permaculture`. Commit `13a49739` (51 files). Closes the mojibake item deferred from the same-day [[log/2026-05-24-light-mode-inset-well-and-ring-tokens]] light-mode session (a task chip + scratch `_mojibake_inventory.txt` were spawned during that work; the inventory file is cleaned up by this commit).

## Why

The light-mode screenshot review surfaced a stray `â€"` glyph in the Human Context dashboard. Root cause is **cp1252-as-UTF-8 mojibake**: source files containing typographic punctuation (em/en dashes, curly quotes, ellipsis, middle dot) had been saved with the bytes mis-decoded, so `—` rendered as `â€"`, `–` as `â€"`, range strings like `0–5` as `0â€"5`, and similar for `'`, `…`, `·`. This is the recurring Windows/cp1252 ↔ UTF-8 hazard called out in the project CLAUDE.md.

## What shipped

Swept `apps/web/src/**` and corrected the mojibake byte-sequences back to their intended UTF-8 punctuation across **51 files** — primarily Zustand **stores** (humanContextStore, livestockStore, soilSampleStore, sectorStore, ecologicalNoteStore, portalStore, cropStore, pathStore, and ~20 more) plus **map/feature components** (GaezOverlay, SoilOverlay, CrossSectionTool, HistoricalImageryControl, OsmVectorOverlay, TerrainControls, CommandPalette, PublicPortalShell, …) and a few **CSS modules** (SolarClimatePanel, HydrologyPanel, MapLoadingOverlay, ZonePanel). Changes are **punctuation-only** in comments/docstrings/labels — no logic, identifiers, schema, or covenant surface touched. Example: `humanContextStore â€" OBSERVE Module 1` → `humanContextStore — OBSERVE Module 1`; `Mollison Zones 0â€"5` → `Mollison Zones 0–5`.

## Scope discipline

Mojibake-only; **no foreign WIP** leaked in (verified `EconomicsPanel*`, `CapitalPartnerSummary*`, `capitalPartner*`, `MapCanvas`, the `*Map.tsx` trio, `ZoneSomSidebar*`, `MapCoordinateReadout*`, `launch.json`, `ObserveChecklistAside.tsx` all absent from the commit). Per the Windows/cp1252 awareness in [[entities/web-app]] / project CLAUDE.md.
