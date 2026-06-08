# 2026-06-08 -- Parcel area displayed ~2.47x too high: unit convention fix

**Branch.** `feat/structured-capture-forms` (one clean explicit-path commit; **pushed this session**).

## Problem

Metric projects displayed parcel area roughly 2.47x too high. Root cause: `LocalProject.acreage`
is canonically ACRES (the API computes `ST_Area(::geography) / 4046.86` and `applyServerAcreage`
overwrites local on every sync), but four display/adapter paths relabeled the acres value as "ha"
for metric projects without converting. Four write paths stored unit-native ha (not acres),
causing a flip-flop before the server overwrote the value.

Example: Halton Hills (122.22 ac) displayed as **122.2 ha** instead of the correct **49.46 ha**.

## Fix

Standardized `project.acreage` = canonical ACRES throughout the web client.

**New helpers** in `apps/web/src/lib/geo.ts`:
- `parcelAcres(geo)` — geodesic acres via turf (replaces write-path calls to `parcelAcreage(geo, units)`)
- `parcelAreaValue(acres, units)` — numeric value in display unit
- `formatParcelArea(acres, units)` — labelled string ("49.46 ha" / "122.22 ac" / "—")

**Write paths** (`ObserveLayout`, `PlanLayout`, `ActLayout`, `WizardStep1Site`) now call
`parcelAcres(geo)` — no unit argument, always stores acres.

**Read paths** (`ArchivePage`, `PortfolioSummaryBar`, `projectToCandidate`, `adaptLocalProject`,
`pdfExport`) now convert via `parcelAreaValue`/`formatParcelArea` before display.

Backend (API routes + `syncService`) left unchanged — canonical acres is correct there.

## Verification

- `geo.test.ts` 30/30 pass (3 new describe blocks); typecheck clean.
- Live preview: Halton Hills → **49.46 ha** (correct); 351 House → 4.839 ha; Three Streams → 64.633 ha;
  Apricot Lane → 81.701 ha. Imperial mock candidates unchanged.
- Pre-existing 2-test failure in `ActTierZeroWorkbench` (boundary mode badge / SR-C label reconciliation)
  is unrelated and predates this fix.

## ADR

[[decisions/2026-06-08-atlas-parcel-area-unit-fix]]
