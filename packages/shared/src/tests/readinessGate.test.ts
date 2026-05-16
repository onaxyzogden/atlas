import { describe, it, expect } from 'vitest';
import {
  evaluateRegenerationReadiness,
  type RegenReadinessInput,
} from '../regeneration/readinessGate.js';
import { canopyAtAge } from '../succession/growthCurves.js';

// Default thresholds mirror the steward-facing defaults: a barren zone is
// "observably recovered" once ground cover is thriving grasses and the
// successional stage has reached at least mid-succession.
const baseInput = (
  overrides: Partial<RegenReadinessInput> = {},
): RegenReadinessInput => ({
  thresholds: { groundCover: 'thriving-grasses', minSuccessionStage: 'mid' },
  observed: { groundCover: 'barren', successionStage: 'disturbed' },
  pathwayDurationYears: 5,
  startedAt: '2026-01-15T00:00:00.000Z',
  stewardConfirmedAt: null,
  ...overrides,
});

describe('evaluateRegenerationReadiness', () => {
  it('is not ready when the steward has not confirmed and observed state is below thresholds', () => {
    const result = evaluateRegenerationReadiness(baseInput());
    expect(result.ready).toBe(false);
    expect(result.thresholdsObservedMet).toBe(false);
    expect(result.unmet).toContain('groundCover');
    expect(result.unmet).toContain('successionStage');
    expect(result.met).toEqual([]);
  });

  it('stays not-ready when observed thresholds are met but the steward has not confirmed (observation never auto-flips the gate)', () => {
    const result = evaluateRegenerationReadiness(
      baseInput({
        observed: { groundCover: 'thriving-grasses', successionStage: 'late' },
        stewardConfirmedAt: null,
      }),
    );
    // Decisive rule: ready === !!stewardConfirmedAt.
    expect(result.ready).toBe(false);
    // Advisory signal still reports the land looks recovered.
    expect(result.thresholdsObservedMet).toBe(true);
    expect(result.unmet).toEqual([]);
    expect(result.met).toContain('groundCover');
    expect(result.met).toContain('successionStage');
  });

  it('is ready once the steward confirms, even if observed state has not visibly met thresholds (steward sovereignty)', () => {
    const result = evaluateRegenerationReadiness(
      baseInput({
        observed: { groundCover: 'barren', successionStage: 'disturbed' },
        stewardConfirmedAt: '2027-06-01T00:00:00.000Z',
      }),
    );
    expect(result.ready).toBe(true);
    // The advisory signal is independent and still reports not-yet-recovered.
    expect(result.thresholdsObservedMet).toBe(false);
  });

  it('projects an advisory ready date from startedAt + pathwayDurationYears but never gates on it', () => {
    const result = evaluateRegenerationReadiness(
      baseInput({
        startedAt: '2026-01-15T00:00:00.000Z',
        pathwayDurationYears: 5,
        stewardConfirmedAt: null,
      }),
    );
    expect(result.projectedReadyDate).not.toBeNull();
    const projected = new Date(result.projectedReadyDate as string);
    expect(projected.getUTCFullYear()).toBe(2031);
    // Even though the projected date is years out, readiness is purely the
    // steward gate — the date is guidance, not a lock.
    expect(result.ready).toBe(false);
  });

  it('has a confirmed steward gate that opens regardless of the projected date still being in the future', () => {
    const result = evaluateRegenerationReadiness(
      baseInput({
        startedAt: '2026-01-15T00:00:00.000Z',
        pathwayDurationYears: 10,
        stewardConfirmedAt: '2026-08-01T00:00:00.000Z',
      }),
    );
    const projected = new Date(result.projectedReadyDate as string);
    expect(projected.getUTCFullYear()).toBe(2036);
    expect(result.ready).toBe(true);
  });

  it('returns a null projected date when the pathway has not been started', () => {
    const result = evaluateRegenerationReadiness(
      baseInput({ startedAt: null, stewardConfirmedAt: null }),
    );
    expect(result.projectedReadyDate).toBeNull();
    expect(result.ready).toBe(false);
  });

  it('treats successional stage ordinally: an observed stage past the minimum satisfies it', () => {
    const result = evaluateRegenerationReadiness(
      baseInput({
        thresholds: {
          groundCover: 'thriving-grasses',
          minSuccessionStage: 'mid',
        },
        observed: { groundCover: 'thriving-grasses', successionStage: 'climax' },
      }),
    );
    expect(result.met).toContain('successionStage');
    expect(result.unmet).not.toContain('successionStage');
    expect(result.thresholdsObservedMet).toBe(true);
  });

  it('treats successional stage ordinally: an observed stage below the minimum fails it', () => {
    const result = evaluateRegenerationReadiness(
      baseInput({
        thresholds: {
          groundCover: 'thriving-grasses',
          minSuccessionStage: 'mid',
        },
        observed: {
          groundCover: 'thriving-grasses',
          successionStage: 'pioneer',
        },
      }),
    );
    expect(result.unmet).toContain('successionStage');
    expect(result.met).toContain('groundCover');
    expect(result.thresholdsObservedMet).toBe(false);
  });

  it('counts a null observed axis as unmet', () => {
    const result = evaluateRegenerationReadiness(
      baseInput({
        observed: { groundCover: null, successionStage: null },
      }),
    );
    expect(result.unmet).toContain('groundCover');
    expect(result.unmet).toContain('successionStage');
    expect(result.thresholdsObservedMet).toBe(false);
  });
});

