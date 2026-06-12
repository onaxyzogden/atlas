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
