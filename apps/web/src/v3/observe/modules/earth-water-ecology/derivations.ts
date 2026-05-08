import type { MockLayerResult } from '../../../../lib/mockLayerData.js';
import type {
  EcologyObservation,
  EcologyZone,
  SuccessionStage,
  TrophicLevel,
} from '../../../../store/ecologyStore.js';
import type {
  Earthwork,
  StorageInfra,
  Watercourse,
} from '../../../../store/waterSystemsStore.js';
import type { SoilSample } from '../../../../store/soilSampleStore.js';

const DASH = '—';

// ── Layer narrowing ───────────────────────────────────────────────────────────

export interface SoilsLayer {
  layerType: 'soils';
  summary: {
    predominant_texture?: string;
    drainage_class?: string;
    organic_matter_pct?: number;
    ph_range?: string;
    hydrologic_group?: string;
    farmland_class?: string;
    depth_to_bedrock_m?: number | null;
    bulk_density_g_cm3?: number;
    fertility_index?: number;
  };
}

export interface WatershedLayer {
  layerType: 'watershed';
  summary: {
    watershed_name?: string;
    nearest_stream_m?: number;
    stream_order?: number;
    catchment_area_ha?: number | null;
    flow_direction?: string;
    huc_code?: string | null;
  };
}

export interface WetlandsLayer {
  layerType: 'wetlands_flood';
  summary: {
    flood_zone?: string;
    wetland_pct?: number;
    wetland_types?: string[];
    riparian_buffer_m?: number;
    regulated_area_pct?: number;
  };
}

export interface CriticalHabitatLayer {
  layerType: 'critical_habitat';
  summary: {
    on_site?: boolean;
    species_on_site?: number;
    species_nearby?: number;
    species_list?: string[];
    primary_species?: string;
    primary_status?: string;
  };
}

export function getSoilsLayer(layers: MockLayerResult[] | undefined): SoilsLayer | null {
  return (layers?.find((l) => l.layerType === 'soils') as SoilsLayer | undefined) ?? null;
}

export function getWatershedLayer(layers: MockLayerResult[] | undefined): WatershedLayer | null {
  return (layers?.find((l) => l.layerType === 'watershed') as WatershedLayer | undefined) ?? null;
}

export function getWetlandsLayer(layers: MockLayerResult[] | undefined): WetlandsLayer | null {
  return (layers?.find((l) => l.layerType === 'wetlands_flood') as WetlandsLayer | undefined) ?? null;
}

export function getCriticalHabitatLayer(layers: MockLayerResult[] | undefined): CriticalHabitatLayer | null {
  return (layers?.find((l) => l.layerType === 'critical_habitat') as CriticalHabitatLayer | undefined) ?? null;
}

// ── Store counts ─────────────────────────────────────────────────────────────

export interface WaterCounts {
  earthworks: number;
  storage: number;
  watercourses: number;
  total: number;
}

export function waterCounts(
  earthworks: Earthwork[],
  storageInfra: StorageInfra[],
  watercourses: Watercourse[],
): WaterCounts {
  return {
    earthworks: earthworks.length,
    storage: storageInfra.length,
    watercourses: watercourses.length,
    total: earthworks.length + storageInfra.length + watercourses.length,
  };
}

export interface EcologyCounts {
  observations: number;
  zones: number;
  successionStage: SuccessionStage | null;
  trophicLevels: TrophicLevel[];
}

export function ecologyCounts(
  observations: EcologyObservation[],
  zones: EcologyZone[],
  stage: SuccessionStage | undefined,
): EcologyCounts {
  const levels = [...new Set(observations.map((o) => o.trophicLevel))] as TrophicLevel[];
  return {
    observations: observations.length,
    zones: zones.length,
    successionStage: stage ?? null,
    trophicLevels: levels,
  };
}

export interface SoilStats {
  count: number;
  avgPh: number | null;
  avgOm: number | null;
  hasJar: boolean;
  hasPerc: boolean;
  hasRoof: boolean;
  latestSample: SoilSample | null;
}

