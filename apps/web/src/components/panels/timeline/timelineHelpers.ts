/**
 * timelineHelpers — pure functions for timeline intelligence:
 * feature aggregation, build dependency checking, phase summaries.
 */

import type { DesignPath } from '../../../store/pathStore.js';
import type { Structure } from '../../../store/structureStore.js';
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
