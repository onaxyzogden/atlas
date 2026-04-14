
## OGDEN Atlas — Global Completeness Gap Analysis

### How to read this

**✅ Atlas has it** | **⚠️ Partial / stubbed** | **❌ Missing entirely**

---

## 1. FORMAL SCORING & CLASSIFICATION SYSTEMS

These are the recognized frameworks that give a land evaluation tool international credibility.

| Standard | Body | What it does | Atlas Status |
|---|---|---|---|
| FAO S1/S2/S3/N1/N2 suitability classification | FAO (1976) | Universal 5-tier suitability verdict by land use type | ❌ |
| USDA Land Capability Classification (LCC I–VIII) | USDA/NRCS | Classifies land by limitations for general agricultural use | ❌ |
| Canada Soil Capability Classification (Classes 1–7) | AAFC | Canadian equivalent to LCC for arable, grazing, and forestry | ❌ |
| Fuzzy logic membership functions (Triangular, Trapezoidal, Gaussian) | ALUES/FAO | Handles borderline land honestly; no hard thresholds | ❌ |
| AHP multi-criteria weighting | MCDM standard | Weights evaluation criteria differently by project type | ❌ |
| Length of Growing Period (LGP) classification | FAO AEZ | Thermal + moisture regime defining viable crop calendar | ❌ |
| USDA Plant Hardiness Zones | USDA | Cold hardiness baseline for perennial plant selection | ❌ |

---

## 2. SOIL ASSESSMENT

Atlas has SSURGO (US) and LIO (Ontario), giving soil *type* and some basic properties. What's missing:

| Parameter | Why it matters |
|---|---|
| Soil pH | Directly limits crop selection; affects nutrient availability |
| Organic carbon content (OC) | Fertility and carbon sequestration potential |
| Cation Exchange Capacity (CEC) | Nutrient retention capacity |
| Electrical conductivity / salinity (EC) | Crop tolerance thresholds; irrigation suitability |
| Sodicity (ESP / SAR) | Soil structure degradation risk under irrigation |
| Calcium carbonate content | Affects pH, iron availability, drainage |
| Nitrogen–Phosphorus–Potassium (N-P-K) | Baseline fertility assessment |
| Hydraulic conductivity | Drainage rate; waterlogging risk |
| Effective rooting depth | Hard pans, restrictive layers |
| Surface stoniness / coarse fragment % | Workability and tillage limitations |
| Bulk density | Compaction, root penetration limits |
| Soil erosion susceptibility (USLE/RUSLE factors) | Long-term productivity risk |
| Soil degradation status | Salinization, crusting, desertification history |
| Boron toxicity | Limits certain crops in arid soils |
| WRB Soil Classification | FAO's World Reference Base — internationally recognized soil naming |
| SoilGrids (ISRIC) | Global 250m resolution soil properties; fills gap outside US/Canada |

---

## 3. TERRAIN & TOPOGRAPHY

Atlas has basic elevation and 3D terrain visualization. Missing:

| Parameter | Why it matters |
|---|---|
| Slope aspect (north/south/east/west facing) | Solar exposure, frost risk, microclimate — critical for plant placement |
| Slope curvature (concave/convex) | Predicts water accumulation vs. drainage |
| Topographic Wetness Index (TWI) | Predicts natural waterlogging; essential for drainage design |
| Terrain Ruggedness Index (TRI) | Workability and infrastructure cost estimation |
| LiDAR-derived micro-topography | High-precision earthworks design, swale siting |
| Viewshed analysis | Privacy, aesthetics, neighbor visibility — essential for retreats |
| Cut/fill volume estimation | Earthworks cost modeling |
| Erosion hazard mapping | Combines slope + rainfall + soil erodibility |

---

## 4. HYDROLOGY (beyond current)

Atlas has watershed boundaries, wetlands (partial), and flood zones (partial). Missing:

| Parameter | Why it matters |
|---|---|
| Groundwater depth / water table | Determines well viability, basement risk, wetland creation potential |
| Aquifer type and recharge zones | Long-term water security for the site |
| Evapotranspiration (PET / actual ET) | Water demand modeling for crops and landscape |
| Aridity index (P/PET ratio) | Classifies site climate regime for FAO assessment |
| Irrigation water requirement by crop | Feasibility of irrigation-dependent food systems |
| Seasonal flooding duration | Distinct from FEMA binary flood zone |
| Drainage density | Runoff concentration and outlet point identification |
| Water stress index | Projected future water availability under climate scenarios |
| Rainwater harvesting potential | Roof/land area × annual rainfall × runoff coefficient |
| Surface water quality (proximate bodies) | Contamination risk for irrigation and livestock |

