/**
 * @vitest-environment happy-dom
 *
 * workbenchAffordances -- data-driven per-objective affordance descriptor.
 *
 * These pure-unit assertions pin the descriptor contract that ActTierZeroWorkbench
 * consumes: the three real S1 objectives (boundaries / stakeholders / legal-
 * governance) carry their exact strips + mode mappers, while ANY id without an
 * entry (a vision objective, or an arbitrary future S2 objective) routes safely
 * to the frozen EMPTY shape with no strips, no groups, and a null modeFor.
 */

import { describe, it, expect } from 'vitest';
import { workbenchAffordancesFor } from '../workbenchAffordances.js';
import { boundaryModeFor } from '../BoundaryCaptureLegacy.js';
import { grazingModeFor } from '../GrazingSystemCapture.js';
import { livestockIntentModeFor } from '../LivestockIntentCapture.js';
import { propagationInfraModeFor } from '../PropagationInfraCapture.js';
import { socialFabricModeFor } from '../SocialFabricCapture.js';

describe('workbenchAffordancesFor -- s1-boundaries', () => {
  const aff = workbenchAffordancesFor('s1-boundaries');

  it('carries a single boundary map-strip with the activation text', () => {
    expect(aff.mapStrips).toHaveLength(1);
    expect(aff.mapStrips[0]!.testId).toBe('boundary-map-strip');
    expect(aff.mapStrips[0]!.text).toContain(
      '2 overlays will activate on the map',
    );
  });

  it('has no register strip and shows decision groups', () => {
    expect(aff.registerStrip).toBeNull();
    expect(aff.showGroups).toBe(true);
  });

  it('modeFor matches boundaryModeFor for boundary ids and guards the prefix', () => {
    expect(typeof aff.modeFor).toBe('function');
    const got = aff.modeFor!('s1-boundaries-c1');
    expect(got).not.toBeNull();
    expect(got).toBe(boundaryModeFor('s1-boundaries-c1'));
    // Prefix guard: a vision id under the same mapper returns null.
    expect(aff.modeFor!('s1-vision-c1')).toBeNull();
  });
});

describe('workbenchAffordancesFor -- s1-stakeholders', () => {
  const aff = workbenchAffordancesFor('s1-stakeholders');

  it('carries the stakeholder map-strip', () => {
    expect(aff.mapStrips).toHaveLength(1);
    expect(aff.mapStrips[0]!.testId).toBe('stakeholder-map-strip');
  });

  it('carries the live register strip descriptor', () => {
    expect(aff.registerStrip).not.toBeNull();
    expect(aff.registerStrip!.testId).toBe('stakeholder-reg-strip');
    expect(aff.registerStrip!.countTestId).toBe('stakeholder-reg-count');
    expect(aff.registerStrip!.label).toBe('stakeholders in register');
    expect(aff.registerStrip!.note).toBe(
      'Items 1-4 build the register - Items 5-6 annotate it',
    );
    expect(aff.registerStrip!.registerKind).toBe('stakeholder');
  });

  it('does not show decision groups and provides a non-null modeFor', () => {
    expect(aff.showGroups).toBe(false);
    expect(aff.modeFor!('s1-stakeholders-c1')).not.toBeNull();
  });
});

describe('workbenchAffordancesFor -- ev-s1-legal-governance', () => {
  const aff = workbenchAffordancesFor('ev-s1-legal-governance');

  it('carries no strips, shows decision groups, and provides a non-null modeFor', () => {
    expect(aff.mapStrips).toHaveLength(0);
    expect(aff.registerStrip).toBeNull();
    expect(aff.showGroups).toBe(true);
    expect(aff.modeFor!('ev-s1-legal-governance-c1')).not.toBeNull();
  });
});

describe('workbenchAffordancesFor -- silv-sec-s4-grazing-design', () => {
  const aff = workbenchAffordancesFor('silv-sec-s4-grazing-design');

  it('carries no strips, shows decision groups (advisory -- no map/register)', () => {
    expect(aff.mapStrips).toHaveLength(0);
    expect(aff.registerStrip).toBeNull();
    expect(aff.showGroups).toBe(true);
  });

  it('modeFor matches grazingModeFor for grazing ids and guards the prefix', () => {
    expect(typeof aff.modeFor).toBe('function');
    const got = aff.modeFor!('silv-sec-s4-grazing-design-c1');
    expect(got).not.toBeNull();
    expect(got).toBe(grazingModeFor('silv-sec-s4-grazing-design-c1'));
    // c1 maps to the grazing-method mode.
    expect(got).toBe('grazingMethod');
    // Prefix guard: a foreign id under the same mapper returns null.
    expect(aff.modeFor!('silv-sec-s3-forage-survey-c1')).toBeNull();
  });
});

