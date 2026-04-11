/**
 * RulesEngine — evaluates all siting rules against the current project state.
 * Returns a list of violations sorted by severity.
 *
 * Pure functions — no side effects. Takes store state as input.
 *
 * 15 rule checks:
 *   6 original (feature-vs-feature geometry)
 *   9 environmental (feature-vs-site-data from Tier 1/3 layers)
 */

import type { Structure } from '../../store/structureStore.js';
import type { LandZone } from '../../store/zoneStore.js';
import type { Paddock } from '../../store/livestockStore.js';
import type { CropArea } from '../../store/cropStore.js';
import type { DesignPath } from '../../store/pathStore.js';
import type { Utility } from '../../store/utilityStore.js';
import type { SiteData } from '../../store/siteDataStore.js';
import { getLayerSummary } from '../../store/siteDataStore.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import { computeQibla } from '../../lib/qibla.js';
import {
  SETBACK_RULES,
  SLOPE_RULES,
  SOLAR_RULES,
  GRAZING_SLOPE_RULES,
  FROST_RULES,
  FLOOD_SETBACK_RULES,
  DRAINAGE_RULES,
  WIND_SHELTER_RULES,
  SACRED_NOISE_BUFFER,
  CIRCULATION_RULES,
  FLOW_ACCUMULATION_RULES,
  type RuleViolation,
  type RuleWeightCategory,
} from './SitingRules.js';

/* ------------------------------------------------------------------ */
/*  Project state consumed by all rule checks                          */
/* ------------------------------------------------------------------ */

export interface ProjectState {
  hasBoundary: boolean;
  structures: Structure[];
  zones: LandZone[];
  paddocks: Paddock[];
  crops: CropArea[];
  paths: DesignPath[];
  utilities: Utility[];

