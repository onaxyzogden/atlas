/**
 * Climate Projections — Sprint BE
 *
 * Pure frontend computation of mid-century (2041-2060) climate deltas for a site,
 * applied to already-fetched historical normals (NOAA ACIS / ECCC).
 *
 * Approach: IPCC AR6 WG1 regional projected change factsheet values for the
 * continental reference regions intersecting the site's lat/lng. We apply the
 * ensemble-median ΔT (°C) and Δprecip (%) for SSP2-4.5 and SSP5-8.5 to the site's
 * observed annual mean temperature and annual precipitation.
 *
 * This is an intentionally coarse approach — a true downscaled CMIP6 point query
 * (NEX-GDDP, WorldClim-CMIP6) requires gridded NetCDF access not available via
 * free REST endpoints. The IPCC AR6 regional deltas are the peer-reviewed fallback
 * used by the World Bank CCKP at admin-0/admin-1 resolution, which is appropriate
 * for site-level planning uncertainty.
 *
 * References:
 *   - IPCC AR6 WG1 Ch. 12 Regional Fact Sheets (2021)
 *   - IPCC AR6 Interactive Atlas reference regions
 *   - World Bank Climate Change Knowledge Portal (CMIP6 ensemble medians)
 */

export type WarmingClass = 'Low' | 'Moderate' | 'High' | 'Severe';
export type PrecipTrend = 'Wetter' | 'Stable' | 'Drier' | 'Strongly Drier';

export interface ClimateProjection {
  region: string;                    // IPCC AR6 reference region name
  referencePeriod: string;           // e.g. "1995-2014"
  projectionPeriod: string;          // "2041-2060"
  historicalTempC: number | null;
  historicalPrecipMm: number | null;
  // SSP2-4.5 (medium-stabilization)
  ssp245: {
    deltaTempC: number;
    projectedTempC: number | null;
    deltaPrecipPct: number;
    projectedPrecipMm: number | null;
  };
  // SSP5-8.5 (high-emission)
  ssp585: {
    deltaTempC: number;
    projectedTempC: number | null;
    deltaPrecipPct: number;
    projectedPrecipMm: number | null;
  };
  warmingClass: WarmingClass;        // based on SSP5-8.5 delta
  precipTrend: PrecipTrend;          // based on SSP5-8.5 delta
  advisory: string;
}

/**
 * Coarse IPCC AR6 reference regions (mid-century ensemble-median).
 * Values are indicative; real regions are defined by polygons in the IPCC Atlas.
 * We use bbox approximations adequate for continental-scale mid-latitude sites.
 */
interface RegionDelta {
  name: string;
  bbox: [number, number, number, number]; // [lonMin, latMin, lonMax, latMax]
  dT45: number; dT85: number;
  dP45: number; dP85: number;            // percent change
}

const IPCC_REGIONS: RegionDelta[] = [
  // North America
  { name: 'Western North America (WNA)', bbox: [-170, 30, -103, 60], dT45: 2.0, dT85: 2.8, dP45: 3, dP85: 5 },
  { name: 'Central North America (CNA)', bbox: [-103, 30, -85, 50], dT45: 2.2, dT85: 3.1, dP45: 2, dP85: 3 },
  { name: 'Eastern North America (ENA)', bbox: [-85, 25, -60, 50], dT45: 1.9, dT85: 2.7, dP45: 4, dP85: 6 },
  { name: 'Northern North America (NCA)', bbox: [-170, 50, -50, 75], dT45: 2.8, dT85: 4.0, dP45: 8, dP85: 14 },
  { name: 'Greenland / Iceland (GIC)', bbox: [-75, 60, -12, 85], dT45: 2.6, dT85: 3.8, dP45: 7, dP85: 12 },
  // Central America / Caribbean
  { name: 'Central America (CAR)', bbox: [-110, 10, -60, 30], dT45: 1.6, dT85: 2.3, dP45: -6, dP85: -11 },
  // South America
  { name: 'Northern South America (NSA)', bbox: [-82, -10, -50, 12], dT45: 1.8, dT85: 2.5, dP45: -3, dP85: -6 },
  { name: 'South-Eastern South America (SES)', bbox: [-70, -40, -40, -20], dT45: 1.6, dT85: 2.2, dP45: 4, dP85: 7 },
  // Europe
  { name: 'Northern Europe (NEU)', bbox: [-12, 55, 40, 72], dT45: 2.0, dT85: 2.8, dP45: 7, dP85: 12 },
  { name: 'Western and Central Europe (WCE)', bbox: [-12, 44, 22, 55], dT45: 1.9, dT85: 2.7, dP45: 1, dP85: 2 },
  { name: 'Mediterranean (MED)', bbox: [-12, 30, 44, 44], dT45: 2.1, dT85: 3.0, dP45: -6, dP85: -11 },
  // Africa
  { name: 'Sahara (SAH)', bbox: [-20, 18, 40, 30], dT45: 2.2, dT85: 3.1, dP45: 3, dP85: 5 },
  { name: 'Western Africa (WAF)', bbox: [-20, 0, 15, 18], dT45: 1.9, dT85: 2.7, dP45: 2, dP85: 3 },
  { name: 'Central Africa (CAF)', bbox: [15, -5, 35, 10], dT45: 1.8, dT85: 2.6, dP45: 3, dP85: 5 },
  { name: 'Eastern Africa (EAF)', bbox: [28, -12, 52, 18], dT45: 1.9, dT85: 2.7, dP45: 5, dP85: 9 },
  { name: 'Southern Africa (SAF)', bbox: [10, -35, 42, -12], dT45: 2.0, dT85: 2.8, dP45: -6, dP85: -10 },
  // Middle East / South Asia
  { name: 'Arabian Peninsula (ARP)', bbox: [34, 12, 60, 32], dT45: 2.2, dT85: 3.1, dP45: -2, dP85: -4 },
  { name: 'West Central Asia (WCA)', bbox: [40, 30, 75, 50], dT45: 2.2, dT85: 3.1, dP45: -2, dP85: -3 },
  { name: 'South Asia (SAS)', bbox: [60, 5, 100, 32], dT45: 1.8, dT85: 2.5, dP45: 8, dP85: 13 },
  // East Asia / SE Asia
  { name: 'East Asia (EAS)', bbox: [100, 20, 145, 50], dT45: 2.0, dT85: 2.8, dP45: 5, dP85: 9 },
  { name: 'South-East Asia (SEA)', bbox: [92, -11, 155, 20], dT45: 1.6, dT85: 2.3, dP45: 3, dP85: 6 },
  // Australasia
  { name: 'Northern Australia (NAU)', bbox: [110, -25, 155, -10], dT45: 1.7, dT85: 2.4, dP45: 0, dP85: 0 },
  { name: 'Southern Australia (SAU)', bbox: [110, -45, 155, -25], dT45: 1.7, dT85: 2.4, dP45: -5, dP85: -9 },
  { name: 'New Zealand (NZ)', bbox: [165, -48, 180, -34], dT45: 1.5, dT85: 2.1, dP45: 2, dP85: 3 },
  // High latitudes
  { name: 'Russian Arctic (RAR)', bbox: [40, 66, 180, 82], dT45: 3.5, dT85: 5.2, dP45: 12, dP85: 22 },
  { name: 'Siberia (WSB/ESB)', bbox: [40, 50, 180, 66], dT45: 2.6, dT85: 3.8, dP45: 8, dP85: 14 },
];

