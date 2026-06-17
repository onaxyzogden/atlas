import { describe, it, expect } from 'vitest';
import {
  resolveProjectObjectives,
  findPlanStratumObjectiveIn,
} from '../resolveProjectObjectives.js';
import type { SecondaryCatalogue } from '../../constants/plan/catalogues/index.js';
import { patch } from '../../constants/plan/catalogues/authoring.js';

// Part D (Plan Nav v1.1 greyed gate history). When a secondary patch amends a
// target objective's completion gate, the resolver concatenates the amendment
// onto `completionGate` (unchanged behaviour) AND now also captures the
// pre-amendment text in `completionGateBase` (first amendment only) plus an
// ordered, attributed trail in `completionGateAmendments`. The Plan render uses
// these to show the original gate greyed beneath the current concatenated one.

const PRIMARY = 'regenerative_farm' as const;

describe('resolveProjectObjectives - gate history capture (real residential)', () => {
  const r = resolveProjectObjectives({
    primaryTypeId: PRIMARY,
    secondaryTypeIds: ['residential'],
  });
  const hydro = findPlanStratumObjectiveIn(r.objectives, 's3-hydrology');

  it('captures the pre-amendment base gate (the original universal text)', () => {
    const bare = resolveProjectObjectives({ primaryTypeId: PRIMARY });
    const originalGate = findPlanStratumObjectiveIn(
      bare.objectives,
      's3-hydrology',
    )?.completionGate;
    expect(originalGate).toBeTruthy();
    expect(hydro?.completionGateBase).toBe(originalGate);
  });

  it('records one attributed amendment for the residential patch', () => {
    expect(hydro?.completionGateAmendments).toEqual([
      {
        secondaryTypeId: 'residential',
        text: 'Domestic water supply options assessed with seasonal reliability and water-table depth recorded; source potability status and treatment requirements defined for household use.',
      },
    ]);
  });

  it('still concatenates the flat completionGate (base + amendment), unchanged', () => {
    expect(hydro?.completionGate).toContain('Hydrological survey complete');
    expect(hydro?.completionGate).toContain(
      'source potability status and treatment requirements defined for household use.',
    );
  });

  it('leaves unamended objectives free of history fields', () => {
    // An objective residential never patches keeps base/amendments undefined.
    const vision = findPlanStratumObjectiveIn(r.objectives, 's1-vision');
    expect(vision?.completionGateAmendments).toBeUndefined();
    expect(vision?.completionGateBase).toBeUndefined();
  });
});

describe('resolveProjectObjectives - gate history: base captured once, amendments ordered (synthetic multi-secondary)', () => {
  // Two secondaries each amend the SAME universal target (s3-hydrology). Force
  // both compatible + supply synthetic single-patch catalogues so the test is
  // independent of the real relationship matrix. Pending patches apply in
  // secondary-iteration order: residential first, then agritourism.
  const r = resolveProjectObjectives(
    { primaryTypeId: PRIMARY, secondaryTypeIds: ['residential', 'agritourism'] },
    {
      isCompatibleSecondary: () => true,
      getSecondaryCatalogue: (id): SecondaryCatalogue | undefined => {
        if (id === 'residential') {
          return {
            additive: [],
            patches: [
              patch({
                secondaryTypeId: 'residential',
                targetObjectiveId: 's3-hydrology',
                ref: 'SYN>RES-S3',
                injectedItems: [],
                completionGateAmendment: 'First amendment from residential.',
              }),
            ],
          };
        }
        if (id === 'agritourism') {
          return {
            additive: [],
            patches: [
              patch({
                secondaryTypeId: 'agritourism',
                targetObjectiveId: 's3-hydrology',
                ref: 'SYN>AGT-S3',
                injectedItems: [],
                completionGateAmendment: 'Second amendment from agritourism.',
              }),
            ],
          };
        }
        return undefined;
      },
    },
  );
  const hydro = findPlanStratumObjectiveIn(r.objectives, 's3-hydrology');

  it('captures the base ONCE (the original gate, before either amendment)', () => {
    const bare = resolveProjectObjectives({ primaryTypeId: PRIMARY });
    const originalGate = findPlanStratumObjectiveIn(
      bare.objectives,
      's3-hydrology',
    )?.completionGate;
    expect(hydro?.completionGateBase).toBe(originalGate);
    // The base must NOT have absorbed either amendment.
    expect(hydro?.completionGateBase).not.toContain('First amendment');
    expect(hydro?.completionGateBase).not.toContain('Second amendment');
  });

  it('records both amendments in application order, each attributed', () => {
    expect(hydro?.completionGateAmendments).toEqual([
      {
        secondaryTypeId: 'residential',
        text: 'First amendment from residential.',
      },
      {
        secondaryTypeId: 'agritourism',
        text: 'Second amendment from agritourism.',
      },
    ]);
  });

  it('flat completionGate contains base then both amendments in order', () => {
    const gate = hydro?.completionGate ?? '';
    const iFirst = gate.indexOf('First amendment');
    const iSecond = gate.indexOf('Second amendment');
    expect(iFirst).toBeGreaterThan(-1);
    expect(iSecond).toBeGreaterThan(iFirst);
  });
});