describe('workbenchAffordancesFor -- silv-sec-s1-livestock-intent', () => {
  const aff = workbenchAffordancesFor('silv-sec-s1-livestock-intent');

  it('carries no strips, shows decision groups (advisory -- no map/register)', () => {
    expect(aff.mapStrips).toHaveLength(0);
    expect(aff.registerStrip).toBeNull();
    expect(aff.showGroups).toBe(true);
  });

  it('modeFor namespaces livestock modes "li-" and guards the prefix', () => {
    expect(typeof aff.modeFor).toBe('function');
    // c1 maps to the rationale mode, namespaced to avoid the global
    // species / capacity label collision.
    const got = aff.modeFor!('silv-sec-s1-livestock-intent-c1');
    expect(got).toBe('li-rationale');
    expect(got).toBe(`li-${livestockIntentModeFor('silv-sec-s1-livestock-intent-c1')}`);
    // The colliding modes are namespaced: c2 -> li-species, c4 -> li-capacity.
    expect(aff.modeFor!('silv-sec-s1-livestock-intent-c2')).toBe('li-species');
    expect(aff.modeFor!('silv-sec-s1-livestock-intent-c4')).toBe('li-capacity');
    expect(aff.modeFor!('silv-sec-s1-livestock-intent-c5')).toBe('li-compat');
    // Prefix guard: a foreign id under the same mapper returns null.
    expect(aff.modeFor!('silv-sec-s4-grazing-design-c1')).toBeNull();
  });
});

describe('workbenchAffordancesFor -- nur-sec-s1-propagation-infra-survey', () => {
  const aff = workbenchAffordancesFor('nur-sec-s1-propagation-infra-survey');

  it('carries no strips, shows decision groups (advisory -- no map/register)', () => {
    expect(aff.mapStrips).toHaveLength(0);
    expect(aff.registerStrip).toBeNull();
    expect(aff.showGroups).toBe(true);
  });

  it('modeFor namespaces propagation-infra modes "pi-" and guards the prefix', () => {
    expect(typeof aff.modeFor).toBe('function');
    // c1 maps to the structure-inventory mode, namespaced to keep clear of the
    // global mode-label table.
    const got = aff.modeFor!('nur-sec-s1-propagation-infra-survey-c1');
    expect(got).toBe('pi-infraInventory');
    expect(got).toBe(
      `pi-${propagationInfraModeFor('nur-sec-s1-propagation-infra-survey-c1')}`,
    );
    expect(aff.modeFor!('nur-sec-s1-propagation-infra-survey-c4')).toBe(
      'pi-compostCapacity',
    );
    expect(aff.modeFor!('nur-sec-s1-propagation-infra-survey-c5')).toBe(
      'pi-mediaSourcing',
    );
    // Prefix guard: the sibling biosecurity objective returns null here.
    expect(aff.modeFor!('nur-sec-s2-biosecurity-survey-c1')).toBeNull();
  });
});

describe('workbenchAffordancesFor -- s1-vision', () => {
  const aff = workbenchAffordancesFor('s1-vision');

  it('carries no strips and shows the catalogue decision groups', () => {
    expect(aff.mapStrips).toHaveLength(0);
    expect(aff.registerStrip).toBeNull();
    expect(aff.showGroups).toBe(true);
  });

  it('maps each checklist item to its namespaced vs-* artifact badge key', () => {
    expect(typeof aff.modeFor).toBe('function');
    expect(aff.modeFor!('s1-vision-c1')).toBe('vs-purpose');
    expect(aff.modeFor!('s1-vision-c2')).toBe('vs-criteria');
    expect(aff.modeFor!('s1-vision-steward')).toBe('vs-steward');
    expect(aff.modeFor!('s1-vision-labour')).toBe('vs-labour');
    expect(aff.modeFor!('s1-vision-c3')).toBe('vs-capital');
    expect(aff.modeFor!('s1-vision-constraints')).toBe('vs-constraints');
    expect(aff.modeFor!('s1-vision-classify')).toBe('vs-classify');
    expect(aff.modeFor!('s1-vision-assumptions')).toBe('vs-assumptions');
  });

  it('returns null for an unmapped vision id (no stray badge)', () => {
    expect(aff.modeFor!('s1-vision-unknown')).toBeNull();
  });
});

describe('workbenchAffordancesFor -- ev-s2-social-fabric', () => {
  const aff = workbenchAffordancesFor('ev-s2-social-fabric');

  it('carries no strips, shows decision groups (advisory -- no map/register)', () => {
    expect(aff.mapStrips).toHaveLength(0);
    expect(aff.registerStrip).toBeNull();
    expect(aff.showGroups).toBe(true);
  });

  it('modeFor namespaces social-fabric modes "sf-" and guards the prefix', () => {
    expect(typeof aff.modeFor).toBe('function');
    // c1 maps to the relationships mode, namespaced to keep clear of the global
    // mode-label table.
    const got = aff.modeFor!('ev-s2-social-fabric-c1');
    expect(got).toBe('sf-relationships');
    expect(got).toBe(`sf-${socialFabricModeFor('ev-s2-social-fabric-c1')}`);
    expect(aff.modeFor!('ev-s2-social-fabric-c6')).toBe('sf-networks');
    // The bare objective id (no -cN suffix) and a sibling id return null.
    expect(aff.modeFor!('ev-s2-social-fabric')).toBeNull();
    expect(aff.modeFor!('ev-s4-food-system-c1')).toBeNull();
  });
});

describe('workbenchAffordancesFor -- empty fallback (any id routes safely)', () => {
  it('returns the EMPTY shape for an arbitrary future S2 objective without throwing', () => {
    const aff = workbenchAffordancesFor('s2-fake-carrying-capacity');
    expect(aff.mapStrips).toHaveLength(0);
    expect(aff.registerStrip).toBeNull();
    expect(aff.showGroups).toBe(false);
    expect(aff.modeFor).toBeNull();
  });
});