const GLOBAL_DEFAULT: Omit<RegionDelta, 'name' | 'bbox'> = {
  dT45: 2.0, dT85: 2.9, dP45: 2, dP85: 4,
};

function findRegion(lat: number, lng: number): RegionDelta | null {
  for (const r of IPCC_REGIONS) {
    const [w, s, e, n] = r.bbox;
    if (lng >= w && lng <= e && lat >= s && lat <= n) return r;
  }
  return null;
}

export function computeClimateProjections(inputs: {
  lat: number;
  lng: number;
  annualTempC: number | null;
  annualPrecipMm: number | null;
}): ClimateProjection {
  const region = findRegion(inputs.lat, inputs.lng);
  const r = region ?? { name: 'Global average (no region match)', ...GLOBAL_DEFAULT };

  const tempHist = inputs.annualTempC;
  const precipHist = inputs.annualPrecipMm;

  const projectedTemp = (dT: number) => (tempHist != null ? Math.round((tempHist + dT) * 10) / 10 : null);
  const projectedPrecip = (dPpct: number) =>
    precipHist != null ? Math.round(precipHist * (1 + dPpct / 100)) : null;

  const dT85 = r.dT85;
  const dP85 = r.dP85;

  let warmingClass: WarmingClass;
  if (dT85 < 2.0) warmingClass = 'Low';
  else if (dT85 < 3.0) warmingClass = 'Moderate';
  else if (dT85 < 4.0) warmingClass = 'High';
  else warmingClass = 'Severe';

  let precipTrend: PrecipTrend;
  if (dP85 > 5) precipTrend = 'Wetter';
  else if (dP85 > -5) precipTrend = 'Stable';
  else if (dP85 > -10) precipTrend = 'Drier';
  else precipTrend = 'Strongly Drier';

  const advisory = buildAdvisory(warmingClass, precipTrend);

  return {
    region: r.name,
    referencePeriod: '1995-2014',
    projectionPeriod: '2041-2060',
    historicalTempC: tempHist,
    historicalPrecipMm: precipHist,
    ssp245: {
      deltaTempC: r.dT45,
      projectedTempC: projectedTemp(r.dT45),
      deltaPrecipPct: r.dP45,
      projectedPrecipMm: projectedPrecip(r.dP45),
    },
    ssp585: {
      deltaTempC: r.dT85,
      projectedTempC: projectedTemp(r.dT85),
      deltaPrecipPct: r.dP85,
      projectedPrecipMm: projectedPrecip(r.dP85),
    },
    warmingClass,
    precipTrend,
    advisory,
  };
}

function buildAdvisory(w: WarmingClass, p: PrecipTrend): string {
  const wPart =
    w === 'Severe' ? 'Severe warming (>4 °C by 2050 under SSP5-8.5) — plan for heat-tolerant cultivars and evapotranspiration stress.'
    : w === 'High' ? 'High warming (3–4 °C) — expect earlier phenology, heat-stress risk in mid-summer, and increased irrigation demand.'
    : w === 'Moderate' ? 'Moderate warming (2–3 °C) — extended growing season may favour later-season crops but pest range will expand.'
    : 'Low warming (<2 °C) — limited thermal stress expected but adaptation still prudent.';
  const pPart =
    p === 'Strongly Drier' ? ' Strongly drier (>10% precip loss) — prioritize drought-tolerant crops, mulching, and storage-based irrigation.'
    : p === 'Drier' ? ' Drier trend (5–10% loss) — invest in rainwater harvesting and soil moisture retention.'
    : p === 'Wetter' ? ' Wetter trend — expect more runoff and intermittent flooding; swale capacity and drainage should be oversized.'
    : ' Precipitation roughly stable — focus adaptation on thermal rather than moisture stress.';
  return wPart + pPart;
}
