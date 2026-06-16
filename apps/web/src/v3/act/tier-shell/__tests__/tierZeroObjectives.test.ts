/**
 * tierZeroObjectives -- the single membership set shared by ActTierShell and
 * PlanTierShell to decide which objectives swap their center pane to the
 * decision workbench (Plan) / execution-only panel (Act) instead of the map.
 *
 * This set is load-bearing for TWO shells: if it ever drifts, one shell would
 * mount the workbench while the other mounts the map for the same objective.
 * These pins keep the id roster and both predicates honest.
 */

import { describe, it, expect } from 'vitest';
import {
  TIER_ZERO_OBJECTIVE_IDS,
  isTierZeroObjective,
  isTierZeroObjectiveId,
} from '../tierZeroObjectives.js';
import type { PlanStratumObjective } from '@ogden/shared';

const EXPECTED_IDS = [
  's1-vision',
  's1-steward',
  's1-boundaries',
  's1-stakeholders',
  'ev-s1-legal-governance',
  'ev-s1-provision-balance',
  's2-terrain',
  's2-climate',
  's2-ecology',
  'ev-s2-landscape-vectors',
  'ev-s2-carrying-capacity',
  'silv-sec-s1-livestock-intent',
  'silv-sec-s3-forage-survey',
  'silv-sec-s4-grazing-design',
  'ev-s1-conflict-framework',
  'silv-sec-s4-husbandry-framework',
  's5-soil-improvement',
  's4-water-strategy',
  'ev-s3-energy-potential',
  'ev-s4-settlement-strategy',
  'nur-sec-s2-biosecurity-survey',
  'ev-s4-financial-model',
  'nur-sec-s1-propagation-infra-survey',
  'ev-s7-adaptive-management',
  'ev-s7-exit-succession',
  'ev-s2-social-fabric',
  'ev-s3-infra-condition',
  // Universal gap-closure (2026-06-12): non-spatial decision objectives routed
  // through the workbench so every checklist item has a per-item capture path.
  's4-direction',
  's7-phase1',
  's7-resource-plan',
  // Ecovillage workbench membership (2026-06-12): ten ev- objectives across
  // s4, s6, and s7 strata added to the Tier-0 set so the workbench execution
  // surface covers them without a map mount. Bespoke captures deferred; the
  // generic workbench per-item path (textarea + Record) is the v1 route.
  'ev-s4-food-system',
  'ev-s4-infra-strategy',
  'ev-s6-coordination-feedback',
  'ev-s6-external-relations',
  'ev-s6-maintenance-protocol',
  'ev-s6-social-monitoring',
  'ev-s7-financial-plan',
  'ev-s7-launch-sequence',
  'ev-s7-onboarding',
  'ev-s7-settlement-plan',
  // Orchard workbench membership (2026-06-12)
  'orch-s4-species-mix',
  'orch-s4-succession-management',
  'orch-sec-s4-species-pollination',
  'orch-s6-adaptive-management',
  'orch-sec-s6-perennial-care',
  'orch-s7-financial-viability',
  'orch-s7-planting-establishment',
  'orch-s7-succession-plan',
  // Silvopasture workbench membership (2026-06-12)
  'silv-s4-animal-health',
  'silv-s6-animal-health-monitoring',
  'silv-s7-financial-viability',
  'silv-s7-livestock-establishment',
  // Nursery-secondary workbench membership (2026-06-12)
  'nur-sec-s1-water-survey',
  // Homestead workbench membership (2026-06-12)
  'hms-s4-energy-shelter-resilience',
  'hms-s4-food-production-strategy',
  'hms-s6-self-sufficiency-feedback',
  'hms-s7-adaptive-management',
  'hms-s7-budget-input-reduction',
  'hms-s7-provision-phasing',
  // Agritourism workbench membership (2026-06-12)
  'ag-s2-seasonal-patterns',
  'ag-s4-food-strategy',
  'ag-s4-revenue-model',
  'ag-s4-service-model',
  'ag-s6-compliance-monitoring',
  'ag-s6-experience-feedback',
  'ag-s6-load-monitoring',
  'ag-s7-adaptive-management',
  'ag-s7-booking-system',
  'ag-s7-phased-launch',
  'ag-s7-seasonal-resilience',
  'ag-s7-staffing-training',
  // Off-grid workbench membership (2026-06-12)
  'ofg-s3-energy-demand-balance',
  'ofg-s4-emergency-comms-response',
  'ofg-s4-energy-system-redundancy',
  'ofg-s4-food-security-storage',
  'ofg-s4-shelter-thermal-performance',
  'ofg-s4-water-system-redundancy',
  'ofg-s6-adaptive-management',
  'ofg-s6-emergency-preparedness-monitoring',
  'ofg-s6-systems-performance-monitoring',
  'ofg-s7-phased-habitation',
  'ofg-s7-resourcing-supply-chain',
  'ofg-s7-systems-establishment-sequence',
  // Wellness workbench membership (2026-06-12)
  'well-s4-healing-garden-strategy',
  'well-s4-safeguarding-protocol',
  'well-s4-sensory-design-standards',
  'well-s4-therapeutic-program',
  'well-s6-external-relations',
  'well-s6-outcome-monitoring',
  'well-s6-sensory-monitoring',
  'well-s7-adaptive-management',
  'well-s7-practitioner-onboarding',
  'well-s7-program-launch',
  'well-sec-s4-safeguarding',
  'well-sec-s4-sensory-standards',
  'well-sec-s4-therapeutic-program',
  // Education workbench membership (2026-06-12)
  'edu-s4-food-hospitality',
  'edu-s4-program-delivery',
  'edu-s6-adaptive-management',
  'edu-s6-external-relations-compliance',
  'edu-s6-program-evaluation',
  'edu-s7-financial-viability',
  'edu-s7-instructor-onboarding',
  'edu-s7-program-launch',
  // Conservation workbench membership (2026-06-12)
  'con-s4-native-species-provenance',
  'con-s4-pest-invasive-strategy',
  'con-s6-external-relations-compliance',
  'con-s7-adaptive-management',
  'con-s7-funding-resourcing',
  'con-s7-longterm-timeline',
  'con-s7-phase1-priorities',
  'con-s7-volunteer-stewardship',
  // Livestock workbench membership (2026-06-12)
  'lvs-s4-grazing-system',
  'lvs-s4-species-breed',
  'lvs-s4-stocking-rate',
  'lvs-s5-feed-budget',
  'lvs-s6-herd-health',
  'lvs-s7-break-even',
  'lvs-s7-herd-buildup',
  'lvs-s7-marketing',
  // Livestock-secondary workbench membership (2026-06-12)
  'lvs-sec-s4-species-stocking',
  // Market-garden workbench membership (2026-06-12)
  'mgd-s6-adaptive-management',
  'mgd-s6-sales-revenue-tracking',
  'mgd-s7-financial-viability',
  // Regenerative-farm workbench membership (2026-06-12)
  'rf-s7-cash-flow',
  'rf-s7-enterprise-sequencing',
  // Residential workbench membership (2026-06-12)
  'res-s1-household-needs',
] as const;