export function soilStats(samples: SoilSample[]): SoilStats {
  if (samples.length === 0) {
    return { count: 0, avgPh: null, avgOm: null, hasJar: false, hasPerc: false, hasRoof: false, latestSample: null };
  }
  const phVals = samples.map((s) => s.ph).filter((v): v is number => v != null);
  const omVals = samples.map((s) => s.organicMatterPct).filter((v): v is number => v != null);
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const sorted = [...samples].sort((a, b) => b.sampleDate.localeCompare(a.sampleDate));
  return {
    count: samples.length,
    avgPh: avg(phVals),
    avgOm: avg(omVals),
    hasJar: samples.some((s) => s.jarTest != null),
    hasPerc: samples.some((s) => s.percolationInPerHr != null),
    hasRoof: samples.some((s) => s.roofCatchment != null),
    latestSample: sorted[0] ?? null,
  };
}

// ── KPI items ─────────────────────────────────────────────────────────────────

export type KpiTone = 'green' | 'gold' | 'red' | 'blue' | 'dim';
export type KpiIconKey = 'droplet' | 'leaf' | 'layers' | 'beaker' | 'mountain' | 'waves';

export interface KpiItem {
  iconKey: KpiIconKey;
  label: string;
  value: string;
  note: string;
  tone: KpiTone;
  pill?: string;
}

export function earthwaterKpis(
  layers: MockLayerResult[] | undefined,
  samples: SoilSample[],
  observations: EcologyObservation[],
  earthworks: Earthwork[],
  storageInfra: StorageInfra[],
  watercourses: Watercourse[],
): KpiItem[] {
  const soil = getSoilsLayer(layers);
  const stats = soilStats(samples);
  const wc = waterCounts(earthworks, storageInfra, watercourses);

  const avgPh = stats.avgPh;
  const phVal = avgPh != null ? avgPh.toFixed(1) : soil?.summary.ph_range ?? DASH;
  const phTone: KpiTone = avgPh == null ? 'dim' : avgPh < 5.5 ? 'red' : avgPh > 7.5 ? 'gold' : 'green';

  const omVal = stats.avgOm != null
    ? `${stats.avgOm.toFixed(1)}%`
    : soil?.summary.organic_matter_pct != null
      ? `${soil.summary.organic_matter_pct}%`
      : DASH;
  const omTone: KpiTone = stats.avgOm == null && soil?.summary.organic_matter_pct == null ? 'dim' : 'green';

  const obsVal = String(observations.length);
  const obsTone: KpiTone = observations.length === 0 ? 'dim' : 'green';

  const waterVal = wc.total === 0 ? DASH : String(wc.total);
  const waterTone: KpiTone = wc.total === 0 ? 'dim' : 'blue';

  const samplesVal = String(samples.length);
  const samplesTone: KpiTone = samples.length === 0 ? 'dim' : 'green';

  const watershed = getWatershedLayer(layers);
  const streamVal = watershed?.summary.nearest_stream_m != null
    ? `${watershed.summary.nearest_stream_m} m`
    : DASH;
  const streamTone: KpiTone = watershed == null ? 'dim' : 'blue';

  return [
    {
      iconKey: 'layers',
      label: 'Soil pH (avg)',
      value: phVal,
      note: avgPh != null ? 'From field samples' : soil ? 'From site layer' : 'No data',
      tone: phTone,
      pill: avgPh != null ? (avgPh < 6 ? 'Acidic' : avgPh > 7 ? 'Alkaline' : 'Near-neutral') : undefined,
    },
    {
      iconKey: 'leaf',
      label: 'Organic matter',
      value: omVal,
      note: stats.avgOm != null ? 'From field samples' : soil ? 'From site layer' : 'No data',
      tone: omTone,
    },
    {
      iconKey: 'leaf',
      label: 'Ecology observations',
      value: obsVal,
      note: observations.length === 0 ? 'Record species and habitats' : 'Species & trophic levels',
      tone: obsTone,
    },
    {
      iconKey: 'droplet',
      label: 'Water features',
      value: waterVal,
      note: wc.total === 0 ? 'Map swales, ponds, streams' : `${wc.earthworks} earthworks · ${wc.storage} storage · ${wc.watercourses} courses`,
      tone: waterTone,
    },
    {
      iconKey: 'beaker',
      label: 'Soil samples',
      value: samplesVal,
      note: samples.length === 0 ? 'Run jar, perc, or lab tests' : 'Manual field samples',
      tone: samplesTone,
    },
    {
      iconKey: 'waves',
      label: 'Nearest stream',
      value: streamVal,
      note: watershed?.summary.watershed_name ?? 'Watershed data',
      tone: streamTone,
    },
  ];
}

// ── Hydrology KPIs ────────────────────────────────────────────────────────────