  /** Environmental layer data — null until site intelligence is fetched */
  siteData: SiteData | null;
  /** Project center [lng, lat] — used for Qibla calculation */
  projectCenter: [number, number] | null;
  /** Project type — used for circulation rules (retreat_center, moontrance) */
  projectType: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Approximate distance in meters between two [lng, lat] points */
function approxDistanceM(a: [number, number], b: [number, number]): number {
  const dx = (a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180);
  const dy = (a[1] - b[1]) * 111320;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Centroid of a GeoJSON Polygon (simple average of exterior ring) */
function polygonCentroid(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): [number, number] {
  const ring = geom.type === 'Polygon' ? geom.coordinates[0]! : geom.coordinates[0]![0]!;
  let sumLng = 0;
  let sumLat = 0;
  for (const coord of ring) {
    sumLng += coord[0]!;
    sumLat += coord[1]!;
  }
  return [sumLng / ring.length, sumLat / ring.length];
}

/** Safely read a nested summary value */
function nestedVal<T>(summary: Record<string, unknown>, path: string): T | undefined {
  const parts = path.split('.');
  let current: unknown = summary;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current as T | undefined;
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

/**
 * Run all rules and return violations.
 */
export function evaluateRules(state: ProjectState): RuleViolation[] {
  const violations: RuleViolation[] = [];

  // Feature-vs-feature checks (original 6)
  violations.push(...checkBoundarySetbacks(state));
  violations.push(...checkLivestockSpiritualBuffers(state));
  violations.push(...checkWaterProximity(state));
  violations.push(...checkInfrastructureDependencies(state));
  violations.push(...checkAccessRequirements(state));
  violations.push(...checkGuestPrivacy(state));

  // Environmental checks (9 new — guarded by siteData presence)
  violations.push(...checkSlopeViolations(state));
  violations.push(...checkFloodZoneViolations(state));
  violations.push(...checkFrostPocketViolations(state));
  violations.push(...checkSolarOrientationViolations(state));
  violations.push(...checkWindShelterViolations(state));
  violations.push(...checkDrainageViolations(state));
  violations.push(...checkFlowAccumulationViolations(state));
  violations.push(...checkSacredZoneBuffers(state));
  violations.push(...checkGuestCirculationViolations(state));

  // Sort: errors first, then warnings, then info
  const severityOrder = { error: 0, warning: 1, info: 2 };
  violations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return violations;
}

// ═══════════════════════════════════════════════════════════════════════
//  ORIGINAL 6 — feature-vs-feature checks (now with weight + dataSource)
// ═══════════════════════════════════════════════════════════════════════

function checkBoundarySetbacks(state: ProjectState): RuleViolation[] {
  const violations: RuleViolation[] = [];
  if (!state.hasBoundary) return violations;

  for (const s of state.structures) {
    const tmpl = STRUCTURE_TEMPLATES[s.type];
    if (tmpl?.category === 'dwelling' && s.phase === 'Phase 1') {
      const hasAccessRoad = state.paths.some((p) => p.type === 'main_road' || p.type === 'secondary_road');
      if (!hasAccessRoad) {
        violations.push({
          ruleId: 'access-to-dwelling',
          severity: 'warning',
          category: 'access',
          title: 'No access road to dwelling',
          description: `${s.name} is a dwelling but no main or secondary road has been drawn.`,
          suggestion: 'Draw a main road or secondary road connecting the dwelling to the property entrance.',
          affectedElementId: s.id,
          affectedElementName: s.name,
          needsSiteVisit: false,
          ruleWeightCategory: 'structural',
          dataSource: 'Feature Geometry',
        });
      }
    }
  }

  return violations;
}

function checkLivestockSpiritualBuffers(state: ProjectState): RuleViolation[] {
  const violations: RuleViolation[] = [];

  const spiritualZones = state.zones.filter((z) => z.category === 'spiritual');

  for (const paddock of state.paddocks) {
    for (const zone of spiritualZones) {
      violations.push({
        ruleId: 'livestock-spiritual-buffer',
        severity: 'info',
        category: 'buffer',
        title: 'Livestock near spiritual zone',
        description: `Paddock "${paddock.name}" and spiritual zone "${zone.name}" should maintain a ${SETBACK_RULES.livestock_spiritual}m buffer for noise and odor.`,
        suggestion: 'Verify on-site that wind patterns carry livestock smells away from the prayer space.',
        affectedElementId: paddock.id,
        affectedElementName: paddock.name,
        needsSiteVisit: true,
        ruleWeightCategory: 'spiritual',
        dataSource: 'Feature Geometry',
      });
    }

    // Guest-safe buffer check
    if (!paddock.guestSafeBuffer && state.zones.some((z) => z.category === 'retreat')) {
      violations.push({
        ruleId: 'guest-safe-livestock',
        severity: 'warning',
        category: 'buffer',
        title: 'Paddock near guest area without buffer',
        description: `"${paddock.name}" is not marked as guest-safe, but retreat zones exist.`,
        suggestion: 'Enable "guest-safe buffer" on this paddock or ensure physical separation from guest areas.',
        affectedElementId: paddock.id,
        affectedElementName: paddock.name,
        needsSiteVisit: false,
        ruleWeightCategory: 'experiential',
        dataSource: 'Feature Geometry',
      });
    }
  }

  return violations;
}

function checkWaterProximity(state: ProjectState): RuleViolation[] {
  const violations: RuleViolation[] = [];

  const waterUtils = state.utilities.filter((u) => u.type === 'water_tank' || u.type === 'well_pump');

  for (const paddock of state.paddocks) {
    if (paddock.species.length > 0 && waterUtils.length === 0) {
      violations.push({
        ruleId: 'livestock-water-source',
        severity: 'error',
        category: 'water',
        title: 'No water source for livestock',
        description: `Paddock "${paddock.name}" has livestock species but no water tank or well has been placed.`,
        suggestion: 'Place a water tank or well pump within reach of the paddock.',
        affectedElementId: paddock.id,
        affectedElementName: paddock.name,
        needsSiteVisit: false,
        ruleWeightCategory: 'hydrological',
        dataSource: 'Feature Geometry',
      });
    }
  }

  // Well-septic distance
  const wells = state.utilities.filter((u) => u.type === 'well_pump');
  const septics = state.utilities.filter((u) => u.type === 'septic');

  for (const well of wells) {
    for (const septic of septics) {
      const dist = approxDistanceM(well.center, septic.center);

      if (dist < SETBACK_RULES.well_septic) {
        violations.push({
          ruleId: 'well-septic-distance',
          severity: 'error',
          category: 'setback',
          title: 'Well too close to septic',
          description: `"${well.name}" is only ${Math.round(dist)}m from "${septic.name}". Minimum required: ${SETBACK_RULES.well_septic}m.`,
          suggestion: `Move the well or septic to maintain at least ${SETBACK_RULES.well_septic}m separation.`,
          affectedElementId: well.id,
          affectedElementName: well.name,
          needsSiteVisit: false,
          ruleWeightCategory: 'structural',
          dataSource: 'Feature Geometry',
        });
      }
    }
  }

  return violations;
}

function checkInfrastructureDependencies(state: ProjectState): RuleViolation[] {
  const violations: RuleViolation[] = [];

  const dwellings = state.structures.filter((s) => {
    const tmpl = STRUCTURE_TEMPLATES[s.type];
    return tmpl?.category === 'dwelling';
  });

  const hasWater = state.utilities.some((u) => u.type === 'well_pump' || u.type === 'water_tank');
  const hasSeptic = state.utilities.some((u) => u.type === 'septic');
  const hasPower = state.utilities.some((u) => u.type === 'solar_panel' || u.type === 'generator');

  for (const d of dwellings) {
    const reqs = STRUCTURE_TEMPLATES[d.type]?.infrastructureReqs ?? [];
    if (reqs.includes('water') && !hasWater) {
      violations.push({
        ruleId: 'dwelling-needs-water',
        severity: 'warning',
        category: 'water',
        title: 'Dwelling needs water source',
        description: `"${d.name}" requires water but no well or water tank has been placed.`,
        suggestion: 'Place a well/pump or water tank before building the dwelling.',
        affectedElementId: d.id,
        affectedElementName: d.name,
        needsSiteVisit: false,
        ruleWeightCategory: 'structural',
        dataSource: 'Feature Geometry',
      });
    }
    if (reqs.includes('septic') && !hasSeptic) {
      violations.push({
        ruleId: 'dwelling-needs-septic',
        severity: 'warning',
        category: 'setback',
        title: 'Dwelling needs septic system',
        description: `"${d.name}" requires a septic system that has not been placed.`,
        suggestion: 'Place a septic system at least 30m from any water source.',
        affectedElementId: d.id,
        affectedElementName: d.name,
        needsSiteVisit: false,
        ruleWeightCategory: 'structural',
        dataSource: 'Feature Geometry',
      });
    }
    if (reqs.includes('power') && !hasPower) {
      violations.push({
        ruleId: 'dwelling-needs-power',
        severity: 'info',
        category: 'conflict',
        title: 'No power source placed',
        description: `"${d.name}" requires power but no solar array or generator has been placed.`,
        suggestion: 'Place a solar array or generator for off-grid power supply.',
        affectedElementId: d.id,
        affectedElementName: d.name,
        needsSiteVisit: false,
        ruleWeightCategory: 'structural',
        dataSource: 'Feature Geometry',
      });
    }
  }

  return violations;
}

function checkAccessRequirements(state: ProjectState): RuleViolation[] {
  const violations: RuleViolation[] = [];

  if (state.structures.length > 0 && state.paths.length === 0) {
    violations.push({
      ruleId: 'no-access-paths',
      severity: 'warning',
      category: 'access',
      title: 'No access paths planned',
      description: `${state.structures.length} structures placed but no roads or paths have been drawn.`,
      suggestion: 'Draw at least a main road for vehicle access and pedestrian paths between key structures.',
      affectedElementId: state.structures[0]!.id,
      affectedElementName: 'Project',
      needsSiteVisit: false,
      ruleWeightCategory: 'structural',
      dataSource: 'Feature Geometry',
    });
  }

  if (state.structures.length > 3 && !state.paths.some((p) => p.type === 'emergency_access')) {
    violations.push({
      ruleId: 'no-emergency-access',
      severity: 'info',
      category: 'access',
      title: 'No emergency access route',
      description: 'Multiple structures without a designated emergency access route.',
      suggestion: 'Draw an emergency access path that fire and EMS vehicles can use.',
      affectedElementId: state.structures[0]!.id,
      affectedElementName: 'Project',
      needsSiteVisit: false,
      ruleWeightCategory: 'structural',
      dataSource: 'Feature Geometry',
    });
  }

  return violations;
}

function checkGuestPrivacy(state: ProjectState): RuleViolation[] {
  const violations: RuleViolation[] = [];

  const guestStructures = state.structures.filter((s) => s.type === 'tent_glamping' || s.type === 'yurt');
  const habitations = state.structures.filter((s) => s.type === 'cabin' || s.type === 'earthship');

  for (const guest of guestStructures) {
    for (const hab of habitations) {
      const dist = approxDistanceM(guest.center, hab.center);

      if (dist < SETBACK_RULES.guest_privacy) {
        violations.push({
          ruleId: 'guest-privacy-buffer',
          severity: 'info',
          category: 'privacy',
          title: 'Guest accommodation close to dwelling',
          description: `"${guest.name}" is ${Math.round(dist)}m from "${hab.name}". Recommended privacy buffer: ${SETBACK_RULES.guest_privacy}m.`,
          suggestion: 'Consider visual screening (hedgerow, fence) or increase separation for guest comfort.',
          affectedElementId: guest.id,
          affectedElementName: guest.name,
          needsSiteVisit: true,
          ruleWeightCategory: 'experiential',
          dataSource: 'Feature Geometry',
        });
      }
    }
  }

  return violations;
}

// ═══════════════════════════════════════════════════════════════════════
//  NEW 9 — environmental + advanced feature checks
// ═══════════════════════════════════════════════════════════════════════

/**
 * 1. Slope violations — structures, roads, and paddocks vs elevation data.
 * Data source: Elevation Layer (mean_slope_deg)
 */
function checkSlopeViolations(state: ProjectState): RuleViolation[] {
  if (!state.siteData) return [];
  const elev = getLayerSummary<Record<string, unknown>>(state.siteData, 'elevation');
  if (!elev) return [];

  const meanSlope = Number(elev['mean_slope_deg'] ?? 0);
  if (meanSlope <= 0) return [];

  const violations: RuleViolation[] = [];

  // Structures on steep slopes
  for (const s of state.structures) {
    const tmpl = STRUCTURE_TEMPLATES[s.type];
    if (!tmpl) continue;

    if (meanSlope > SLOPE_RULES.structure_max) {
      violations.push({
        ruleId: 'slope-structure',
        severity: 'error',
        category: 'slope',
        title: `Slope too steep for ${tmpl.label.toLowerCase()}`,
        description: `Site mean slope is ${meanSlope.toFixed(1)}\u00b0 \u2014 structures on slopes above ${SLOPE_RULES.structure_max}\u00b0 face prohibitive foundation costs and erosion risk.`,
        suggestion: `Consider relocating ${s.name} to flatter terrain or plan for engineered foundations.`,
        affectedElementId: s.id,
        affectedElementName: s.name,
        needsSiteVisit: true,
        ruleWeightCategory: 'structural',
        dataSource: 'Elevation Layer',
      });
    } else if (meanSlope > SLOPE_RULES.structure_warn) {
      violations.push({
        ruleId: 'slope-structure',
        severity: 'warning',
        category: 'slope',
        title: `Moderate slope for ${tmpl.label.toLowerCase()}`,
        description: `Site mean slope is ${meanSlope.toFixed(1)}\u00b0 \u2014 structures on slopes above ${SLOPE_RULES.structure_warn}\u00b0 need additional foundation engineering.`,
        suggestion: `Factor in slope-adapted foundations for ${s.name}. Site visit recommended to assess micro-terrain.`,
        affectedElementId: s.id,
        affectedElementName: s.name,
        needsSiteVisit: true,
        ruleWeightCategory: 'structural',
        dataSource: 'Elevation Layer',
      });
    }
  }

  // Roads on steep slopes
  for (const p of state.paths) {
    if (p.type === 'main_road' || p.type === 'secondary_road' || p.type === 'service_road' || p.type === 'emergency_access') {
      if (meanSlope > SLOPE_RULES.road_max) {
        violations.push({
          ruleId: 'slope-road',
          severity: 'error',
          category: 'slope',
          title: `Road slope exceeds limit`,
          description: `Site mean slope is ${meanSlope.toFixed(1)}\u00b0 \u2014 roads on slopes above ${SLOPE_RULES.road_max}\u00b0 require cut-and-fill engineering and may be impassable in wet conditions.`,
          suggestion: `Reroute "${p.name}" along contour lines to reduce effective grade.`,
          affectedElementId: p.id,
          affectedElementName: p.name,
          needsSiteVisit: true,
          ruleWeightCategory: 'structural',
          dataSource: 'Elevation Layer',
        });
      } else if (meanSlope > SLOPE_RULES.road_warn) {
        violations.push({
          ruleId: 'slope-road',
          severity: 'warning',
          category: 'slope',
          title: `Road on moderate slope`,
          description: `Site mean slope is ${meanSlope.toFixed(1)}\u00b0 \u2014 roads above ${SLOPE_RULES.road_warn}\u00b0 need gravel base and drainage channels.`,
          suggestion: `Plan water bars and culverts for "${p.name}" to prevent erosion.`,
          affectedElementId: p.id,
          affectedElementName: p.name,
          needsSiteVisit: true,
          ruleWeightCategory: 'structural',
          dataSource: 'Elevation Layer',
        });
      }
    }
  }

  // Paddocks on steep slopes (grazing erosion)
  for (const paddock of state.paddocks) {
    if (meanSlope > GRAZING_SLOPE_RULES.max) {
      violations.push({
        ruleId: 'slope-grazing',
        severity: 'warning',
        category: 'grazing',
        title: 'Paddock on steep slope',
        description: `Site mean slope is ${meanSlope.toFixed(1)}\u00b0 \u2014 paddocks on slopes above ${GRAZING_SLOPE_RULES.max}\u00b0 cause erosion and animal stress.`,
        suggestion: `Consider reducing stocking density in "${paddock.name}" or establishing terraced grazing cells.`,
        affectedElementId: paddock.id,
        affectedElementName: paddock.name,
        needsSiteVisit: true,
        ruleWeightCategory: 'agricultural',
        dataSource: 'Elevation Layer',
      });
    } else if (meanSlope > GRAZING_SLOPE_RULES.warn) {
      violations.push({
        ruleId: 'slope-grazing',
        severity: 'info',
        category: 'grazing',
        title: 'Paddock on moderate slope',
        description: `Site mean slope is ${meanSlope.toFixed(1)}\u00b0 \u2014 paddocks above ${GRAZING_SLOPE_RULES.warn}\u00b0 benefit from rotational grazing to prevent soil compaction.`,
        suggestion: `Plan shorter grazing rotations for "${paddock.name}" and monitor for erosion paths.`,
        affectedElementId: paddock.id,
        affectedElementName: paddock.name,
        needsSiteVisit: false,
        ruleWeightCategory: 'agricultural',
        dataSource: 'Elevation Layer',
      });
    }
  }

  return violations;
}

/**
 * 2. Flood zone violations — structures in flood-prone areas.
 * Data source: Wetlands & Flood Layer (flood_zone)
 */
function checkFloodZoneViolations(state: ProjectState): RuleViolation[] {
  if (!state.siteData) return [];
  const wetlands = getLayerSummary<Record<string, unknown>>(state.siteData, 'wetlands_flood');
  if (!wetlands) return [];

  const floodZone = String(wetlands['flood_zone'] ?? '').toLowerCase();
  // Only flag if there's an actual flood risk (not "minimal risk", "not regulated", etc.)
  const isFloodRisk = floodZone.includes('100-year') || floodZone.includes('zone a') ||
    floodZone.includes('zone v') || floodZone.includes('floodway') ||
    floodZone.includes('high risk') || floodZone.includes('flood plain');

  if (!isFloodRisk) return [];

  const violations: RuleViolation[] = [];

  for (const s of state.structures) {
    if (FLOOD_SETBACK_RULES.restricted_types.includes(s.type)) {
      violations.push({
        ruleId: 'flood-zone',
        severity: 'error',
        category: 'flood',
        title: 'Structure in flood zone',
        description: `"${s.name}" is sited within a mapped flood zone (${String(wetlands['flood_zone'])}). Structures placed here are at risk of flood damage and may not be insurable.`,
        suggestion: `Relocate ${s.name} to higher ground outside the flood zone boundary.`,
        affectedElementId: s.id,
        affectedElementName: s.name,
        needsSiteVisit: true,
        ruleWeightCategory: 'hydrological',
        dataSource: 'Wetlands & Flood Layer',
      });
    }
  }

  return violations;
}

/**
 * 3. Frost pocket violations — sensitive crops in cold-air pooling areas.
 * Data source: Terrain Analysis (Tier 3) — coldAirDrainage.riskRating
 */
function checkFrostPocketViolations(state: ProjectState): RuleViolation[] {
  if (!state.siteData) return [];
  const terrain = getLayerSummary<Record<string, unknown>>(state.siteData, 'terrain_analysis');
  if (!terrain) return [];

  const riskRating = nestedVal<string>(terrain, 'coldAirDrainage.riskRating');
  if (!riskRating || riskRating.toLowerCase() !== FROST_RULES.risk_threshold) return [];

  const violations: RuleViolation[] = [];

  for (const crop of state.crops) {
    if (FROST_RULES.sensitive_types.includes(crop.type)) {
      violations.push({
        ruleId: 'frost-pocket',
        severity: 'warning',
        category: 'frost',
        title: 'Frost-sensitive crop in cold-air pooling area',
        description: `Terrain analysis shows high cold-air drainage risk \u2014 "${crop.name}" (${crop.type}) is susceptible to frost damage in terrain hollows where cold air pools overnight.`,
        suggestion: `Consider relocating "${crop.name}" to a slope shoulder or mid-slope position where cold air drains away rather than accumulating.`,
        affectedElementId: crop.id,
        affectedElementName: crop.name,
        needsSiteVisit: true,
        ruleWeightCategory: 'agricultural',
        dataSource: 'Terrain Analysis (Tier 3)',
      });
    }
  }

  return violations;
}

/**
 * 4. Solar orientation violations — dwellings on non-optimal aspects + Qibla alignment for prayer spaces.
 * Data source: Elevation Layer (predominant_aspect) + Qibla Library
 */
function checkSolarOrientationViolations(state: ProjectState): RuleViolation[] {
  const violations: RuleViolation[] = [];

  // Part A: Solar aspect for dwellings (needs site data)
  if (state.siteData) {
    const elev = getLayerSummary<Record<string, unknown>>(state.siteData, 'elevation');
    if (elev) {
      const aspect = String(elev['predominant_aspect'] ?? '');
      if (aspect && !SOLAR_RULES.preferred_aspects.includes(aspect)) {
        for (const s of state.structures) {
          if (SOLAR_RULES.dwelling_types.includes(s.type)) {
            violations.push({
              ruleId: 'solar-orientation',
              severity: 'info',
              category: 'solar',
              title: 'Non-optimal solar aspect',
              description: `Site predominant aspect is ${aspect} \u2014 dwellings facing south, SE, or SW capture 30\u201340% more passive solar gain for heating and natural light.`,
              suggestion: `Orient "${s.name}" with primary windows facing south if possible, or add south-facing clerestory windows.`,
              affectedElementId: s.id,
              affectedElementName: s.name,
              needsSiteVisit: false,
              ruleWeightCategory: 'structural',
              dataSource: 'Elevation Layer',
            });
          }
        }
      }
    }
  }

  // Part B: Qibla alignment for prayer spaces (needs project center)
  if (state.projectCenter) {
    const qibla = computeQibla(state.projectCenter[1], state.projectCenter[0]);
    const prayerSpaces = state.structures.filter((s) => s.type === 'prayer_space');

    for (const ps of prayerSpaces) {
      // Compare structure rotation to Qibla bearing (within 15° tolerance)
      const rotNorm = ((ps.rotationDeg % 360) + 360) % 360;
      const qiblaNorm = ((qibla.bearing % 360) + 360) % 360;
      const diff = Math.abs(rotNorm - qiblaNorm);
      const angularDiff = diff > 180 ? 360 - diff : diff;

      if (angularDiff > 15) {
        violations.push({
          ruleId: 'prayer-qibla-alignment',
          severity: 'info',
          category: 'spiritual',
          title: 'Prayer space not aligned to Qibla',
          description: `"${ps.name}" is oriented at ${Math.round(rotNorm)}\u00b0 but the Qibla bearing from this location is ${Math.round(qiblaNorm)}\u00b0 (${angularDiff.toFixed(0)}\u00b0 off). Aligning to Qibla direction is spiritually significant for prayer spaces.`,
          suggestion: `Rotate "${ps.name}" to ${Math.round(qiblaNorm)}\u00b0 to align with the Qibla direction.`,
          affectedElementId: ps.id,
          affectedElementName: ps.name,
          needsSiteVisit: false,
          ruleWeightCategory: 'spiritual',
          dataSource: 'Qibla Library',
        });
      }
    }
  }

  return violations;
}

/**
 * 5. Wind shelter violations — dwellings in exposed areas.
 * Data source: Microclimate (Tier 3) — windShelter.shelteredAreaPct
 */
function checkWindShelterViolations(state: ProjectState): RuleViolation[] {
  if (!state.siteData) return [];
  const micro = getLayerSummary<Record<string, unknown>>(state.siteData, 'microclimate');
  if (!micro) return [];

  const shelteredPct = nestedVal<number>(micro, 'windShelter.shelteredAreaPct');
  if (shelteredPct == null || shelteredPct >= WIND_SHELTER_RULES.min_shelter_pct) return [];

  const violations: RuleViolation[] = [];

  for (const s of state.structures) {
    if (WIND_SHELTER_RULES.dwelling_types.includes(s.type)) {
      violations.push({
        ruleId: 'wind-shelter',
        severity: 'warning',
        category: 'wind',
        title: 'Dwelling in wind-exposed area',
        description: `Only ${shelteredPct.toFixed(0)}% of the site has wind shelter \u2014 exposed dwellings face higher heating costs and structural wind load. Minimum recommended: ${WIND_SHELTER_RULES.min_shelter_pct}%.`,
        suggestion: `Plant windbreak trees (shelterbelt) upwind of "${s.name}" or site behind existing terrain features for natural wind protection.`,
        affectedElementId: s.id,
        affectedElementName: s.name,
        needsSiteVisit: true,
        ruleWeightCategory: 'structural',
        dataSource: 'Microclimate (Tier 3)',
      });
    }
  }

  return violations;
}

/**
 * 6. Drainage violations — orchards/crops in poorly drained soil.
 * Data source: Soils Layer (drainage_class)
 */
function checkDrainageViolations(state: ProjectState): RuleViolation[] {
  if (!state.siteData) return [];
  const soils = getLayerSummary<Record<string, unknown>>(state.siteData, 'soils');
  if (!soils) return [];

  const drainageClass = String(soils['drainage_class'] ?? '').toLowerCase();
  const isPoorDrainage = DRAINAGE_RULES.poor_classes.some((c) => drainageClass.includes(c));
  if (!isPoorDrainage) return [];

  const violations: RuleViolation[] = [];

  for (const crop of state.crops) {
    if (DRAINAGE_RULES.sensitive_types.includes(crop.type)) {
      violations.push({
        ruleId: 'drainage-orchard',
        severity: 'warning',
        category: 'drainage',
        title: `Poor drainage for ${crop.type}`,
        description: `Soil drainage is classified as "${soils['drainage_class']}" \u2014 ${crop.type} root systems in poorly drained soil are susceptible to root rot and reduced yields.`,
        suggestion: `Consider raised beds, French drains, or relocate "${crop.name}" to better-drained soil if available on-site.`,
        affectedElementId: crop.id,
        affectedElementName: crop.name,
        needsSiteVisit: true,
        ruleWeightCategory: 'hydrological',
        dataSource: 'Soils Layer',
      });
    }
  }

  return violations;
}

/**
 * 7. Flow accumulation violations — water features in low-accumulation areas.
 * Data source: Watershed Derived (Tier 3) — runoff.meanAccumulation
 */
function checkFlowAccumulationViolations(state: ProjectState): RuleViolation[] {
  if (!state.siteData) return [];
  const wshed = getLayerSummary<Record<string, unknown>>(state.siteData, 'watershed_derived');
  if (!wshed) return [];

  const meanAcc = nestedVal<number>(wshed, 'runoff.meanAccumulation');
  if (meanAcc == null || meanAcc >= FLOW_ACCUMULATION_RULES.min_accumulation) return [];

  const violations: RuleViolation[] = [];

  // Water retention zones
  const waterZones = state.zones.filter((z) =>
    FLOW_ACCUMULATION_RULES.water_zone_types.includes(z.category),
  );

  for (const zone of waterZones) {
    violations.push({
      ruleId: 'flow-accumulation',
      severity: 'info',
      category: 'water',
      title: 'Low flow accumulation for water feature',
      description: `Flow accumulation index is ${meanAcc.toFixed(1)} \u2014 water features placed in low-accumulation areas may not fill reliably during normal rainfall. Minimum recommended: ${FLOW_ACCUMULATION_RULES.min_accumulation}.`,
      suggestion: `Consider supplemental water input for "${zone.name}" (roof runoff diversion, pump-fill) or relocate to a natural drainage convergence point.`,
      affectedElementId: zone.id,
      affectedElementName: zone.name,
      needsSiteVisit: true,
      ruleWeightCategory: 'hydrological',
      dataSource: 'Watershed Derived (Tier 3)',
    });
  }

  // Water feature structures near other structures (spillway clearance)
  for (const zone of waterZones) {
    const zoneCentroid = polygonCentroid(zone.geometry);
    for (const s of state.structures) {
      const dist = approxDistanceM(zoneCentroid, s.center);
      if (dist < FLOW_ACCUMULATION_RULES.spillway_clearance) {
        violations.push({
          ruleId: 'water-structure-clearance',
          severity: 'warning',
          category: 'water',
          title: 'Structure too close to water feature',
          description: `"${s.name}" is only ${Math.round(dist)}m from water zone "${zone.name}". Minimum spillway clearance: ${FLOW_ACCUMULATION_RULES.spillway_clearance}m.`,
          suggestion: `Move "${s.name}" at least ${FLOW_ACCUMULATION_RULES.spillway_clearance}m from the water feature for spillway safety.`,
          affectedElementId: s.id,
          affectedElementName: s.name,
          needsSiteVisit: false,
          ruleWeightCategory: 'hydrological',
          dataSource: 'Feature Geometry',
        });
      }
    }
  }

  return violations;
}

/**
 * 8. Sacred zone buffer violations — spiritual zones too close to noise sources.
 * Data source: Feature Geometry (distance calculations)
 */
function checkSacredZoneBuffers(state: ProjectState): RuleViolation[] {
  const violations: RuleViolation[] = [];

  const spiritualZones = state.zones.filter((z) => z.category === 'spiritual');
  if (spiritualZones.length === 0) return violations;

  for (const zone of spiritualZones) {
    const zoneCentroid = polygonCentroid(zone.geometry);

    // Check distance to roads
    for (const path of state.paths) {
      if (path.type === 'main_road' || path.type === 'secondary_road' || path.type === 'service_road') {
        // Use first point of line as approximate position
        const pathStart = path.geometry.coordinates[0] as [number, number] | undefined;
        if (!pathStart) continue;
        const dist = approxDistanceM(zoneCentroid, pathStart);
        if (dist < SACRED_NOISE_BUFFER.roads) {
          violations.push({
            ruleId: 'sacred-noise-road',
            severity: 'warning',
            category: 'spiritual',
            title: 'Spiritual zone close to road',
            description: `Spiritual zone "${zone.name}" is only ${Math.round(dist)}m from road "${path.name}" \u2014 recommended minimum acoustic buffer is ${SACRED_NOISE_BUFFER.roads}m.`,
            suggestion: `Increase separation or plant a dense hedgerow/tree buffer between "${zone.name}" and the road.`,
            affectedElementId: zone.id,
            affectedElementName: zone.name,
            needsSiteVisit: true,
            ruleWeightCategory: 'spiritual',
            dataSource: 'Feature Geometry',
          });
        }
      }
    }

    // Check distance to paddocks (livestock noise/odor)
    for (const paddock of state.paddocks) {
      const paddockCentroid = polygonCentroid(paddock.geometry);
      const dist = approxDistanceM(zoneCentroid, paddockCentroid);
      if (dist < SACRED_NOISE_BUFFER.livestock) {
        violations.push({
          ruleId: 'sacred-noise-livestock',
          severity: 'warning',
          category: 'spiritual',
          title: 'Spiritual zone close to livestock',
          description: `Spiritual zone "${zone.name}" is only ${Math.round(dist)}m from paddock "${paddock.name}" \u2014 recommended minimum buffer is ${SACRED_NOISE_BUFFER.livestock}m for acoustic privacy and odor separation.`,
          suggestion: `Increase separation or establish a planted buffer zone between "${zone.name}" and the paddock.`,
          affectedElementId: zone.id,
          affectedElementName: zone.name,
          needsSiteVisit: true,
          ruleWeightCategory: 'spiritual',
          dataSource: 'Feature Geometry',
        });
      }
    }

    // Check distance to infrastructure zones
    const infraZones = state.zones.filter((z) => z.category === 'infrastructure');
    for (const infra of infraZones) {
      const infraCentroid = polygonCentroid(infra.geometry);
      const dist = approxDistanceM(zoneCentroid, infraCentroid);
      if (dist < SACRED_NOISE_BUFFER.infrastructure) {
        violations.push({
          ruleId: 'sacred-noise-infrastructure',
          severity: 'info',
          category: 'spiritual',
          title: 'Spiritual zone close to infrastructure',
          description: `Spiritual zone "${zone.name}" is only ${Math.round(dist)}m from infrastructure zone "${infra.name}" \u2014 recommended minimum buffer is ${SACRED_NOISE_BUFFER.infrastructure}m for noise separation.`,
          suggestion: `Consider noise-mitigating landscape features between "${zone.name}" and "${infra.name}".`,
          affectedElementId: zone.id,
          affectedElementName: zone.name,
          needsSiteVisit: false,
          ruleWeightCategory: 'spiritual',
          dataSource: 'Feature Geometry',
        });
      }
    }
  }

  return violations;
}

/**
 * 9. Guest circulation violations — guest paths crossing service/livestock routes.
 * Only applies to retreat_center and moontrance project types.
 * Data source: Feature Geometry (line intersection)
 */
function checkGuestCirculationViolations(state: ProjectState): RuleViolation[] {
  if (!state.projectType) return [];
  if (!CIRCULATION_RULES.applicable_project_types.includes(state.projectType)) return [];

  const violations: RuleViolation[] = [];

  const guestPaths = state.paths.filter((p) =>
    CIRCULATION_RULES.guest_path_types.includes(p.type),
  );
  const servicePaths = state.paths.filter((p) =>
    CIRCULATION_RULES.service_path_types.includes(p.type),
  );

  // Approximate intersection check: if any segment endpoints are close
  for (const guest of guestPaths) {
    for (const service of servicePaths) {
      // Check if any points on the service path are near the guest path
      const guestCoords = guest.geometry.coordinates as [number, number][];
      const serviceCoords = service.geometry.coordinates as [number, number][];

      let minDist = Infinity;
      for (const gc of guestCoords) {
        for (const sc of serviceCoords) {
          const d = approxDistanceM(gc, sc);
          if (d < minDist) minDist = d;
        }
      }

      // If paths come within 5m of each other, consider it a crossing
      if (minDist < 5) {
        violations.push({
          ruleId: 'guest-circulation-conflict',
          severity: 'warning',
          category: 'circulation',
          title: 'Guest route crosses service route',
          description: `Guest path "${guest.name}" crosses service path "${service.name}" \u2014 retreat guests should not encounter service traffic, livestock movement, or farm equipment during their arrival sequence.`,
          suggestion: `Reroute "${service.name}" to avoid crossing "${guest.name}", or design a grade-separated crossing point.`,
          affectedElementId: guest.id,
          affectedElementName: guest.name,
          needsSiteVisit: false,
          ruleWeightCategory: 'experiential',
          dataSource: 'Feature Geometry',
        });
      }
    }
  }

  return violations;
}
