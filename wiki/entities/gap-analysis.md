# Global Completeness Gap Analysis
**Type:** strategic-plan
**Status:** active
**Source:** `infrastructure/OGDEN Atlas — Global Completeness Gap Analysis.md`
**Benchmarks:** FAO, USDA/NRCS, ASTM E1527-21, IUCN, WRB, AEZ, GAEZ, WDPA

## Purpose
Comprehensive inventory of ~120 gaps between Atlas's current capabilities and what recognized global frameworks require of a credible, globally deployable land intelligence platform. This page is the strategic planning reference for roadmap prioritization across all future sessions.

## Summary

| # | Category | Gaps | Dominant Type | Priority | Rationale |
|---|----------|------|---------------|----------|-----------|
| 3 | [Terrain & Topography](#3-terrain--topography) | 0 remaining | Computation | **Complete** | All 8/8 implemented: aspect, curvature, TWI, TRI, viewshed, cut/fill, erosion hazard + frost pocket, cold air drainage, TPI bonus |
| 2 | [Soil Assessment](#2-soil-assessment) | 6 remaining | Data | **Mostly Complete** | 10/16 implemented (Sprint B): pH, CEC, EC, SAR, bulk density, Ksat, AWC, CaCO3, rooting depth, OC + fertility index, salinization risk, scoring integration |
| 5 | [Climate](#5-climate) | 2 remaining | Data | **Mostly Complete** | 8/10 implemented: NOAA ACIS + ECCC normals (temp, precip, frost, GDD, wind), NASA POWER solar, Koppen, freeze-thaw. Remaining: extreme events, climate projections |
| 1 | [Formal Scoring & Classification](#1-formal-scoring--classification) | 7 | Computation | **P1** | International credibility; mostly algorithms over soil+climate+terrain; depends on P0/P1 data being filled |
| 6 | [Crop & Vegetation Suitability](#6-crop--vegetation-suitability) | 8 | Data + Computation | **P2** | Most significant strategic gap; FAO ECOCROP is free; but depends on climate + soil being complete first |
| 11 | [Regulatory & Legal](#11-regulatory--legal) | 11 | Data | **P2** | Critical for real transactions; zoning data is fragmented and hard to source programmatically |
| 4 | [Hydrology](#4-hydrology) | 10 | Mixed | **P2/P3** | ET, aridity index, drainage density are computation; groundwater/aquifer are hard data gaps |
| 9 | [Renewable Energy](#9-renewable-energy) | 6 | Data | **P3** | NASA POWER + Global Wind Atlas have free APIs; high user value but not core land suitability |
| 10 | [Infrastructure & Accessibility](#10-infrastructure--accessibility) | 8 | Data + Computation | **P3** | Distance calcs are straightforward once POI datasets sourced; masjid proximity is OGDEN-differentiator |
| 7 | [Ecological & Biodiversity](#7-ecological--biodiversity) | 8 | Data | **P3** | WDPA is free; species-at-risk data varies by jurisdiction; important for stewardship framing |
| 13 | [Design Intelligence](#13-design-intelligence) | 10 | Computation | **P3** | All computation — but every gap depends on upstream data (terrain + climate + soil) being rich enough |
| 8 | [Environmental Risk & Site History](#8-environmental-risk--site-history) | 8 | Data | **P4** | Phase I ESA data is jurisdiction-specific and often not API-accessible; important for due diligence |
| 12 | [Global Data Coverage](#12-global-data-coverage) | 10 | Data | **P4** | SoilGrids, WorldClim, ESA WorldCover expand beyond US+Ontario; strategic but not MVP-blocking |
| | **Total** | **~120** | | |

> **Priority key:**
> - **P0 — Quick Win:** computation on data Atlas already has; can implement now
> - **P1 — High impact, moderate effort:** free APIs available, high credibility value
> - **P2 — High impact, high effort:** strategic gaps, may need upstream dependencies or fragmented sources
> - **P3 — Medium priority:** valuable but not blocking core use case or credibility
> - **P4 — Long-term:** expands scope beyond current MVP; tackle after P0-P2 are solid

---

## 1. Formal Scoring & Classification

Recognized frameworks that give a land evaluation tool international credibility.

| Standard | Body | Gap Type |
|----------|------|----------|
| FAO S1/S2/S3/N1/N2 suitability classification | FAO (1976) | Computation |
| USDA Land Capability Classification (LCC I-VIII) | USDA/NRCS | Computation |
| Canada Soil Capability Classification (Classes 1-7) | AAFC | Computation |
| Fuzzy logic membership functions | ALUES/FAO | Computation |
| AHP multi-criteria weighting | MCDM standard | Computation |
| Length of Growing Period (LGP) classification | FAO AEZ | Data + Computation |
| USDA Plant Hardiness Zones | USDA | Data |

> **Cross-ref:** [Scoring Engine](../concepts/scoring-engine.md) — Atlas's current 5-dimension scoring would need to align with or wrap these standards.

---

## 2. Soil Assessment

Atlas has SSURGO (US) and LIO (Ontario). Sprint B (2026-04-14) extended the frontend layerFetcher to query 15 chorizon fields with weighted multi-component averages, added derived indices, and wired into scoring engine.

| Parameter | Gap Type | Status |
|-----------|----------|--------|
| Soil pH | Data | **Implemented** — weighted avg, pH scoring in ag suitability |
| Organic carbon content (OC) | Data | **Implemented** — derived from OM% (OC = OM * 0.58) |
| Cation Exchange Capacity (CEC) | Data | **Implemented** — weighted avg, CEC scoring component |
| Electrical conductivity / salinity (EC) | Data | **Implemented** — weighted avg, salinity penalty in stewardship |
| Sodicity (ESP / SAR) | Data | **Implemented** — SAR weighted avg, salinization risk |
| Calcium carbonate content | Data | **Implemented** — CaCO3% weighted avg |
| N-P-K (baseline fertility) | Data | Open — not in SSURGO chorizon |
| Hydraulic conductivity | Data | **Implemented** — Ksat weighted avg |
| Effective rooting depth | Data | **Implemented** — resdepth_r from component |
| Surface stoniness / coarse fragment % | Data | Open — fragvol in chfrags (separate table) |
| Bulk density | Data | **Implemented** — dbthirdbar weighted avg |
| Soil erosion susceptibility (USLE/RUSLE factors) | Computation | **Implemented** — Sprint A RUSLE + kfact |
| Soil degradation status | Data | Open |
| Boron toxicity | Data | Open |
| WRB Soil Classification | Data | Open — international classification |
| SoilGrids (ISRIC) — global 250m | Data | Open — global coverage gap |

> **Status:** 10/16 implemented (Sprint A + B). Remaining 6 gaps: N-P-K, surface stoniness, soil degradation, boron toxicity, WRB classification, SoilGrids.
> **Cross-ref:** [Data Pipeline](data-pipeline.md) — frontend layerFetcher now queries 15 chorizon fields. Backend SsurgoAdapter queries 20+ fields via BullMQ pipeline.

---

## 3. Terrain & Topography

Atlas has elevation DEM (USGS 3DEP + NRCan HRDEM), 3D visualization, and a full terrain analysis pipeline (4,663 lines). Most original gaps are now implemented:

| Parameter | Gap Type | Status |
|-----------|----------|--------|
| Slope aspect (N/S/E/W facing) | Computation | **Implemented** — elevation route + layerFetcher |
| Slope curvature (concave/convex) | Computation | **Implemented** — `algorithms/curvature.ts` (Zevenbergen-Thorne) |
| Topographic Wetness Index (TWI) | Computation | **Implemented** — `algorithms/twi.ts` (Sprint A, 2026-04-14) |
| Terrain Ruggedness Index (TRI) | Computation | **Implemented** — `algorithms/tri.ts` (Sprint A, 2026-04-14) |
| LiDAR-derived micro-topography | Data | **Partial** — NRCan HRDEM is LiDAR-derived (1m CA); US is 3DEP (10-30m) |
| Viewshed analysis | Computation | **Implemented** — `algorithms/viewshed.ts` (720-ray radial LOS) |
| Cut/fill volume estimation | Computation | **Implemented** — `algorithms/cutFill.ts` (Sprint A, 2026-04-14); on-demand utility |
| Erosion hazard mapping | Computation | **Implemented** — `algorithms/erosionHazard.ts` (Sprint A, 2026-04-14); RUSLE with tiered confidence |

> **Note:** All 8/8 gaps now implemented. Additionally implemented but not in original gap list: frost pocket probability, cold air drainage, TPI (6-class landscape position). RUSLE erosion uses defaults (low confidence) when soil K-factor and climate data unavailable; upgrades to high confidence when SSURGO kfact + precipitation data are present.

---

## 4. Hydrology

Atlas has watershed boundaries, wetlands (partial), and flood zones (partial). Missing:

| Parameter | Gap Type |
|-----------|----------|
| Groundwater depth / water table | Data |
| Aquifer type and recharge zones | Data |
| Evapotranspiration (PET / actual ET) | Computation |
| Aridity index (P/PET ratio) | Computation |
| Irrigation water requirement by crop | Computation |
| Seasonal flooding duration | Data |
| Drainage density | Computation |
| Water stress index | Data |
| Rainwater harvesting potential | Computation |
| Surface water quality | Data |

---

## 5. Climate

Atlas has robust station-based climate from NOAA ACIS (US, 30-year normals) and ECCC OGC (CA). Sprint C (2026-04-14) added Koppen classification, freeze-thaw estimation, and NASA POWER solar radiation.

| Parameter | Gap Type | Status |
|-----------|----------|--------|
| Mean annual temperature (min/max/mean) | Data | **Implemented** — NOAA ACIS monthly normals (pre-Sprint C) |
| Growing Degree Days (GDD) | Computation | **Implemented** — base 10°C from monthly means (pre-Sprint C) |
| First and last frost dates | Data | **Implemented** — interpolated from monthly minimums (pre-Sprint C) |
| Sunshine hours / solar radiation (kWh/m2/day) | Data | **Implemented** — NASA POWER GHI (Sprint C) |
| Prevailing wind speed and direction | Data | **Implemented** — NOAA ISD + ECCC wind rose (pre-Sprint C) |
| Annual rainfall (mean + monthly distribution) | Data | **Implemented** — NOAA ACIS + ECCC normals (pre-Sprint C) |
| Koppen climate classification | Computation | **Implemented** — full Koppen-Geiger from monthly normals (Sprint C) |
| Snow load / freeze-thaw cycles | Data | **Implemented** — estimated from monthly temp transitions (Sprint C) |
| Extreme event frequency (drought, hail, frost) | Data | Open — needs specialized historical event data |
| Climate change projections (RCP 4.5 / 8.5) | Data | Open — needs RCP scenario datasets |

> **Status:** 8/10 implemented. Pre-Sprint C: 6 already existed via NOAA ACIS + ECCC. Sprint C added: Koppen, freeze-thaw, NASA POWER solar. Remaining 2 gaps are P3+ (specialized data).
> **Data sources connected:** NOAA ACIS (US station normals), ECCC OGC API (CA normals), NASA POWER (global solar radiation), NOAA ISD/ECCC (wind rose).

---

## 6. Crop & Vegetation Suitability

Entirely missing — perhaps the most significant gap for a land intelligence tool.

| Capability | Gap Type |
|------------|----------|
| FAO ECOCROP / GAEZ crop matching (2,000+ species) | Data + Computation |
| Rain-fed vs. irrigated suitability distinction | Computation |
| Perennial crop matching (orchard, food forest) | Computation |
| Livestock forage suitability | Computation |
| Agroforestry species pairing | Computation |
| Companion planting / polyculture compatibility | Data |
| Invasive species risk by region | Data |
| Native species library by ecoregion | Data |

---

## 7. Ecological & Biodiversity

| Parameter | Gap Type |
|-----------|----------|
| Habitat type (IUCN classification) | Data |
| Species at risk / critical habitat overlap | Data |
| Protected areas overlap (WDPA) | Data |
| Biodiversity index by ecoregion | Data |
| Forest canopy cover and height | Data |
| Carbon stock estimation | Computation |
| Ecosystem services valuation | Computation |
| Wetland ecological function classification (Cowardin) | Computation |

---

## 8. Environmental Risk & Site History

Phase I Environmental Site Assessment (ASTM E1527-21) — Atlas has none of this.

| Risk Category | Gap Type |
|---------------|----------|
| Prior land use history | Data |
| Contaminated sites registry proximity | Data |
| Underground storage tank (UST) proximity | Data |
| Brownfield / former industrial site | Data |
| Pesticide / herbicide application history | Data |
| Mine tailings proximity | Data |
| Landfill / waste site proximity | Data |
| Military / former industrial legacy | Data |

---

## 9. Renewable Energy

Entirely missing.

| Resource | Available Source | Gap Type |
|----------|----------------|----------|
| Solar PV potential (kWh/m2/year) | NASA POWER, PVGIS, NREL | Data |
| Peak sun hours by month | Same | Data |
| Wind energy potential | Global Wind Atlas (free API) | Data |
| Micro-hydro potential | USGS stream flow | Data + Computation |
| Geothermal surface temperature | USGS geothermal maps (US) | Data |
| Biomass energy potential | Crop residue modeling | Computation |

---

## 10. Infrastructure & Accessibility

| Parameter | Gap Type |
|-----------|----------|
| Road type and access quality | Data |
| Distance to electrical grid (+ capacity) | Data |
| Distance to potable water supply | Data |
| Internet/telecom connectivity | Data |
| Distance to emergency services | Data + Computation |
| Distance to nearest hospital / trauma center | Data + Computation |
| Distance to markets (produce / inputs) | Data + Computation |
| Distance to nearest masjid | Data + Computation |

> **Note:** Distance-based gaps are partly computation (routing/isochrone) once a POI dataset is available.

---

## 11. Regulatory & Legal

Atlas has no connected zoning data for US or Canada — a critical gap.

| Regulatory Layer | Gap Type |
|------------------|----------|
| Zoning classification | Data |
| Agricultural Land Reserve (ALR) status (BC) | Data |
| Greenbelt / conservation overlay | Data |
| Conservation easement status | Data |
| Mineral / subsurface rights separation | Data |
| Water rights / riparian rights | Data |
| Floodplain development restrictions | Data |
| Setback requirements | Data |
| Heritage / archaeological site designation | Data |
| Environmental impact assessment triggers | Data |
| Agricultural use-value assessment eligibility | Data |

> **Cross-ref:** [Data Pipeline](data-pipeline.md) — zoning is listed as Layer 7 but both US and CA adapters are stubbed.

---

## 12. Global Data Coverage

Atlas currently serves US + Ontario only. For global deployment:

| Gap | Source | Resolution |
|-----|--------|------------|
| Global soil properties | SoilGrids (ISRIC) REST API | 250m |
| Global climate data | WorldClim v2.1 / CHELSA | 1km |
| Global agro-ecological zones | FAO GAEZ v4 | varies |
| Global elevation | SRTM / ALOS PALSAR | 30m |
| Global land cover | ESA WorldCover 2021 | 10m |
| Global crop suitability | FAO ECOCROP (2,500+ species) | database |
| Global protected areas | WDPA | vector |
| Global groundwater depth | Fan et al. water table maps | varies |
| European soil data | ESDAC | varies |
| MENA / SE Asia soil data | ISRIC World Soil Database | varies |

---

## 13. Design Intelligence

Atlas has drawing tools but no siting intelligence tied to land data.

| Capability | Gap Type |
|------------|----------|
| Passive solar building orientation | Computation |
| Wind break siting (location + species) | Computation |
| Swale / water harvesting siting | Computation |
| Pond / dam siting and volume estimation | Computation |
| Septic / leach field suitability | Computation |
| Rainwater catchment sizing | Computation |
| Compost / waste system siting | Computation |
| Building footprint optimization | Computation |
| Shadow / shade modeling by season | Computation |
| Fire risk zoning | Computation |

> **Note:** All design intelligence gaps are computation — they combine existing or planned data layers with spatial logic. These depend on upstream data gaps being filled first.

---

## Quick Wins (P0 — implement now)

These gaps require **no new data sources** — the underlying data is already available in Atlas.

### Terrain computation (7 gaps, `tier3-terrain` worker exists)
The USGS 3DEP DEM is live. All of these are standard GIS algorithms on elevation rasters:
1. **Slope aspect** — `atan2(dz/dy, dz/dx)` on DEM grid; classify into 8 cardinal directions
2. **Slope curvature** — second derivative of DEM surface; concave = water collects, convex = drains
3. **Topographic Wetness Index (TWI)** — `ln(contributing_area / tan(slope))`; predicts waterlogging
4. **Terrain Ruggedness Index (TRI)** — mean absolute elevation difference between a cell and its neighbors
5. **Viewshed analysis** — line-of-sight from observer point across DEM; standard r.viewshed algorithm
6. **Cut/fill volume estimation** — difference between existing DEM and proposed design surface
7. **Erosion hazard mapping** — combines slope + aspect + curvature + soil erodibility (needs soil K-factor from SSURGO)

### Soil extended properties (5-8 gaps, SSURGO already connected)
SSURGO's Soil Data Access (SDA) web service already returns `mapunit` and `component` tables. These properties are **in SSURGO but not currently queried** by the adapter:
- pH (`ph1to1h2o` column in `chorizon`)
- CEC (`cec7` column in `chorizon`)
- Bulk density (`dbthirdbar` in `chorizon`)
- Organic matter (`om` in `chorizon`)
- Available water capacity (`awc` in `chorizon`)
- Effective rooting depth (`resdept` in `corestrictions`)
- Hydraulic conductivity (`ksat` in `chorizon`)
- Surface stoniness (`fragvol` in `chfrags`)

> **Implementation note:** These are additional columns in the same SDA query the SSURGO adapter already makes. The effort is primarily adapter extension + UI display, not new API integration.

### Hydrology computation (3 gaps, data available)
- **Evapotranspiration (PET)** — Penman-Monteith or Hargreaves formula from temperature + solar radiation (climate data)
- **Aridity index** — simple ratio: P/PET once both are available
- **Drainage density** — stream length / catchment area from existing watershed boundaries

## Implementation Roadmap

### Sprint A — Terrain Intelligence (P0)
- Extend `tier3-terrain` worker with aspect, curvature, TWI, TRI algorithms
- Surface results in terrain dashboard panel
- **Depends on:** nothing new — DEM data is live

### Sprint B — Soil Depth (P0/P1)
- Extend SSURGO backend adapter to query `chorizon` extended properties
- Extend LIO adapter equivalently for Ontario
- Add soil properties to soil dashboard panel
- **Depends on:** backend SSURGO adapter being implemented (currently stubbed)

### Sprint C — Climate Foundation (P1)
- Integrate WorldClim v2.1 or NASA POWER API
- Compute GDD, frost dates, Koppen classification
- **Depends on:** new API integration

### Sprint D — Formal Scoring (P1)
- Implement FAO S1-N2 classification engine
- Implement USDA LCC I-VIII classification
- Wire into existing scoring engine
- **Depends on:** Sprints B + C complete (soil + climate data)

### Sprint E — Crop Suitability (P2)
- Integrate FAO ECOCROP database
- Build crop-matching engine against site soil + climate profile
- **Depends on:** Sprints B + C + D complete

### Sprint F+ — Remaining categories (P3-P4)
- Renewable energy, infrastructure, ecological, environmental risk, regulatory, global coverage, design intelligence
- Each can be prioritized independently based on user demand
