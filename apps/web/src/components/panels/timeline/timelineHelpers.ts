/**
 * timelineHelpers — pure functions for timeline intelligence:
 * feature aggregation, build dependency checking, phase summaries.
 */

import type { CropArea, CropAreaType } from '../../../store/cropStore.js';
import type { DesignPath, PathType } from '../../../store/pathStore.js';
import type { Structure, StructureType } from '../../../store/structureStore.js';
import type { Utility, UtilityType } from '../../../store/utilityStore.js';

/* ── Feature aggregation ──────────────────────────────────────────────── */

export interface PhaseFeature {
  id: string;
  name: string;
  featureType: 'structure' | 'path' | 'utility';
  subType: string;
  phase: string;
}

export interface PhaseSummary {
  phaseName: string;
  featureCount: number;
  features: PhaseFeature[];
}

export function aggregatePhaseFeatures(
  structures: Structure[],
  paths: DesignPath[],
  utilities: Utility[],
): Map<string, PhaseSummary> {
  const map = new Map<string, PhaseSummary>();

  function ensure(phase: string): PhaseSummary {
    if (!map.has(phase)) map.set(phase, { phaseName: phase, featureCount: 0, features: [] });
    return map.get(phase)!;
  }

  for (const st of structures) {
    const phase = st.phase || 'Unassigned';
    const summary = ensure(phase);
    summary.features.push({ id: st.id, name: st.name, featureType: 'structure', subType: st.type, phase });
    summary.featureCount++;
  }

  for (const pa of paths) {
    const phase = pa.phase || 'Unassigned';
    const summary = ensure(phase);
    summary.features.push({ id: pa.id, name: pa.name, featureType: 'path', subType: pa.type, phase });
    summary.featureCount++;
  }

  for (const u of utilities) {
    const phase = u.phase || 'Unassigned';
    const summary = ensure(phase);
    summary.features.push({ id: u.id, name: u.name, featureType: 'utility', subType: u.type, phase });
    summary.featureCount++;
  }

  return map;
}

/* ── Build dependency checking ────────────────────────────────────────── */

export interface BuildDependencyRule {
  dependent: UtilityType;
  requires: UtilityType[];
  reason: string;
}

export const BUILD_DEPENDENCIES: BuildDependencyRule[] = [
  { dependent: 'greywater', requires: ['water_tank'], reason: 'Greywater system requires water tank for supply' },
  { dependent: 'septic', requires: ['water_tank'], reason: 'Septic system requires water infrastructure' },
  { dependent: 'battery_room', requires: ['solar_panel'], reason: 'Battery storage requires solar generation' },
  { dependent: 'lighting', requires: ['solar_panel'], reason: 'Lighting requires power source' },
  { dependent: 'laundry_station', requires: ['water_tank', 'greywater'], reason: 'Laundry requires water and drainage' },
  { dependent: 'rain_catchment', requires: ['water_tank'], reason: 'Catchment should feed into storage' },
];

const PHASE_ORDER: Record<string, number> = {
  'Phase 1': 1, 'Phase 2': 2, 'Phase 3': 3, 'Phase 4': 4,
};

export interface BuildViolation {
  utilityName: string;
  utilityPhase: string;
  missingType: string;
  reason: string;
}

export function checkBuildOrder(utilities: Utility[]): BuildViolation[] {
  const violations: BuildViolation[] = [];
  const typesByPhase = new Map<string, Set<UtilityType>>();

  for (const u of utilities) {
    const phase = u.phase || 'Phase 1';
    if (!typesByPhase.has(phase)) typesByPhase.set(phase, new Set());
    typesByPhase.get(phase)!.add(u.type);
  }

  for (const u of utilities) {
    const rule = BUILD_DEPENDENCIES.find((d) => d.dependent === u.type);
    if (!rule) continue;

    const uPhaseOrder = PHASE_ORDER[u.phase] ?? 1;

    for (const reqType of rule.requires) {
      let found = false;
      for (const [phase, types] of typesByPhase) {
        if ((PHASE_ORDER[phase] ?? 1) <= uPhaseOrder && types.has(reqType)) {
          found = true;
          break;
        }
      }
      if (!found) {
        violations.push({
          utilityName: u.name,
          utilityPhase: u.phase,
          missingType: reqType,
          reason: rule.reason,
        });
      }
    }
  }

  return violations;
}

/* ── Crop & structure build dependencies ──────────────────────────────────
 * §15 build-sequence-infrastructure-water-regen-revenue: extends utility-only
 * sequencing to cover the regen / revenue layers.
 *
 *   CROPS (revenue layer) — irrigated crop types must be preceded by a water
 *   source in the same or earlier phase. Rain-fed or un-irrigated areas are
 *   skipped (nothing to wait on).
 *
 *   STRUCTURES (infrastructure layer) — habitable & working structures must be
 *   preceded by a drivable path for material delivery and vehicle access.
 *   Point features (fire_circle, lookout) are excluded since they can be
 *   hand-built without vehicle access.
 *
 * All three checks share the same `PHASE_ORDER` scale so violations read
 * consistently in the PhasingDashboard warning panel.
 */

/** Utility types that can act as an irrigation source for crop areas. */
const IRRIGATION_SOURCE_UTILITY_TYPES: ReadonlySet<UtilityType> = new Set([
  'well_pump',
  'water_tank',
  'rain_catchment',
]);

