/**
 * PlantingToolDashboard — species suitability, frost-safe planting windows,
 * placement validation, spacing logic, companion planting, yield estimates.
 *
 * All data derived from site layers (climate, soils, elevation) and cropStore.
 * No hardcoded species or phenology.
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import { useCropStore, type CropArea } from '../../../store/cropStore.js';
import { useUtilityStore, type Utility } from '../../../store/utilityStore.js';
import { usePathStore, type DesignPath, type PathType } from '../../../store/pathStore.js';
import {
  filterSuitableSpecies,
  computePlantingWindows,
  validatePlacement,
  computeYieldEstimates,
  getCompanionNotes,
  computePlantingMetrics,
} from '../../planting/plantingAnalysis.js';
import { SPECIES_BY_ID } from '../../planting/plantSpeciesData.js';
import SeasonalProductivityCard from '../../crops/SeasonalProductivityCard.js';
import CompanionRotationPlannerCard from '../../crops/CompanionRotationPlannerCard.js';
import AllelopathyWarningCard from '../../crops/AllelopathyWarningCard.js';
import OrchardGuildSuggestionsCard from '../../crops/OrchardGuildSuggestionsCard.js';
import CanopyMaturityCard from '../../crops/CanopyMaturityCard.js';
import ClimateShiftScenarioCard from '../../crops/ClimateShiftScenarioCard.js';
import ShadeSuccessionForecastCard from '../../crops/ShadeSuccessionForecastCard.js';
import TreeSpacingCalculatorCard from '../../crops/TreeSpacingCalculatorCard.js';
import AgroforestryPatternAuditCard from '../../crops/AgroforestryPatternAuditCard.js';
import css from './PlantingToolDashboard.module.css';
import { DelayedTooltip } from '../../../components/ui/DelayedTooltip.js';

// ─── §11 Species water-demand rollup ──────────────────────────────────────────
//
// Each `PlantSpeciesInfo` carries a `waterDemand: 'low' | 'medium' | 'high'`
// class. The per-m² rate is no longer a flat 3-class table — it now varies
// by crop area type via `@ogden/shared/demand` (orchard:medium ≠
// market_garden:medium). Areas with no resolvable species fall back to the
// per-area-type "typical" rate.
import { getCropAreaDemandGalPerM2Yr, type CropAreaType } from '@ogden/shared/demand';

type WaterDemandClass = 'low' | 'medium' | 'high' | 'unknown';

interface CropAreaWaterRow {
  areaId: string;
  areaName: string;
  areaM2: number;
  speciesCount: number;
  dominantDemand: WaterDemandClass;
  gallonsPerYear: number;
}

interface WaterDemandRollup {
  rows: CropAreaWaterRow[];
  totalGallonsPerYear: number;
  totalAreaM2: number;
  byClass: { low: number; medium: number; high: number; unknown: number };
}

/**
 * Aggregate annual irrigation demand across placed crop areas.
 *
 * Strategy: for each area, resolve the species IDs against the catalog and
 * take the MAX water-demand class (conservative sizing — a mixed bed defers
 * to its thirstiest member). Multiply the class's per-m² rate by the area.
 * Areas with no known species fall through to `unknown` and contribute zero.
 */
function buildWaterDemandRollup(cropAreas: CropArea[]): WaterDemandRollup {
  const classOrder: Record<'low' | 'medium' | 'high', number> = { low: 1, medium: 2, high: 3 };

  const rows: CropAreaWaterRow[] = [];
  const byClass = { low: 0, medium: 0, high: 0, unknown: 0 };
  let totalGallonsPerYear = 0;
  let totalAreaM2 = 0;

  for (const area of cropAreas) {
    let dominant: WaterDemandClass = 'unknown';
    for (const speciesId of area.species) {
      const sp = SPECIES_BY_ID[speciesId];
      if (!sp) continue;
      if (dominant === 'unknown' || classOrder[sp.waterDemand] > classOrder[dominant as 'low' | 'medium' | 'high']) {
        dominant = sp.waterDemand;
      }
    }
    const rate = getCropAreaDemandGalPerM2Yr({
      areaType: area.type as CropAreaType,
      waterDemandClass: dominant === 'unknown' ? undefined : dominant,
    });
    const gallonsPerYear = Math.round(area.areaM2 * rate);
    rows.push({
      areaId: area.id,
      areaName: area.name,
      areaM2: area.areaM2,
      speciesCount: area.species.length,
      dominantDemand: dominant,
      gallonsPerYear,
    });
    totalGallonsPerYear += gallonsPerYear;
    totalAreaM2 += area.areaM2;
    byClass[dominant] += gallonsPerYear;
  }

  return { rows, totalGallonsPerYear, totalAreaM2, byClass };
}

