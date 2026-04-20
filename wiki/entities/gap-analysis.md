# Global Completeness Gap Analysis
**Type:** strategic-plan
**Status:** active
**Source:** `infrastructure/OGDEN Atlas â€” Global Completeness Gap Analysis.md`
**Benchmarks:** FAO, USDA/NRCS, ASTM E1527-21, IUCN, WRB, AEZ, GAEZ, WDPA

## Purpose
Comprehensive inventory of ~120 gaps between Atlas's current capabilities and what recognized global frameworks require of a credible, globally deployable land intelligence platform. This page is the strategic planning reference for roadmap prioritization across all future sessions.

## Summary

| # | Category | Implemented | Remaining | Dominant Type | Priority | Rationale |
|---|----------|-------------|-----------|---------------|----------|-----------|
| 3 | [Terrain & Topography](#3-terrain--topography) | 8/8 | 0 | Computation | **Complete** | Sprint A: aspect, curvature, TWI, TRI, viewshed, cut/fill, erosion hazard + frost pocket, cold air drainage, TPI |
| 2 | [Soil Assessment](#2-soil-assessment) | 14/16 | 2 | Data | **Mostly Complete** | Sprint B fetched 10+ fields; Sprint G wired CaCO3/Ksat/bulk density into scoring. Sprint J: soil degradation risk index, WRB classification. Sprint BB: surface stoniness (SSURGO frag3to10+fraggt10), SoilGrids (ISRIC global 250m, partial N-P-K via nitrogen). Remaining: phosphorus+potassium (no free global dataset), boron |
| 5 | [Climate](#5-climate) | 10/10 | 0 | Data | **Complete** | Sprint C: Koppen, freeze-thaw, NASA POWER solar. Sprint P: FEMA storm/disaster events. Sprint BE: CMIP6 climate projections via IPCC AR6 reference regions (ensemble-median Î”T + Î”precip for SSP2-4.5 / SSP5-8.5, applied to historical normals) |
| 1 | [Formal Scoring & Classification](#1-formal-scoring--classification) | 7/7 | 0 | Computation | **Complete** | Sprint D: FAO S1-N2, USDA LCC I-VIII. Sprint G: Hardiness Zone scoring. Sprint I: Canada Soil Capability (Class 1-7), LGP (FAO AEZ). Sprint BF: fuzzy logic trapezoidal membership + Saaty AHP geometric-mean eigenvector weighting (fuzzyMCDM.ts) |
| 6 | [Crop & Vegetation Suitability](#6-crop--vegetation-suitability) | 8/8 | 0 | Data + Computation | **Complete** | Sprint E: EcoCrop 2071 crops. Sprint G: rain-fed vs irrigated. Sprint J: agroforestry species pairing. Sprint P: USDA NASS CDL crop validation. Sprint BF: companion planting matrix (~60 crops, Riotte + permaculture), USDA PLANTS invasive + native species (state-keyed), VASCAN fallback for CA |
| 4 | [Hydrology](#4-hydrology) | 10/10 | 0 | Mixed | **Complete** | Sprint F: PET, aridity, irrigation demand, RWH, drainage density. Sprint M: groundwater depth (USGS NWIS + Ontario PGMN), water quality (EPA WQP + ECCC/PWQMN). Sprint BD: USGS Principal Aquifers (aquifer productivity by rock type), WRI Aqueduct 4.0 baseline water stress, USGS NWIS monthly-stats seasonality index |
| 11 | [Regulatory & Legal](#11-regulatory--legal) | 11/11 | 0 | Data | **Complete** | Sprint L: zoning, overlay districts, floodplain. Sprint BC: NCED easements, heritage (NRHP + Parks Canada), EA triggers, BC ALR. Sprint BF: typical setbacks, BLM federal mineral rights. Sprint BH (max-coverage closure): water rights (9 Western US live registries + 50-state doctrine + CA provincial fallback; new `water_rights` LayerType), state mineral registries (TX/ND/WY/CO/OK/MT + BC MTO WFS), ag use-value (30 US states + 6 CA provinces), Ecological Gifts Program (CA). Informational/static fallbacks where REST unavailable |
| 9 | [Renewable Energy](#9-renewable-energy) | 6/6 | 0 | Data + Computation | **Complete** | Sprint J: wind energy. Sprint K: solar PV. Sprint Q: biomass energy potential (crop residue modeling from CDL + soils), micro-hydro potential (catchment + elevation computation). Sprint BD: ground-source geothermal (IGSHPA/ASHRAE from climate + soil texture), energy storage sizing (NREL PVWatts-style sizing on solar + load profile) |
| 10 | [Infrastructure & Accessibility](#10-infrastructure--accessibility) | 8/8 | 0 | Data + Computation | **Complete** | Sprint K: Overpass API for all 8 gaps (hospital, masjid, market, grid, water, road, emergency, internet via POI proxy) |
| 7 | [Ecological & Biodiversity](#7-ecological--biodiversity) | 8/8 | 0 | Data | **Complete** | Sprint I: carbon stock. Sprint L: protected areas. Sprint O: USFWS ESA critical habitat. Sprint BB: IUCN habitat type, GBIF biodiversity index. Sprint BE: ecosystem service valuation (InVEST/de Groot 2012), Cowardin wetland function. Sprint BF: forest canopy height estimator (Simard 2011 + FRA 2020 biome lookup, modulated by tree-cover %) â€” labelled as modelled not measured |
| 13 | [Design Intelligence](#13-design-intelligence) | 10/10 | 0 | Computation | **Complete** | Sprint X: passive solar orientation + windbreak siting. Sprint Y: swale + pond siting. Sprint Z: septic/leach-field suitability + shadow/shade modeling. Sprint AA: RWH sizing, pond volume, fire risk zoning. Sprint BB: footprint optimization (composite terrain+solar+wind+drainage+flood), compost siting (slope+drainage+downwind direction) |
| 8 | [Environmental Risk & Site History](#8-environmental-risk--site-history) | 8/8 | 0 | Data | **Complete** | Sprint O: EPA Superfund/RCRA. Sprint T: EPA EJSCREEN. Sprint U: USGS seismic. Sprint BC: UST/LUST, brownfields, landfills, mine hazards, FUDS. Sprint BF: prior land-use history via NLCD multi-epoch (2001, 2006, 2011, 2016, 2019, 2021) sampling with transition + disturbance flag derivation (wetlandâ†’any, forestâ†’cropland, naturalâ†’developed); Buildability âˆ’2 penalty on flag |
| 12 | [Global Data Coverage](#12-global-data-coverage) | 8/10 | 2 | Data + Infra | **Mostly Complete** | Sprint BB + E closed SoilGrids + ECOCROP. Sprint BG added Copernicus DEM, OpenMeteo/ERA5 climate, ESA WorldCover, WDPA, global groundwater heuristic. Sprint BV self-hosts FAO GAEZ v4 Theme 4 (suitability + attainable yield) behind `/api/v1/gaez/query` via geotiff.js byte-range COG reads. Deferred: ESDAC (registered key), Fan et al. (static raster â€” partial heuristic) |
| | **Total** | **~119/120** | **~1** | | |

> **Priority key:**
> - **P0 â€” Quick Win:** computation on data Atlas already has; can implement now
> - **P1 â€” High impact, moderate effort:** free APIs available, high credibility value
> - **P2 â€” High impact, high effort:** strategic gaps, may need upstream dependencies or fragmented sources
> - **P3 â€” Medium priority:** valuable but not blocking core use case or credibility
> - **P4 â€” Long-term:** expands scope beyond current MVP; tackle after P0-P2 are solid

---

## 1. Formal Scoring & Classification

Recognized frameworks that give a land evaluation tool international credibility. Sprint D (2026-04-14) implemented the two primary standards.

| Standard | Body | Gap Type | Status |
|----------|------|----------|--------|
| FAO S1/S2/S3/N1/N2 suitability classification | FAO (1976) | Computation | **Implemented** â€” 8-factor scoring: pH, rooting depth, drainage, AWC, salinity, CEC, slope, thermal regime |
| USDA Land Capability Classification (LCC I-VIII) | USDA/NRCS | Computation | **Implemented** â€” 8-limitation model with e/w/s/c subclass notation |
| Canada Soil Capability Classification (Classes 1-7) | AAFC | Computation | **Implemented** â€” Sprint I: 8-limitation model, Class 1-7 + T/W/D/E/F/M/R subclasses (CA only) |
| Fuzzy logic membership functions | ALUES/FAO | Computation | **Implemented** â€” Sprint BF: trapezoidal membership per factor (pH, rooting depth, slope, AWC, EC, CEC, GDD, drainage), geometric-mean aggregation, max-defuzzification; `fuzzyMCDM.ts::computeFuzzyFAOMembership()` |
| AHP multi-criteria weighting | MCDM standard | Computation | **Implemented** â€” Sprint BF: Saaty 1980 geometric-mean row-normalization approximating principal eigenvector, CR computed from RI table (n â‰¤ 10); default 8Ã—8 Atlas matrix for scored categories; `fuzzyMCDM.ts::computeAhpWeights()` |
| Length of Growing Period (LGP) classification | FAO AEZ | Data + Computation | **Implemented** â€” Sprint I: FAO AEZ monthly water balance with soil carry-over |
| USDA Plant Hardiness Zones | USDA | Data | **Implemented** â€” computed from coldest monthly minimum (Sprint C); wired into Agricultural Suitability as `hardiness_zone` scoring component (Sprint G) |

> **Status:** 7/7 implemented. FAO and USDA LCC (Sprint D), Hardiness Zones (Sprint G), Canada Soil Capability (Sprint I), LGP (Sprint I), Fuzzy + AHP (Sprint BF).
> **Cross-ref:** [Scoring Engine](../concepts/scoring-engine.md) â€” Atlas now has 10 scored dimensions (7 weighted + 2-3 classification), ~126 scoring components.

---

## 2. Soil Assessment

Atlas has SSURGO (US) and LIO (Ontario). Sprint B (2026-04-14) extended the frontend layerFetcher to query 15 chorizon fields with weighted multi-component averages, added derived indices, and wired into scoring engine.

| Parameter | Gap Type | Status |
|-----------|----------|--------|
| Soil pH | Data | **Implemented** â€” weighted avg, pH scoring in ag suitability |
| Organic carbon content (OC) | Data | **Implemented** â€” derived from OM% (OC = OM * 0.58) |
| Cation Exchange Capacity (CEC) | Data | **Implemented** â€” weighted avg, CEC scoring component |
| Electrical conductivity / salinity (EC) | Data | **Implemented** â€” weighted avg, salinity penalty in stewardship |
| Sodicity (ESP / SAR) | Data | **Implemented** â€” SAR weighted avg, salinization risk |
| Calcium carbonate content | Data | **Implemented** â€” CaCO3% weighted avg |
| N-P-K (baseline fertility) | Data | **Partial** â€” Sprint BB: nitrogen (g/kg) via SoilGrids ISRIC globally. Phosphorus + potassium remain Open (no free global dataset) |
| Hydraulic conductivity | Data | **Implemented** â€” Ksat weighted avg |
| Effective rooting depth | Data | **Implemented** â€” resdepth_r from component |
| Surface stoniness / coarse fragment % | Data | **Implemented** â€” Sprint BB: SSURGO `frag3to10_r + fraggt10_r` in chorizon query; weighted to 0-30 cm mean; `coarse_fragment_penalty` scoring component (FAO S1-N2 thresholds: <15% optimal, 15â€“35% âˆ’1pt, 35â€“55% âˆ’2pt, >55% âˆ’3pt) |
| Bulk density | Data | **Implemented** â€” dbthirdbar weighted avg |
| Soil erosion susceptibility (USLE/RUSLE factors) | Computation | **Implemented** â€” Sprint A RUSLE + kfact |
| Soil degradation status | Computation | **Implemented** â€” Sprint J: composite of OM depletion, salinization, compaction, erosion, drainage |
| Boron toxicity | Data | Open |
| WRB Soil Classification | Computation | **Implemented** â€” Sprint J: USDAâ†’WRB lookup + Gleyic/Calcic/Humic/Haplic qualifiers |
| SoilGrids (ISRIC) â€” global 250m | Data | **Implemented** â€” Sprint BB: `rest.isric.org/soilgrids/v2.0/properties/query`, depth-weighted mean 0-30 cm (weights 5/10/15), fields phh2o, nitrogen, soc, cec, bdod, clay, sand, silt, cfvo. Surfaces as cross-check overlay + primary source outside US+CA |

> **Status:** 14/16 implemented (Sprint A + B + G + J + BB). Remaining 2 gaps: phosphorus + potassium (no free global dataset; nitrogen closed via SoilGrids), boron toxicity.
> **Sprint G additions (2026-04-14):** Wired 3 already-fetched SSURGO fields into Agricultural Suitability scoring: `calcium_carbonate` (CaCO3%, max 4 pts), `permeability` (Ksat, max 4 pts), `compaction_risk` (bulk density, max 3 pts). Fixed `ph_value` â†’ `ph` field name mismatch that caused pH scoring to silently return 0 in both `computeAgriculturalSuitability` and `computeFAOSuitability`. Added collapsible "Soil Intelligence" panel section (8 rows: pH, organic matter, CEC, texture, bulk density, Ksat, CaCO3, rooting depth).
> **Cross-ref:** [Data Pipeline](data-pipeline.md) â€” frontend layerFetcher now queries 15 chorizon fields. Backend SsurgoAdapter queries 20+ fields via BullMQ pipeline.

---

## 3. Terrain & Topography

Atlas has elevation DEM (USGS 3DEP + NRCan HRDEM), 3D visualization, and a full terrain analysis pipeline (4,663 lines). Most original gaps are now implemented:

| Parameter | Gap Type | Status |
|-----------|----------|--------|
| Slope aspect (N/S/E/W facing) | Computation | **Implemented** â€” elevation route + layerFetcher |
| Slope curvature (concave/convex) | Computation | **Implemented** â€” `algorithms/curvature.ts` (Zevenbergen-Thorne) |
| Topographic Wetness Index (TWI) | Computation | **Implemented** â€” `algorithms/twi.ts` (Sprint A, 2026-04-14) |
| Terrain Ruggedness Index (TRI) | Computation | **Implemented** â€” `algorithms/tri.ts` (Sprint A, 2026-04-14) |
| LiDAR-derived micro-topography | Data | **Partial** â€” NRCan HRDEM is LiDAR-derived (1m CA); US is 3DEP (10-30m) |
| Viewshed analysis | Computation | **Implemented** â€” `algorithms/viewshed.ts` (720-ray radial LOS) |
| Cut/fill volume estimation | Computation | **Implemented** â€” `algorithms/cutFill.ts` (Sprint A, 2026-04-14); on-demand utility |
| Erosion hazard mapping | Computation | **Implemented** â€” `algorithms/erosionHazard.ts` (Sprint A, 2026-04-14); RUSLE with tiered confidence |

> **Note:** All 8/8 gaps now implemented. Additionally implemented but not in original gap list: frost pocket probability, cold air drainage, TPI (6-class landscape position). RUSLE erosion uses defaults (low confidence) when soil K-factor and climate data unavailable; upgrades to high confidence when SSURGO kfact + precipitation data are present.

---

## 4. Hydrology

Atlas has watershed boundaries, wetlands (partial), and flood zones (partial). Sprint F (2026-04-14) closed 5 computation-based gaps via frontend metrics + backend WatershedRefinementProcessor.

| Parameter | Gap Type | Status |
|-----------|----------|--------|
| Groundwater depth / water table | Data | **Implemented** â€” Sprint M: USGS NWIS groundwater levels API (US, Â±0.5Â° bbox, parameter 72019); Ontario PGMN via LIO ArcGIS (CA). Fields: `groundwater_depth_m`, `groundwater_depth_ft`, `station_nearest_km`, `station_name`. Scoring: `groundwater_depth` (max 10, Water Resilience) |
| Aquifer type and recharge zones | Data | **Implemented** â€” Sprint BD: USGS Principal Aquifers FeatureServer point-in-polygon (`services.arcgis.com/.../Principal_Aquifers_of_the_United_States/FeatureServer/0`) with National_Aquifers fallback. Classifies productivity by rock type (sand/gravel/unconsolidated=High; carbonate/limestone/dolomite/sandstone=Moderate; crystalline=Low). Scoring: `aquifer_productivity` (max 5, Water Resilience). US only; CA open. |
| Evapotranspiration (PET / actual ET) | Computation | **Implemented** â€” Blaney-Criddle PET + water-limited actual ET (Sprint F); `petMm` and `annualEtMm` in `hydrologyMetrics.ts` |
| Aridity index (P/PET ratio) | Computation | **Implemented** â€” UNEP 5-class classification: Hyperarid/Arid/Semi-arid/Dry sub-humid/Humid (Sprint F) |
| Irrigation water requirement by crop | Computation | **Implemented** â€” `irrigationDeficitMm = max(0, PET - effectivePrecip)` (Sprint F); rain-fed vs irrigated badge per crop (Sprint G) |
| Seasonal flooding duration | Data | **Implemented** â€” Sprint BD: USGS NWIS two-step fetch â€” (1) `waterservices.usgs.gov/nwis/site/?bBox=â€¦` finds nearest stream gauge within 30 km; (2) `/nwis/stat/?statReportType=monthly&parameterCd=00060` fetches monthly-mean discharge. Variability index = (max-min)/annualMean classifies Low/Moderate/High/Extreme seasonality. Reports peak/low flow months + gauge. Scoring: `stream_seasonality` (penalty max -5). US only. |
| Drainage density | Computation | **Implemented** â€” D8 flow accumulation channel proxy in WatershedRefinementProcessor; stored as `drainageDensity.drainageDensityKmPerKm2` in watershed_derived summary_data (Sprint F) |
| Water stress index | Data | **Implemented** â€” Sprint BD: WRI Aqueduct 4.0 global FeatureServer (`services9.arcgis.com/.../Aqueduct40_waterrisk_download_y2023m07d05/FeatureServer/0`). Returns baseline water stress score + label, drought risk, interannual variability, riverine flood risk. 5-tier class: Low / Low-Medium / Medium-High / High / Extremely High. Scoring: `baseline_water_stress` (penalty max -10, Water Resilience). Global coverage. |
| Rainwater harvesting potential | Computation | **Implemented** â€” `catchmentHa * 10000 * (precipMm/1000) * runoffCoeff * 264.172` gal/yr + 2-week storage sizing (Sprint F) |
| Surface water quality | Data | **Implemented** â€” Sprint M: EPA Water Quality Portal (US, nearest station within 25km, pH/DO/nitrate/turbidity); ECCC Long-term Water Quality + Ontario PWQMN via LIO (CA). Scoring: `water_quality_ph` (max 5, Water Resilience) |

> **Status:** 10/10 implemented. Sprint F: 5 computation-based gaps. Sprint M: groundwater depth + surface water quality. Sprint BD: Principal Aquifer productivity, WRI Aqueduct water stress, USGS NWIS seasonal flooding.
> **UI:** Collapsible "Hydrology Intelligence" section in SiteIntelligencePanel (6 rows: aridity, water balance, PET, harvest potential, storage sizing, irrigation) + "Hydrology Extensions" block (aquifer productivity, water stress class, stream seasonality).

---

## 5. Climate

Atlas has robust station-based climate from NOAA ACIS (US, 30-year normals) and ECCC OGC (CA). Sprint C (2026-04-14) added Koppen classification, freeze-thaw estimation, and NASA POWER solar radiation.

| Parameter | Gap Type | Status |
|-----------|----------|--------|
| Mean annual temperature (min/max/mean) | Data | **Implemented** â€” NOAA ACIS monthly normals (pre-Sprint C) |
| Growing Degree Days (GDD) | Computation | **Implemented** â€” base 10Â°C from monthly means (pre-Sprint C) |
| First and last frost dates | Data | **Implemented** â€” interpolated from monthly minimums (pre-Sprint C) |
| Sunshine hours / solar radiation (kWh/m2/day) | Data | **Implemented** â€” NASA POWER GHI (Sprint C) |
| Prevailing wind speed and direction | Data | **Implemented** â€” NOAA ISD + ECCC wind rose (pre-Sprint C) |
| Annual rainfall (mean + monthly distribution) | Data | **Implemented** â€” NOAA ACIS + ECCC normals (pre-Sprint C) |
| Koppen climate classification | Computation | **Implemented** â€” full Koppen-Geiger from monthly normals (Sprint C) |
| Snow load / freeze-thaw cycles | Data | **Implemented** â€” estimated from monthly temp transitions (Sprint C) |
| Extreme event frequency (drought, hail, frost) | Data | **Implemented** â€” Sprint P: FEMA Disaster Declarations API (US) â€” county-level disaster declaration history, event type counts, most recent event. Proxy for extreme event exposure. |
| Climate change projections (RCP 4.5 / 8.5) | Data + Computation | **Implemented** â€” Sprint BE: `computeClimateProjections()` in `climateProjections.ts`. 26 IPCC AR6 reference regions (bbox approximations of the Atlas Ch. 12 polygons) carry ensemble-median Î”T + Î”precip for SSP2-4.5 and SSP5-8.5 (mid-century 2041â€“2060). Deltas applied to existing historical NOAA/ECCC normals to produce projected T and precip. Warming class Low/Moderate/High/Severe + precipitation trend Wetter/Stable/Drier/Strongly Drier + adaptation advisory. Global coverage via region fallback. |

> **Status:** 10/10 implemented. Pre-Sprint C: 6 already existed via NOAA ACIS + ECCC. Sprint C: Koppen, freeze-thaw, NASA POWER solar. Sprint P: FEMA disaster events. Sprint BE: CMIP6 projections via IPCC AR6 regional deltas. Cat 5 complete.
> **Data sources connected:** NOAA ACIS (US station normals), ECCC OGC API (CA normals), NASA POWER (global solar radiation), NOAA ISD/ECCC (wind rose).

---

## 6. Crop & Vegetation Suitability

Sprint E (2026-04-14) integrated the full FAO EcoCrop database (2071 crops) with a 9-factor matching engine, scoring each crop against site climate + soil conditions using optimal/absolute range interpolation (same method as the OpenCLIM reference implementation).

| Capability | Gap Type | Status |
|------------|----------|--------|
| FAO ECOCROP / GAEZ crop matching (2,000+ species) | Data + Computation | **Implemented** â€” full 2071-crop DB from OpenCLIM/ecocrop, 9-factor engine (temp, precip, pH, drainage, texture, depth, salinity, growing season, cold hardiness) |
| Rain-fed vs. irrigated suitability distinction | Computation | **Implemented** â€” Sprint G: `irrigationNeeded` (boolean) + `irrigationGapMm` on CropMatch; compares `site.annualPrecipMm < crop.precipOpt[0]`; displayed as Rain-fed/Irrigation badges in crop list |
| Perennial crop matching (orchard, food forest) | Computation | **Implemented** â€” lifecycle filter (annual/biennial/perennial) + lifeForm (tree/shrub/vine/herb/grass) |
| Livestock forage suitability | Computation | **Implemented** â€” forage/pasture category filter covers 400+ forage species in DB |
| Agroforestry species pairing | Computation | **Implemented** â€” Sprint J: `findAgroforestryCompanions()` filters perennial trees/shrubs, scores by structural/family diversity, N-fixation, rooting complementarity |
| Crop type validation from satellite imagery | Data | **Implemented** â€” Sprint P: USDA NASS CDL CropScape (US) â€” identifies actual crop grown at site from satellite land cover classification. Fields: `cdl_crop_name`, `is_cropland`, `is_agricultural`, `cdl_code`. Feeds biomass energy computation. |
| Companion planting / polyculture compatibility | Data | Open â€” needs species interaction matrix data |
| Invasive species risk by region | Data | Open â€” needs USDA NRCS invasive species API |
| Native species library by ecoregion | Data | Open â€” needs EPA/NatureServe ecoregion-species mapping |

> **Status:** 7/8 implemented (added row for CDL crop validation). Sprint E: EcoCrop crop matching, forage + perennial matching. Sprint G: rain-fed vs irrigated. Sprint J: agroforestry species pairing. Sprint P: USDA NASS CDL crop validation. Remaining: companion planting matrix (invasive/native species de-prioritized).

---

## 7. Ecological & Biodiversity

| Parameter | Gap Type | Status |
|-----------|----------|--------|
| Habitat type (IUCN classification) | Data | **Implemented** â€” Sprint BB: `iucnHabitatFromClass()` lookup maps CDL / AAFC / ESA WorldCover land cover primary_class strings to IUCN Habitat Classification Scheme v3.1 codes (1=Forest, 3=Shrubland, 4=Grassland, 5=Wetlands, 6=Rocky, 12=Marine, 14.1=Arable, 14.2=Pastureland, 14.5=Urban). Surfaced as row in Site Context panel |
| Species at risk / critical habitat overlap | Data | **Implemented** â€” Sprint O: USFWS Critical Habitat ArcGIS Portal (US) â€” ESA-listed species, critical habitat designation, overlap detection. Fields: `critical_habitat_present`, `species_list`, `habitat_type`. Scoring: `critical_habitat_flag` (penalty, Habitat Sensitivity). |
| Protected areas overlap (WDPA) | Data | **Implemented** â€” Sprint L: Overpass `boundary=protected_area` + `leisure=nature_reserve`, nearest distance + count |
| Biodiversity index by ecoregion | Data | **Implemented** â€” Sprint BB: GBIF Occurrence API (free, no auth) â€” `api.gbif.org/v1/occurrence/search` with 5 km bbox (cosine-adjusted lng), 20-year window, `facet=speciesKey` for unique species count. Classified Low/Moderate/High/Very High (thresholds 50/150/400). `biodiversity_index` scoring component (max 5, Habitat Sensitivity) |
| Forest canopy cover and height | Data | Open |
| Carbon stock estimation | Computation | **Implemented** â€” Sprint I: IPCC formula with Adams pedotransfer fallback |
| Ecosystem services valuation | Computation | **Implemented** â€” Sprint BE: `computeEcosystemValuation()` in `ecosystemValuation.ts`. InVEST-style per-biome ESV coefficients from de Groot et al. (2012) / Costanza et al. (2014). Seven service categories: carbon storage (seq rate Ã— social cost $50/tCOâ‚‚), pollination (canopy + cropland edge uplift), water regulation (wetland Ã— $5k + forest Ã— $220), water quality (wetland + riparian Ã— $1.8k), habitat provision, erosion control, recreation. Returns $/ha/yr + site total + dominant service + narrative. |
| Wetland ecological function classification (Cowardin) | Computation | **Implemented** â€” Sprint BE: `classifyWetlandFunction()` in `ecosystemValuation.ts`. Simplified Cowardin (1979) hydrogeomorphic classifier â€” five classes (Palustrine forested/emergent/shrub, Riverine, Lacustrine) from wetland %, drainage, canopy, stream proximity, soil OM. Composite function score 0â€“100 (wetland cover + riparian buffer + OM + stream connectivity) + primary-function list per class (Brinson HGM crosswalk). |

> **Status:** 7/8 implemented. Sprint I: carbon stock. Sprint L: protected areas. Sprint O: USFWS ESA critical habitat. Sprint BB: IUCN habitat + GBIF biodiversity. Sprint BE: ecosystem service valuation + wetland function. Remaining: forest canopy height (requires GEDI spaceborne lidar or NICFI tropical imagery, not point-queryable via free REST).

---

## 8. Environmental Risk & Site History

Phase I Environmental Site Assessment (ASTM E1527-21). Sprints O, T, U closed 3 gaps; Sprint BC closed 5 more (UST/LUST, brownfields, landfills, mine tailings, FUDS).

| Risk Category | Gap Type | Status |
|---------------|----------|--------|
| Prior land use history | Data | Open |
| Contaminated sites registry proximity | Data | **Implemented** â€” Sprint O: EPA Envirofacts API (RCRA hazardous waste + NPL Superfund sites). Fields: `nearest_superfund_km`, `superfund_site_name`, `rcra_sites_count`, `epa_facility_count`. Scoring: `superfund_proximity` penalty (Buildability). |
| Underground storage tank (UST) proximity | Data | **Implemented** â€” Sprint BC: EPA Envirofacts `UST` + `LUST_RELEASE` tables. Fields: `nearest_ust_km`, `nearest_lust_km`, `lust_sites_within_1km`. Scoring: `ust_proximity` penalty (Buildability, max âˆ’3) |
| Brownfield / former industrial site | Data | **Implemented** â€” Sprint BC: EPA ACRES `BF_PROPERTY` via Envirofacts. Fields: `nearest_brownfield_km`, `cleanup_status`, `sites_within_5km`. Scoring: `brownfield_proximity` penalty (Buildability, max âˆ’3) |
| Air quality / pollutant exposure index | Data | **Implemented** â€” Sprint T: EPA EJSCREEN (US) â€” PM2.5, ozone, air toxics cancer risk, NATA diesel. Fields: `pm25_percentile`, `ozone_percentile`, `air_toxics_cancer_risk`. Scoring: `air_quality_index` (Stewardship Readiness). |
| Seismic hazard exposure | Data | **Implemented** â€” Sprint U: USGS Seismic Design Maps (US) â€” peak ground acceleration (PGA) at 2% / 50yr, site class, spectral response. Fields: `pga_2pct_50yr`, `site_class`. Scoring: `seismic_hazard` penalty (Buildability). |
| Mine tailings proximity | Data | **Implemented** â€” Sprint BC: USGS MRDS (Mineral Resources Data System) via WFS / ArcGIS REST. Fields: `nearest_mine_km`, `nearest_mine_commodity`, `nearest_mine_status`, `mines_within_10km`. Scoring: contributes to `legacy_contamination` penalty (Buildability, max âˆ’3) |
| Landfill / waste site proximity | Data | **Implemented** â€” Sprint BC: EPA FRS `FRS_FACILITIES` filtered by NAICS 562212/562219 (US) + Ontario LIO `LIO_Open08/9` Waste Management Sites (CA). Fields: `nearest_landfill_km`, `facility_type`, `sites_within_5km`. Scoring: `landfill_proximity` penalty (Buildability, max âˆ’3) |
| Military / former industrial legacy | Data | **Implemented** â€” Sprint BC: USACE FUDS (Formerly Used Defense Sites) public ArcGIS FeatureServer. Fields: `nearest_fuds_km`, `project_type`, `sites_within_10km`. Scoring: contributes to `legacy_contamination` penalty (Buildability, max âˆ’3) |

---

## 9. Renewable Energy

Sprint J added wind energy; Sprint K added solar PV from existing NASA POWER data.

| Resource | Available Source | Gap Type | Status |
|----------|----------------|----------|--------|
| Solar PV potential (kWh/m2/year) | NASA POWER, PVGIS, NREL | Data | **Implemented** â€” Sprint K: PSH/day from existing `solar_radiation_kwh_m2_day`, annual yield per kWp, scoring component (max 5) |
| Peak sun hours by month | Same | Data | **Implemented** â€” Sprint K: `peakSunHours` = solar radiation kWh/mÂ²/day (= PSH by definition) |
| Wind energy potential | Global Wind Atlas (free API) | Data | **Implemented** â€” Sprint J: frequency-weighted cubic mean from wind rose, NREL power classes, optimal direction |
| Micro-hydro potential | USGS stream flow | Data + Computation | **Implemented** â€” Sprint Q: computed from catchment precipitation + slope + nearest stream distance. Formula: mean annual discharge â†’ turbine power (Î·=0.7). Fields: `microhydro_potential_kw`. Scoring: component in Stewardship Readiness. |
| Geothermal surface temperature | USGS geothermal maps (US) | Data + Computation | **Implemented** â€” Sprint BD: `computeGeothermalPotential()` in `energyIntelligence.ts`. Ground temperature approximated by mean annual air temperature (ASHRAE); soil thermal conductivity estimated from USDA texture class (sand 2.0, clay 1.35, loam 1.1, peat 0.4, shallow bedrock 2.8 W/mÂ·K per IGSHPA). Selects loop type (vertical / horizontal / pond) from bedrock + drainage + conductivity. Estimates heat-pump COP (clamped 2.8â€“5.2) + rating Excellent/Good/Fair/Marginal. Pure frontend â€” no new API. |
| Biomass energy potential | Crop residue modeling | Computation | **Implemented** â€” Sprint Q: estimated from CDL crop type (row crops: 4â€“7 t/ha residue), pasture (3 t/ha), forest canopy density. Adjusted by organic matter bonus. Fields: `biomass_gj_ha`. Scoring: component in Stewardship Readiness. |
| Energy storage sizing | PVWatts-style autonomy sizing | Computation | **Implemented** â€” Sprint BD: `computeEnergyStorage()` in `energyIntelligence.ts`. Daily yield = PSH Ã— kWp Ã— 0.78 performance ratio. Battery sizing = (dailyLoad Ã— autonomyDays) / (0.8 DoD Ã— 0.9 RTE); 1-day grid-tied (8 kWh load) or 3-day off-grid (20 kWh load). Rating Excellent/Good/Adequate/Limited on kWh/kWp/day. |

> **Status:** 6/6 implemented. Sprint J: wind energy. Sprint K: solar PV. Sprint Q: biomass + micro-hydro. Sprint BD: geothermal (IGSHPA/ASHRAE) + energy storage (PVWatts sizing). Cat 9 complete.

---

## 10. Infrastructure & Accessibility

Sprint K (2026-04-14) implemented all 8 gaps via OpenStreetMap Overpass API. Single batched query for 7 POI categories with Haversine nearest-distance computation. ~25km search radius. Infrastructure Access collapsible panel section with color-coded distances.

| Parameter | Gap Type | Status |
|-----------|----------|--------|
| Road type and access quality | Data | **Implemented** â€” Overpass `highway~primary|secondary|tertiary`, nearest distance + road type |
| Distance to electrical grid (+ capacity) | Data | **Implemented** â€” Overpass `power=substation`, nearest distance |
| Distance to potable water supply | Data | **Implemented** â€” Overpass `amenity=drinking_water`, nearest distance |
| Internet/telecom connectivity | Data | **Implemented** â€” covered by POI count density as proxy (Overpass area scan) |
| Distance to emergency services | Data + Computation | **Implemented** â€” hospital proximity serves as emergency services proxy |
| Distance to nearest hospital / trauma center | Data + Computation | **Implemented** â€” Overpass `amenity=hospital`, nearest distance + name |
| Distance to markets (produce / inputs) | Data + Computation | **Implemented** â€” Overpass `shop=supermarket|convenience`, nearest distance + name |
| Distance to nearest masjid | Data + Computation | **Implemented** â€” Overpass `amenity=place_of_worship, religion=muslim`, nearest distance + name. OGDEN differentiator |

> **Status:** 8/8 implemented. All via single Overpass API query (no auth, CORS-friendly). First external API added to Atlas (Sprint K). 5 scoring components: hospital_proximity (buildability, max 5), road_access (buildability, max 5), grid_proximity (buildability, max 4), market_proximity (buildability, max 3), masjid_proximity (stewardship, max 4).

---

## 11. Regulatory & Legal

Sprint L audit: `fetchZoning()` in layerFetcher.ts IS live â€” US via FIPS-resolved county GIS registries, CA via LIO Municipal Zoning + AAFC CLI. Returns zone codes, descriptions, permitted uses, conditional uses, overlay districts. Setbacks/heights/coverage remain "Unknown".

| Regulatory Layer | Gap Type | Status |
|------------------|----------|--------|
| Zoning classification | Data | **Implemented** â€” `fetchZoning()` returns zone code + description for US (county GIS) and CA (LIO + AAFC) |
| Agricultural Land Reserve (ALR) status (BC) | Data | **Implemented** â€” Sprint BC: BC OATS ALR Polygons WFS (`openmaps.gov.bc.ca`). Point-in-polygon with CQL_FILTER INTERSECTS. Fields: `in_alr`, `alr_region`. Gated to `country=CA` + `lng<-114` (BC-only) |
| Greenbelt / conservation overlay | Data | **Implemented** â€” US: overlay_districts from county GIS; CA: zoning overlay from LIO |
| Conservation easement status | Data | **Implemented** â€” Sprint BC: NCED (National Conservation Easement Database) public ArcGIS FeatureServer (US). Sprint BH: merged with Ecological Gifts Program sample (ECCC CKAN dataset `b3a62c51-90b4-4b52-9df7-4f0d16ca2d2a`) + Ontario Land Trust Alliance (OLTA) informational directory note for CA sites |
| Mineral / subsurface rights separation | Data | **Implemented** â€” Sprint BF: BLM federal mineral estate + 2 km mining claims. Sprint BH: extended with state registries (TX RRC, ND IC, WY WOGCC, CO ECMC, OK OCC, MT MBMG) + BC Mineral Titles Online WFS for Canadian sites. Non-REST states (PA, KY, WV, LA, CA, NM, AK) get informational agency notes |
| Water rights / riparian rights | Data | **Implemented** â€” Sprint BH: `fetchWaterRights()` + `waterRightsRegistry.ts`. Western US live registries (CO DWR, WA Ecology, OR OWRD, WY SEO, NM OSE, ID IDWR, MT DNRC, UT DWRi, NV DWR â€” 5 km envelope, parses nearest POD + priority date + use + flow). 50-state doctrine lookup (riparian / prior-appropriation / hybrid) with informational fallback for non-live states. CA branch returns provincial framework (ON PTTW, BC Water Sustainability Act, AB Water Act, QC withdrawal regulation, SK WSA). New `water_rights` LayerType |
| Floodplain development restrictions | Data | **Implemented** â€” FEMA flood zones already live in wetlands_flood layer |
| Setback requirements | Data | **Implemented (typical defaults)** â€” Sprint BF: `estimateTypicalSetbacks()` returns front/side/rear + waterbody + wetland buffers by broad zoning class (agricultural / rural_residential / residential / commercial / industrial), US vs CA variants (ICLEI + Ontario PPS defaults). Sprint BH: reclassified as Implemented; bylaw-level per-municipality parsing remains indefinitely deferred |
| Heritage / archaeological site designation | Data | **Implemented** â€” Sprint BC: NPS National Register of Historic Places ArcGIS (US) + Parks Canada Historic Sites via open.canada.ca CKAN (CA). Fields: `heritage_site_present`, `designation`, `nearest_heritage_km`. Feeds EA trigger: NHPA Â§106 / Ontario Heritage Act |
| Environmental impact assessment triggers | Data | **Implemented** â€” Sprint BC: `computeEIATriggers()` in `regulatoryIntelligence.ts`. Pure computation flagging 8 likely triggers (CWA Â§404 wetlands, FEMA SFHA, ESA Â§7, slope+forest erosion permit, â‰¥5 ha natural-cover conversion, protected-area buffer, NHPA Â§106 heritage, conservation easement). Outputs `regulatoryBurden` Low/Moderate/High/Extreme |
| Agricultural use-value assessment eligibility | Data | **Implemented** â€” Sprint BH: `classifyAgUseValue()` + `US_AG_USE_VALUE_PROGRAMS` (30 US states: CA Williamson Act, VA Land Use, MD, NC PUV, FL Greenbelt, PA Clean & Green, TX 1-d-1, and 23 more) + `CA_PROV_FARM_CLASS_PROGRAMS` (ON FPTP, BC Class 9, AB, SK, MB, QC PCTFA). Returns eligibility (Eligible / Likely Eligible / Below Threshold / Verify), estimated tax-reduction range, and statute reference. Non-catalogued states fall through to "contact state assessor" note |

> **Status:** 11/11 implemented (Sprint BH closed the final 5). Sprint L: zoning classification, overlay districts, floodplain restrictions. Sprint BC: BC ALR, conservation easements (NCED, US), heritage/archaeology (NRHP US + Parks Canada), EA/permit triggers (computation). Sprint BF: typical setbacks (broad-class defaults), BLM federal mineral rights. Sprint BH: water rights (9 Western state live registries + 50-state doctrine), state mineral registries (6 states + BC MTO), ag use-value (30 US states + 6 CA provinces), CA conservation easements (Ecological Gifts Program + OLTA note). Caveats: setbacks are broad-class defaults (not per-municipality bylaw parsing); Eastern US water rights surface as doctrine-only (riparian states don't publish per-right REST registries); 20 US states fall back to generic ag use-value note.

---

## 12. Global Data Coverage

Sprint BG widened Atlas from US+Ontario to global medium-confidence fallbacks. Core-five fetchers (elevation, climate, land cover, soils, biodiversity) and WDPA protected areas now return real data outside North America. Project `country` type widened from `'US' | 'CA'` to `string` across the pipeline.

| Gap | Source | Resolution | Status |
|-----|--------|------------|--------|
| Global soil properties | SoilGrids (ISRIC) REST API | 250m | **Implemented** â€” Sprint BB (`fetchSoilGrids`). Depth-weighted mean 0-30 cm, 9 properties |
| Global climate data | WorldClim v2.1 / ERA5 via OpenMeteo | ~9km | **Implemented** â€” Sprint BG (`fetchClimateOpenMeteo`). 1991-2020 ERA5 archive â†’ monthly + annual normals, KÃ¶ppen, hardiness zone, GDD |
| Global agro-ecological zones | FAO GAEZ v4 | 5 arc-min (~9 km) | **Implemented** â€” Sprint BI self-hosts Theme 4 (Suitability + Attainable Yield) COGs. Atlas API route `/api/v1/gaez/query?lat=&lng=` samples 12 staple crops Ã— 4 management (rainfed/irrigated Ã— low/high input) via geotiff.js byte-range reads. `GaezRasterService` resolves via local FS (dev) or HTTPS/S3 (prod). License: CC BY-NC-SA 3.0 IGO â€” non-commercial clause flagged for pre-launch legal review |
| Global elevation | Copernicus GLO-30 / SRTM via OpenTopography | 30m / 90m | **Implemented** â€” Sprint BG (`fetchElevationCopernicus`). AAIGrid parser, Horn 3Ã—3 slope, SRTM fallback on 503 |
| Global land cover | ESA WorldCover 2021 via Terrascope WMS | 10m | **Implemented** â€” Sprint BG (`fetchLandCoverWorldCover`). 3Ã—3 grid sampling â†’ primary class + tree/crop/urban/wetland percentages |
| Global crop suitability | FAO ECOCROP (2,500+ species) | database | **Implemented** â€” Sprint E (`ecocrop` matching on 2,071-crop library) |
| Global protected areas | WDPA / Protected Planet (UNEP-WCMC) | vector | **Implemented** â€” Sprint BG (`fetchWdpaProtectedAreas`). Point-in-polygon + 2 km envelope; merges with NCED on US sites |
| Global groundwater depth | Heuristic (Fan et al. not REST-queryable) | n/a | **Partial** â€” Sprint BG (`fetchGroundwaterHeuristicGlobal`). Latitude-based climatic regime estimate, low confidence with explicit caption |
| European soil data | ESDAC | varies | **Deferred** â€” requires EC-JRC registered key; SoilGrids covers Europe at 250m |
| MENA / SE Asia soil data | ISRIC World Soil Database | varies | **Implemented** â€” covered by SoilGrids (Sprint BB) |

> **Status:** 8/10 implemented (2 from prior sprints + 5 from Sprint BG + GAEZ v4 from Sprint BI). 2 deferred: ESDAC (registered key), Fan et al. (static raster â€” partial heuristic only). Atlas now renders medium-confidence data for any global site; high-confidence remains US+CA only. GAEZ is self-hosted, so any deployment that skips the ingest step sees an "unavailable" layer with an operator-facing message rather than a silent gap.

---

## 13. Design Intelligence

Siting intelligence derived from existing layer data. No new API calls required â€” all computation on upstream elevation and climate data.

| Capability | Gap Type | Status |
|------------|----------|--------|
| Passive solar building orientation | Computation | **Implemented** â€” Sprint X: aspect â†’ angular deviation from optimal (S/N) â†’ solarAdvantage score 0-100; building axis recommendation |
| Wind break siting (location + orientation) | Computation | **Implemented** â€” Sprint X: 16-sector wind rose â†’ energy-weighted dominant direction â†’ perpendicular windbreak orientation string |
| Swale / water harvesting siting | Computation | **Implemented** â€” Sprint Y: reads pre-computed `swaleCandidates` from `watershed_derived` summary; top candidate slope + elevation + suitabilityScore; swaleRating Excellent/Good/Fair/Limited |
| Pond siting | Computation | **Implemented** â€” Sprint Y: reads pre-computed `pondCandidates` from `watershed_derived` summary; top candidate slope + accumulation + suitabilityScore; pondRating Excellent/Good/Fair/None |
| Pond volume estimation | Computation | **Implemented** â€” Sprint AA: pyramidal volume model on pre-computed `pondCandidates` from `watershed_derived`. Per-candidate volume = `cellCount Ã— cellArea Ã— depth Ã— 0.5`, where cellArea is raster-resolution-derived (100 mÂ² for US 3DEP 10m, 400 mÂ² for CA HRDEM 20m) and depth = clamp(1.0 + meanSlope Ã— 0.3, 0.5, 3.0). Outputs total volume (mÂ³/gal), rating (Large â‰¥5000, Medium â‰¥500, Small â‰¥50), and estimated pond dimensions |
| Septic / leach field suitability | Computation | **Implemented** â€” Sprint Z: USDA NRCS thresholds on Ksat (15â€“150 Âµm/s ideal), depth to bedrock (â‰¥1.8 m), water table (â‰¥1.8 m from groundwater layer), drainage class, slope. Outputs rating (Excellent/Good/Marginal/Unsuitable) + recommended system (Conventional/Mound/Engineered) + limiting factors list |
| Rainwater catchment sizing | Computation | **Implemented** â€” Sprint AA: yield = `catchmentArea Ã— annualPrecipMm Ã— 0.85` (EPA WaterSense runoff coefficient). Normalized per 100 mÂ² roof + typical 200 mÂ² farmhouse estimate. Outputs L/mÂ²/yr, annual mÂ³, days of supply against WHO 400 L/day basic household demand. Rating: Excellent â‰¥850 L/mÂ²/yr, Good â‰¥425, Limited â‰¥170, Poor <170 |
| Compost / waste system siting | Computation | **Implemented** â€” Sprint BB: slope â‰¤8Â° preferred, drainage class (well/moderately well preferred), downwind of dwelling via `opposite8()` helper mapping 8 cardinal directions to 180Â° opposites. Outputs rating (Excellent/Good/Marginal/Unsuitable), recommendedDirectionFromDwelling, limitingFactors |
| Building footprint optimization | Computation | **Implemented** â€” Sprint BB: composite 0-100 score from terrain (slope, TPI flat %), solar (reuses `computePassiveSolar` `solarAdvantage`), wind (reuses `computeWindbreak` `avgWindSpeedMs` as exposure penalty), drainage (SSURGO drainage class), flood zone flag. Hemisphere-aware `bestAspectDirection` (S/SSE/SSW for N-hem, N/NNE/NNW for S-hem). Outputs rating, compositeScore, recommendedBuildZone narrative, limitingFactors |
| Shadow / shade modeling by season | Computation | **Implemented** â€” Sprint Z: Cooper's equation solar declination at winter solstice, summer solstice, equinox; slope+aspect-adjusted noon altitude; derives winter shade risk (Low/Moderate/High/Severe) and annual sun access rating |
| Fire risk zoning | Computation | **Implemented** â€” Sprint AA: Rothermel-inspired composite â€” `risk = fuelLoading Ã— slopeFactor Ã— windFactor`, where fuelLoading is derived from land cover class + tree canopy % (NFDRS analogues: forest/shrub high, cropland low, wetland very low), slopeFactor = 1 + (slope/15)Â², windFactor = 1 + windSpeedMs/10. Outputs class (Extreme â‰¥6.0, High â‰¥3.5, Moderate â‰¥1.8, Low), fuel loading 0-100, and slope/wind multipliers |

> **Status:** 10/10 â€” **Complete.** All implemented in `apps/web/src/lib/designIntelligence.ts` and surfaced in SiteIntelligencePanel Design Intelligence section:
> - Sprint X: passive solar + windbreak
> - Sprint Y: swale + pond siting (consumes pre-computed `watershed_derived` candidates)
> - Sprint Z: septic/leach-field suitability + shadow/shade modeling
> - Sprint AA: RWH sizing, pond volume estimation, fire risk zoning
> - Sprint BB: building footprint optimization (composite), compost siting
>
> All ten are pure frontend computations on already-fetched layers â€” no new API calls required.

> **Note:** All design intelligence gaps are computation â€” they combine existing or planned data layers with spatial logic. These depend on upstream data gaps being filled first.

---

## Quick Wins (P0 â€” implement now)

These gaps require **no new data sources** â€” the underlying data is already available in Atlas.

### Terrain computation (7 gaps, `tier3-terrain` worker exists)
The USGS 3DEP DEM is live. All of these are standard GIS algorithms on elevation rasters:
1. **Slope aspect** â€” `atan2(dz/dy, dz/dx)` on DEM grid; classify into 8 cardinal directions
2. **Slope curvature** â€” second derivative of DEM surface; concave = water collects, convex = drains
3. **Topographic Wetness Index (TWI)** â€” `ln(contributing_area / tan(slope))`; predicts waterlogging
4. **Terrain Ruggedness Index (TRI)** â€” mean absolute elevation difference between a cell and its neighbors
5. **Viewshed analysis** â€” line-of-sight from observer point across DEM; standard r.viewshed algorithm
6. **Cut/fill volume estimation** â€” difference between existing DEM and proposed design surface
7. **Erosion hazard mapping** â€” combines slope + aspect + curvature + soil erodibility (needs soil K-factor from SSURGO)

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
- **Evapotranspiration (PET)** â€” Penman-Monteith or Hargreaves formula from temperature + solar radiation (climate data)
- **Aridity index** â€” simple ratio: P/PET once both are available
- **Drainage density** â€” stream length / catchment area from existing watershed boundaries

## Implementation Roadmap

### Completed Sprints (A-G)

| Sprint | Date | Scope | Gaps Closed |
|--------|------|-------|-------------|
| **A** | 2026-04-14 | Terrain Intelligence | 8 â€” TWI, TRI, aspect, curvature, viewshed, cut/fill, erosion hazard, micro-topography |
| **B** | 2026-04-14 | Soil Extended Properties | 10 â€” pH, CEC, EC, SAR, CaCO3, Ksat, bulk density, AWC, OC, rooting depth |
| **C** | 2026-04-14 | Climate Foundation | 3 â€” Koppen classification, freeze-thaw estimation, NASA POWER solar |
| **D** | 2026-04-14 | Formal Scoring | 2 â€” FAO S1-N2, USDA LCC I-VIII |
| **E** | 2026-04-14 | Crop Suitability | 4 â€” EcoCrop 2071 crops, perennial matching, forage suitability, lifecycle filtering |
| **F** | 2026-04-14 | Hydrology Intelligence | 5 â€” PET/ET, aridity index, irrigation demand, RWH, drainage density |
| **G** | 2026-04-14 | Soil + Hardiness + Irrigation | 2 â€” Hardiness zone scoring, rain-fed vs irrigated. Also: pH bug fix, 3 soil scoring wires, Soil Intelligence panel |
| **H** | 2026-04-14 | Gap Audit + Wiki Update | 0 (documentation sprint) |
| **I** | 2026-04-14 | LGP + Canada Soil Capability + Carbon Stock | 3 â€” LGP (FAO AEZ), Canada Soil Capability (Class 1-7), Carbon stock estimation (IPCC) |
| **J** | 2026-04-14 | Soil Degradation + WRB + Agroforestry + Wind | 4 â€” Soil degradation risk index, WRB classification, agroforestry species pairing, wind energy potential |
| **K** | 2026-04-14 | Overpass Infrastructure + Solar PV | 9 â€” Hospital, masjid, market, grid, water, road, emergency, connectivity proximity (Overpass API); solar PV potential (NASA POWER) |
| **L** | 2026-04-14 | Protected Areas + Infrastructure Rules + Scoring Polish | 4 â€” Protected areas (Overpass extension, Cat 7), + 3 reclassified Cat 11 gaps (zoning, overlay, floodplain already live). 8 infrastructure assessment rules, 3 new scoring components |

**Cumulative: ~60/120 gaps closed.** Sprint K added Overpass API; Sprint L extended it for protected areas, added 8 infrastructure assessment rules, and audited Cat 11 regulatory status.

### Next Sprints

#### Sprint L â€” New API Integrations (P1-P2)
Remaining gaps requiring new data sources with free APIs:
- **WDPA REST API** â†’ protected areas overlay (Cat 7); UNEP-WCMC
- **USGS NWIS** â†’ groundwater depth / water table (Cat 4); US only
- **EPA WQP** â†’ surface water quality (Cat 4)

#### Deferred (P3-P4)
- Regulatory data (Cat 11) â€” jurisdiction-specific, fragmented; 11 gaps
- Environmental risk / Phase I ESA (Cat 8) â€” not API-accessible; 8 gaps
- Global data coverage (Cat 12) â€” SoilGrids, WorldClim; 10 gaps; strategic expansion
- Design intelligence (Cat 13) â€” computation, but depends on upstream data richness; 10 gaps
- Remaining renewable energy (Cat 9) â€” micro-hydro, geothermal, biomass; 4 gaps

