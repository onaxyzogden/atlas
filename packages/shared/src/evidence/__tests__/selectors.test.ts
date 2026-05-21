// apps/web/src/lib/evidence/__tests__/selectors.test.ts
//
// Phase E.2 — per-panel selector unit tests + top-level dispatcher
// integration. Each selector gets ≥ 4 cases; the dispatcher gets a
// round-trip case per panel key.

import { describe, expect, it } from 'vitest';
import type { AssessmentFlag } from '../../schemas/assessment.schema.js';

import { selectEvidenceFor } from '../selectEvidence.js';
import { selectVerdictEvidence } from '../selectors/verdict.js';
import { selectTriadEvidence } from '../selectors/triad.js';
import { selectSiteNarrativeEvidence } from '../selectors/siteNarrative.js';
import { selectWaterStorageEvidence } from '../selectors/waterStorage.js';
import { selectThreeEthicsEvidence } from '../selectors/threeEthics.js';
import { selectWaterRouterEvidence } from '../selectors/waterRouter.js';
import { selectCapitalPartnerEvidence } from '../selectors/capitalPartner.js';

const sampleFlag = (overrides: Partial<AssessmentFlag> = {}): AssessmentFlag => ({
  id: 'flag.low-som',
  type: 'risk',
  severity: 'critical',
  category: 'agriculture',
  message: 'Soil organic matter is critically low',
  layerSource: 'soils',
  priority: 90,
  country: 'US',
  needsSiteVisit: false,
  ...overrides,
});

describe('selectVerdictEvidence', () => {
  it('emits an EvidenceItem with the verdict label and score', () => {
    const item = selectVerdictEvidence({
      overallScore: 72,
      layers: [{ layerType: 'soils' }, { layerType: 'land_cover' }],
      topFlags: [],
    });
    expect(item.panelKey).toBe('land-verdict');
    expect(item.summary.label).toBe('Conditional Opportunity');
    expect(item.summary.value).toBe(72);
  });

  it('caps the top-flag list at 3', () => {
    const flags = Array.from({ length: 5 }, (_, i) =>
      sampleFlag({ id: `flag-${i}`, message: `m${i}` }),
    );
    const item = selectVerdictEvidence({
      overallScore: 65,
      layers: [{ layerType: 'soils' }],
      topFlags: flags,
    });
    const flagFragments = item.evidence.filter(
      (f) => f.source.kind === 'rule',
    );
    expect(flagFragments).toHaveLength(3);
  });

  it('downgrades layer-roster confidence when fewer than 3 layers present', () => {
    const item = selectVerdictEvidence({
      overallScore: 55,
      layers: [{ layerType: 'soils' }],
      topFlags: [],
    });
    const rosterFragment = item.evidence.find((f) => f.label === 'Input layers');
    expect(rosterFragment?.source.confidence).toBe('low');
  });

  it('labels strong opportunities at score ≥ 80', () => {
    const item = selectVerdictEvidence({
      overallScore: 85,
      layers: [{ layerType: 'soils' }],
      topFlags: [],
    });
    expect(item.summary.label).toBe('Strong Opportunity');
  });
});

describe('selectTriadEvidence', () => {
  it('exposes rule + severity + category + priority + layerSource', () => {
    const item = selectTriadEvidence({
      flag: sampleFlag(),
      bucket: 'risk',
    });
    expect(item.panelKey).toBe('decision-triad');
    const labels = item.evidence.map((f) => f.label);
    expect(labels).toEqual(
      expect.arrayContaining(['Rule', 'Severity', 'Category', 'Priority', 'Source layer']),
    );
  });

  it('omits Source layer fragment when layerSource is absent', () => {
    const item = selectTriadEvidence({
      flag: sampleFlag({ layerSource: undefined }),
      bucket: 'risk',
    });
    expect(item.evidence.some((f) => f.label === 'Source layer')).toBe(false);
  });

  it('maps severity to confidence band correctly', () => {
    const warningItem = selectTriadEvidence({
      flag: sampleFlag({ severity: 'warning' }),
      bucket: 'risk',
    });
    const sev = warningItem.evidence.find((f) => f.label === 'Severity');
    expect(sev?.source.confidence).toBe('medium');
  });

  it('passes the bucket through as the summary label', () => {
    const item = selectTriadEvidence({
      flag: sampleFlag({ type: 'opportunity' }),
      bucket: 'opportunity',
    });
    expect(item.summary.label).toBe('opportunity');
  });
});