function formatGal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n.toFixed(0)}`;
}

function waterClassLabel(c: WaterDemandClass): string {
  return c === 'unknown' ? 'Unknown' : c.charAt(0).toUpperCase() + c.slice(1);
}

// ─── §11 Frost-safe orchard + drainage-sensitive placement ───────────────────
//
// Synthesizes site-level orchard safety from slope, aspect, drainage, and
// frost-window. Tree-based crop area types (orchard, food_forest, silvopasture)
// are treated as orchard-like for placement checks. Per-species drainage &
// slope checks already live in `validatePlacement`; this helper complements
// that with a site-level verdict and orchard-only severity.
type SafetyStatus = 'good' | 'caution' | 'risk' | 'unknown';

interface SafetyFactor {
  label: string;
  value: string;
  status: SafetyStatus;
  detail: string;
}

interface OrchardPlacementRisk {
  areaId: string;
  areaName: string;
  areaType: string;
  status: SafetyStatus;
  reasons: string[];
}

interface OrchardSafety {
  site: {
    slope: SafetyFactor;
    aspect: SafetyFactor;
    drainage: SafetyFactor;
    frost: SafetyFactor;
  };
  overallSite: SafetyStatus;
  placements: OrchardPlacementRisk[];
  idealCharacteristics: string;
}

const ORCHARD_LIKE_TYPES: ReadonlySet<CropArea['type']> = new Set([
  'orchard',
  'food_forest',
  'silvopasture',
]);

/** Rank status severity for aggregation (max). */
const STATUS_RANK: Record<SafetyStatus, number> = {
  good: 0,
  unknown: 1,
  caution: 2,
  risk: 3,
};

function worstStatus(...statuses: SafetyStatus[]): SafetyStatus {
  let worst: SafetyStatus = 'good';
  for (const s of statuses) {
    if (STATUS_RANK[s] > STATUS_RANK[worst]) worst = s;
  }
  return worst;
}

function statusLabel(s: SafetyStatus): string {
  switch (s) {
    case 'good': return 'Good';
    case 'caution': return 'Caution';
    case 'risk': return 'Risk';
    case 'unknown': return 'Unknown';
  }
}

function buildOrchardSafety(
  climate: { last_frost_date?: string; hardiness_zone?: string } | null,
  soils: { drainage_class?: string } | null,
  elevation: { mean_slope_deg?: number; predominant_aspect?: string } | null,
  cropAreas: CropArea[],
): OrchardSafety {
  const slope = elevation?.mean_slope_deg ?? null;
  const aspect = (elevation?.predominant_aspect ?? '').toUpperCase().trim();
  const drainRaw = (soils?.drainage_class ?? '').toLowerCase().trim();
  const lastFrost = climate?.last_frost_date ?? null;

  // ── Slope factor ────────────────────────────────────────────────────
  let slopeFactor: SafetyFactor;
  if (slope == null) {
    slopeFactor = { label: 'Slope', value: '\u2014', status: 'unknown', detail: 'No elevation data available.' };
  } else if (slope < 2) {
    slopeFactor = { label: 'Slope', value: `${slope.toFixed(1)}\u00B0`, status: 'caution', detail: 'Very flat \u2014 cold air may pool (frost-pocket risk).' };
  } else if (slope < 3) {
    slopeFactor = { label: 'Slope', value: `${slope.toFixed(1)}\u00B0`, status: 'caution', detail: 'Flat \u2014 marginal cold-air drainage.' };
  } else if (slope <= 15) {
    slopeFactor = { label: 'Slope', value: `${slope.toFixed(1)}\u00B0`, status: 'good', detail: 'Good gradient for cold-air drainage and root aeration.' };
  } else if (slope <= 20) {
    slopeFactor = { label: 'Slope', value: `${slope.toFixed(1)}\u00B0`, status: 'caution', detail: 'Steep \u2014 terracing or keyline may be needed.' };
  } else {
    slopeFactor = { label: 'Slope', value: `${slope.toFixed(1)}\u00B0`, status: 'risk', detail: 'Very steep \u2014 erosion and harvest access concerns.' };
  }

  // ── Aspect factor ───────────────────────────────────────────────────
  let aspectFactor: SafetyFactor;
  if (!aspect) {
    aspectFactor = { label: 'Aspect', value: '\u2014', status: 'unknown', detail: 'No dominant aspect recorded.' };
  } else if (['S', 'SE', 'SW'].includes(aspect)) {
    aspectFactor = { label: 'Aspect', value: aspect, status: 'good', detail: 'Warm exposure \u2014 extends bearing season.' };
  } else if (['E', 'W'].includes(aspect)) {
    aspectFactor = { label: 'Aspect', value: aspect, status: 'good', detail: 'Balanced exposure \u2014 suitable for most orchards.' };
  } else if (['NE', 'NW'].includes(aspect)) {
    aspectFactor = { label: 'Aspect', value: aspect, status: 'caution', detail: 'Cooler exposure \u2014 favor late-leafing, frost-hardy cultivars.' };
  } else if (aspect === 'N') {
    aspectFactor = { label: 'Aspect', value: aspect, status: 'caution', detail: 'North-facing \u2014 shorter growing season; combine only with frost-hardy species.' };
  } else {
    aspectFactor = { label: 'Aspect', value: aspect, status: 'unknown', detail: 'Unrecognized aspect code.' };
  }

  // ── Drainage factor ─────────────────────────────────────────────────
  let drainageFactor: SafetyFactor;
  if (!drainRaw) {
    drainageFactor = { label: 'Drainage', value: '\u2014', status: 'unknown', detail: 'No soils data available.' };
  } else if (drainRaw.includes('very poor')) {
    drainageFactor = { label: 'Drainage', value: soils?.drainage_class ?? drainRaw, status: 'risk', detail: 'Unsuitable for orchard trees \u2014 root rot risk.' };
  } else if (drainRaw.includes('poorly')) {
    drainageFactor = { label: 'Drainage', value: soils?.drainage_class ?? drainRaw, status: 'risk', detail: 'Poor drainage \u2014 limit to wet-tolerant species (persimmon, pawpaw).' };
  } else if (drainRaw.includes('somewhat poor')) {
    drainageFactor = { label: 'Drainage', value: soils?.drainage_class ?? drainRaw, status: 'caution', detail: 'Marginal \u2014 favor hazelnut, elderberry, persimmon; add mounds for fruit trees.' };
  } else if (drainRaw.includes('well')) {
    drainageFactor = { label: 'Drainage', value: soils?.drainage_class ?? drainRaw, status: 'good', detail: 'Well-drained \u2014 ideal for fruit/nut trees.' };
  } else if (drainRaw.includes('excessive')) {
    drainageFactor = { label: 'Drainage', value: soils?.drainage_class ?? drainRaw, status: 'caution', detail: 'Droughty \u2014 mulch heavily and favor drought-tolerant rootstock.' };
  } else {
    drainageFactor = { label: 'Drainage', value: soils?.drainage_class ?? drainRaw, status: 'unknown', detail: 'Drainage class not recognized.' };
  }

  // ── Frost-window factor ─────────────────────────────────────────────
  let frostFactor: SafetyFactor;
  if (!lastFrost) {
    frostFactor = { label: 'Last Frost', value: '\u2014', status: 'unknown', detail: 'No frost-date data available.' };
  } else {
    const lf = lastFrost.toLowerCase();
    const isLate =
      /may|jun/.test(lf) || /late april|late apr/.test(lf);
    if (isLate) {
      frostFactor = { label: 'Last Frost', value: lastFrost, status: 'caution', detail: 'Late last-frost \u2014 frost-sensitive species (peach, cherry) need sheltered microsites.' };
    } else {
      frostFactor = { label: 'Last Frost', value: lastFrost, status: 'good', detail: 'Early last-frost \u2014 broad species window available.' };
    }
  }

  const overallSite = worstStatus(
    slopeFactor.status,
    aspectFactor.status,
    drainageFactor.status,
    frostFactor.status,
  );

  // ── Per-orchard-area placements ─────────────────────────────────────
  const placements: OrchardPlacementRisk[] = [];
  for (const area of cropAreas) {
    if (!ORCHARD_LIKE_TYPES.has(area.type)) continue;
    const reasons: string[] = [];
    let areaStatus: SafetyStatus = 'good';
    // Pull per-species drainage/slope/frost warnings conservatively
    for (const speciesId of area.species) {
      const sp = SPECIES_BY_ID[speciesId];
      if (!sp) continue;
      if (slope != null && slope > sp.maxSlopeDeg) {
        reasons.push(`${sp.commonName}: site slope ${slope.toFixed(1)}\u00B0 > max ${sp.maxSlopeDeg}\u00B0`);
        areaStatus = worstStatus(areaStatus, 'caution');
      }
      const drainOk = sp.drainageSuitability.some((d) =>
        drainRaw.includes(d.toLowerCase().trim()) || d.toLowerCase().trim().includes(drainRaw),
      );
      if (drainRaw && !drainOk) {
        reasons.push(`${sp.commonName}: prefers ${sp.drainageSuitability.join('/')}, site is "${drainRaw}"`);
        areaStatus = worstStatus(areaStatus, 'risk');
      }
      if (sp.frostSensitivity === 'high' && frostFactor.status === 'caution') {
        reasons.push(`${sp.commonName}: frost-sensitive on a late-frost site`);
        areaStatus = worstStatus(areaStatus, 'caution');
      }
    }
    // Site-level caution bubbles up if no species-specific issues
    if (reasons.length === 0 && (slopeFactor.status === 'caution' || drainageFactor.status === 'caution')) {
      reasons.push('Site-level caution applies (see factors above).');
      areaStatus = worstStatus(areaStatus, 'caution');
    }
    if (drainageFactor.status === 'risk') {
      reasons.push('Site drainage classified as risk for orchard trees.');
      areaStatus = worstStatus(areaStatus, 'risk');
    }
    placements.push({
      areaId: area.id,
      areaName: area.name,
      areaType: area.type,
      status: areaStatus,
      reasons,
    });
  }

  // ── Ideal-zone summary (for unpopulated sites) ──────────────────────
  const idealParts: string[] = [];
  idealParts.push('3\u201315\u00B0 slope');
  idealParts.push('S/SE/SW-facing aspect');
  idealParts.push('well-drained soils');
  idealParts.push('away from frost pockets (avoid low-lying flats with poor cold-air drainage)');
  const idealCharacteristics = idealParts.join(' \u00B7 ');

  return { site: { slope: slopeFactor, aspect: aspectFactor, drainage: drainageFactor, frost: frostFactor }, overallSite, placements, idealCharacteristics };
}

// ─── §11 Nursery / compost proximity planning ────────────────────────────────
//
// Flags orchard-like crop areas that are far from the nursery beds supplying
// their stock or from the compost stations feeding their mulch/amendment flow.
// Planning-grade thresholds chosen to reflect hand-haul vs. wheelbarrow vs.
// tractor-haul work budgets commonly referenced in regenerative-ag literature:
//
//   NURSERY (sapling & transplant supply)
//     <= 150 m : good     (close — single-person walk / wheelbarrow range)
//     <= 400 m : caution  (workable — tractor / UTV haul needed)
//     >  400 m : risk     (awkward — consider a satellite nursery bed)
//
//   COMPOST (mulch, amendment, woodchip staging)
//     <= 100 m : good     (wheelbarrow range)
//     <= 300 m : caution  (UTV / tractor haul)
//     >  300 m : risk     (dedicated haul route needed — consider satellite pile)
//
// All distances measured centroid-to-centroid via turf.distance (km → m).
// When no nursery or compost exists, every orchard is flagged `risk` with an
// explanatory reason so the gap surfaces on an otherwise "clean" site.
const NURSERY_GOOD_M = 150;
const NURSERY_CAUTION_M = 400;
const COMPOST_GOOD_M = 100;
const COMPOST_CAUTION_M = 300;

type ProximityStatus = 'good' | 'caution' | 'risk' | 'unknown';

interface ProximityTarget {
  /** Present when the source type exists on site; null when missing entirely. */
  nearestId: string | null;
  nearestName: string | null;
  /** Centroid-to-centroid distance in metres. null when missing. */
  distanceM: number | null;
  status: ProximityStatus;
  detail: string;
}

interface OrchardProximityRow {
  areaId: string;
  areaName: string;
  areaType: string;
  nursery: ProximityTarget;
  compost: ProximityTarget;
  overall: ProximityStatus;
}

interface ProximityChecks {
  nurseryCount: number;
  compostCount: number;
  orchardCount: number;
  rows: OrchardProximityRow[];
  missingNursery: boolean;
  missingCompost: boolean;
}

/** Polygon centroid as [lng, lat] or null if geometry is degenerate. */
function polygonCentroid(poly: GeoJSON.Polygon): [number, number] | null {
  try {
    const c = turf.centroid({ type: 'Feature', geometry: poly, properties: {} });
    const coords = c.geometry.coordinates;
    const lng = coords[0];
    const lat = coords[1];
    if (typeof lng !== 'number' || typeof lat !== 'number' || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return [lng, lat];
  } catch {
    return null;
  }
}

/** Distance in metres between two [lng, lat] points. */
function distanceMetres(a: [number, number], b: [number, number]): number {
  return turf.distance(a, b, { units: 'kilometers' }) * 1000;
}

function nurseryStatus(distM: number | null, hasAny: boolean): ProximityStatus {
  if (!hasAny) return 'risk';
  if (distM == null) return 'unknown';
  if (distM <= NURSERY_GOOD_M) return 'good';
  if (distM <= NURSERY_CAUTION_M) return 'caution';
  return 'risk';
}

function compostStatus(distM: number | null, hasAny: boolean): ProximityStatus {
  if (!hasAny) return 'risk';
  if (distM == null) return 'unknown';
  if (distM <= COMPOST_GOOD_M) return 'good';
  if (distM <= COMPOST_CAUTION_M) return 'caution';
  return 'risk';
}

function formatDistance(m: number | null): string {
  if (m == null) return '\u2014';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

/** Max-severity aggregator using the same STATUS_RANK scale as OrchardSafety. */
function worstProximityStatus(...statuses: ProximityStatus[]): ProximityStatus {
  let worst: ProximityStatus = 'good';
  for (const s of statuses) {
    if (STATUS_RANK[s] > STATUS_RANK[worst]) worst = s;
  }
  return worst;
}

function buildProximityChecks(cropAreas: CropArea[], utilities: Utility[]): ProximityChecks {
  // Source points: nursery crop areas (by centroid) + compost utilities (by center)
  const nurseries = cropAreas
    .filter((c) => c.type === 'nursery')
    .map((c) => ({ id: c.id, name: c.name, point: polygonCentroid(c.geometry) }))
    .filter((n): n is { id: string; name: string; point: [number, number] } => n.point !== null);

  const composts = utilities
    .filter((u) => u.type === 'compost')
    .map((u) => ({ id: u.id, name: u.name, point: u.center }));

  const orchards = cropAreas.filter((c) => ORCHARD_LIKE_TYPES.has(c.type));
  const rows: OrchardProximityRow[] = [];

  for (const o of orchards) {
    const oc = polygonCentroid(o.geometry);

    // ── Nearest nursery ──────────────────────────────────────────────
    let nurseryTarget: ProximityTarget;
    if (nurseries.length === 0) {
      nurseryTarget = {
        nearestId: null,
        nearestName: null,
        distanceM: null,
        status: 'risk',
        detail: 'No nursery crop area placed \u2014 stock supply route undefined.',
      };
    } else if (!oc) {
      nurseryTarget = {
        nearestId: null,
        nearestName: null,
        distanceM: null,
        status: 'unknown',
        detail: 'Orchard geometry centroid unresolved.',
      };
    } else {
      const first = nurseries[0]!;
      let best = { id: first.id, name: first.name, dist: distanceMetres(oc, first.point) };
      for (let i = 1; i < nurseries.length; i++) {
        const n = nurseries[i]!;
        const d = distanceMetres(oc, n.point);
        if (d < best.dist) best = { id: n.id, name: n.name, dist: d };
      }
      const st = nurseryStatus(best.dist, true);
      const detailByStatus: Record<ProximityStatus, string> = {
        good: `Close to nursery \u2014 walk / wheelbarrow haul works.`,
        caution: `Workable with UTV or tractor haul; consider a satellite bed if volume is high.`,
        risk: `Far from nursery \u2014 place a satellite propagation bed nearer this orchard.`,
        unknown: '',
      };
      nurseryTarget = {
        nearestId: best.id,
        nearestName: best.name,
        distanceM: best.dist,
        status: st,
        detail: detailByStatus[st],
      };
    }

    // ── Nearest compost ──────────────────────────────────────────────
    let compostTarget: ProximityTarget;
    if (composts.length === 0) {
      compostTarget = {
        nearestId: null,
        nearestName: null,
        distanceM: null,
        status: 'risk',
        detail: 'No compost utility placed \u2014 mulch / amendment flow undefined.',
      };
    } else if (!oc) {
      compostTarget = {
        nearestId: null,
        nearestName: null,
        distanceM: null,
        status: 'unknown',
        detail: 'Orchard geometry centroid unresolved.',
      };
    } else {
      const first = composts[0]!;
      let best = { id: first.id, name: first.name, dist: distanceMetres(oc, first.point) };
      for (let i = 1; i < composts.length; i++) {
        const c = composts[i]!;
        const d = distanceMetres(oc, c.point);
        if (d < best.dist) best = { id: c.id, name: c.name, dist: d };
      }
      const st = compostStatus(best.dist, true);
      const detailByStatus: Record<ProximityStatus, string> = {
        good: `Close to compost \u2014 wheelbarrow range.`,
        caution: `UTV / tractor haul range \u2014 acceptable for periodic top-dressing.`,
        risk: `Far from compost \u2014 stage a satellite pile closer to this orchard.`,
        unknown: '',
      };
      compostTarget = {
        nearestId: best.id,
        nearestName: best.name,
        distanceM: best.dist,
        status: st,
        detail: detailByStatus[st],
      };
    }

    rows.push({
      areaId: o.id,
      areaName: o.name,
      areaType: o.type,
      nursery: nurseryTarget,
      compost: compostTarget,
      overall: worstProximityStatus(nurseryTarget.status, compostTarget.status),
    });
  }

  return {
    nurseryCount: nurseries.length,
    compostCount: composts.length,
    orchardCount: orchards.length,
    rows,
    missingNursery: nurseries.length === 0,
    missingCompost: composts.length === 0,
  };
}

// ─── §11 Access-to-harvest & irrigation tie-in planning ──────────────────────
//
// For each orchard-like crop area, measures:
//   1. Distance to nearest irrigation source (well_pump, water_tank,
//      rain_catchment) — centroid-to-point. Drives pipe-run sizing + pump
//      head decisions.
//   2. Distance to nearest drivable path for harvest vehicles (main/secondary/
//      service road, farm lane, emergency access) — centroid-to-line via
//      `turf.pointToLineDistance`. Drives harvest logistics + picker access.
//
// Thresholds (planning-grade):
//   IRRIGATION TIE-IN (centroid → source)
//     <=  80 m : good     (short pipe run)
//     <= 250 m : caution  (sized pipe + pump head loss accounted for)
//     >  250 m : risk     (consider a closer tank / booster pump)
//
//   HARVEST ACCESS (centroid → drivable line)
//     <=  50 m : good     (truck / wagon can pull alongside)
//     <= 150 m : caution  (UTV shuttle reasonable)
//     >  150 m : risk     (carry-out by hand; consider a spur road)
//
// Missing-source handling mirrors the proximity checker: every orchard flags
// `risk` with an explanatory detail rather than silently showing "—".
const IRRIGATION_GOOD_M = 80;
const IRRIGATION_CAUTION_M = 250;
const HARVEST_GOOD_M = 50;
const HARVEST_CAUTION_M = 150;

const IRRIGATION_SOURCE_TYPES: ReadonlySet<Utility['type']> = new Set([
  'well_pump',
  'water_tank',
  'rain_catchment',
]);

/** Path types a harvest vehicle (truck, UTV, wagon) can actually drive. */
const HARVEST_DRIVABLE_PATH_TYPES: ReadonlySet<PathType> = new Set([
  'main_road',
  'secondary_road',
  'service_road',
  'farm_lane',
  'emergency_access',
]);

interface AccessTarget {
  nearestId: string | null;
  nearestName: string | null;
  nearestTypeLabel: string | null;
  distanceM: number | null;
  status: ProximityStatus;
  detail: string;
}

interface OrchardAccessRow {
  areaId: string;
  areaName: string;
  areaType: string;
  irrigation: AccessTarget;
  harvest: AccessTarget;
  overall: ProximityStatus;
}

interface AccessChecks {
  irrigationSourceCount: number;
  drivablePathCount: number;
  orchardCount: number;
  rows: OrchardAccessRow[];
  missingIrrigation: boolean;
  missingHarvestPath: boolean;
}

function irrigationStatus(distM: number | null, hasAny: boolean): ProximityStatus {
  if (!hasAny) return 'risk';
  if (distM == null) return 'unknown';
  if (distM <= IRRIGATION_GOOD_M) return 'good';
  if (distM <= IRRIGATION_CAUTION_M) return 'caution';
  return 'risk';
}

function harvestStatus(distM: number | null, hasAny: boolean): ProximityStatus {
  if (!hasAny) return 'risk';
  if (distM == null) return 'unknown';
  if (distM <= HARVEST_GOOD_M) return 'good';
  if (distM <= HARVEST_CAUTION_M) return 'caution';
  return 'risk';
}

function utilityTypeLabel(t: Utility['type']): string {
  return t.replace(/_/g, ' ');
}

function pathTypeLabel(t: PathType): string {
  return t.replace(/_/g, ' ');
}

/**
 * Minimum centroid-to-line distance in metres. Uses turf.pointToLineDistance
 * which handles great-circle math correctly for LineStrings.
 */
function pointToLineMetres(point: [number, number], line: GeoJSON.LineString): number | null {
  try {
    if (!line.coordinates || line.coordinates.length < 2) return null;
    const km = turf.pointToLineDistance(turf.point(point), turf.lineString(line.coordinates), {
      units: 'kilometers',
    });
    return Number.isFinite(km) ? km * 1000 : null;
  } catch {
    return null;
  }
}

function buildAccessChecks(
  cropAreas: CropArea[],
  utilities: Utility[],
  paths: DesignPath[],
): AccessChecks {
  const irrigationSources = utilities
    .filter((u) => IRRIGATION_SOURCE_TYPES.has(u.type))
    .map((u) => ({ id: u.id, name: u.name, type: u.type, point: u.center }));

  const drivablePaths = paths.filter((p) => HARVEST_DRIVABLE_PATH_TYPES.has(p.type));

  const orchards = cropAreas.filter((c) => ORCHARD_LIKE_TYPES.has(c.type));
  const rows: OrchardAccessRow[] = [];

  for (const o of orchards) {
    const oc = polygonCentroid(o.geometry);

    // ── Nearest irrigation source ─────────────────────────────────────
    let irrigation: AccessTarget;
    if (irrigationSources.length === 0) {
      irrigation = {
        nearestId: null,
        nearestName: null,
        nearestTypeLabel: null,
        distanceM: null,
        status: 'risk',
        detail: 'No well, water tank, or rain catchment placed \u2014 irrigation tie-in undefined.',
      };
    } else if (!oc) {
      irrigation = {
        nearestId: null,
        nearestName: null,
        nearestTypeLabel: null,
        distanceM: null,
        status: 'unknown',
        detail: 'Orchard geometry centroid unresolved.',
      };
    } else {
      const first = irrigationSources[0]!;
      let best = {
        id: first.id,
        name: first.name,
        type: first.type,
        dist: distanceMetres(oc, first.point),
      };
      for (let i = 1; i < irrigationSources.length; i++) {
        const s = irrigationSources[i]!;
        const d = distanceMetres(oc, s.point);
        if (d < best.dist) {
          best = {
            id: s.id,
            name: s.name,
            type: s.type,
            dist: d,
          };
        }
      }
      const st = irrigationStatus(best.dist, true);
      const detailByStatus: Record<ProximityStatus, string> = {
        good: `Short pipe run \u2014 standard 1\u201D line handles it.`,
        caution: `Moderate run \u2014 size pipe and pump head accordingly.`,
        risk: `Long run \u2014 consider a closer tank or satellite cistern.`,
        unknown: '',
      };
      irrigation = {
        nearestId: best.id,
        nearestName: best.name,
        nearestTypeLabel: utilityTypeLabel(best.type),
        distanceM: best.dist,
        status: st,
        detail: detailByStatus[st],
      };
    }

    // ── Nearest drivable path for harvest access ──────────────────────
    let harvest: AccessTarget;
    if (drivablePaths.length === 0) {
      harvest = {
        nearestId: null,
        nearestName: null,
        nearestTypeLabel: null,
        distanceM: null,
        status: 'risk',
        detail: 'No drivable path placed \u2014 harvest-vehicle access undefined.',
      };
    } else if (!oc) {
      harvest = {
        nearestId: null,
        nearestName: null,
        nearestTypeLabel: null,
        distanceM: null,
        status: 'unknown',
        detail: 'Orchard geometry centroid unresolved.',
      };
    } else {
      let best: { id: string; name: string; type: PathType; dist: number } | null = null;
      for (const p of drivablePaths) {
        const d = pointToLineMetres(oc, p.geometry);
        if (d == null) continue;
        if (best === null || d < best.dist) {
          best = { id: p.id, name: p.name, type: p.type, dist: d };
        }
      }
      if (best === null) {
        harvest = {
          nearestId: null,
          nearestName: null,
          nearestTypeLabel: null,
          distanceM: null,
          status: 'unknown',
          detail: 'Drivable path geometries unresolved.',
        };
      } else {
        const st = harvestStatus(best.dist, true);
        const detailByStatus: Record<ProximityStatus, string> = {
          good: `Truck or wagon pulls alongside \u2014 efficient harvest loading.`,
          caution: `UTV shuttle or short carry \u2014 acceptable but adds labor.`,
          risk: `Hand-carry only \u2014 stage a service spur closer to this orchard.`,
          unknown: '',
        };
        harvest = {
          nearestId: best.id,
          nearestName: best.name,
          nearestTypeLabel: pathTypeLabel(best.type),
          distanceM: best.dist,
          status: st,
          detail: detailByStatus[st],
        };
      }
    }

    rows.push({
      areaId: o.id,
      areaName: o.name,
      areaType: o.type,
      irrigation,
      harvest,
      overall: worstProximityStatus(irrigation.status, harvest.status),
    });
  }

  return {
    irrigationSourceCount: irrigationSources.length,
    drivablePathCount: drivablePaths.length,
    orchardCount: orchards.length,
    rows,
    missingIrrigation: irrigationSources.length === 0,
    missingHarvestPath: drivablePaths.length === 0,
  };
}

interface PlantingToolDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface ElevationSummary { predominant_aspect?: string; mean_slope_deg?: number; }
interface SoilsSummary { predominant_texture?: string; drainage_class?: string; ph_range?: string; }
interface ClimateSummary {
  hardiness_zone?: string;
  first_frost_date?: string;
  last_frost_date?: string;
  growing_season_days?: number;
  growing_degree_days_base10c?: number;
}

export default function PlantingToolDashboard({ project, onSwitchToMap }: PlantingToolDashboardProps) {
  const siteData = useSiteData(project.id);
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allPaths = usePathStore((s) => s.paths);

  const climate = useMemo(() => siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null, [siteData]);
  const soils = useMemo(() => siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null, [siteData]);
  const elevation = useMemo(() => siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null, [siteData]);

  const cropAreas = useMemo(
    () => allCropAreas.filter((c) => c.projectId === project.id),
    [allCropAreas, project.id],
  );

  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === project.id),
    [allUtilities, project.id],
  );

  const paths = useMemo(
    () => allPaths.filter((p) => p.projectId === project.id),
    [allPaths, project.id],
  );

  // Species suitability filtered by site conditions
  const suitability = useMemo(
    () => filterSuitableSpecies(climate, soils, elevation),
    [climate, soils, elevation],
  );

  // Frost-safe planting windows
  const windows = useMemo(() => computePlantingWindows(climate), [climate]);

  // Placement validation per crop area
  const validations = useMemo(
    () => cropAreas.map((area) => validatePlacement(area, climate, soils, elevation)),
    [cropAreas, climate, soils, elevation],
  );

  // Yield estimates
  const yields = useMemo(() => computeYieldEstimates(cropAreas), [cropAreas]);

  // §11 Water-demand rollup across placed crop areas
  const waterDemand = useMemo(() => buildWaterDemandRollup(cropAreas), [cropAreas]);

  // §11 Orchard safety — site-level frost/drainage/slope verdict + per-area risk
  const orchardSafety = useMemo(
    () => buildOrchardSafety(climate, soils, elevation, cropAreas),
    [climate, soils, elevation, cropAreas],
  );

  // §11 Nursery & compost proximity — per-orchard supply-route distances
  const proximity = useMemo(
    () => buildProximityChecks(cropAreas, utilities),
    [cropAreas, utilities],
  );

  // §11 Access-to-harvest + irrigation tie-in — per-orchard logistics distances
  const access = useMemo(
    () => buildAccessChecks(cropAreas, utilities, paths),
    [cropAreas, utilities, paths],
  );

  // Companion notes across all placed species
  const allSpeciesIds = useMemo(() => {
    const ids = new Set<string>();
    for (const area of cropAreas) {
      for (const s of area.species) ids.add(s);
    }
    return Array.from(ids);
  }, [cropAreas]);
  const companions = useMemo(() => getCompanionNotes(allSpeciesIds), [allSpeciesIds]);

  // Aggregate metrics
  const propertyAreaM2 = useMemo(() => {
    // Rough estimate from crop areas or project boundary
    return cropAreas.reduce((sum, a) => sum + a.areaM2, 0) * 3;
  }, [cropAreas]);
  const metrics = useMemo(
    () => computePlantingMetrics(cropAreas, propertyAreaM2),
    [cropAreas, propertyAreaM2],
  );

  // Spacing logic from elevation
  const siting = useMemo(() => {
    const aspect = (elevation?.predominant_aspect ?? 'S').toUpperCase().trim();
    const slope = elevation?.mean_slope_deg ?? 3;
    const zone = climate?.hardiness_zone ?? '6a';

    let orientation = 'NW\u2013SE rows';
    if (['N', 'NE', 'NW'].includes(aspect)) orientation = 'E\u2013W rows (maximize solar)';
    else if (['S', 'SE', 'SW'].includes(aspect)) orientation = 'N\u2013S rows (shading management)';

    let inRowFt = 20;
    let inRowLabel = '20ft';
    if (slope >= 8) { inRowFt = 25; inRowLabel = '25ft (steep terrain)'; }
    else if (slope < 3) { inRowFt = 15; inRowLabel = '15ft (flat)'; }

    const betweenRowFt = Math.round(inRowFt * 1.5 / 5) * 5;
    const inRowPct = Math.round((inRowFt / 40) * 100);
    const btRowPct = Math.round((betweenRowFt / 60) * 100);

    return { orientation, inRowLabel, inRowFt, inRowPct, betweenRowFt, btRowPct, zone };
  }, [elevation, climate]);

  return (
    <div className={css.page}>
      {/* Hero */}
      <div className={css.terrainHero}>
        <div className={css.terrainOverlay}>
          <span className={css.terrainTag}>PLANTING TOOL</span>
          <h1 className={css.title}>Design Parameters</h1>
          <span className={css.terrainSub}>SITE-FILTERED SPECIES &middot; ZONE {siting.zone}</span>
        </div>
      </div>

      {/* ── Suitable Species ─────────────────────────────────────── */}
      <div className={css.section}>
        <h2 className={css.sectionLabel}>
          SUITABLE SPECIES ({suitability.suitable.length} of {suitability.suitable.length + suitability.excluded.length})
        </h2>
        {suitability.suitable.length > 0 ? (
          <div className={css.speciesList}>
            {suitability.suitable.map((sp) => (
              <div key={sp.id} className={`${css.speciesCard} ${css.speciesActive}`}>
                <div>
                  <span className={css.speciesName}>{sp.commonName}</span>
                  <span className={css.speciesLatin}>{sp.latinName}</span>
                </div>
                <div className={css.speciesTags}>
                  <DelayedTooltip label={`Water demand: ${waterClassLabel(sp.waterDemand)} — ~${WATER_DEMAND_GAL_PER_M2_YR[sp.waterDemand]} gal/m²/yr`}>
                    <span
                      tabIndex={0}
                      className={`${css.waterChip} ${css[`waterChip_${sp.waterDemand}`]}`}
                    >
                      {sp.waterDemand === 'low' ? '\u25CB' : sp.waterDemand === 'medium' ? '\u25D0' : '\u25CF'}{' '}
                      {waterClassLabel(sp.waterDemand)} water
                    </span>
                  </DelayedTooltip>
                  <span className={css.speciesCategory}>{sp.category}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={css.emptyState}>No species match current site conditions.</div>
        )}
        {suitability.excluded.length > 0 && (
          <div className={css.excludedList}>
            <h3 className={css.sectionLabel} style={{ marginTop: 16 }}>EXCLUDED</h3>
            {suitability.excluded.map((ex) => (
              <div key={ex.species.id} className={css.excludedItem}>
                {ex.species.commonName}
                <span className={css.excludedReason}>— {ex.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Design Metrics ───────────────────────────────────────── */}
      <div className={css.section}>
        <h2 className={css.sectionLabel}>DESIGN METRICS</h2>
        {cropAreas.length > 0 ? (
          <div className={css.metricsGrid}>
            <div className={css.metricBox}>
              <span className={css.metricValue}>{metrics.totalLinearFeetPerimeter.toLocaleString()}</span>
              <span className={css.metricUnit}>TOTAL LINEAR FEET</span>
            </div>
            <div className={css.metricBox}>
              <span className={css.metricValue}>{metrics.totalTrees.toLocaleString()}</span>
              <span className={css.metricUnit}>TOTAL TREE COUNT</span>
            </div>
            <div className={css.metricBoxWide}>
              <span className={css.metricValue}>{metrics.estimatedCanopyCoverPct}%</span>
              <span className={css.metricUnit}>ESTIMATED CANOPY COVER (YEAR 15)</span>
            </div>
          </div>
        ) : (
          <div className={css.emptyState}>Place crop areas on the map to see metrics.</div>
        )}
      </div>

      {/* ── Water Demand Rollup (§11 species water-demand coupling) ─ */}
      {cropAreas.length > 0 && (
        <div className={css.section}>
          <h2 className={css.sectionLabel}>WATER DEMAND</h2>

          {/* Summary tiles */}
          <div className={css.waterSummary}>
            <div className={css.waterSummaryCell}>
              <span className={css.waterSummaryLabel}>TOTAL ANNUAL DEMAND</span>
              <span className={css.waterSummaryValue}>
                {formatGal(waterDemand.totalGallonsPerYear)}
              </span>
              <span className={css.waterSummaryUnit}>GAL/YEAR</span>
            </div>
            <div className={css.waterSummaryCell}>
              <span className={css.waterSummaryLabel}>LOW</span>
              <span className={css.waterSummaryValue}>{formatGal(waterDemand.byClass.low)}</span>
              <span className={css.waterSummaryUnit}>GAL/YEAR</span>
            </div>
            <div className={css.waterSummaryCell}>
              <span className={css.waterSummaryLabel}>MEDIUM</span>
              <span className={css.waterSummaryValue}>{formatGal(waterDemand.byClass.medium)}</span>
              <span className={css.waterSummaryUnit}>GAL/YEAR</span>
            </div>
            <div className={css.waterSummaryCell}>
              <span className={css.waterSummaryLabel}>HIGH</span>
              <span className={css.waterSummaryValue}>{formatGal(waterDemand.byClass.high)}</span>
              <span className={css.waterSummaryUnit}>GAL/YEAR</span>
            </div>
          </div>

          {/* Per-area breakdown */}
          <div className={css.waterTableHead}>
            <span>CROP AREA</span>
            <span>AREA</span>
            <span>DEMAND CLASS</span>
            <span>EST. GAL/YEAR</span>
          </div>
          {waterDemand.rows.map((r) => (
            <div key={r.areaId} className={css.waterRow}>
              <span className={css.waterCellLabel}>
                {r.areaName}
                <span className={css.waterCellMeta}>
                  {r.speciesCount} species
                </span>
              </span>
              <span className={css.waterCell}>{Math.round(r.areaM2).toLocaleString()} m²</span>
              <span
                className={`${css.waterChip} ${css[`waterChip_${r.dominantDemand}`]}`}
              >
                {r.dominantDemand === 'low' ? '\u25CB'
                  : r.dominantDemand === 'medium' ? '\u25D0'
                  : r.dominantDemand === 'high' ? '\u25CF'
                  : '?'}{' '}
                {waterClassLabel(r.dominantDemand)}
              </span>
              <span className={css.waterCell}>
                {r.dominantDemand === 'unknown' ? '—' : formatGal(r.gallonsPerYear)}
              </span>
            </div>
          ))}

          {/* Footnote */}
          <div className={css.waterFoot}>
            <div>
              Per-class rates: low ~{WATER_DEMAND_GAL_PER_M2_YR.low} gal/m²/yr,
              medium ~{WATER_DEMAND_GAL_PER_M2_YR.medium} gal/m²/yr,
              high ~{WATER_DEMAND_GAL_PER_M2_YR.high} gal/m²/yr. Mixed beds use the
              thirstiest species as a conservative sizing assumption.
            </div>
            <div>
              Compare this figure against the site&apos;s annual catchment potential in the
              <strong> Hydrology &rarr; Water Budget </strong>
              tab. Planning-grade only &mdash; actual irrigation depends on climate,
              mulching, species maturity, and establishment vs. bearing phase.
            </div>
          </div>
        </div>
      )}

      {/* ── Orchard Safety (§11 frost-safe + drainage-sensitive) ─── */}
      <div className={css.section}>
        <h2 className={css.sectionLabel}>
          ORCHARD SAFETY
          <span className={`${css.orchardStatusPill} ${css[`orchardStatus_${orchardSafety.overallSite}`]}`}>
            {statusLabel(orchardSafety.overallSite)}
          </span>
        </h2>

        {/* Site factor grid */}
        <div className={css.orchardFactorGrid}>
          {[orchardSafety.site.slope, orchardSafety.site.aspect, orchardSafety.site.drainage, orchardSafety.site.frost].map((f) => (
            <div key={f.label} className={css.orchardFactorCell}>
              <span className={css.orchardFactorHead}>
                <span className={css.orchardFactorLabel}>{f.label.toUpperCase()}</span>
                <span className={`${css.orchardDot} ${css[`orchardDot_${f.status}`]}`} aria-label={statusLabel(f.status)} />
              </span>
              <span className={css.orchardFactorValue}>{f.value}</span>
              <span className={css.orchardFactorDetail}>{f.detail}</span>
            </div>
          ))}
        </div>

        {/* Per-orchard-area risk list (or ideal-zone guidance if empty) */}
        {orchardSafety.placements.length > 0 ? (
          <div className={css.orchardPlacements}>
            <div className={css.orchardPlacementsHead}>
              PLACED ORCHARDS ({orchardSafety.placements.length})
            </div>
            {orchardSafety.placements.map((p) => (
              <div key={p.areaId} className={css.orchardPlacementRow}>
                <div className={css.orchardPlacementHead}>
                  <span className={css.orchardPlacementName}>{p.areaName}</span>
                  <span className={css.orchardPlacementType}>{p.areaType.replace(/_/g, ' ')}</span>
                  <span className={`${css.orchardStatusPill} ${css[`orchardStatus_${p.status}`]}`}>
                    {statusLabel(p.status)}
                  </span>
                </div>
                {p.reasons.length === 0 ? (
                  <div className={css.orchardPlacementReason}>All checks passed for this orchard.</div>
                ) : (
                  <ul className={css.orchardReasonList}>
                    {p.reasons.map((r, i) => (
                      <li key={i} className={css.orchardReasonItem}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={css.orchardEmpty}>
            No orchard-type crop areas placed yet. Ideal orchard zones on this
            site: <strong>{orchardSafety.idealCharacteristics}</strong>. Draw an
            orchard, food forest, or silvopasture area from the map view to run
            placement checks.
          </div>
        )}
      </div>

      {/* ── Nursery & Compost Proximity (§11) ─────────────────────── */}
      <div className={css.section}>
        <h2 className={css.sectionLabel}>
          NURSERY &amp; COMPOST PROXIMITY
          {proximity.orchardCount > 0 && (
            <span
              className={`${css.orchardStatusPill} ${css[`orchardStatus_${proximity.rows.reduce<ProximityStatus>(
                (acc, r) => worstProximityStatus(acc, r.overall),
                'good',
              )}`]}`}
            >
              {statusLabel(
                proximity.rows.reduce<ProximityStatus>(
                  (acc, r) => worstProximityStatus(acc, r.overall),
                  'good',
                ),
              )}
            </span>
          )}
        </h2>

        {/* Site-level counts */}
        <div className={css.proximityCounts}>
          <div className={css.proximityCount}>
            <span className={css.proximityCountValue}>{proximity.nurseryCount}</span>
            <span className={css.proximityCountLabel}>NURSERY AREAS</span>
          </div>
          <div className={css.proximityCount}>
            <span className={css.proximityCountValue}>{proximity.compostCount}</span>
            <span className={css.proximityCountLabel}>COMPOST STATIONS</span>
          </div>
          <div className={css.proximityCount}>
            <span className={css.proximityCountValue}>{proximity.orchardCount}</span>
            <span className={css.proximityCountLabel}>ORCHARD AREAS</span>
          </div>
        </div>

        {/* Missing-source banners */}
        {(proximity.missingNursery || proximity.missingCompost) && proximity.orchardCount > 0 && (
          <div className={css.proximityBanner}>
            {proximity.missingNursery && (
              <div className={css.proximityBannerItem}>
                <strong>No nursery crop area placed.</strong> Draw a{' '}
                <code>nursery</code>-type crop area near your propagation workflow so
                stock supply routes surface here.
              </div>
            )}
            {proximity.missingCompost && (
              <div className={css.proximityBannerItem}>
                <strong>No compost utility placed.</strong> Drop a{' '}
                <code>compost</code> station via the Utilities layer so mulch &amp;
                amendment haul distances surface here.
              </div>
            )}
          </div>
        )}

        {/* Per-orchard proximity rows */}
        {proximity.rows.length > 0 ? (
          <div className={css.orchardPlacements}>
            <div className={css.orchardPlacementsHead}>
              SUPPLY-ROUTE CHECKS ({proximity.rows.length})
            </div>
            {proximity.rows.map((r) => (
              <div key={r.areaId} className={css.orchardPlacementRow}>
                <div className={css.orchardPlacementHead}>
                  <span className={css.orchardPlacementName}>{r.areaName}</span>
                  <span className={css.orchardPlacementType}>
                    {r.areaType.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`${css.orchardStatusPill} ${css[`orchardStatus_${r.overall}`]}`}
                  >
                    {statusLabel(r.overall)}
                  </span>
                </div>
                <div className={css.proximityPairGrid}>
                  <div className={css.proximityPair}>
                    <span className={css.proximityPairHead}>
                      <span className={css.proximityPairLabel}>NURSERY</span>
                      <span
                        className={`${css.orchardDot} ${css[`orchardDot_${r.nursery.status}`]}`}
                        aria-label={statusLabel(r.nursery.status)}
                      />
                    </span>
                    <span className={css.proximityPairValue}>
                      {formatDistance(r.nursery.distanceM)}
                      {r.nursery.nearestName && (
                        <span className={css.proximityPairTarget}>
                          &rarr; {r.nursery.nearestName}
                        </span>
                      )}
                    </span>
                    <span className={css.proximityPairDetail}>{r.nursery.detail}</span>
                  </div>
                  <div className={css.proximityPair}>
                    <span className={css.proximityPairHead}>
                      <span className={css.proximityPairLabel}>COMPOST</span>
                      <span
                        className={`${css.orchardDot} ${css[`orchardDot_${r.compost.status}`]}`}
                        aria-label={statusLabel(r.compost.status)}
                      />
                    </span>
                    <span className={css.proximityPairValue}>
                      {formatDistance(r.compost.distanceM)}
                      {r.compost.nearestName && (
                        <span className={css.proximityPairTarget}>
                          &rarr; {r.compost.nearestName}
                        </span>
                      )}
                    </span>
                    <span className={css.proximityPairDetail}>{r.compost.detail}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className={css.waterFoot}>
              <div>
                Thresholds: nursery good &le;{NURSERY_GOOD_M}&nbsp;m, caution &le;
                {NURSERY_CAUTION_M}&nbsp;m. Compost good &le;{COMPOST_GOOD_M}&nbsp;m,
                caution &le;{COMPOST_CAUTION_M}&nbsp;m. Distances measured
                centroid-to-centroid &mdash; actual walking paths may be longer.
              </div>
            </div>
          </div>
        ) : (
          <div className={css.orchardEmpty}>
            No orchard-type crop areas placed yet. Proximity checks run against
            orchards, food forests, and silvopasture systems once drawn.
          </div>
        )}
      </div>

      {/* ── Access & Irrigation Tie-In (§11) ──────────────────────── */}
      <div className={css.section}>
        <h2 className={css.sectionLabel}>
          ACCESS &amp; IRRIGATION TIE-IN
          {access.orchardCount > 0 && (
            <span
              className={`${css.orchardStatusPill} ${css[`orchardStatus_${access.rows.reduce<ProximityStatus>(
                (acc, r) => worstProximityStatus(acc, r.overall),
                'good',
              )}`]}`}
            >
              {statusLabel(
                access.rows.reduce<ProximityStatus>(
                  (acc, r) => worstProximityStatus(acc, r.overall),
                  'good',
                ),
              )}
            </span>
          )}
        </h2>

        {/* Site-level counts */}
        <div className={css.proximityCounts}>
          <div className={css.proximityCount}>
            <span className={css.proximityCountValue}>{access.irrigationSourceCount}</span>
            <span className={css.proximityCountLabel}>WATER SOURCES</span>
          </div>
          <div className={css.proximityCount}>
            <span className={css.proximityCountValue}>{access.drivablePathCount}</span>
            <span className={css.proximityCountLabel}>DRIVABLE PATHS</span>
          </div>
          <div className={css.proximityCount}>
            <span className={css.proximityCountValue}>{access.orchardCount}</span>
            <span className={css.proximityCountLabel}>ORCHARD AREAS</span>
          </div>
        </div>

        {/* Missing-source banners */}
        {(access.missingIrrigation || access.missingHarvestPath) && access.orchardCount > 0 && (
          <div className={css.proximityBanner}>
            {access.missingIrrigation && (
              <div className={css.proximityBannerItem}>
                <strong>No irrigation source placed.</strong> Drop a{' '}
                <code>well_pump</code>, <code>water_tank</code>, or{' '}
                <code>rain_catchment</code> utility so tie-in distances surface here.
              </div>
            )}
            {access.missingHarvestPath && (
              <div className={css.proximityBannerItem}>
                <strong>No drivable path placed.</strong> Draw a{' '}
                <code>main_road</code>, <code>secondary_road</code>,{' '}
                <code>service_road</code>, <code>farm_lane</code>, or{' '}
                <code>emergency_access</code> path so harvest-vehicle access
                distances surface here.
              </div>
            )}
          </div>
        )}

        {/* Per-orchard access rows */}
        {access.rows.length > 0 ? (
          <div className={css.orchardPlacements}>
            <div className={css.orchardPlacementsHead}>
              LOGISTICS CHECKS ({access.rows.length})
            </div>
            {access.rows.map((r) => (
              <div key={r.areaId} className={css.orchardPlacementRow}>
                <div className={css.orchardPlacementHead}>
                  <span className={css.orchardPlacementName}>{r.areaName}</span>
                  <span className={css.orchardPlacementType}>
                    {r.areaType.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`${css.orchardStatusPill} ${css[`orchardStatus_${r.overall}`]}`}
                  >
                    {statusLabel(r.overall)}
                  </span>
                </div>
                <div className={css.proximityPairGrid}>
                  <div className={css.proximityPair}>
                    <span className={css.proximityPairHead}>
                      <span className={css.proximityPairLabel}>IRRIGATION</span>
                      <span
                        className={`${css.orchardDot} ${css[`orchardDot_${r.irrigation.status}`]}`}
                        aria-label={statusLabel(r.irrigation.status)}
                      />
                    </span>
                    <span className={css.proximityPairValue}>
                      {formatDistance(r.irrigation.distanceM)}
                      {r.irrigation.nearestName && (
                        <span className={css.proximityPairTarget}>
                          &rarr; {r.irrigation.nearestName}
                          {r.irrigation.nearestTypeLabel && ` (${r.irrigation.nearestTypeLabel})`}
                        </span>
                      )}
                    </span>
                    <span className={css.proximityPairDetail}>{r.irrigation.detail}</span>
                  </div>
                  <div className={css.proximityPair}>
                    <span className={css.proximityPairHead}>
                      <span className={css.proximityPairLabel}>HARVEST</span>
                      <span
                        className={`${css.orchardDot} ${css[`orchardDot_${r.harvest.status}`]}`}
                        aria-label={statusLabel(r.harvest.status)}
                      />
                    </span>
                    <span className={css.proximityPairValue}>
                      {formatDistance(r.harvest.distanceM)}
                      {r.harvest.nearestName && (
                        <span className={css.proximityPairTarget}>
                          &rarr; {r.harvest.nearestName}
                          {r.harvest.nearestTypeLabel && ` (${r.harvest.nearestTypeLabel})`}
                        </span>
                      )}
                    </span>
                    <span className={css.proximityPairDetail}>{r.harvest.detail}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className={css.waterFoot}>
              <div>
                Thresholds: irrigation good &le;{IRRIGATION_GOOD_M}&nbsp;m, caution
                &le;{IRRIGATION_CAUTION_M}&nbsp;m. Harvest good &le;{HARVEST_GOOD_M}
                &nbsp;m, caution &le;{HARVEST_CAUTION_M}&nbsp;m. Harvest distance is
                centroid to nearest drivable path (main / secondary / service road,
                farm lane, emergency access) &mdash; trails and pedestrian paths are
                excluded since they can&apos;t carry a harvest vehicle.
              </div>
            </div>
          </div>
        ) : (
          <div className={css.orchardEmpty}>
            No orchard-type crop areas placed yet. Access &amp; irrigation tie-in
            checks run against orchards, food forests, and silvopasture systems
            once drawn.
          </div>
        )}
      </div>

      {/* ── Frost-Safe Planting Windows ──────────────────────────── */}
      <div className={css.section}>
        <h2 className={css.sectionLabel}>FROST-SAFE PLANTING WINDOWS</h2>
        <div className={css.windowCard}>
          <div className={css.windowTitle}>Spring Window</div>
          <div className={css.windowDates}>{windows.springStart} — {windows.springEnd}</div>
        </div>
        <div className={css.windowCard}>
          <div className={css.windowTitle}>Fall Window</div>
          <div className={css.windowDates}>{windows.fallStart} — {windows.fallEnd}</div>
        </div>
        <div className={css.spacingRow} style={{ marginTop: 8 }}>
          <span className={css.spacingLabel}>LAST FROST</span>
          <span className={css.spacingValue} style={{ fontSize: 14 }}>{windows.lastFrostRaw}</span>
        </div>
        <div className={css.spacingRow}>
          <span className={css.spacingLabel}>FIRST FROST</span>
          <span className={css.spacingValue} style={{ fontSize: 14 }}>{windows.firstFrostRaw}</span>
        </div>
        <div className={css.spacingRow}>
          <span className={css.spacingLabel}>GROWING SEASON</span>
          <span className={css.spacingValue} style={{ fontSize: 14 }}>{windows.growingDays} days</span>
        </div>
      </div>

      {/* ── Spacing Logic ────────────────────────────────────────── */}
      <div className={css.section}>
        <h2 className={css.sectionLabel}>SPACING LOGIC</h2>
        <div className={css.spacingCard}>
          <div className={css.spacingRow}>
            <span className={css.spacingLabel}>IN-ROW SPACING</span>
            <span className={css.spacingValue}>{siting.inRowLabel}</span>
          </div>
          <div className={css.spacingTrack}>
            <div className={css.spacingFill} style={{ width: `${siting.inRowPct}%` }} />
            <div className={css.spacingThumb} style={{ left: `${siting.inRowPct}%` }} />
          </div>
          <div className={css.spacingRow}>
            <span className={css.spacingLabel}>BETWEEN-ROW SPACING</span>
            <span className={css.spacingValue}>{siting.betweenRowFt}ft</span>
          </div>
          <div className={css.spacingTrack}>
            <div className={css.spacingFill} style={{ width: `${siting.btRowPct}%` }} />
            <div className={css.spacingThumb} style={{ left: `${siting.btRowPct}%` }} />
          </div>
          <div className={css.spacingRow}>
            <span className={css.spacingLabel}>ROW ORIENTATION</span>
            <span className={css.spacingValue}>{siting.orientation}</span>
          </div>
          <div className={css.spacingRow}>
            <span className={css.spacingLabel}>HARDINESS ZONE</span>
            <span className={css.spacingValue}>{siting.zone}</span>
          </div>
        </div>
      </div>

      {/* ── Placement Validation ─────────────────────────────────── */}
      {validations.length > 0 && (
        <div className={css.section}>
          <h2 className={css.sectionLabel}>PLACEMENT VALIDATION</h2>
          {validations.map((v) => (
            <div key={v.cropAreaId} className={v.valid ? css.validationOk : css.validationWarn}>
              <div className={css.validationTitle}>
                {v.valid ? '\u2713' : '\u26A0'} {v.cropAreaName}
              </div>
              {v.warnings.map((w, i) => (
                <div key={i} className={css.validationMsg}>{w}</div>
              ))}
              {v.valid && <div className={css.validationMsg} style={{ color: 'rgba(21,128,61,0.7)' }}>All checks passed</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Companion Planting ───────────────────────────────────── */}
      {companions.length > 0 && (
        <div className={css.section}>
          <h2 className={css.sectionLabel}>COMPANION PLANTING NOTES</h2>
          {companions.map((c, i) => (
            <div key={i} className={css.companionRow}>
              <span className={c.relationship === 'companion' ? css.companionGood : css.companionBad}>
                {c.relationship === 'companion' ? '\u2713' : '\u2717'}
              </span>
              {c.speciesA} + {c.speciesB}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                {c.relationship}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Yield Estimates ──────────────────────────────────────── */}
      {yields.length > 0 && (
        <div className={css.section}>
          <h2 className={css.sectionLabel}>YIELD ESTIMATES</h2>
          <span className={css.yieldBadge}>Estimate — not a projection</span>
          {yields.map((y, i) => (
            <div key={i} className={css.yieldRow}>
              <span className={css.yieldSpecies}>
                {y.species} ({y.treesEstimated} plants)
              </span>
              <span className={css.yieldValue}>
                {y.yieldKg.toLocaleString()}
                <span className={css.yieldUnit}>{y.yieldUnit}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── §12 Seasonal Productivity ────────────────────────────── */}
      <SeasonalProductivityCard project={project} />

      {/* ── §12 Tree Spacing Calculator ──────────────────────────── */}
      <TreeSpacingCalculatorCard projectId={project.id} />

      {/* ── §12 Companion & Rotation Planner ─────────────────────── */}
      <CompanionRotationPlannerCard projectId={project.id} />

      {/* ── §12 Allelopathy & Suppression Warnings ───────────────── */}
      <AllelopathyWarningCard projectId={project.id} />

      {/* ── §12 Orchard Guild Suggestions (perennials) ───────────── */}
      <OrchardGuildSuggestionsCard projectId={project.id} />

      {/* ── §12 Agroforestry Pattern Audit (windbreak / silvopasture / food-forest / alley) ── */}
      <AgroforestryPatternAuditCard project={project} projectId={project.id} />

      {/* ── §15 Canopy Maturity & Overlap Projection ─────────────── */}
      <CanopyMaturityCard projectId={project.id} />

      {/* ── §16 Climate Shift Scenario Overlay (mid-century) ─────── */}
      <ClimateShiftScenarioCard projectId={project.id} />

      {/* ── §12 Shade Succession Forecast (Y5/Y10/Y20/Y50 arc) ───── */}
      <ShadeSuccessionForecastCard projectId={project.id} />

      {/* ── AI Siting Support ────────────────────────────────────── */}
      <div className={css.aiCard}>
        <div className={css.aiHeader}>
          <span className={css.aiLabel}>AI SITING SUPPORT</span>
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="rgba(21,128,61,0.4)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="2" />
            <path d="M8 2L9 4L11 3.4L10.7 5.5L12.7 6L11.4 7.5L12.7 9L10.7 9.5L11 11.6L9 11L8 13L7 11L5 11.6L5.3 9.5L3.3 9L4.6 7.5L3.3 6L5.3 5.5L5 3.4L7 4L8 2Z" />
          </svg>
        </div>
        <p className={css.aiQuote}>
          &ldquo;{siting.zone} hardiness zone with {suitability.suitable.length} suitable species.{' '}
          {siting.orientation} recommended for this aspect. Growing season: {windows.growingDays} days ({windows.lastFrostRaw} to {windows.firstFrostRaw}).{' '}
          {cropAreas.length > 0 ? `${metrics.totalTrees} trees across ${cropAreas.length} planting areas.` : 'Place crop areas on the map to generate specific recommendations.'}&rdquo;
        </p>
      </div>

      <button className={css.mapBtn} onClick={onSwitchToMap}>
        VIEW ON MAP
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>
    </div>
  );
}
