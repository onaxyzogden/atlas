/**
 * coherenceCheckModel tests -- pin the Threshold-2 audit engine + copy.
 *
 * No DOM / React: the model is pure, so these run as plain vitest. They cover
 * the A/B/C evaluator, graceful degradation for non-reference configs, the
 * designed B3 inline gap, Section-C coverage (with the schema-guaranteed shape),
 * the soft seal gate (display-only), coherence-open derivation, and the Amanah
 * banned-term scan over all Threshold-2 copy.
 */

import { describe, it, expect } from 'vitest';
import type { PlanStratumObjective } from '@ogden/shared';
import { detectCovenantBanned } from '@ogden/shared';
import {
  SECTION_A_CHECKS,
  SECTION_B_LOOPS,
  SECTION_AB_REGISTRY,
  coherenceABRegistryFor,
  isProtocolComplete,
  coverageItemId,
  evaluateCoherenceAudit,
  coherenceVerdict,
  deriveCoherenceProgress,
  deriveCoherenceOpen,
  selectDesignObjectives,
  isCoherenceDownstreamStratum,
  coherenceGateState,
  auditItemObjectiveIds,
  amendmentsForObjective,
  detectCsaLikeText,
  DESIGN_STRATUM_IDS,
  COHERENCE_DOWNSTREAM_STRATUM_IDS,
  COHERENCE_COPY,
  COHERENCE_GATE_COPY,
  COHERENCE_CONFIGURATION_LABEL,
  COHERENCE_PALETTE,
  type AuditItemResult,
  type ItemResolution,
} from '../coherenceCheckModel.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMPLETE_PROTOCOL = {
  indicators: [
    { metric: 'Indicator one', frequency: 'per season' },
    { metric: 'Indicator two', frequency: 'monthly' },
  ],
  triggers: ['If storage falls below 60% at season start -> review catchment'],
  feeds: 'hydrology',
} as const;

type Over = Partial<PlanStratumObjective>;

const obj = (id: string, stratumId: string, over: Over = {}): PlanStratumObjective =>
  ({
    id,
    stratumId,
    title: id,
    monitoringProtocol: COMPLETE_PROTOCOL,
    ...over,
  }) as unknown as PlanStratumObjective;

// The reference config: 8 s4 (doc Tier 3) + 7 s5 (doc Tier 4) objectives, each
// carrying a complete monitoring protocol. Mirrors the resolved RegenFarm +
// Residential + Silvopasture set.
const S4_IDS = [
  's4-water-strategy',
  's4-zones',
  'rf-s4-fertility-strategy',
  'rf-s4-biodiversity-strategy',
  'res-s4-living-zone',
  'silv-sec-s4-grazing-design',
  'silv-sec-s4-stock-infrastructure',
  'silv-sec-s4-husbandry-framework',
];
const S5_IDS = [
  's5-access',
  's5-water-infrastructure',
  's5-soil-improvement',
  'rf-s5-fertility-system',
  'rf-s5-windbreaks',
  'res-s5-living-infrastructure',
  'silv-sec-s5-tree-establishment',
];

const referenceDesign: PlanStratumObjective[] = [
  ...S4_IDS.map((id) => obj(id, 's4-foundation-decisions')),
  ...S5_IDS.map((id) => obj(id, 's5-system-design')),
];

const allComplete = (
  objectives: readonly PlanStratumObjective[],
): Record<string, 'complete'> =>
  Object.fromEntries(objectives.map((o) => [o.id, 'complete'] as const));

// ---------------------------------------------------------------------------
// Editorial constants integrity
// ---------------------------------------------------------------------------

