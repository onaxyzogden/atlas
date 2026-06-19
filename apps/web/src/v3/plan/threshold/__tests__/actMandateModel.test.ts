/**
 * actMandateModel tests -- pin the Threshold-3 assembly + copy.
 *
 * No DOM / React: the model is pure, so these run as plain vitest. They cover
 * the derived handoff grouping, the two synthetic threshold packages (present
 * only when T1 approved / T2 sealed), the three key documents (Doc 3 = the FULL
 * resolved integrated design), the advisory readiness derivation, the
 * reference-config handoff tally (test-only pin -- never hardcoded in product
 * code), and the Amanah banned-term scan over all Threshold-3 copy.
 */

import { describe, it, expect } from 'vitest';
import { resolveProjectObjectives } from '@ogden/shared';
import type { PlanStratumObjective, PlanStratumObjectiveStatus } from '@ogden/shared';
import {
  LAUNCH_PREP_STRATUM_ID,
  PLANNING_DIRECTION_DOC_ID,
  COHERENCE_RECORD_DOC_ID,
  selectHandoffObjectives,
  groupDerivedHandoffs,
  buildPlanningDirectionPackage,
  buildCoherenceRecordPackage,
  buildKeyDocuments,
  assembleActMandate,
  ACT_MANDATE_COPY,
  ACT_MANDATE_PALETTE,
  ACT_MANDATE_CONFIGURATION_LABEL,
  type PlanningDirectionSource,
  type CoherenceRecordSource,
} from '../actMandateModel.js';

// ---------------------------------------------------------------------------
// Reference configuration -- RegenFarm primary + Residential + Silvopasture.
// Resolved from the REAL catalogue so the handoff tally is a regression pin
// against actual `actHandoff` authoring, not a synthetic fixture.
// ---------------------------------------------------------------------------

const RESOLVED = resolveProjectObjectives({
  primaryTypeId: 'regenerative_farm',
  secondaryTypeIds: ['residential', 'silvopasture'],
});
const OBJECTIVES = RESOLVED.objectives;

/** Identity stratum-title lookup -- keeps grouping assertions about the keys. */
const idTitle = (stratumId: string): string => stratumId;

const allComplete = (
  objectives: readonly PlanStratumObjective[],
): Record<string, PlanStratumObjectiveStatus> =>
  Object.fromEntries(objectives.map((o) => [o.id, 'complete'] as const));

const TS = 1_700_000_000_000;

// ---------------------------------------------------------------------------
// Reference set sanity
// ---------------------------------------------------------------------------