export function hydrologyKpis(
  layers: MockLayerResult[] | undefined,
  earthworks: Earthwork[],
  storageInfra: StorageInfra[],
  watercourses: Watercourse[],
): KpiItem[] {
  const watershed = getWatershedLayer(layers);
  const wetlands = getWetlandsLayer(layers);
  const wc = waterCounts(earthworks, storageInfra, watercourses);

  return [
    {
      iconKey: 'waves',
      label: 'Watercourses',
      value: String(wc.watercourses),
      note: wc.watercourses === 0 ? 'Trace streams and creeks' : 'Mapped watercourses',
      tone: wc.watercourses === 0 ? 'dim' : 'blue',
    },
    {
      iconKey: 'droplet',
      label: 'Earthworks',
      value: String(wc.earthworks),
      note: wc.earthworks === 0 ? 'Design swales and diversions' : 'Swales, drains, diversions',
      tone: wc.earthworks === 0 ? 'dim' : 'green',
    },
    {
      iconKey: 'mountain',
      label: 'Storage infra',
      value: String(wc.storage),
      note: wc.storage === 0 ? 'Place cisterns and ponds' : 'Cisterns, ponds, rain gardens',
      tone: wc.storage === 0 ? 'dim' : 'green',
    },
    {
      iconKey: 'waves',
      label: 'Nearest stream',
      value: watershed?.summary.nearest_stream_m != null ? `${watershed.summary.nearest_stream_m} m` : DASH,
      note: watershed?.summary.watershed_name ?? 'Watershed data',
      tone: watershed == null ? 'dim' : 'blue',
    },
    {
      iconKey: 'droplet',
      label: 'Wetland cover',
      value: wetlands?.summary.wetland_pct != null ? `${wetlands.summary.wetland_pct}%` : DASH,
      note: wetlands?.summary.flood_zone ?? 'Wetland & flood data',
      tone: wetlands == null ? 'dim' : 'blue',
    },
    {
      iconKey: 'droplet',
      label: 'Riparian buffer',
      value: wetlands?.summary.riparian_buffer_m != null ? `${wetlands.summary.riparian_buffer_m} m` : DASH,
      note: 'Recommended buffer width',
      tone: wetlands?.summary.riparian_buffer_m != null ? 'green' : 'dim',
    },
  ];
}

// ── Ecology KPIs ──────────────────────────────────────────────────────────────

const SUCCESSION_LABELS: Record<SuccessionStage, string> = {
  disturbed: 'Disturbed',
  pioneer: 'Pioneer',
  mid: 'Mid-successional',
  late: 'Late-successional',
  climax: 'Climax',
};

export function ecologyDetailKpis(
  layers: MockLayerResult[] | undefined,
  observations: EcologyObservation[],
  zones: EcologyZone[],
  stage: SuccessionStage | undefined,
): KpiItem[] {
  const habitat = getCriticalHabitatLayer(layers);
  const counts = ecologyCounts(observations, zones, stage);

  return [
    {
      iconKey: 'leaf',
      label: 'Observations',
      value: String(counts.observations),
      note: counts.observations === 0 ? 'Log species sightings' : 'Species recorded',
      tone: counts.observations === 0 ? 'dim' : 'green',
    },
    {
      iconKey: 'leaf',
      label: 'Ecology zones',
      value: String(counts.zones),
      note: counts.zones === 0 ? 'Map habitat patches' : 'Mapped habitat zones',
      tone: counts.zones === 0 ? 'dim' : 'green',
    },
    {
      iconKey: 'mountain',
      label: 'Succession stage',
      value: counts.successionStage ? SUCCESSION_LABELS[counts.successionStage] : DASH,
      note: 'Site-wide successional context',
      tone: counts.successionStage == null ? 'dim' : 'green',
    },
    {
      iconKey: 'leaf',
      label: 'Trophic levels',
      value: counts.trophicLevels.length === 0 ? DASH : String(counts.trophicLevels.length),
      note: counts.trophicLevels.length > 0 ? counts.trophicLevels.join(', ') : 'No observations yet',
      tone: counts.trophicLevels.length === 0 ? 'dim' : 'green',
    },
    {
      iconKey: 'leaf',
      label: 'Species nearby',
      value: habitat?.summary.species_nearby != null ? String(habitat.summary.species_nearby) : DASH,
      note: habitat?.summary.primary_species ?? 'Critical habitat data',
      tone: habitat == null ? 'dim' : habitat.summary.on_site ? 'red' : 'gold',
      pill: habitat?.summary.on_site ? 'On site' : habitat?.summary.species_nearby ? 'Nearby' : undefined,
    },
    {
      iconKey: 'droplet',
      label: 'Wetland %',
      value: getWetlandsLayer(layers)?.summary.wetland_pct != null
        ? `${getWetlandsLayer(layers)!.summary.wetland_pct}%`
        : DASH,
      note: 'Site wetland coverage',
      tone: getWetlandsLayer(layers) == null ? 'dim' : 'blue',
    },
  ];
}

