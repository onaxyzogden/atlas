/**
 * derivations — pure helpers for the v3 Macroclimate & Hazards module.
 * Map raw `siteDataStore` climate layers + `hazardsStore` records into the
 * KPI strips, charts, lists, and counts the dashboard / detail pages render.
 */

import type { LayerResultFor, MockLayerResult } from '@ogden/shared/scoring';
import type {
  Hazard,
  HazardRisk,
  HazardStatus,
} from '../../../../store/hazardsStore.js';

/* --------------------------- climate ---------------------------------- */

export type ClimateLayer = LayerResultFor<'climate'>;

export function getClimateLayer(
  layers: MockLayerResult[] | undefined,
): ClimateLayer | undefined {
  return layers?.find((l): l is ClimateLayer => l.layerType === 'climate');
}

export interface KpiItem {
  /** Lucide icon component name as string — looked up by caller. */
  iconKey: 'snowflake' | 'droplet' | 'alert' | 'calendar' | 'sun' | 'wind' | 'shield';
  label: string;
  value: string;
  note: string;
  tone: 'blue' | 'gold' | 'green' | 'red' | 'dim';
}

const DASH = '—';

function fmtMm(value: number | null | undefined): string {
  return value == null ? DASH : `${Math.round(value)} mm`;
}
function fmtDays(value: number | null | undefined): string {
  return value == null ? DASH : `${Math.round(value)}`;
}
function fmtKwh(value: number | null | undefined): string {
  return value == null ? DASH : `${value.toFixed(1)} kWh/m²`;
}

export function climateKpis(layers: MockLayerResult[] | undefined): KpiItem[] {
  const c = getClimateLayer(layers)?.summary;
  return [
    {
      iconKey: 'snowflake',
      label: 'Hardiness zone',
      value: c?.hardiness_zone ?? DASH,
      note: 'USDA',
      tone: 'blue',
    },
    {
      iconKey: 'droplet',
      label: 'Annual precip',
      value: fmtMm(c?.annual_precip_mm),
      note: 'Average',
      tone: 'blue',
    },
    {
      iconKey: 'calendar',
      label: 'Frost-free days',
      value: fmtDays(c?.growing_season_days),
      note: 'Average',
      tone: 'green',
    },
    {
      iconKey: 'sun',
      label: 'Avg. solar exposure',
      value: c?.solar_radiation_kwh_m2_day != null
        ? `${c.solar_radiation_kwh_m2_day.toFixed(1)} kWh/m²/day`
        : c?.annual_sunshine_hours != null
          ? `${Math.round(c.annual_sunshine_hours / 365 * 0.5 * 10) / 10} kWh/m²/day`
          : DASH,
      note: c?.annual_sunshine_hours
        ? `${Math.round(c.annual_sunshine_hours)} hrs/yr`
        : 'Annual avg',
      tone: 'gold',
    },
    {
      iconKey: 'wind',
      label: 'Prevailing wind',
      value: c?.prevailing_wind ?? DASH,
      note: c?.wind_speed_ms != null ? `${(c.wind_speed_ms * 3.6).toFixed(0)} km/h avg` : 'Direction',
      tone: 'green',
    },
    {
      iconKey: 'snowflake',
      label: 'Last spring frost',
      value: c?.last_frost_date ?? DASH,
      note: 'Average',
      tone: 'dim',
    },
    {
      iconKey: 'snowflake',
      label: 'First fall frost',
      value: c?.first_frost_date ?? DASH,
      note: 'Average',
      tone: 'dim',
    },
  ];
}

export interface MonthlyClimatePoint {
  month: number;
  precipMm: number | null;
  meanMaxC: number | null;
  meanMinC: number | null;
}

export function monthlyClimateSeries(
  layers: MockLayerResult[] | undefined,
): MonthlyClimatePoint[] {
  const normals = getClimateLayer(layers)?.summary.monthly_normals;
  if (!normals || normals.length === 0) return [];
  return normals.map((n) => ({
    month: n.month,
    precipMm: n.precip_mm ?? null,
    meanMaxC: n.mean_max_c ?? null,
    meanMinC: n.mean_min_c ?? null,
  }));
}

