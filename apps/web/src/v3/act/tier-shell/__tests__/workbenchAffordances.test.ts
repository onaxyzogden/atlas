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

describe('workbenchAffordancesFor -- empty fallback (any id routes safely)', () => {
  it('returns the EMPTY shape for a vision objective with no entry', () => {
    const aff = workbenchAffordancesFor('s1-vision');
    expect(aff.mapStrips).toHaveLength(0);
    expect(aff.registerStrip).toBeNull();
    expect(aff.showGroups).toBe(false);
    expect(aff.modeFor).toBeNull();
  });

  it('returns the EMPTY shape for an arbitrary future S2 objective without throwing', () => {
    const aff = workbenchAffordancesFor('s2-fake-carrying-capacity');
    expect(aff.mapStrips).toHaveLength(0);
    expect(aff.registerStrip).toBeNull();
    expect(aff.showGroups).toBe(false);
    expect(aff.modeFor).toBeNull();
  });
});
