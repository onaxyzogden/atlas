/**
 * derivations — pure helpers for the v3 Sectors, Microclimates & Zones module.
 * Maps `externalForcesStore` sector arrows + `zoneStore` land zones +
 * `siteDataStore` climate layer into KPI strips and count summaries.
 */

import type { MockLayerResult } from '../../../../lib/mockLayerData.js';
import type { SectorArrow } from '../../../../store/externalForcesStore.js';
import type { LandZone, ZoneCategory } from '../../../../store/zoneStore.js';

// ── KpiItem shape (same contract as topography/earth-water derivations) ───────

export type KpiIconKey =
  | 'compass'
  | 'layers'
  | 'wind'
  | 'sun'
  | 'flame'
  | 'mountain'
  | 'shield';

export interface KpiItem {
  iconKey: KpiIconKey;
  label: string;
  value: string;
  note: string;
  tone: 'green' | 'gold' | 'blue' | 'red' | 'dim';
}

const DASH = '—';

// ── sectorCounts ─────────────────────────────────────────────────────────────

export interface SectorCounts {
  total: number;
  wind: number;
  sun: number;
  fire: number;
  noise: number;
  wildlife: number;
  view: number;
}

export function sectorCounts(sectors: SectorArrow[]): SectorCounts {
  const counts: SectorCounts = { total: 0, wind: 0, sun: 0, fire: 0, noise: 0, wildlife: 0, view: 0 };
  for (const s of sectors) {
    counts.total++;
    if (s.type === 'wind_prevailing' || s.type === 'wind_storm') counts.wind++;
    else if (s.type === 'sun_summer' || s.type === 'sun_winter') counts.sun++;
    else if (s.type === 'fire') counts.fire++;
    else if (s.type === 'noise') counts.noise++;
    else if (s.type === 'wildlife') counts.wildlife++;
    else if (s.type === 'view') counts.view++;
  }
  return counts;
}

// ── zoneCounts ────────────────────────────────────────────────────────────────

export interface ZoneCounts {
  total: number;
  byCategory: Partial<Record<ZoneCategory, number>>;
}

export function zoneCounts(zones: LandZone[]): ZoneCounts {
  const byCategory: Partial<Record<ZoneCategory, number>> = {};
  for (const z of zones) {
    byCategory[z.category] = (byCategory[z.category] ?? 0) + 1;
  }
  return { total: zones.length, byCategory };
}

// ── dominantWindDir ───────────────────────────────────────────────────────────

export function dominantWindDir(layers?: MockLayerResult[]): string {
  if (!layers) return DASH;
  const climate = layers.find((l) => l.layerType === 'climate');
  if (!climate) return DASH;
  const dir = (climate.summary as Record<string, unknown>)['prevailing_wind'];
  return typeof dir === 'string' && dir.length > 0 ? dir : DASH;
}

// ── sectorsKpis (dashboard KPI strip) ────────────────────────────────────────

export function sectorsKpis(
  sectors: SectorArrow[],
  zones: LandZone[],
  layers: MockLayerResult[] | undefined,
): KpiItem[] {
  const sc = sectorCounts(sectors);
  const zc = zoneCounts(zones);
  const wind = dominantWindDir(layers);

  return [
    {
      iconKey: 'compass',
      label: 'Sector arrows',
      value: sc.total > 0 ? String(sc.total) : DASH,
      note: sc.total > 0 ? 'Placed on site' : 'None yet',
      tone: sc.total > 0 ? 'green' : 'dim',
    },
    {
      iconKey: 'layers',
      label: 'Zones outlined',
      value: zc.total > 0 ? String(zc.total) : DASH,
      note: zc.total > 0 ? 'Land-use zones' : 'None yet',
      tone: zc.total > 0 ? 'green' : 'dim',
    },
    {
      iconKey: 'wind',
      label: 'Prevailing wind',
      value: wind,
      note: wind !== DASH ? 'From climate data' : 'No data',
      tone: wind !== DASH ? 'blue' : 'dim',
    },
    {
      iconKey: 'flame',
      label: 'High-risk sectors',
      value: sc.fire > 0 ? String(sc.fire) : DASH,
      note: sc.fire > 0 ? 'Fire / storm sectors' : 'None logged',
      tone: sc.fire > 0 ? 'red' : 'dim',
    },
    {
      iconKey: 'sun',
      label: 'Solar sectors',
      value: sc.sun > 0 ? String(sc.sun) : DASH,
      note: sc.sun > 0 ? 'Sun arcs logged' : 'None logged',
      tone: sc.sun > 0 ? 'gold' : 'dim',
    },
  ];
}

// ── compassKpis (detail page KPI strip) ──────────────────────────────────────

/** Find the most intense sector of a given type set, return its bearing as a
 *  compass label (e.g. "NW" for 315°). */
function bearingLabel(bearingDeg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
  const idx = Math.round(((bearingDeg % 360) + 360) % 360 / 45) % 8;
  return dirs[idx];
}

function highestIntensity(candidates: SectorArrow[]): SectorArrow | undefined {
  if (candidates.length === 0) return undefined;
  const order: Record<string, number> = { high: 3, med: 2, low: 1 };
  return candidates.reduce((best, cur) =>
    (order[cur.intensity ?? 'low'] ?? 0) >= (order[best.intensity ?? 'low'] ?? 0) ? cur : best,
  );
}

export function compassKpis(
  sectors: SectorArrow[],
  layers: MockLayerResult[] | undefined,
): KpiItem[] {
  const wind = dominantWindDir(layers);

  const windSectors = sectors.filter((s) => s.type === 'wind_prevailing' || s.type === 'wind_storm');
  const dominantWind = highestIntensity(windSectors);

  const sunSectors = sectors.filter((s) => s.type === 'sun_summer');
  const morningSun = sunSectors[0];

  const fireSectors = sectors.filter((s) => s.type === 'fire');
  const highRisk = highestIntensity(fireSectors);

  const viewSectors = sectors.filter((s) => s.type === 'view');
  const bestView = highestIntensity(viewSectors);

  return [
    {
      iconKey: 'wind',
      label: 'Dominant wind',
      value: dominantWind ? bearingLabel(dominantWind.bearingDeg) : wind,
      note: dominantWind ? 'From sector arrows' : (wind !== DASH ? 'From climate layer' : 'No data'),
      tone: 'blue',
    },
    {
      iconKey: 'sun',
      label: 'Sun sector',
      value: morningSun ? bearingLabel(morningSun.bearingDeg) : DASH,
      note: morningSun ? 'Summer sun arc' : 'None logged',
      tone: morningSun ? 'gold' : 'dim',
    },
    {
      iconKey: 'flame',
      label: 'High-risk sector',
      value: highRisk ? bearingLabel(highRisk.bearingDeg) : DASH,
      note: highRisk ? 'Wildfire / hazard' : 'None logged',
      tone: highRisk ? 'red' : 'dim',
    },
    {
      iconKey: 'mountain',
      label: 'View sector',
      value: bestView ? bearingLabel(bestView.bearingDeg) : DASH,
      note: bestView ? 'Beneficial views' : 'None logged',
      tone: bestView ? 'green' : 'dim',
    },
    {
      iconKey: 'compass',
      label: 'Sector arrows',
      value: sectors.length > 0 ? String(sectors.length) : DASH,
      note: sectors.length > 0 ? 'Placed on site' : 'None yet',
      tone: sectors.length > 0 ? 'green' : 'dim',
    },
  ];
}
