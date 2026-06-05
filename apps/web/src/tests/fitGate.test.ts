/**
 * fitGate.ts — Fit Gate engine tests (Stage 0 / True North).
 *
 * Covers the four canonical paths from the approved plan: a clean Proceed,
 * a Caution driven by moderate GIS, a deal-breaker Black→Reject, and the
 * advisory nature of the gate (a Reject verdict is still surfaced, never an
 * auto-block — the steward is sovereign).
 */

import { describe, it, expect } from 'vitest';
import {
  computeFitGate,
  verdictLabel,
  severityLabel,
  type FitGateInput,
} from '../v3/true-north/fit-gate/engine/fitGate.js';
import { emptyTrueNorthProfile } from '../v3/true-north/data/trueNorthTypes.js';
import { emptySiteProfile } from '../v3/plan/data/goalCompassTypes.js';
import type {
  SiteProfile,
  FacetProvenance,
} from '../v3/plan/data/goalCompassTypes.js';
import type { TrueNorthProfile } from '../v3/true-north/data/trueNorthTypes.js';
import type { FitResult } from '../lib/visionFit.js';

const PID = 'test-project';

// ── Fixture builders ──

/** A True North profile with every dimension answered "clean" (no flags). */
function cleanTrueNorth(): TrueNorthProfile {
  return {
    ...emptyTrueNorthProfile(PID),
    requiredFunctions: ['growing-food'],
    legalZoning: {
      zoningPermitsUse: 'yes',
      permitsRequired: ['building'],
      permitsConfirmed: ['building'],
    },
    financial: {
      capitalChannels: ['donation'],
      carryingCostConfidence: 'high',
      fundingSecured: 'yes',
    },
    accessMarket: {
      roadAccess: 'good',
      distanceToAudienceKm: 5,
      seasonalAccess: 'yes',
    },
    ecological: {
      protectedFeatures: [],
      respectCommitment: 'yes',
    },
    humanNeighbour: {
      neighbourProximity: 'moderate',
      conflictRisk: 'low',
      municipalAttitude: 'supportive',
    },
    dealBreakers: [],
  };
}

function facet<T>(value: T, provenance: FacetProvenance = 'manual') {
  return { value, provenance, notedAt: new Date().toISOString() };
}

/** A site profile with all fit-gate facets set to their benign values. */
function cleanSiteProfile(): SiteProfile {
  return {
    ...emptySiteProfile(PID),
    zoningFit: facet('permitted'),
    legalAccess: facet('deeded'),
    conservationOverlay: facet('none'),
    floodplainExtent: facet('none'),
  };
}

function gisResult(
  scoreName: string,
  status: FitResult['status'],
  weight: FitResult['weight'],
): FitResult {
  return { scoreName, threshold: 60, actual: 70, weight, status, confidence: 'high' };
}

function baseInput(overrides: Partial<FitGateInput> = {}): FitGateInput {
  return {
    archetype: 'regenerative-farm',
    trueNorth: cleanTrueNorth(),
    siteProfile: cleanSiteProfile(),
    gisFit: [],
    ...overrides,
  };
}

// ── Tests ──

describe('computeFitGate', () => {
  it('returns Proceed (green) for a clean profile with no GIS challenges', () => {
    const result = computeFitGate(baseInput());
    expect(result.worstSeverity).toBe('green');
    expect(result.verdict).toBe('proceed');
    expect(result.unknowns).toHaveLength(0);
  });

  it('still proceeds when strong GIS results are folded in', () => {
    const result = computeFitGate(
      baseInput({
        gisFit: [
          gisResult('Agricultural Suitability', 'strong', 'critical'),
          gisResult('Water Resilience', 'strong', 'important'),
        ],
      }),
    );
    expect(result.worstSeverity).toBe('green');
    expect(result.verdict).toBe('proceed');
    const gis = result.findings.find((f) => f.dimension === 'gis');
    expect(gis?.severity).toBe('green');
  });

  it('returns Caution (orange) for moderate/challenged GIS on an important factor', () => {
    const result = computeFitGate(
      baseInput({
        gisFit: [
          gisResult('Agricultural Suitability', 'strong', 'critical'),
          // challenge on an important factor → orange → caution
          gisResult('Water Resilience', 'challenge', 'important'),
        ],
      }),
    );
    expect(result.worstSeverity).toBe('orange');
    expect(result.verdict).toBe('caution');
    const gis = result.findings.find((f) => f.dimension === 'gis');
    expect(gis?.severity).toBe('orange');
  });

  it('escalates to Pause (red) when GIS challenges a critical factor', () => {
    const result = computeFitGate(
      baseInput({
        gisFit: [gisResult('Agricultural Suitability', 'challenge', 'critical')],
      }),
    );
    expect(result.worstSeverity).toBe('red');
    expect(result.verdict).toBe('pause');
  });

  it('returns Reject (black) when a deal-breaker is declared', () => {
    const tn = cleanTrueNorth();
    tn.dealBreakers = ['no-legal-access'];
    const result = computeFitGate(baseInput({ trueNorth: tn }));
    expect(result.worstSeverity).toBe('black');
    expect(result.verdict).toBe('reject');
    const db = result.findings.find((f) => f.dimension === 'deal-breakers');
    expect(db?.severity).toBe('black');
    expect(db?.rationale).toContain('No legal access');
  });

  it('is advisory: a Reject verdict still returns findings (never throws / blocks)', () => {
    const tn = cleanTrueNorth();
    tn.dealBreakers = ['no-water-path', 'soil-contamination'];
    const result = computeFitGate(baseInput({ trueNorth: tn }));
    // The engine surfaces the verdict but produces a complete, inspectable
    // result — the UI is what offers "proceed anyway"; nothing here blocks.
    expect(result.verdict).toBe('reject');
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.every((f) => typeof f.rationale === 'string')).toBe(true);
  });

  it('collects unknowns for unanswered dimensions on an empty profile', () => {
    const result = computeFitGate(
      baseInput({
        trueNorth: emptyTrueNorthProfile(PID),
        siteProfile: emptySiteProfile(PID),
      }),
    );
    expect(result.unknowns.length).toBeGreaterThan(0);
    // empty profile is all "unknown" → at worst yellow → still proceed
    expect(result.verdict).toBe('proceed');
  });

  it('flags a site-profile black (no legal access) independent of deal-breakers', () => {
    const sp = cleanSiteProfile();
    sp.legalAccess = facet('none');
    const result = computeFitGate(baseInput({ siteProfile: sp }));
    expect(result.worstSeverity).toBe('black');
    expect(result.verdict).toBe('reject');
  });
});

describe('label helpers', () => {
  it('verdictLabel covers every verdict', () => {
    expect(verdictLabel('proceed')).toMatch(/Observe/);
    expect(verdictLabel('caution')).toMatch(/Caution/);
    expect(verdictLabel('pause')).toMatch(/Verify/);
    expect(verdictLabel('reject')).toMatch(/Not Recommended/);
  });

  it('severityLabel covers every severity', () => {
    expect(severityLabel('green')).toBe('Compatible');
    expect(severityLabel('yellow')).toBe('Investigate');
    expect(severityLabel('orange')).toBe('Serious Constraint');
    expect(severityLabel('red')).toBe('Potential Disqualifier');
    expect(severityLabel('black')).toBe('Hard Stop');
  });
});