---

## 5. CLIMATE (largely missing)

Recognized land suitability parameters include aridity index, growing degree days, length of the dry season, potential evapotranspiration, relative humidity, solar radiation, and sunshine hours — most of which Atlas does not yet compute.

| Parameter | Why it matters |
|---|---|
| Mean annual temperature (min / max / mean) | Plant hardiness, livestock comfort, building insulation requirements |
| Growing Degree Days (GDD) | Defines viable crop calendar; predicts harvest timing |
| First and last frost dates | Critical for annual crop planning and frost-sensitive perennials |
| Sunshine hours / solar radiation (kWh/m²/day) | PV potential, passive solar design, crop light requirements |
| Prevailing wind speed and direction | Wind break placement, building orientation, wind energy potential |
| Annual rainfall (mean + monthly distribution) | Rain-fed crop viability; irrigation supplement needs |
| Köppen climate classification | Universal climate zone label for crop matching |
| Snow load / freeze-thaw cycles | Structural design implications |
| Extreme event frequency (drought, hail, frost) | Risk assessment for agricultural investment |
| Climate change projections (RCP 4.5 / 8.5) | 20–50 year crop viability under projected warming |

---

## 6. CROP & VEGETATION SUITABILITY (entirely missing)

This is perhaps the most significant gap for a land intelligence tool.

| Capability | Why it matters |
|---|---|
| FAO ECOCROP / GAEZ crop matching | Information on crop requirements for 2,000+ species including temperature, rainfall, pH, texture, drainage, and altitude ranges |
| Rain-fed vs. irrigated suitability distinction | Entirely different project economics and water risk profile |
| Perennial crop matching (orchard, food forest) | Multi-decade commitment; soil and climate must be right |
| Livestock forage suitability | Grass species and carrying capacity by soil and climate |
| Agroforestry species pairing | Tree-crop-livestock integration by zone |
| Companion planting / polyculture compatibility | For designed food forests and guilds |
| Invasive species risk by region | Species that compete with or threaten food systems |
| Native species library by ecoregion | Restoration-appropriate planting |

---

## 7. ECOLOGICAL & BIODIVERSITY

| Parameter | Why it matters |
|---|---|
| Habitat type (IUCN classification) | Recognized international framework for ecological context |
| Species at risk / critical habitat overlap | Legal obligations; stewardship responsibility |
| Protected areas overlap (WDPA) | Development constraints; conservation opportunity |
| Biodiversity index by ecoregion | Baseline ecological richness of the site |
| Forest canopy cover and height | Carbon stock, shade, microclimate |
| Carbon stock estimation | Sequestration value; increasingly tied to financing |
| Ecosystem services valuation | Water filtration, pollination, erosion control — quantified |
| Wetland ecological function classification | Cowardin system beyond just presence/absence |

---

## 8. ENVIRONMENTAL RISK & SITE HISTORY

A Phase I Environmental Site Assessment evaluates recognized environmental conditions (RECs) associated with a property's historical and current uses, governed by ASTM International's E1527-21 Standard Practice. Atlas has none of this.

| Risk Category | What to flag |
|---|---|
| Prior land use history | Industrial, agricultural chemical, waste disposal |
| Contaminated sites registry proximity | National/provincial databases of known contaminated land |
| Underground storage tank (UST) proximity | Petroleum contamination risk |
| Brownfield / former industrial site | Soil and groundwater contamination baseline |
| Pesticide / herbicide application history | Organic transition period; soil biology impact |
| Mine tailings proximity | Heavy metal contamination risk |
| Landfill / waste site proximity | Methane risk, leachate, contamination |
| Military/former industrial legacy | Unexploded ordnance, contamination in some regions |

---

## 9. RENEWABLE ENERGY POTENTIAL (missing)

Every project built for the sake of Allah (SWT) benefits from energy independence. This is missing entirely.

| Resource | Data source available |
|---|---|
| Solar PV potential (kWh/m²/year) | NASA POWER, PVGIS (global), NREL (US) |
| Peak sun hours by month | Same sources |
| Wind energy potential (mean wind speed at hub height) | Global Wind Atlas (free API) |
| Micro-hydro potential | Stream flow (USGS) × head estimation |
| Geothermal surface temperature gradient | USGS geothermal resource maps (US) |
| Biomass energy potential | Crop residue and timber yield modeling |

---

## 10. INFRASTRUCTURE & ACCESSIBILITY