describe('selectSiteNarrativeEvidence', () => {
  it('marks state as AI-generated when hasAiNarrative is true', () => {
    const item = selectSiteNarrativeEvidence({
      acreage: 200,
      layerCount: 6,
      hasAiNarrative: true,
      modelVersion: 'claude-opus-4-7',
    });
    expect(item.summary.value).toBe('AI-generated');
    const state = item.evidence.find((f) => f.label === 'Narrative state');
    expect(state?.value).toBe('AI-generated');
  });

  it('marks state as fallback when hasAiNarrative is false', () => {
    const item = selectSiteNarrativeEvidence({
      acreage: 200,
      layerCount: 2,
      hasAiNarrative: false,
    });
    expect(item.summary.value).toBe('fallback prose');
  });

  it('omits AI model fragment when modelVersion is absent', () => {
    const item = selectSiteNarrativeEvidence({
      acreage: 200,
      layerCount: 2,
      hasAiNarrative: false,
    });
    expect(item.evidence.some((f) => f.label === 'AI model')).toBe(false);
  });

  it('includes live-count fragment when provided', () => {
    const item = selectSiteNarrativeEvidence({
      acreage: 200,
      layerCount: 6,
      liveCount: 4,
      hasAiNarrative: true,
    });
    expect(item.evidence.some((f) => f.label === 'Live (non-stale) layers')).toBe(true);
  });
});

describe('selectWaterStorageEvidence', () => {
  it('rounds total storage and labels overflow OK when no warnings', () => {
    const item = selectWaterStorageEvidence({
      totalStorageM3: 1234.7,
      nodesByKind: { pond: 2, tank: 1 },
      overflowWarnings: [],
    });
    expect(item.summary.value).toBe(1235);
    const overflow = item.evidence.find((f) => f.label === 'Overflow integrity');
    expect(overflow?.value).toBe('OK');
  });

  it('summarises overflow warnings when present', () => {
    const item = selectWaterStorageEvidence({
      totalStorageM3: 500,
      nodesByKind: { swale: 3 },
      overflowWarnings: ['cycle detected on node X', 'missing sink on node Y'],
    });
    const overflow = item.evidence.find((f) => f.label === 'Overflow integrity');
    expect(overflow?.value).toBe('2 warnings');
  });

  it('emits a fragment per non-zero node kind', () => {
    const item = selectWaterStorageEvidence({
      totalStorageM3: 800,
      nodesByKind: { pond: 1, tank: 2, dam: 0 },
      overflowWarnings: [],
    });
    const kindLabels = item.evidence
      .filter((f) => /nodes$/.test(f.label))
      .map((f) => f.label);
    expect(kindLabels).toEqual(expect.arrayContaining(['pond nodes', 'tank nodes']));
    expect(kindLabels).not.toContain('dam nodes');
  });

  it('exposes D.3 sponge capacity when supplied', () => {
    const item = selectWaterStorageEvidence({
      totalStorageM3: 500,
      nodesByKind: { swale: 4 },
      overflowWarnings: [],
      spongeCapacityM3: 12345,
    });
    expect(item.evidence.some((f) => f.label === 'Soil sponge capacity (D.3)')).toBe(true);
  });
});

describe('selectThreeEthicsEvidence', () => {
  it('emits one fragment per ethic plus the principle-check count', () => {
    const item = selectThreeEthicsEvidence({
      perEthicStatus: {
        'earth-care': 'met',
        'people-care': 'partial',
        'fair-share': 'unmet',
      },
      perEthicFeatureCount: {
        'earth-care': 4,
        'people-care': 2,
        'fair-share': 1,
      },
      principleCheckCount: 12,
    });
    expect(item.evidence.length).toBe(4);
  });

  it('summarises as "All three met" when every ethic is met', () => {
    const item = selectThreeEthicsEvidence({
      perEthicStatus: {
        'earth-care': 'met',
        'people-care': 'met',
        'fair-share': 'met',
      },
      perEthicFeatureCount: {
        'earth-care': 1,
        'people-care': 1,
        'fair-share': 1,
      },
      principleCheckCount: 5,
    });
    expect(item.summary.value).toBe('All three met');
  });

  it('reports unmet count when any ethic is unmet', () => {
    const item = selectThreeEthicsEvidence({
      perEthicStatus: {
        'earth-care': 'met',
        'people-care': 'unmet',
        'fair-share': 'unmet',
      },
      perEthicFeatureCount: {
        'earth-care': 1,
        'people-care': 0,
        'fair-share': 0,
      },
      principleCheckCount: 3,
    });
    expect(item.summary.value).toBe('2 unmet');
  });

  it('passes per-ethic rationale through as methodology hint', () => {
    const item = selectThreeEthicsEvidence({
      perEthicStatus: {
        'earth-care': 'met',
        'people-care': 'partial',
        'fair-share': 'partial',
      },
      perEthicFeatureCount: {
        'earth-care': 2,
        'people-care': 1,
        'fair-share': 1,
      },
      perEthicRationale: { 'earth-care': 'Swales + cover crop land Y1' },
      principleCheckCount: 4,
    });
    const earth = item.evidence.find((f) => f.label === 'Earth Care');
    expect(earth?.methodologyHint).toContain('Swales');
  });
});

