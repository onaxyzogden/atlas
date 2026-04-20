/**
 * Forest canopy height estimator — Sprint BF
 *
 * Honest fallback in lieu of a free point-query GEDI L4A API. Derives mean
 * canopy height from land-cover class + Köppen-like biome + tree canopy cover.
 *
 * References:
 *   - Simard et al. (2011) *Mapping forest canopy height globally with spaceborne lidar*
 *     (JGR Biogeosciences)
 *   - FAO Global Forest Resources Assessment (FRA) 2020
 */

export interface CanopyHeightInput {
  treeCanopyPct: number | null;
  primaryLandCoverClass: string | null;
  meanAnnualTempC: number | null;
  annualPrecipMm: number | null;
  koppenClass: string | null;
}

export type CanopyBiome =
  | 'Tropical Moist Broadleaf'
  | 'Tropical Dry Broadleaf'
  | 'Temperate Broadleaf'
  | 'Temperate Conifer'
  | 'Boreal'
  | 'Mediterranean Woodland'
  | 'Savanna / Open Woodland'
  | 'Non-forest';

export interface CanopyHeightResult {
  estimated_height_m: number | null;
  biome: CanopyBiome;
  confidence: 'estimate';
  note: string;
}

// Mean / max canopy heights per biome (Simard 2011 + FRA 2020)
const BIOME_HEIGHT_M: Record<CanopyBiome, [number, number]> = {
  'Tropical Moist Broadleaf': [25, 35],
  'Tropical Dry Broadleaf':   [12, 20],
  'Temperate Broadleaf':      [22, 30],
  'Temperate Conifer':        [28, 40],
  'Boreal':                   [15, 22],
  'Mediterranean Woodland':   [10, 15],
  'Savanna / Open Woodland':  [5, 10],
  'Non-forest':               [0, 0],
};

function classifyBiome(
  temp: number | null, precip: number | null, koppen: string | null, lcClass: string | null,
): CanopyBiome {
  const lc = (lcClass ?? '').toLowerCase();
  if (lc.includes('barren') || lc.includes('developed') || lc.includes('water') || lc.includes('crop') || lc.includes('pasture')) {
    return 'Non-forest';
  }
  const k = (koppen ?? '').toUpperCase();
  // Köppen major climate letter
  const major = k[0] ?? '';
  if (major === 'A') {
    // Tropical
    if ((precip ?? 1500) >= 1500) return 'Tropical Moist Broadleaf';
    return 'Tropical Dry Broadleaf';
  }
  if (major === 'B') return 'Savanna / Open Woodland';
  if (major === 'C') {
    // Temperate / Mediterranean
    if (k.startsWith('CS')) return 'Mediterranean Woodland';
    if (lc.includes('evergreen') || lc.includes('conifer')) return 'Temperate Conifer';
    return 'Temperate Broadleaf';
  }
  if (major === 'D') {
    // Continental — broadleaf if warm summer, conifer if cold
    if (lc.includes('evergreen') || lc.includes('conifer')) return 'Temperate Conifer';
    if ((temp ?? 5) < 2) return 'Boreal';
    return 'Temperate Broadleaf';
  }
  if (major === 'E') return 'Boreal';
  // No Köppen — fall back by temperature band
  if (temp != null) {
    if (temp >= 22) return (precip ?? 1500) >= 1500 ? 'Tropical Moist Broadleaf' : 'Tropical Dry Broadleaf';
    if (temp >= 10) return 'Temperate Broadleaf';
    if (temp >= 2) return 'Temperate Conifer';
    return 'Boreal';
  }
  return 'Temperate Broadleaf';
}

export function estimateCanopyHeight(input: CanopyHeightInput): CanopyHeightResult {
  const biome = classifyBiome(
    input.meanAnnualTempC, input.annualPrecipMm,
    input.koppenClass, input.primaryLandCoverClass,
  );

  if (biome === 'Non-forest') {
    return {
      estimated_height_m: 0,
      biome,
      confidence: 'estimate',
      note: 'Non-forest land cover — canopy height not applicable.',
    };
  }

  const [lowH, highH] = BIOME_HEIGHT_M[biome];
  const canopyPct = input.treeCanopyPct ?? 50;
  // Low canopy cover → younger / more open → closer to low end
  const fraction = Math.max(0.2, Math.min(1, canopyPct / 80));
  const h = lowH + (highH - lowH) * fraction;

  return {
    estimated_height_m: Math.round(h * 10) / 10,
    biome,
    confidence: 'estimate',
    note: 'Modelled from biome + canopy cover (Simard 2011, FRA 2020). Not a direct GEDI lidar measurement.',
  };
}