describe('coherenceCheckModel -- Section A/B constants', () => {
  it('has exactly 5 integration checks and 3 closed loops with unique ids', () => {
    expect(SECTION_A_CHECKS.length).toBe(5);
    expect(SECTION_B_LOOPS.length).toBe(3);
    const ids = [...SECTION_A_CHECKS, ...SECTION_B_LOOPS].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3']);
  });

  it('every check carries at least one evidence objective id', () => {
    for (const c of [...SECTION_A_CHECKS, ...SECTION_B_LOOPS]) {
      expect(c.evidenceObjectiveIds.length).toBeGreaterThan(0);
    }
  });

  it('marks B3 (residential) as the single designed inline gap', () => {
    const gaps = SECTION_B_LOOPS.filter((l) => l.designedGap);
    expect(gaps.map((g) => g.id)).toEqual(['B3']);
    expect(gaps[0]!.evidenceObjectiveIds).toEqual(['res-s5-living-infrastructure']);
    expect(gaps[0]!.gapPrompt).toBeTruthy();
  });

  it('registers the A/B set under the regenerative_farm primary type only', () => {
    expect(Object.keys(SECTION_AB_REGISTRY)).toEqual(['regenerative_farm']);
    expect(coherenceABRegistryFor('regenerative_farm')).toBeTruthy();
    expect(coherenceABRegistryFor('market_garden')).toBeUndefined();
    expect(coherenceABRegistryFor(null)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// isProtocolComplete -- the Section-C coverage predicate
// ---------------------------------------------------------------------------

describe('coherenceCheckModel -- isProtocolComplete', () => {
  it('accepts a fully-formed protocol', () => {
    expect(isProtocolComplete(obj('x', 's5-system-design'))).toBe(true);
  });

  it('rejects a missing protocol', () => {
    expect(
      isProtocolComplete(obj('x', 's5-system-design', { monitoringProtocol: undefined })),
    ).toBe(false);
  });

  it('rejects fewer than two indicators', () => {
    expect(
      isProtocolComplete(
        obj('x', 's5-system-design', {
          monitoringProtocol: {
            indicators: [{ metric: 'only one', frequency: 'daily' }],
            triggers: ['t'],
            feeds: 'soil',
          },
        } as unknown as Over),
      ),
    ).toBe(false);
  });

  it('rejects an indicator missing its frequency', () => {
    expect(
      isProtocolComplete(
        obj('x', 's5-system-design', {
          monitoringProtocol: {
            indicators: [
              { metric: 'a', frequency: 'daily' },
              { metric: 'b', frequency: '   ' },
            ],
            triggers: ['t'],
            feeds: 'soil',
          },
        } as unknown as Over),
      ),
    ).toBe(false);
  });

  it('rejects an empty triggers list', () => {
    expect(
      isProtocolComplete(
        obj('x', 's5-system-design', {
          monitoringProtocol: {
            indicators: [
              { metric: 'a', frequency: 'daily' },
              { metric: 'b', frequency: 'weekly' },
            ],
            triggers: [],
            feeds: 'soil',
          },
        } as unknown as Over),
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// evaluateCoherenceAudit -- the full A/B/C engine
// ---------------------------------------------------------------------------

describe('coherenceCheckModel -- evaluateCoherenceAudit (reference config)', () => {
  const audit = evaluateCoherenceAudit({
    primaryTypeId: 'regenerative_farm',
    designObjectives: referenceDesign,
    statuses: allComplete(referenceDesign),
  });

  it('passes all 5 integration checks when the design work is complete', () => {
    expect(audit.tallies.A).toEqual({ passed: 5, total: 5 });
    expect(audit.sectionA.every((i) => i.status === 'pass')).toBe(true);
    expect(audit.hasIntegrationChecks).toBe(true);
  });

  it('passes B1 + B2 but surfaces B3 as the open designed gap', () => {
    const byId = Object.fromEntries(audit.sectionB.map((i) => [i.id, i.status]));
    expect(byId).toEqual({ B1: 'pass', B2: 'pass', B3: 'open' });
    expect(audit.tallies.B).toEqual({ passed: 2, total: 3 });
    const b3 = audit.sectionB.find((i) => i.id === 'B3') as AuditItemResult;
    expect(b3.gapPrompt).toBeTruthy();
  });

  it('passes Section C coverage for every design objective (schema guarantees the shape)', () => {
    expect(audit.tallies.C).toEqual({ passed: 15, total: 15 });
    expect(audit.sectionC.every((i) => i.status === 'pass')).toBe(true);
    expect(audit.sectionC[0]!.id).toBe(coverageItemId(referenceDesign[0]!.id));
  });

  it('withholds the verdict while B3 is open', () => {
    expect(audit.openCount).toBe(1);
    expect(audit.verdict).toBe('forming');
  });

  it('issues PASS once B3 is resolved by a recorded amendment', () => {
    const resolutions: Record<string, ItemResolution> = {
      B3: { resolvedAt: 111, amendmentText: 'Household three-bay compost added to the residential design.' },
    };
    const sealed = evaluateCoherenceAudit({
      primaryTypeId: 'regenerative_farm',
      designObjectives: referenceDesign,
      statuses: allComplete(referenceDesign),
      resolutions,
    });
    const b3 = sealed.sectionB.find((i) => i.id === 'B3') as AuditItemResult;
    expect(b3.status).toBe('resolved');
    expect(b3.amendmentText).toContain('compost');
    expect(b3.resolvedAt).toBe(111);
    expect(sealed.openCount).toBe(0);
    expect(sealed.verdict).toBe('pass');
    expect(sealed.tallies.B).toEqual({ passed: 3, total: 3 });
  });
});

describe('coherenceCheckModel -- graceful degradation', () => {
  it('omits A/B checks whose evidence is out of the resolved set (bare regen, no secondaries)', () => {
    const bareIds = [
      's4-water-strategy',
      's4-zones',
      'rf-s4-fertility-strategy',
      'rf-s4-biodiversity-strategy',
      's5-access',
      's5-water-infrastructure',
      's5-soil-improvement',
      'rf-s5-fertility-system',
      'rf-s5-windbreaks',
    ];
    const bare: PlanStratumObjective[] = [
      ...bareIds
        .filter((id) => id.includes('s4'))
        .map((id) => obj(id, 's4-foundation-decisions')),
      ...bareIds
        .filter((id) => id.includes('s5'))
        .map((id) => obj(id, 's5-system-design')),
    ];
    const audit = evaluateCoherenceAudit({
      primaryTypeId: 'regenerative_farm',
      designObjectives: bare,
      statuses: allComplete(bare),
    });
    // A4 (needs residential + silvopasture evidence) and B2/B3 are omitted.
    expect(audit.sectionA.map((i) => i.id)).toEqual(['A1', 'A2', 'A3', 'A5']);
    expect(audit.sectionB.map((i) => i.id)).toEqual(['B1']);
    // No residential B3 gap in scope -> the audit can pass.
    expect(audit.openCount).toBe(0);
    expect(audit.verdict).toBe('pass');
  });

  it('runs Section C only for a primary type with no authored A/B registry', () => {
    const design = [
      obj('mg-s4-beds', 's4-foundation-decisions'),
      obj('mg-s5-irrigation', 's5-system-design'),
    ];
    const audit = evaluateCoherenceAudit({
      primaryTypeId: 'market_garden',
      designObjectives: design,
      statuses: allComplete(design),
    });
    expect(audit.hasIntegrationChecks).toBe(false);
    expect(audit.sectionA).toHaveLength(0);
    expect(audit.sectionB).toHaveLength(0);
    expect(audit.tallies.C).toEqual({ passed: 2, total: 2 });
    expect(audit.verdict).toBe('pass');
  });

  it('flags a design objective with no protocol as an open coverage gap, resolvable inline', () => {
    const design = [
      obj('s5-water-infrastructure', 's5-system-design'),
      obj('s5-access', 's5-system-design', { monitoringProtocol: undefined }),
    ];
    const open = evaluateCoherenceAudit({
      primaryTypeId: 'market_garden',
      designObjectives: design,
      statuses: allComplete(design),
    });
    const gap = open.sectionC.find((i) => i.id === coverageItemId('s5-access')) as AuditItemResult;
    expect(gap.status).toBe('open');
    expect(open.verdict).toBe('forming');

    const fixed = evaluateCoherenceAudit({
      primaryTypeId: 'market_garden',
      designObjectives: design,
      statuses: allComplete(design),
      resolutions: {
        [coverageItemId('s5-access')]: {
          resolvedAt: 222,
          amendmentText: 'Two indicators with frequency + a trigger + an Observe feed added.',
        },
      },
    });
    const resolved = fixed.sectionC.find(
      (i) => i.id === coverageItemId('s5-access'),
    ) as AuditItemResult;
    expect(resolved.status).toBe('resolved');
    expect(fixed.verdict).toBe('pass');
  });

  it('does not pass A/B checks whose evidence is present but incomplete', () => {
    const statuses: Record<string, 'complete' | 'active'> = {
      ...allComplete(referenceDesign),
      's5-water-infrastructure': 'active',
    };
    const audit = evaluateCoherenceAudit({
      primaryTypeId: 'regenerative_farm',
      designObjectives: referenceDesign,
      statuses,
    });
    const a1 = audit.sectionA.find((i) => i.id === 'A1') as AuditItemResult;
    expect(a1.status).toBe('open');
  });
});

// ---------------------------------------------------------------------------
// coherenceVerdict
// ---------------------------------------------------------------------------

describe('coherenceCheckModel -- coherenceVerdict', () => {
  const mk = (status: AuditItemResult['status']): AuditItemResult => ({
    section: 'C',
    id: 'x',
    label: 'x',
    status,
    summary: 's',
    evidenceObjectiveIds: [],
  });

  it('is forming for an empty item list', () => {
    expect(coherenceVerdict([])).toBe('forming');
  });

  it('passes when every item is pass or resolved', () => {
    expect(coherenceVerdict([mk('pass'), mk('resolved')])).toBe('pass');
  });

  it('is forming when any item is open', () => {
    expect(coherenceVerdict([mk('pass'), mk('open')])).toBe('forming');
  });
});

// ---------------------------------------------------------------------------
// Coherence-open derivation
// ---------------------------------------------------------------------------

describe('coherenceCheckModel -- deriveCoherenceProgress / deriveCoherenceOpen', () => {
  it('opens only when both design strata are fully complete', () => {
    const progress = deriveCoherenceProgress(
      referenceDesign,
      allComplete(referenceDesign),
    );
    expect(progress.tierThree).toEqual({ complete: 8, total: 8 });
    expect(progress.tierFour).toEqual({ complete: 7, total: 7 });
    expect(progress.totalDesignObjectives).toBe(15);
    expect(progress.coherenceOpen).toBe(true);
    expect(deriveCoherenceOpen(referenceDesign, allComplete(referenceDesign))).toBe(true);
  });

  it('stays closed when one design objective is incomplete', () => {
    const statuses: Record<string, 'complete' | 'active'> = {
      ...allComplete(referenceDesign),
      'rf-s5-fertility-system': 'active',
    };
    expect(deriveCoherenceOpen(referenceDesign, statuses)).toBe(false);
  });

  it('stays closed when a design stratum is empty', () => {
    const onlyS4 = referenceDesign.filter((o) => o.stratumId === 's4-foundation-decisions');
    expect(deriveCoherenceOpen(onlyS4, allComplete(onlyS4))).toBe(false);
  });

  it('selectDesignObjectives keeps only the two design strata', () => {
    const mixed = [
      obj('s3-hydrology', 's3-systems-reading'),
      ...referenceDesign,
      obj('s6-monitoring', 's6-integration-design'),
    ];
    const design = selectDesignObjectives(mixed);
    expect(design).toHaveLength(15);
    expect(design.every((o) => DESIGN_STRATUM_IDS.includes(o.stratumId))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Soft seal gate (display-only)
// ---------------------------------------------------------------------------

describe('coherenceCheckModel -- coherenceGateState (soft, never blocks)', () => {
  it('arms pending on an unsealed downstream stratum (s6 / s7)', () => {
    for (const id of COHERENCE_DOWNSTREAM_STRATUM_IDS) {
      expect(coherenceGateState(id, null)).toEqual({
        downstream: true,
        sealed: false,
        pending: true,
      });
      expect(isCoherenceDownstreamStratum(id)).toBe(true);
    }
  });

  it('shows the calm sealed reading once sealedAt is set', () => {
    expect(coherenceGateState('s6-integration-design', 1700)).toEqual({
      downstream: true,
      sealed: true,
      pending: false,
    });
  });

  it('renders nothing off the downstream strata (incl. the design strata)', () => {
    expect(coherenceGateState('s5-system-design', null).downstream).toBe(false);
    expect(coherenceGateState('s4-foundation-decisions', null).downstream).toBe(false);
    expect(coherenceGateState(null, null).downstream).toBe(false);
    expect(isCoherenceDownstreamStratum('s5-system-design')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// On-objective amendment mapping (Stage 5 overlay)
// ---------------------------------------------------------------------------

describe('coherenceCheckModel -- auditItemObjectiveIds / amendmentsForObjective', () => {
  it('maps a Section-C coverage id back to its single objective', () => {
    expect(
      auditItemObjectiveIds(coverageItemId('rf-s5-fertility-system')),
    ).toEqual(['rf-s5-fertility-system']);
  });

  it('maps a Section-B loop id to its evidence objective(s)', () => {
    // B3 (the designed residential gap) cites res-s5-living-infrastructure.
    expect(auditItemObjectiveIds('B3')).toEqual(['res-s5-living-infrastructure']);
    // Every authored A/B item resolves to a non-empty objective set.
    for (const c of [...SECTION_A_CHECKS, ...SECTION_B_LOOPS]) {
      expect(auditItemObjectiveIds(c.id).length).toBeGreaterThan(0);
    }
  });

  it('maps an unknown id to nothing', () => {
    expect(auditItemObjectiveIds('not-an-item')).toEqual([]);
    expect(auditItemObjectiveIds('Z9')).toEqual([]);
  });

  it('filters amendments to only those touching the objective, preserving order', () => {
    const amendments = [
      { itemId: 'B3', amendmentText: 'Compost bay added.', resolvedAt: 1 },
      {
        itemId: coverageItemId('s5-access'),
        amendmentText: 'Protocol completed.',
        resolvedAt: 2,
      },
      {
        itemId: coverageItemId('res-s5-living-infrastructure'),
        amendmentText: 'Second residential pass.',
        resolvedAt: 3,
      },
    ];
    // res-s5-living-infrastructure is touched by BOTH B3 (evidence) and its own
    // coverage id -- both surface, in submission order.
    expect(
      amendmentsForObjective('res-s5-living-infrastructure', amendments).map(
        (a) => a.resolvedAt,
      ),
    ).toEqual([1, 3]);
    // s5-access is touched only by its own coverage amendment.
    expect(
      amendmentsForObjective('s5-access', amendments).map((a) => a.resolvedAt),
    ).toEqual([2]);
    // An un-amended objective gets nothing.
    expect(amendmentsForObjective('s4-zones', amendments)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Amanah -- covenant-clean copy + the re-exported advance-sale guard
// ---------------------------------------------------------------------------

describe('coherenceCheckModel -- Amanah', () => {
  const collectStrings = (value: unknown, sink: string[]): void => {
    if (typeof value === 'string') sink.push(value);
    else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, sink));
    else if (value && typeof value === 'object') {
      Object.values(value).forEach((v) => collectStrings(v, sink));
    }
  };

  it('keeps all Threshold-2 copy free of advance-sale / subscription / CSA framing', () => {
    const strings: string[] = [];
    collectStrings(COHERENCE_COPY, strings);
    collectStrings(COHERENCE_GATE_COPY, strings);
    collectStrings(SECTION_A_CHECKS, strings);
    collectStrings(SECTION_B_LOOPS, strings);
    collectStrings(COHERENCE_CONFIGURATION_LABEL, strings);
    expect(strings.length).toBeGreaterThan(0);
    for (const s of strings) {
      expect(detectCovenantBanned(s), `banned term in: ${s}`).toBe(false);
    }
  });

  it('re-exports detectCsaLikeText for amendment-text vetting', () => {
    expect(detectCsaLikeText('weekly CSA box subscription')).toBe(true);
    expect(detectCsaLikeText('Household compost bay routed to the kitchen garden')).toBe(false);
    expect(detectCsaLikeText(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Copy + palette pins
// ---------------------------------------------------------------------------

describe('coherenceCheckModel -- copy + palette', () => {
  it('pins the mauve mode identity', () => {
    expect(COHERENCE_COPY.modeLabel).toBe('Threshold 2');
    expect(COHERENCE_COPY.title).toBe('The Coherence Check');
    expect(COHERENCE_COPY.seal.verdictPass).toBe('PASS');
    expect(COHERENCE_COPY.notList.length).toBe(5);
  });

  it('exposes the canonical mauve register distinct from Threshold-1 amber', () => {
    expect(COHERENCE_PALETTE.accent).toBe('#9B7EC8');
    expect(COHERENCE_PALETTE.accentLight).toBe('#B89FD8');
    expect(COHERENCE_PALETTE.pass).toBe('#5AAF72');
  });
});