describe('selectWaterRouterEvidence', () => {
  it('reports routed edges and confidence percent', () => {
    const item = selectWaterRouterEvidence({
      routedEdgeCount: 12,
      meanRoutingConfidence: 0.82,
      hadDem: true,
      hadAspect: true,
      warnings: [],
    });
    expect(item.summary.value).toBe(12);
    const conf = item.evidence.find((f) => f.label === 'Mean routing confidence');
    expect(conf?.value).toBe(82);
  });

  it('downgrades confidence band when DEM missing', () => {
    const item = selectWaterRouterEvidence({
      routedEdgeCount: 5,
      meanRoutingConfidence: 0.4,
      hadDem: false,
      hadAspect: true,
      warnings: [],
    });
    const dem = item.evidence.find((f) => f.label === 'DEM available');
    expect(dem?.source.confidence).toBe('low');
  });

  it('emits head-loss budget fragment when supplied', () => {
    const item = selectWaterRouterEvidence({
      routedEdgeCount: 3,
      meanRoutingConfidence: 0.7,
      hadDem: true,
      hadAspect: true,
      headLossBudgetM: 2.5,
      warnings: [],
    });
    expect(item.evidence.some((f) => f.label === 'Head-loss budget')).toBe(true);
  });

  it('reports warning count when warnings present', () => {
    const item = selectWaterRouterEvidence({
      routedEdgeCount: 6,
      meanRoutingConfidence: 0.65,
      hadDem: true,
      hadAspect: true,
      warnings: ['no-path for capture C1', 'low confidence on edge E2'],
    });
    expect(item.evidence.some((f) => f.label === 'Routing warnings')).toBe(true);
  });
});

describe('selectCapitalPartnerEvidence', () => {
  it('always includes total capital + line-item counts', () => {
    const item = selectCapitalPartnerEvidence({
      totalCapitalUsd: 750000,
      enterpriseCount: 3,
      costLineItemCount: 18,
      revenueStreamCount: 4,
      somHasTrajectory: false,
    });
    const labels = item.evidence.map((f) => f.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        'Total capital partner contribution',
        'Cost line items',
        'Revenue streams',
        'Enterprises',
      ]),
    );
  });

  it('exposes natural-capital fragment when natCapUsdYr supplied', () => {
    const item = selectCapitalPartnerEvidence({
      totalCapitalUsd: 500000,
      enterpriseCount: 2,
      costLineItemCount: 10,
      revenueStreamCount: 2,
      natCapUsdYr: 12000,
      natCapUsdPerTc: 50,
      somHasTrajectory: true,
      somHorizonYears: 10,
    });
    const labels = item.evidence.map((f) => f.label);
    expect(labels).toContain('Natural-capital appreciation (yr 1)');
    expect(labels).toContain('USD per tonne carbon');
  });

  it('reports J-curve trough + breakeven when supplied', () => {
    const item = selectCapitalPartnerEvidence({
      totalCapitalUsd: 600000,
      enterpriseCount: 2,
      costLineItemCount: 12,
      revenueStreamCount: 2,
      troughYear: 1,
      troughValueUsd: -50000,
      breakevenYear: 6,
      somHasTrajectory: true,
    });
    const labels = item.evidence.map((f) => f.label);
    expect(labels).toContain('J-curve trough');
    expect(labels).toContain('J-curve breakeven');
  });

  it('reports "beyond horizon" when breakeven is null', () => {
    const item = selectCapitalPartnerEvidence({
      totalCapitalUsd: 400000,
      enterpriseCount: 1,
      costLineItemCount: 6,
      revenueStreamCount: 1,
      troughYear: 0,
      troughValueUsd: -200000,
      breakevenYear: null,
      somHasTrajectory: false,
    });
    const be = item.evidence.find((f) => f.label === 'J-curve breakeven');
    expect(be?.value).toBe('beyond horizon');
  });

  it('uses neutral framing ("appreciation of stewarded land value")', () => {
    const item = selectCapitalPartnerEvidence({
      totalCapitalUsd: 500000,
      enterpriseCount: 2,
      costLineItemCount: 10,
      revenueStreamCount: 2,
      somHasTrajectory: false,
    });
    const total = item.evidence.find(
      (f) => f.label === 'Total capital partner contribution',
    );
    expect(total?.methodologyHint).toMatch(/qarḍ ḥasan/);
    expect(total?.methodologyHint).not.toMatch(/ROI|yield|return/i);
  });
});