| Parameter | Why it matters |
|---|---|
| Road type and access quality | Emergency access, produce transport, material delivery |
| Distance to electrical grid (and capacity) | Connection cost; off-grid feasibility indicator |
| Distance to potable water supply | Connection cost; alternative system trigger |
| Internet/telecom connectivity | Remote work and education viability |
| Distance to emergency services | Fire, ambulance — insurance and safety |
| Distance to nearest hospital / trauma center | Liability and community planning |
| Distance to markets (produce / inputs) | Economic viability for farming enterprises |
| Distance to nearest masjid | *(OGDEN-specific)* Jumu'ah access, community integration |

---

## 11. REGULATORY & LEGAL (barely present)

Atlas has no connected zoning data for either US or Canada. This is a critical gap.

| Regulatory Layer | Why it matters |
|---|---|
| Zoning classification | Primary use permission; development feasibility |
| Agricultural Land Reserve (ALR) status | British Columbia; protects farmland from conversion |
| Greenbelt / conservation overlay | Development restrictions |
| Conservation easement status | Encumbrances on title; perpetual restrictions |
| Mineral / subsurface rights separation | Who owns what's underground |
| Water rights / riparian rights | Entitlement to use water from the land |
| Floodplain development restrictions | Beyond FEMA presence/absence — what's actually permitted |
| Setback requirements (waterways, roads, neighbors) | Building envelope constraints |
| Heritage / archaeological site designation | Development restrictions; consultation requirements |
| Environmental impact assessment (EIA) triggers | Thresholds that trigger formal government review |
| Agricultural use-value assessment eligibility | Tax treatment; Green Acres programs |

---

## 12. GLOBAL DATA COVERAGE (US + Ontario only currently)

For Atlas to serve projects built anywhere for the sake of Allah (SWT):

| Gap | What fills it |
|---|---|
| Global soil properties | SoilGrids (ISRIC) — 250m resolution, REST API |
| Global climate data | WorldClim v2.1 / CHELSA — 1km resolution |
| Global agro-ecological zones | FAO GAEZ v4 — crop suitability globally |
| Global elevation | SRTM / ALOS PALSAR — 30m resolution globally |
| Global land cover | ESA WorldCover 2021 — 10m resolution |
| Global crop suitability | FAO ECOCROP database — 2,500+ species |
| Global protected areas | WDPA (World Database on Protected Areas) |
| Global groundwater depth | Fan et al. global water table maps |
| European soil data | ESDAC (European Soil Data Centre) |
| MENA / Southeast Asia soil data | ISRIC World Soil Database |

---

## 13. DESIGN INTELLIGENCE GAPS (within Atlas's drawing tools)

Atlas has excellent drawing tools but no siting intelligence tied to land data. Missing:

| Capability | What it enables |
|---|---|
| Passive solar building orientation | Optimal azimuth based on latitude + aspect |
| Wind break siting (location + species) | Wind direction data + terrain → optimal placement |
| Swale / water harvesting siting | TWI + slope → optimal keyline / A-line placement |
| Pond / dam siting and volume estimation | Topography → storage volume at different spillway heights |
| Septic / leach field suitability | Soil percolation + setbacks + water table depth |
| Rainwater catchment sizing | Roof area + rainfall → tank size recommendation |
| Compost / waste system siting | Setbacks from water, buildings, property lines |
| Building footprint optimization | Slope analysis → most buildable area |
| Shadow / shade modeling by season | Sun path × terrain → frost pockets, shaded zones |
| Fire risk zoning | Slope + aspect + vegetation + wind → defensible space |

---

## Summary Count

| Category | Gaps Identified |
|---|---|
| Formal scoring systems | 7 |
| Soil assessment | 16 |
| Terrain & topography | 8 |
| Hydrology | 10 |
| Climate | 10 |
| Crop & vegetation suitability | 8 |
| Ecological & biodiversity | 8 |
| Environmental risk & site history | 8 |
| Renewable energy | 6 |
| Infrastructure & accessibility | 8 |
| Regulatory & legal | 11 |
| Global data coverage | 10 |
| Design intelligence | 10 |
| **Total** | **~120 identifiable gaps** |

---

This is the "no stone left unturned" inventory. Nothing on this list is exotic — every item appears in recognized global frameworks (FAO, USDA, ASTM, IUCN, WRB). Together they define what a credible, globally deployable land intelligence platform must address.

Ready to move to prioritization whenever you are. The question for that stage will be: which of these gaps are *data gaps* (we need a new source), which are *computation gaps* (we have the data but not the logic), and which are *display gaps* (the logic exists but isn't surfaced to the user). Those three types have very different development costs.