/** Structure types that can also supply irrigation water (equivalent to utilities). */
const IRRIGATION_SOURCE_STRUCTURE_TYPES: ReadonlySet<StructureType> = new Set([
  'well',
  'water_tank',
  'water_pump_house',
]);

/**
 * Crop types that need an irrigation source scheduled first. Windbreaks,
 * shelterbelts, and pollinator strips are excluded because they're
 * rain-fed by design. Other types fall through to irrigation-type check.
 */
const IRRIGATION_REQUIRING_CROP_TYPES: ReadonlySet<CropAreaType> = new Set([
  'orchard',
  'food_forest',
  'silvopasture',
  'row_crop',
  'garden_bed',
  'market_garden',
  'nursery',
]);

/** Path types a construction vehicle can drive on to deliver materials. */
const DRIVABLE_PATH_TYPES: ReadonlySet<PathType> = new Set([
  'main_road',
  'secondary_road',
  'service_road',
  'farm_lane',
  'emergency_access',
]);

/**
 * Structure types that need vehicle access for construction. Fire circles
 * and lookouts are intentionally excluded — they're small enough to be
 * hand-carried or built from materials staged at a distance.
 */
const VEHICLE_ACCESS_REQUIRING_STRUCTURE_TYPES: ReadonlySet<StructureType> = new Set([
  'cabin',
  'yurt',
  'pavilion',
  'greenhouse',
  'barn',
  'workshop',
  'prayer_space',
  'bathhouse',
  'classroom',
  'storage',
  'animal_shelter',
  'compost_station',
  'water_pump_house',
  'tent_glamping',
  'earthship',
  'solar_array',
  'well',
  'water_tank',
]);

export interface CropBuildViolation {
  cropAreaName: string;
  cropAreaType: CropAreaType;
  cropAreaPhase: string;
  reason: string;
}

export interface StructureBuildViolation {
  structureName: string;
  structureType: StructureType;
  structurePhase: string;
  reason: string;
}

/**
 * Flag irrigated crop areas placed before any water source (utility or
 * structure) in their phase chain. An orchard in Phase 2 with no well /
 * tank / catchment scheduled by Phase 2 is a build-order violation.
 */
export function checkCropBuildOrder(
  cropAreas: CropArea[],
  utilities: Utility[],
  structures: Structure[],
): CropBuildViolation[] {
  const violations: CropBuildViolation[] = [];

  // Build phase → set-of-water-source-types (utilities + structures combined)
  const sourceByPhase = new Map<string, Set<string>>();
  const addSource = (phase: string, type: string) => {
    const key = phase || 'Phase 1';
    if (!sourceByPhase.has(key)) sourceByPhase.set(key, new Set());
    sourceByPhase.get(key)!.add(type);
  };
  for (const u of utilities) {
    if (IRRIGATION_SOURCE_UTILITY_TYPES.has(u.type)) addSource(u.phase, u.type);
  }
  for (const s of structures) {
    if (IRRIGATION_SOURCE_STRUCTURE_TYPES.has(s.type)) addSource(s.phase, s.type);
  }

  for (const c of cropAreas) {
    if (!IRRIGATION_REQUIRING_CROP_TYPES.has(c.type)) continue;
    // Rain-fed / none explicitly opts out of this dependency.
    if (c.irrigationType === 'rain_fed' || c.irrigationType === 'none') continue;

    const cPhaseOrder = PHASE_ORDER[c.phase] ?? 1;
    let found = false;
    for (const [phase, types] of sourceByPhase) {
      if ((PHASE_ORDER[phase] ?? 1) <= cPhaseOrder && types.size > 0) {
        found = true;
        break;
      }
    }
    if (!found) {
      violations.push({
        cropAreaName: c.name,
        cropAreaType: c.type,
        cropAreaPhase: c.phase || 'Phase 1',
        reason: `${c.type.replace(/_/g, ' ')} with ${c.irrigationType} irrigation needs a water source (well, tank, or catchment) scheduled in the same or earlier phase`,
      });
    }
  }

  return violations;
}

/**
 * Flag structures requiring vehicle access that are scheduled before any
 * drivable path is built. A barn in Phase 2 with no road / lane in Phase 1
 * or Phase 2 is a materials-delivery hazard.
 */
export function checkStructureBuildOrder(
  structures: Structure[],
  paths: DesignPath[],
): StructureBuildViolation[] {
  const violations: StructureBuildViolation[] = [];

  const drivableByPhase = new Map<string, number>();
  for (const p of paths) {
    if (!DRIVABLE_PATH_TYPES.has(p.type)) continue;
    const phase = p.phase || 'Phase 1';
    drivableByPhase.set(phase, (drivableByPhase.get(phase) ?? 0) + 1);
  }

  for (const s of structures) {
    if (!VEHICLE_ACCESS_REQUIRING_STRUCTURE_TYPES.has(s.type)) continue;
    const sPhaseOrder = PHASE_ORDER[s.phase] ?? 1;
    let found = false;
    for (const [phase, count] of drivableByPhase) {
      if ((PHASE_ORDER[phase] ?? 1) <= sPhaseOrder && count > 0) {
        found = true;
        break;
      }
    }
    if (!found) {
      violations.push({
        structureName: s.name,
        structureType: s.type,
        structurePhase: s.phase || 'Phase 1',
        reason: `${s.type.replace(/_/g, ' ')} needs a drivable path (road, lane, or service access) in the same or earlier phase for materials delivery`,
      });
    }
  }

  return violations;
}