describe('selectEvidenceFor — dispatcher', () => {
  it('routes land-verdict to selectVerdictEvidence', () => {
    const item = selectEvidenceFor({
      panelKey: 'land-verdict',
      inputs: { overallScore: 75, layers: [], topFlags: [] },
    });
    expect(item?.panelKey).toBe('land-verdict');
  });

  it('routes decision-triad to selectTriadEvidence', () => {
    const item = selectEvidenceFor({
      panelKey: 'decision-triad',
      inputs: { flag: sampleFlag(), bucket: 'risk' },
    });
    expect(item?.panelKey).toBe('decision-triad');
  });

  it('routes site-narrative to selectSiteNarrativeEvidence', () => {
    const item = selectEvidenceFor({
      panelKey: 'site-narrative',
      inputs: { acreage: 200, layerCount: 6, hasAiNarrative: true },
    });
    expect(item?.panelKey).toBe('site-narrative');
  });

  it('routes water-storage to selectWaterStorageEvidence', () => {
    const item = selectEvidenceFor({
      panelKey: 'water-storage',
      inputs: { totalStorageM3: 100, nodesByKind: {}, overflowWarnings: [] },
    });
    expect(item?.panelKey).toBe('water-storage');
  });

  it('routes capital-partner to selectCapitalPartnerEvidence', () => {
    const item = selectEvidenceFor({
      panelKey: 'capital-partner',
      inputs: {
        totalCapitalUsd: 500000,
        enterpriseCount: 1,
        costLineItemCount: 5,
        revenueStreamCount: 1,
        somHasTrajectory: false,
      },
    });
    expect(item?.panelKey).toBe('capital-partner');
  });
});

describe('selectEvidenceFor — Apricot-Lane integration', () => {
  // Approximates the Apricot-Lane fixture's flag set (4 hard-coded
  // assessment flags from migration 032) + 6 layers. Every selector
  // should return a non-null EvidenceItem with non-empty evidence[].
  const fixtureFlags: AssessmentFlag[] = [
    sampleFlag({
      id: 'fixture.low-som',
      severity: 'critical',
      message: 'Soil organic matter critically low (1.2 %)',
      layerSource: 'soils',
      priority: 95,
    }),
    sampleFlag({
      id: 'fixture.summer-drought',
      severity: 'warning',
      category: 'climate',
      type: 'risk',
      message: 'Summer drought stress expected (Mediterranean climate)',
      layerSource: 'climate',
      priority: 80,
    }),
    sampleFlag({
      id: 'fixture.slope-erosion',
      severity: 'warning',
      category: 'conservation',
      type: 'risk',
      message: 'Slope erosion risk on south-facing aspect',
      layerSource: 'elevation',
      priority: 70,
    }),
    sampleFlag({
      id: 'fixture.riparian-opp',
      type: 'opportunity',
      severity: 'info',
      category: 'conservation',
      message: 'Riparian-restoration opportunity along seasonal creek',
      layerSource: 'wetlands_flood',
      priority: 60,
    }),
  ];
  const fixtureLayers = [
    { layerType: 'elevation' },
    { layerType: 'soils' },
    { layerType: 'watershed' },
    { layerType: 'wetlands_flood' },
    { layerType: 'land_cover' },
    { layerType: 'climate' },
  ];

  it('verdict selector returns non-empty Evidence for the fixture', () => {
    const item = selectEvidenceFor({
      panelKey: 'land-verdict',
      inputs: {
        overallScore: 62,
        layers: fixtureLayers,
        topFlags: fixtureFlags,
        country: 'US',
      },
    });
    expect(item).not.toBeNull();
    expect(item!.evidence.length).toBeGreaterThanOrEqual(4);
  });

  it('triad selector returns evidence for each fixture flag', () => {
    for (const flag of fixtureFlags) {
      const item = selectEvidenceFor({
        panelKey: 'decision-triad',
        inputs: { flag, bucket: flag.type === 'opportunity' ? 'opportunity' : 'risk' },
      });
      expect(item).not.toBeNull();
      expect(item!.evidence.length).toBeGreaterThan(0);
    }
  });
});