// ── Jar/Perc/Roof KPIs ────────────────────────────────────────────────────────

export type PercRating = 'very_slow' | 'slow' | 'ideal' | 'fast';

export interface PercBand {
  rating: PercRating;
  label: string;
  tone: KpiTone;
}

export function percRating(inPerHr: number): PercBand {
  if (inPerHr < 0.2) return { rating: 'very_slow', label: 'Very slow (<0.2 in/hr)', tone: 'red' };
  if (inPerHr < 1.0) return { rating: 'slow', label: 'Slow (0.2–1.0 in/hr)', tone: 'gold' };
  if (inPerHr <= 3.0) return { rating: 'ideal', label: 'Ideal (1–3 in/hr)', tone: 'green' };
  return { rating: 'fast', label: 'Fast (>3 in/hr)', tone: 'gold' };
}

export function roofAnnualCaptureL(
  areaM2: number,
  annualPrecipMm: number,
  runoffCoeff = 0.85,
): number {
  return areaM2 * (annualPrecipMm / 1000) * runoffCoeff * 1000;
}

export function jprKpis(samples: SoilSample[]): KpiItem[] {
  const stats = soilStats(samples);
  const latest = stats.latestSample;
  const perc = latest?.percolationInPerHr != null ? percRating(latest.percolationInPerHr) : null;
  const capture = latest?.roofCatchment
    ? roofAnnualCaptureL(
        latest.roofCatchment.roofAreaM2,
        latest.roofCatchment.annualPrecipMm ?? 800,
        latest.roofCatchment.runoffCoeff ?? 0.85,
      )
    : null;

  return [
    {
      iconKey: 'layers',
      label: 'Soil pH (avg)',
      value: stats.avgPh != null ? stats.avgPh.toFixed(1) : DASH,
      note: stats.count === 0 ? 'No samples yet' : `${stats.count} sample${stats.count === 1 ? '' : 's'}`,
      tone: stats.avgPh == null ? 'dim' : stats.avgPh < 5.5 ? 'red' : 'green',
    },
    {
      iconKey: 'leaf',
      label: 'Organic matter',
      value: stats.avgOm != null ? `${stats.avgOm.toFixed(1)}%` : DASH,
      note: 'Average across samples',
      tone: stats.avgOm == null ? 'dim' : stats.avgOm < 2 ? 'red' : 'green',
    },
    {
      iconKey: 'droplet',
      label: 'Percolation rate',
      value: latest?.percolationInPerHr != null ? `${latest.percolationInPerHr} in/hr` : DASH,
      note: perc?.label ?? 'No perc test recorded',
      tone: perc?.tone ?? 'dim',
    },
    {
      iconKey: 'droplet',
      label: 'Roof capture (ann.)',
      value: capture != null ? `${Math.round(capture / 1000)} m³` : DASH,
      note: latest?.roofCatchment ? `${latest.roofCatchment.roofAreaM2} m² roof area` : 'No roof data',
      tone: capture == null ? 'dim' : 'blue',
    },
    {
      iconKey: 'beaker',
      label: 'Samples',
      value: String(stats.count),
      note: stats.hasJar || stats.hasPerc || stats.hasRoof
        ? [stats.hasJar && 'jar', stats.hasPerc && 'perc', stats.hasRoof && 'roof'].filter(Boolean).join(' · ')
        : 'No test data',
      tone: stats.count === 0 ? 'dim' : 'green',
    },
    {
      iconKey: 'leaf',
      label: 'Biological activity',
      value: latest?.biologicalActivity != null
        ? (latest.biologicalActivity.charAt(0).toUpperCase() + latest.biologicalActivity.slice(1))
        : DASH,
      note: 'Latest sample reading',
      tone: latest?.biologicalActivity === 'high' ? 'green'
        : latest?.biologicalActivity === 'none' ? 'red'
        : latest?.biologicalActivity != null ? 'gold'
        : 'dim',
    },
  ];
}