describe('evaluateRegenerationReadiness — silvopasture canopy advisory', () => {
  it('omits canopyAdvisory entirely when no canopy config is supplied', () => {
    const result = evaluateRegenerationReadiness(baseInput());
    expect(result.canopyAdvisory).toBeUndefined();
  });

  it('reports current canopy from canopyAtAge against the target', () => {
    const ageYears = 6;
    const targetCanopyM = 8;
    const expected = canopyAtAge('oak-tree', ageYears).canopyM;
    const result = evaluateRegenerationReadiness(
      baseInput({
        silvopastureCanopy: {
          speciesId: 'oak-tree',
          targetCanopyM,
          canopyAgeYears: ageYears,
        },
      }),
    );
    expect(result.canopyAdvisory).toBeDefined();
    expect(result.canopyAdvisory?.currentCanopyM).toBeCloseTo(expected, 6);
    expect(result.canopyAdvisory?.targetCanopyM).toBe(targetCanopyM);
    expect(result.canopyAdvisory?.percentToTarget).toBeCloseTo(
      (expected / targetCanopyM) * 100,
      6,
    );
  });

  it('clamps percentToTarget to 100 when current canopy exceeds the target', () => {
    const result = evaluateRegenerationReadiness(
      baseInput({
        silvopastureCanopy: {
          speciesId: 'oak-tree',
          targetCanopyM: 0.01,
          canopyAgeYears: 40,
        },
      }),
    );
    expect(result.canopyAdvisory?.percentToTarget).toBe(100);
  });

  it('returns 0 percent for a non-positive target instead of dividing by zero', () => {
    const result = evaluateRegenerationReadiness(
      baseInput({
        silvopastureCanopy: {
          speciesId: 'oak-tree',
          targetCanopyM: 0,
          canopyAgeYears: 6,
        },
      }),
    );
    expect(result.canopyAdvisory?.percentToTarget).toBe(0);
  });

  it('COVENANT GUARD: canopy far below target does not change the decisive flip or any advisory axis', () => {
    const withoutCanopy = evaluateRegenerationReadiness(
      baseInput({ stewardConfirmedAt: null }),
    );
    const withCanopy = evaluateRegenerationReadiness(
      baseInput({
        stewardConfirmedAt: null,
        silvopastureCanopy: {
          speciesId: 'oak-tree',
          targetCanopyM: 999,
          canopyAgeYears: 1,
        },
      }),
    );
    // Canopy is nowhere near its 999 m target, yet none of the decisive or
    // advisory outputs may shift — canopy is advisory-only, never gates.
    expect(withCanopy.ready).toBe(withoutCanopy.ready);
    expect(withCanopy.ready).toBe(false);
    expect(withCanopy.met).toEqual(withoutCanopy.met);
    expect(withCanopy.unmet).toEqual(withoutCanopy.unmet);
    expect(withCanopy.thresholdsObservedMet).toBe(
      withoutCanopy.thresholdsObservedMet,
    );
    expect(withCanopy.projectedReadyDate).toBe(
      withoutCanopy.projectedReadyDate,
    );
    // And confirming still flips ready regardless of canopy shortfall.
    const confirmedWithCanopy = evaluateRegenerationReadiness(
      baseInput({
        stewardConfirmedAt: '2027-06-01T00:00:00.000Z',
        silvopastureCanopy: {
          speciesId: 'oak-tree',
          targetCanopyM: 999,
          canopyAgeYears: 1,
        },
      }),
    );
    expect(confirmedWithCanopy.ready).toBe(true);
  });
});
