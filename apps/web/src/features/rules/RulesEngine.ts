/**
 * RulesEngine — evaluates all siting rules against the current project state.
 * Returns a list of violations sorted by severity.
 *
 * Pure functions — no side effects. Takes store state as input.
 */

import type { Structure } from '../../store/structureStore.js';
import type { LandZone } from '../../store/zoneStore.js';
import type { Paddock } from '../../store/livestockStore.js';
import type { CropArea } from '../../store/cropStore.js';
import type { DesignPath } from '../../store/pathStore.js';
import type { Utility } from '../../store/utilityStore.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import { SETBACK_RULES, SLOPE_RULES, type RuleViolation } from './SitingRules.js';

interface ProjectState {
  hasBoundary: boolean;
  structures: Structure[];
  zones: LandZone[];
  paddocks: Paddock[];
  crops: CropArea[];
  paths: DesignPath[];
  utilities: Utility[];
}

/**
 * Run all rules and return violations.
 */
export function evaluateRules(state: ProjectState): RuleViolation[] {
  const violations: RuleViolation[] = [];

  violations.push(...checkBoundarySetbacks(state));
  violations.push(...checkLivestockSpiritualBuffers(state));
  violations.push(...checkWaterProximity(state));
  violations.push(...checkInfrastructureDependencies(state));
  violations.push(...checkAccessRequirements(state));
  violations.push(...checkGuestPrivacy(state));

  // Sort: errors first, then warnings, then info
  const severityOrder = { error: 0, warning: 1, info: 2 };
  violations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return violations;
}

// ─── Rule checks ────────────────────────────────────────────────────────

function checkBoundarySetbacks(state: ProjectState): RuleViolation[] {
  const violations: RuleViolation[] = [];
  if (!state.hasBoundary) return violations;

  // Check structures near boundary edges (simplified — uses center point distance to boundary)
  // In a real implementation this would use Turf.js pointToLineDistance
  // For now, flag structures that don't have boundary context
  for (const s of state.structures) {
    const tmpl = STRUCTURE_TEMPLATES[s.type];
    if (tmpl?.category === 'dwelling' && s.phase === 'Phase 1') {
      // Check if there's a road for access
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
        });
      }
    }
  }

  return violations;
}

function checkLivestockSpiritualBuffers(state: ProjectState): RuleViolation[] {
  const violations: RuleViolation[] = [];

  const spiritualZones = state.zones.filter((z) => z.category === 'spiritual');
  const quietZones = state.zones.filter((z) => z.category === 'education' || z.category === 'retreat');

  for (const paddock of state.paddocks) {
    // Check proximity to spiritual zones
    for (const zone of spiritualZones) {
      // Simplified: if both exist, flag for review
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
      });
    }
  }

  return violations;
}

function checkWaterProximity(state: ProjectState): RuleViolation[] {
  const violations: RuleViolation[] = [];

  // Check if livestock paddocks have water source nearby
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
      });
    }
  }

  // Check septic distance from well
  const wells = state.utilities.filter((u) => u.type === 'well_pump');
  const septics = state.utilities.filter((u) => u.type === 'septic');

  for (const well of wells) {
    for (const septic of septics) {
      // Approximate distance check
      const dx = (well.center[0] - septic.center[0]) * 111320 * Math.cos((well.center[1] * Math.PI) / 180);
      const dy = (well.center[1] - septic.center[1]) * 111320;
      const dist = Math.sqrt(dx * dx + dy * dy);

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
        });
      }
    }
  }

  return violations;
}

function checkInfrastructureDependencies(state: ProjectState): RuleViolation[] {
  const violations: RuleViolation[] = [];

  // Dwellings need water + septic + power
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
    });
  }

  // Emergency access check
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
      const dx = (guest.center[0] - hab.center[0]) * 111320 * Math.cos((guest.center[1] * Math.PI) / 180);
      const dy = (guest.center[1] - hab.center[1]) * 111320;
      const dist = Math.sqrt(dx * dx + dy * dy);

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
        });
      }
    }
  }

  return violations;
}