describe('actMandateModel -- reference resolution', () => {
  it('resolves a non-trivial objective set spanning multiple strata', () => {
    expect(OBJECTIVES.length).toBeGreaterThan(40);
    const strata = new Set(OBJECTIVES.map((o) => o.stratumId));
    // All seven strata participate in the reference configuration.
    expect(strata.size).toBe(7);
    // The terminal Launch-Preparation stratum is present.
    expect(strata.has(LAUNCH_PREP_STRATUM_ID)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectHandoffObjectives -- the reference-config tally (test-only pin)
// ---------------------------------------------------------------------------

describe('actMandateModel -- selectHandoffObjectives (reference tally)', () => {
  it('selects exactly the handoff-bearing objectives (pinned tally)', () => {
    const handoff = selectHandoffObjectives(OBJECTIVES);
    // PIN: the reference config resolves this many objectives carrying a
    // non-empty `actHandoff`. Test-only -- product code never hardcodes a tally.
    expect(handoff.length).toBe(45);
    // Every selected objective genuinely carries a non-empty handoff.
    expect(
      handoff.every(
        (o) => typeof o.actHandoff === 'string' && o.actHandoff.trim().length > 0,
      ),
    ).toBe(true);
    // And it is a strict subset of the resolved set.
    expect(handoff.length).toBeLessThanOrEqual(OBJECTIVES.length);
  });

  it('drops objectives whose handoff is absent or whitespace-only', () => {
    const objs = [
      { id: 'a', stratumId: 's1-project-foundation', title: 'A', actHandoff: 'Carries A.' },
      { id: 'b', stratumId: 's1-project-foundation', title: 'B' },
      { id: 'c', stratumId: 's1-project-foundation', title: 'C', actHandoff: '   ' },
    ] as unknown as PlanStratumObjective[];
    expect(selectHandoffObjectives(objs).map((o) => o.id)).toEqual(['a']);
  });
});

// ---------------------------------------------------------------------------
// groupDerivedHandoffs -- grouped by stratum, in stratum order
// ---------------------------------------------------------------------------

describe('actMandateModel -- groupDerivedHandoffs', () => {
  const groups = groupDerivedHandoffs(OBJECTIVES, idTitle);

  it('groups handoffs by stratum with no empty groups', () => {
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((g) => g.packages.length > 0)).toBe(true);
  });

  it('emits groups in first-appearance (stratum-ordinal) order, no duplicates', () => {
    const order = OBJECTIVES.map((o) => o.stratumId);
    const firstSeen: string[] = [];
    for (const s of order) if (!firstSeen.includes(s)) firstSeen.push(s);
    const groupStrata = groups.map((g) => g.stratumId);
    // Group order is a subsequence of the resolved stratum first-appearance order.
    const expected = firstSeen.filter((s) => groupStrata.includes(s));
    expect(groupStrata).toEqual(expected);
    expect(new Set(groupStrata).size).toBe(groupStrata.length);
  });

  it('labels each group via the supplied lookup and marks every package derived', () => {
    for (const g of groups) {
      expect(g.label).toBe(idTitle(g.stratumId));
      expect(g.packages.every((p) => p.kind === 'derived')).toBe(true);
      expect(g.packages.every((p) => p.handoff.trim().length > 0)).toBe(true);
    }
  });

  it('package count across groups equals the handoff-objective tally', () => {
    const flat = groups.reduce((n, g) => n + g.packages.length, 0);
    expect(flat).toBe(selectHandoffObjectives(OBJECTIVES).length);
  });
});

// ---------------------------------------------------------------------------
// Synthetic packages -- present only when T1 approved / T2 sealed
// ---------------------------------------------------------------------------

describe('actMandateModel -- buildPlanningDirectionPackage', () => {
  it('is null until the direction is approved', () => {
    expect(buildPlanningDirectionPackage({})).toBeNull();
    expect(
      buildPlanningDirectionPackage({ planningDirectionText: 'Some text' }),
    ).toBeNull();
  });

  it('carries the approved direction text once approved', () => {
    const pkg = buildPlanningDirectionPackage({
      approvedAt: TS,
      planningDirectionText: '  Build a resilient mixed farm.  ',
    });
    expect(pkg).not.toBeNull();
    expect(pkg!.id).toBe(PLANNING_DIRECTION_DOC_ID);
    expect(pkg!.kind).toBe('synthetic');
    expect(pkg!.handoff).toBe('Build a resilient mixed farm.');
    expect(pkg!.ref).toBeUndefined();
  });

  it('falls back to a state line when approved with blank text', () => {
    const pkg = buildPlanningDirectionPackage({ approvedAt: TS, planningDirectionText: '   ' });
    expect(pkg!.handoff).toBe(
      ACT_MANDATE_COPY.documents.planningDirection.emptyHandoff,
    );
  });
});

describe('actMandateModel -- buildCoherenceRecordPackage', () => {
  it('is null until the record is sealed', () => {
    expect(buildCoherenceRecordPackage({})).toBeNull();
    expect(
      buildCoherenceRecordPackage({
        amendments: [{ itemId: 'B3', amendmentText: 'x', resolvedAt: 1 }],
      }),
    ).toBeNull();
  });

  it('reads a clean seal when no amendments were recorded', () => {
    const pkg = buildCoherenceRecordPackage({ sealedAt: TS });
    expect(pkg).not.toBeNull();
    expect(pkg!.id).toBe(COHERENCE_RECORD_DOC_ID);
    expect(pkg!.kind).toBe('synthetic');
    expect(pkg!.handoff).toBe(
      ACT_MANDATE_COPY.documents.coherenceRecord.cleanHandoff,
    );
  });

  it('surfaces a singular / plural amendment count', () => {
    expect(
      buildCoherenceRecordPackage({
        sealedAt: TS,
        amendments: [{ itemId: 'B3', amendmentText: 'x', resolvedAt: 1 }],
      })!.handoff,
    ).toContain('1 amendment recorded');
    expect(
      buildCoherenceRecordPackage({
        sealedAt: TS,
        amendments: [
          { itemId: 'B3', amendmentText: 'x', resolvedAt: 1 },
          { itemId: 'A1', amendmentText: 'y', resolvedAt: 2 },
        ],
      })!.handoff,
    ).toContain('2 amendments recorded');
  });
});

// ---------------------------------------------------------------------------
// buildKeyDocuments -- Doc 3 = the FULL resolved integrated design
// ---------------------------------------------------------------------------

describe('actMandateModel -- buildKeyDocuments', () => {
  it('reports all three documents absent before either threshold is set', () => {
    const docs = buildKeyDocuments({
      objectives: [],
      planningDirection: {},
      coherenceRecord: {},
    });
    expect(docs.map((d) => d.kind)).toEqual([
      'planning-direction',
      'coherence-record',
      'integrated-design',
    ]);
    expect(docs.every((d) => d.present === false)).toBe(true);
  });

  it('Doc 3 covers the full resolved set (every stratum), independent of handoffs', () => {
    const docs = buildKeyDocuments({
      objectives: OBJECTIVES,
      planningDirection: {},
      coherenceRecord: {},
    });
    const design = docs.find((d) => d.kind === 'integrated-design')!;
    expect(design.present).toBe(true);
    expect(design.stateLine).toContain(String(OBJECTIVES.length));
    expect(design.stateLine).toContain('7 strata');
  });

  it('marks T1 / T2 present and reads their seal state once set', () => {
    const docs = buildKeyDocuments({
      objectives: OBJECTIVES,
      planningDirection: { approvedAt: TS },
      coherenceRecord: {
        sealedAt: TS,
        amendments: [{ itemId: 'B3', amendmentText: 'x', resolvedAt: 1 }],
      },
    });
    const pd = docs.find((d) => d.kind === 'planning-direction')!;
    const cr = docs.find((d) => d.kind === 'coherence-record')!;
    expect(pd.present).toBe(true);
    expect(pd.stateLine).toBe(ACT_MANDATE_COPY.documents.planningDirection.presentLine);
    expect(cr.present).toBe(true);
    expect(cr.stateLine).toContain('1 amendment');
  });
});

// ---------------------------------------------------------------------------
// assembleActMandate -- full assembly + advisory readiness
// ---------------------------------------------------------------------------

describe('actMandateModel -- assembleActMandate', () => {
  it('assembles with no synthetic packages and not-ready when neither threshold is set', () => {
    const model = assembleActMandate({
      objectives: OBJECTIVES,
      statuses: {},
      planningDirection: {},
      coherenceRecord: {},
      stratumTitleFor: idTitle,
    });
    expect(model.planningDirectionPackage).toBeNull();
    expect(model.coherenceRecordPackage).toBeNull();
    expect(model.readiness.syntheticCount).toBe(0);
    expect(model.readiness.t1Approved).toBe(false);
    expect(model.readiness.t2Sealed).toBe(false);
    expect(model.readiness.ready).toBe(false);
    // Derived count + synthetic count is consistent.
    expect(model.readiness.derivedCount).toBe(
      selectHandoffObjectives(OBJECTIVES).length,
    );
    expect(model.readiness.handoffCount).toBe(
      model.readiness.derivedCount + model.readiness.syntheticCount,
    );
  });

  it('is READY (advisory) when T1 approved, T2 sealed, and Launch Preparation complete', () => {
    const model = assembleActMandate({
      objectives: OBJECTIVES,
      statuses: allComplete(OBJECTIVES),
      planningDirection: { approvedAt: TS, planningDirectionText: 'Direction.' },
      coherenceRecord: { sealedAt: TS },
      stratumTitleFor: idTitle,
    });
    expect(model.planningDirectionPackage).not.toBeNull();
    expect(model.coherenceRecordPackage).not.toBeNull();
    expect(model.readiness.syntheticCount).toBe(2);
    expect(model.readiness.launchPrep.total).toBeGreaterThan(0);
    expect(model.readiness.launchPrep.complete).toBe(model.readiness.launchPrep.total);
    expect(model.readiness.ready).toBe(true);
  });

  it('is NOT ready when Launch Preparation is incomplete, even with both thresholds set', () => {
    // Mark everything complete EXCEPT the s7 objectives.
    const statuses: Record<string, PlanStratumObjectiveStatus> = Object.fromEntries(
      OBJECTIVES.map((o) => [
        o.id,
        o.stratumId === LAUNCH_PREP_STRATUM_ID ? 'active' : 'complete',
      ]),
    );
    const model = assembleActMandate({
      objectives: OBJECTIVES,
      statuses,
      planningDirection: { approvedAt: TS },
      coherenceRecord: { sealedAt: TS },
      stratumTitleFor: idTitle,
    });
    expect(model.readiness.t1Approved).toBe(true);
    expect(model.readiness.t2Sealed).toBe(true);
    expect(model.readiness.launchPrep.complete).toBe(0);
    expect(model.readiness.ready).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Amanah -- covenant-clean copy
// ---------------------------------------------------------------------------

describe('actMandateModel -- Amanah', () => {
  const BANNED =
    /(subscription|presale|pre-sale|advance[ -]sale|\bcsa\b|csra|yield[ -]share|salam)/i;

  const collectStrings = (value: unknown, sink: string[]): void => {
    if (typeof value === 'string') sink.push(value);
    else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, sink));
    else if (value && typeof value === 'object') {
      Object.values(value).forEach((v) => collectStrings(v, sink));
    }
  };

  it('keeps all Threshold-3 copy free of advance-sale / subscription / CSA framing', () => {
    const strings: string[] = [];
    collectStrings(ACT_MANDATE_COPY, strings);
    collectStrings(ACT_MANDATE_CONFIGURATION_LABEL, strings);
    expect(strings.length).toBeGreaterThan(0);
    for (const s of strings) {
      expect(BANNED.test(s), `banned term in: ${s}`).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Copy + palette pins
// ---------------------------------------------------------------------------

describe('actMandateModel -- copy + palette', () => {
  it('pins the green mode identity', () => {
    expect(ACT_MANDATE_COPY.modeLabel).toBe('Threshold 3');
    expect(ACT_MANDATE_COPY.title).toBe('The Act Mandate');
    expect(ACT_MANDATE_COPY.begin.button).toBe('Begin Act');
    expect(ACT_MANDATE_COPY.notList.length).toBe(4);
  });

  it('exposes the canonical green register distinct from T1 amber / T2 mauve', () => {
    expect(ACT_MANDATE_PALETTE.accent).toBe('#4F9D69');
    expect(ACT_MANDATE_PALETTE.accentDark).toBe('#3C7E52');
    expect(ACT_MANDATE_PALETTE.accentLight).toBe('#7FBF95');
  });
});
