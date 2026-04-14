# Global Completeness Gap Analysis
**Type:** strategic-plan
**Status:** active
**Source:** `infrastructure/OGDEN Atlas — Global Completeness Gap Analysis.md`
**Benchmarks:** FAO, USDA/NRCS, ASTM E1527-21, IUCN, WRB, AEZ, GAEZ, WDPA

## Purpose
Comprehensive inventory of ~120 gaps between Atlas's current capabilities and what recognized global frameworks require of a credible, globally deployable land intelligence platform. This page is the strategic planning reference for roadmap prioritization across all future sessions.

## Summary

| # | Category | Implemented | Remaining | Dominant Type | Priority | Rationale |
|---|----------|-------------|-----------|---------------|----------|-----------|
| 3 | [Terrain & Topography](#3-terrain--topography) | 8/8 | 0 | Computation | **Complete** | Sprint A: aspect, curvature, TWI, TRI, viewshed, cut/fill, erosion hazard + frost pocket, cold air drainage, TPI |
| 2 | [Soil Assessment](#2-soil-assessment) | 10/16 | 6 | Data | **Mostly Complete** | Sprint B fetched 10+ fields; Sprint G wired CaCO3/Ksat/bulk density into scoring + pH bug fix + Soil Intelligence panel |
| 5 | [Climate](#5-climate) | 8/10 | 2 | Data | **Mostly Complete** | Sprint C: Koppen, freeze-thaw, NASA POWER solar. Remaining: extreme events, climate projections |
| 1 | [Formal Scoring & Classification](#1-formal-scoring--classification) | 6/7 | 1 | Computation | **Nearly Complete** | Sprint D: FAO S1-N2, USDA LCC I-VIII. Sprint G: Hardiness Zone scoring. Sprint I: Canada Soil Capability (Class 1-7), LGP (FAO AEZ). Remaining: fuzzy logic/AHP |
| 6 | [Crop & Vegetation Suitability](#6-crop--vegetation-suitability) | 5/8 | 3 | Data + Computation | **Mostly Complete** | Sprint E: EcoCrop 2071 crops. Sprint G: rain-fed vs irrigated. Remaining: agroforestry, companion planting, invasive/native |
| 4 | [Hydrology](#4-hydrology) | 5/10 | 5 | Mixed | **Partially Complete** | Sprint F: PET, aridity, irrigation demand, RWH, drainage density. Remaining: groundwater, aquifer, seasonal flood, water stress, water quality |
| 11 | [Regulatory & Legal](#11-regulatory--legal) | 0/11 | 11 | Data | **P2** | Critical for real transactions; zoning data is fragmented and hard to source programmatically |
| 9 | [Renewable Energy](#9-renewable-energy) | 0/6 | 6 | Data | **P3** | NASA POWER + Global Wind Atlas have free APIs; high user value but not core land suitability |
| 10 | [Infrastructure & Accessibility](#10-infrastructure--accessibility) | 0/8 | 8 | Data + Computation | **P3** | Distance calcs are straightforward once POI datasets sourced; masjid proximity is OGDEN-differentiator |
| 7 | [Ecological & Biodiversity](#7-ecological--biodiversity) | 1/8 | 7 | Data | **P3** | Sprint I: carbon stock estimation (IPCC formula). WDPA is free; species-at-risk data varies by jurisdiction |
| 13 | [Design Intelligence](#13-design-intelligence) | 0/10 | 10 | Computation | **P3** | All computation — depends on upstream data (terrain + climate + soil) being rich enough |
| 8 | [Environmental Risk & Site History](#8-environmental-risk--site-history) | 0/8 | 8 | Data | **P4** | Phase I ESA data is jurisdiction-specific and often not API-accessible |
| 12 | [Global Data Coverage](#12-global-data-coverage) | 0/10 | 10 | Data | **P4** | SoilGrids, WorldClim, ESA WorldCover expand beyond US+Ontario; strategic but not MVP-blocking |
| | **Total** | **~43/120** | **~77** | | |

> **Priority key:**
> - **P0 — Quick Win:** computation on data Atlas already has; can implement now
> - **P1 — High impact, moderate effort:** free APIs available, high credibility value
> - **P2 — High impact, high effort:** strategic gaps, may need upstream dependencies or fragmented sources
> - **P3 — Medium priority:** valuable but not blocking core use case or credibility
> - **P4 — Long-term:** expands scope beyond current MVP; tackle after P0-P2 are solid

---

## 1. Formal Scoring & Classification

Recognized frameworks that give a land evaluation tool international credibility. Sprint D (2026-04-14) implemented the two primary standards.

| Standard | Body | Gap Type | Status |
|----------|------|----------|--------|
| FAO S1/S2/S3/N1/N2 suitability classification | FAO (1976) | Computation | **Implemented** — 8-factor scoring: pH, rooting depth, drainage, AWC, salinity, CEC, slope, thermal regime |
| USDA Land Capability Classification (LCC I-VIII) | USDA/NRCS | Computation | **Implemented** — 8-limitation model with e/w/s/c subclass notation |
| Canada Soil Capability Classification (Classes 1-7) | AAFC | Computation | Open — similar to USDA LCC but CA-specific thresholds |
| Fuzzy logic membership functions | ALUES/FAO | Computation | Open — advanced; would enhance S1-N2 with gradual transitions |
| AHP multi-criteria weighting | MCDM standard | Computation | Open — user-configurable priority weighting |
| Length of Growing Period (LGP) classification | FAO AEZ | Data + Computation | Open — needs daily temperature/moisture balance model |
| USDA Plant Hardiness Zones | USDA | Data | **Implemented** — computed from coldest monthly minimum (Sprint C); wired into Agricultural Suitability as `hardiness_zone` scoring component (Sprint G) |

> **Status:** 4/7 implemented. FAO and USDA LCC are the two most critical frameworks; both integrated into the scoring engine as ScoredResult entries (weight 0 — classification only). Hardiness Zones now scored as a 5-point component in Agricultural Suitability (Sprint G).
> **Cross-ref:** [Scoring Engine](../concepts/scoring-engine.md) — Atlas now has 9 scored dimensions (7 weighted + 2 classification), 109 scoring components.

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
> **Sprint G additions (2026-04-14):** Wired 3 already-fetched SSURGO fields into Agricultural Suitability scoring: `calcium_carbonate` (CaCO3%, max 4 pts), `permeability` (Ksat, max 4 pts), `compaction_risk` (bulk density, max 3 pts). Fixed `ph_value` → `ph` field name mismatch that caused pH scoring to silently return 0 in both `computeAgriculturalSuitability` and `computeFAOSuitability`. Added collapsible "Soil Intelligence" panel section (8 rows: pH, organic matter, CEC, texture, bulk density, Ksat, CaCO3, rooting depth).
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

Atlas has watershed boundaries, wetlands (partial), and flood zones (partial). Sprint F (2026-04-14) closed 5 computation-based gaps via frontend metrics + backend WatershedRefinementProcessor.

| Parameter | Gap Type | Status |
|-----------|----------|--------|
| Groundwater depth / water table | Data | Open — needs USGS NWIS or state well log APIs |
| Aquifer type and recharge zones | Data | Open — needs USGS aquifer data |
| Evapotranspiration (PET / actual ET) | Computation | **Implemented** — Blaney-Criddle PET + water-limited actual ET (Sprint F); `petMm` and `annualEtMm` in `hydrologyMetrics.ts` |
| Aridity index (P/PET ratio) | Computation | **Implemented** — UNEP 5-class classification: Hyperarid/Arid/Semi-arid/Dry sub-humid/Humid (Sprint F) |
| Irrigation water requirement by crop | Computation | **Implemented** — `irrigationDeficitMm = max(0, PET - effectivePrecip)` (Sprint F); rain-fed vs irrigated badge per crop (Sprint G) |
| Seasonal flooding duration | Data | Open — needs hydrograph / gauge data beyond FEMA binary zones |
| Drainage density | Computation | **Implemented** — D8 flow accumulation channel proxy in WatershedRefinementProcessor; stored as `drainageDensity.drainageDensityKmPerKm2` in watershed_derived summary_data (Sprint F) |
| Water stress index | Data | Open — needs CMIP6 climate projections for future water availability |
| Rainwater harvesting potential | Computation | **Implemented** — `catchmentHa * 10000 * (precipMm/1000) * runoffCoeff * 264.172` gal/yr + 2-week storage sizing (Sprint F) |
| Surface water quality | Data | Open — needs EPA WQP API |

> **Status:** 5/10 implemented (Sprint F). All 5 were computation-on-existing-data. Remaining 5 require new external data sources (USGS NWIS, EPA WQP, CMIP6).
> **UI:** Collapsible "Hydrology Intelligence" section in SiteIntelligencePanel (6 rows: aridity, water balance, PET, harvest potential, storage sizing, irrigation). 4 new Water Resilience scoring components: `water_balance_surplus`, `aridity_class`, `rwh_potential`, `irrigation_feasibility`.

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

Sprint E (2026-04-14) integrated the full FAO EcoCrop database (2071 crops) with a 9-factor matching engine, scoring each crop against site climate + soil conditions using optimal/absolute range interpolation (same method as the OpenCLIM reference implementation).

| Capability | Gap Type | Status |
|------------|----------|--------|
| FAO ECOCROP / GAEZ crop matching (2,000+ species) | Data + Computation | **Implemented** — full 2071-crop DB from OpenCLIM/ecocrop, 9-factor engine (temp, precip, pH, drainage, texture, depth, salinity, growing season, cold hardiness) |
| Rain-fed vs. irrigated suitability distinction | Computation | **Implemented** — Sprint G: `irrigationNeeded` (boolean) + `irrigationGapMm` on CropMatch; compares `site.annualPrecipMm < crop.precipOpt[0]`; displayed as Rain-fed/Irrigation badges in crop list |
| Perennial crop matching (orchard, food forest) | Computation | **Implemented** — lifecycle filter (annual/biennial/perennial) + lifeForm (tree/shrub/vine/herb/grass) |
| Livestock forage suitability | Computation | **Implemented** — forage/pasture category filter covers 400+ forage species in DB |
| Agroforestry species pairing | Computation | Open — requires companion/guild logic beyond single-species matching |
| Companion planting / polyculture compatibility | Data | Open — needs species interaction matrix data |
| Invasive species risk by region | Data | Open — needs USDA NRCS invasive species API |
| Native species library by ecoregion | Data | Open — needs EPA/NatureServe ecoregion-species mapping |

> **Status:** 5/8 implemented. Sprint E: EcoCrop crop matching (most critical gap), forage + perennial matching. Sprint G: rain-fed vs irrigated distinction using hydrology metrics. Remaining 3 gaps (agroforestry pairing, companion planting, invasive/native species) are data-dependent and lower priority.

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

### Completed Sprints (A-G)

| Sprint | Date | Scope | Gaps Closed |
|--------|------|-------|-------------|
| **A** | 2026-04-14 | Terrain Intelligence | 8 — TWI, TRI, aspect, curvature, viewshed, cut/fill, erosion hazard, micro-topography |
| **B** | 2026-04-14 | Soil Extended Properties | 10 — pH, CEC, EC, SAR, CaCO3, Ksat, bulk density, AWC, OC, rooting depth |
| **C** | 2026-04-14 | Climate Foundation | 3 — Koppen classification, freeze-thaw estimation, NASA POWER solar |
| **D** | 2026-04-14 | Formal Scoring | 2 — FAO S1-N2, USDA LCC I-VIII |
| **E** | 2026-04-14 | Crop Suitability | 4 — EcoCrop 2071 crops, perennial matching, forage suitability, lifecycle filtering |
| **F** | 2026-04-14 | Hydrology Intelligence | 5 — PET/ET, aridity index, irrigation demand, RWH, drainage density |
| **G** | 2026-04-14 | Soil + Hardiness + Irrigation | 2 — Hardiness zone scoring, rain-fed vs irrigated. Also: pH bug fix, 3 soil scoring wires, Soil Intelligence panel |
| **H** | 2026-04-14 | Gap Audit + Wiki Update | 0 (documentation sprint) |
| **I** | 2026-04-14 | LGP + Canada Soil Capability + Carbon Stock | 3 — LGP (FAO AEZ), Canada Soil Capability (Class 1-7), Carbon stock estimation (IPCC) |

**Cumulative: ~43/120 gaps closed.** All sprints used frontend-only computation on existing fetched data — no new API adapters were added.

### Next Sprints

#### Sprint I — Remaining Frontend-Computable Gaps (P0)
Gaps that can be closed with existing data + computation:
- **Canada Soil Capability Classification** (Cat 1) — mirrors USDA LCC with CA-specific thresholds; computation-only
- **Length of Growing Period (LGP)** (Cat 1) — PET + monthly precip → moisture-limited growing days; FAO AEZ framework
- **Carbon stock estimation** (Cat 7) — `organicMatterPct * bulkDensity * rootingDepthCm * 0.58 * 10` tC/ha; data already fetched

#### Sprint J — New API Integrations (P1-P2)
Gaps requiring new data sources with free APIs available:
- **Global Wind Atlas API** → wind energy potential (Cat 9); free REST API
- **WDPA REST API** → protected areas overlay (Cat 7); UNEP-WCMC
- **OpenStreetMap Overpass** → distance-to-infrastructure: roads, hospitals, masjids (Cat 10)
- **USGS NWIS** → groundwater depth / water table (Cat 4); US only

#### Deferred (P3-P4)
- Regulatory data (Cat 11) — jurisdiction-specific, fragmented; 11 gaps
- Environmental risk / Phase I ESA (Cat 8) — not API-accessible; 8 gaps
- Global data coverage (Cat 12) — SoilGrids, WorldClim; 10 gaps; strategic expansion
- Design intelligence (Cat 13) — computation, but depends on upstream data richness; 10 gaps