export function solarOpportunities(
  layers: MockLayerResult[] | undefined,
): Array<[string, string]> {
  const c = getClimateLayer(layers)?.summary;
  const opps: Array<[string, string]> = [];
  if (!c) return [['Climate data pending', 'Awaiting layer fetch']];

  if ((c.solar_radiation_kwh_m2_day ?? 0) >= 4) {
    opps.push(['Passive solar gain', 'Good winter exposure']);
  }
  if ((c.annual_precip_mm ?? 0) >= 600) {
    opps.push(['Rainwater harvesting', 'Reliable yield potential']);
  }
  if ((c.growing_season_days ?? 0) >= 150) {
    opps.push(['Season extension', 'Long shoulder seasons']);
  }
  if (c.prevailing_wind) {
    opps.push(['Wind protection', `${c.prevailing_wind} prevailing`]);
  }
  if ((c.annual_temp_mean_c ?? 0) >= 6 && (c.annual_temp_mean_c ?? 0) <= 14) {
    opps.push(['Cool-temperate crops', 'Suited to mixed perennial systems']);
  }
  if (opps.length === 0) {
    opps.push(['Climate insights forming', 'Add more data to surface opportunities']);
  }
  return opps.slice(0, 5);
}

/* --------------------------- hazards --------------------------------- */

const RISK_WEIGHT: Record<HazardRisk, number> = { low: 1, moderate: 2, high: 3 };
const RISK_LABEL: Record<HazardRisk, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};
const STATUS_LABEL: Record<HazardStatus, string> = {
  monitoring: 'Monitoring',
  planned: 'Planned',
  in_progress: 'In progress',
  mitigated: 'Mitigated',
};

export interface HazardCounts {
  total: number;
  active: number;
  mitigated: number;
  monitoring: number;
  inProgress: number;
  planned: number;
  highRisk: number;
  moderateRisk: number;
  lowRisk: number;
  averageMitigationPct: number;
}

export function hazardCounts(hazards: Hazard[]): HazardCounts {
  const total = hazards.length;
  const active = hazards.filter((h) => h.status !== 'mitigated').length;
  const mitigated = hazards.filter((h) => h.status === 'mitigated').length;
  const monitoring = hazards.filter((h) => h.status === 'monitoring').length;
  const inProgress = hazards.filter((h) => h.status === 'in_progress').length;
  const planned = hazards.filter((h) => h.status === 'planned').length;
  const highRisk = hazards.filter((h) => h.risk === 'high').length;
  const moderateRisk = hazards.filter((h) => h.risk === 'moderate').length;
  const lowRisk = hazards.filter((h) => h.risk === 'low').length;
  const averageMitigationPct =
    total > 0
      ? Math.round(
          hazards.reduce((acc, h) => acc + (h.mitigationPct || 0), 0) / total,
        )
      : 0;
  return {
    total,
    active,
    mitigated,
    monitoring,
    inProgress,
    planned,
    highRisk,
    moderateRisk,
    lowRisk,
    averageMitigationPct,
  };
}

export function topRiskPriorities(hazards: Hazard[]): Hazard[] {
  return [...hazards]
    .filter((h) => h.status !== 'mitigated')
    .sort((a, b) => {
      const ra = RISK_WEIGHT[a.risk] - (a.mitigationPct || 0) / 100;
      const rb = RISK_WEIGHT[b.risk] - (b.mitigationPct || 0) / 100;
      return rb - ra;
    });
}

export function riskLabel(risk: HazardRisk): string {
  return RISK_LABEL[risk];
}

export function statusLabel(status: HazardStatus): string {
  return STATUS_LABEL[status];
}

/* --------------------------- geo helpers ----------------------------- */

/** Compute the centroid (lng,lat) of a GeoJSON polygon by averaging the
 *  outer ring's vertices (drop the closing duplicate). */
export function polygonCentroid(
  polygon: GeoJSON.Polygon | undefined,
): { lat: number; lng: number } | null {
  const ring = polygon?.coordinates?.[0];
  if (!ring || ring.length < 3) return null;
  const pts = ring.slice(0, -1);
  const sum = pts.reduce(
    (acc, pt) => ({ lng: acc.lng + (pt[0] ?? 0), lat: acc.lat + (pt[1] ?? 0) }),
    { lng: 0, lat: 0 },
  );
  return { lng: sum.lng / pts.length, lat: sum.lat / pts.length };
}

/* --------------------------- sun path -------------------------------- */

/** Approximate solar altitude (deg) at solar noon for a given latitude
 *  and day of year. Uses a simple declination formula:
 *    declination = 23.45 * sin(360/365 * (284 + n))
 *    altitude = 90 - |lat - declination|
 *  Good enough for the diagram annotation; not Holmgren-grade. */
export function noonAltitude(lat: number, dayOfYear: number): number {
  const decl = 23.45 * Math.sin(((2 * Math.PI) / 365) * (284 + dayOfYear));
  const alt = 90 - Math.abs(lat - decl);
  return Math.max(0, Math.min(90, alt));
}

export function solsticeAltitudes(lat: number): {
  summer: number;
  equinox: number;
  winter: number;
} {
  return {
    summer: noonAltitude(lat, 172), // ~Jun 21
    equinox: noonAltitude(lat, 80), // ~Mar 21
    winter: noonAltitude(lat, 355), // ~Dec 21
  };
}
