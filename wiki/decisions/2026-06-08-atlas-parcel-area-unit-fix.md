# ADR: Parcel Area Unit Convention Fix (2026-06-08)

**Status:** Implemented and verified  
**Branch:** `feat/structured-capture-forms`  
**Scope:** `apps/web` only — no API, no DB schema change

---

## Context

`LocalProject.acreage` is the single parcel area field used across the OLOS Atlas web client.
The field is authored by the API: both boundary-save routes compute
`ST_Area(ST_GeomFromGeoJSON(...)::geography) / 4046.86` (PostGIS geodesic m² / 4046.86 = acres)
and `syncService.applyServerAcreage` overwrites the local value with this acres figure on every
boundary-push/pull. The field is therefore canonically **ACRES**.

The majority of consumers (SiteOverviewSection, HydrologyRightPanel, valuation/regulatory/sequencing
engines) correctly treat the value as acres and convert for metric display. However, four display/adapter
paths relabeled the acres value as "ha" for metric projects without converting, overstating area by
1 / 0.404686 ≈ 2.47×. Four write paths additionally stored a unit-native value (ha for metric, returned
by `parcelAcreage(geo, units)`), causing a flip-flop: locally-written ha was clobbered by server-written
acres on every sync, making the displayed number unstable.

---

## Decision

**Canonical unit for `project.acreage` is ACRES** (preserves the DB column's semantics and the
majority of consumers). Fix the buggy read paths to convert before display; fix the write paths to
store acres so local and synced values agree.

### Helpers added to `apps/web/src/lib/geo.ts`

```ts
export function parcelAcres(geo): number | null
// Geodesic area via turf.area / 4046.86 — canonical ACRES, rounded to 2dp.

export const HA_PER_ACRE = 0.404686;

export function parcelAreaValue(acres: number, units: 'metric' | 'imperial'): number
// Returns display-unit value: acres * 0.404686 for metric, acres for imperial.

export function formatParcelArea(acres: number | null | undefined, units: 'metric' | 'imperial'): string
// Returns labelled string: "49.46 ha" or "122.22 ac". Returns '—' for null/NaN.
```

The pre-existing `parcelAcreage(geo, units)` helper is KEPT (still used by
`BoundaryConfirmationStrip` which calls it purely for display without persisting the result).

### Write paths fixed (store acres, not unit-native)

| File | Change |
|---|---|
| `ObserveLayout.tsx:410,418` | `parcelAcreage(geo, units)` → `parcelAcres(geo)` |
| `PlanLayout.tsx:326` | `parcelAcreage(polygon, project.units)` → `parcelAcres(polygon)` |
| `ActLayout.tsx:173` | `parcelAcreage(polygon, project.units)` → `parcelAcres(polygon)` |
| `WizardStep1Site.tsx:134` | `parcelAcreage(fc, draft.units)` → `parcelAcres(fc)` |

### Read paths fixed (convert before display)

| File | Change |
|---|---|
| `ArchivePage.tsx:129` | Bare relabel → `formatParcelArea(p.acreage, p.units)` |
| `PortfolioSummaryBar.tsx:totalAreaLabel` | Sum acres, convert via `parcelAreaValue` before label |
| `projectToCandidate.ts:34` | `project.acreage` (raw acres) → `parcelAreaValue(project.acreage, project.units)` |
| `adaptLocalProject.ts:176` | `p.acreage` (raw acres) → `parcelAreaValue(p.acreage, p.units)` |
| `pdfExport.ts:62` | Hardcoded "acres" label → `formatParcelArea(acreage, project.units)` |

### Consumers left unchanged (already correct)

`SiteOverviewSection`, `HydrologyRightPanel`, `BoundaryConfirmationStrip`,
`valuation`/`regulatory`/`sequencing` consumers, `candidateFilter.ts`, `CompareModal.tsx`,
`parcelIntegrity.ts`, `CandidateCard`, `CandidateDetailDrawer` — all correctly treat the
value as acres or accept a `{value, unit}` pair.

---

## Verification

- **Tests:** `geo.test.ts` — 3 new describe blocks: `parcelAcres` (~2.47 for 1-ha parcel),
  `parcelAreaValue` (metric converts, imperial identity), `formatParcelArea` (labels + '—' guard).
  Run bounded `--pool=forks`; 30 geo tests pass (4010 total, 2 pre-existing failures in
  `ActTierZeroWorkbench` from SR-C label reconciliation — unrelated).
- **Typecheck:** `tsc --noEmit` clean.
- **Preview:** Live preview confirmed Halton Hills (122.2178 ac) renders **49.46 ha** (was 122.2 ha).
  Other metric projects: 351 House → 4.839 ha, Three Streams → 64.633 ha, Apricot Lane → 81.701 ha.
  Imperial mock candidates unchanged (512 ac, 248 ac, …).

---

## Amanah

Area calculation is a measurement tool for land-stewardship planning — no sale,
advance-purchase, financing instrument, or CSRA/salam framing involved.
([[fiqh-csra-erased-2026-05-04]])