describe('tierZeroObjectives -- membership set', () => {
  it('contains exactly the expected Tier-0 ids, no drift', () => {
    expect(TIER_ZERO_OBJECTIVE_IDS.size).toBe(EXPECTED_IDS.length);
    for (const id of EXPECTED_IDS) {
      expect(TIER_ZERO_OBJECTIVE_IDS.has(id)).toBe(true);
    }
  });
});

describe('tierZeroObjectives -- isTierZeroObjectiveId (route identity)', () => {
  it('is true for a Tier-0 route id', () => {
    expect(isTierZeroObjectiveId('s1-vision')).toBe(true);
  });

  it('is false for a spatial / non-Tier-0 route id', () => {
    expect(isTierZeroObjectiveId('s3-systems-baseline')).toBe(false);
  });

  it('is false for null', () => {
    expect(isTierZeroObjectiveId(null)).toBe(false);
  });
});

describe('tierZeroObjectives -- isTierZeroObjective (resolved identity)', () => {
  const objectiveWithId = (id: string) =>
    ({ id }) as unknown as PlanStratumObjective;

  it('is true for a resolved Tier-0 objective', () => {
    expect(isTierZeroObjective(objectiveWithId('ev-s1-legal-governance'))).toBe(
      true,
    );
  });

  it('is false for a resolved non-Tier-0 objective', () => {
    expect(isTierZeroObjective(objectiveWithId('s3-systems-baseline'))).toBe(
      false,
    );
  });

  it('is false for null', () => {
    expect(isTierZeroObjective(null)).toBe(false);
  });
});
