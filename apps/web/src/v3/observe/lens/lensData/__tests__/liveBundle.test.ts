// liveBundle.test.ts -- the live LensDataBundle mapper over the MTC seed bundle.
//
// Feeds the real Moontrance Creek seed rows (MTC_OBSERVE_BUNDLE, 10 points, no
// geometry) through the PURE mappers in ../liveBundle.ts and asserts the live
// aggregates: per-lens counts, divergence rollup + priority, project totals,
// plan-revision trigger, pin projection (index scatter, in-bounds), and the
// graceful specialised degrade. No React, no stores -- pure functions only.
//
// Run BOUNDED on Windows (pool:'forks' + explicit timeout); never unbounded.

// @vitest-environment happy-dom
//
// liveBundle.ts -> projectStore.ts attaches persist side effects at module load
// (useProjectStore.persist.onFinishHydration / rehydrateWithLogging). Those need
// a real DOM storage, so the suite runs under happy-dom (forks pool keeps the
// teardown handle from leaking). The assertions themselves are pure -- they call
// the exported mappers over the seed fixture and never touch the live stores.
import { describe, it, expect } from 'vitest';

import {
  UNIVERSAL_DOMAIN_LABELS,
  OBSERVE_LENS_IDS,
  type ObserveLensId,
} from '@ogden/shared';
import {
  buildBuiltinObserveDataPoints,
  MTC_OBSERVE_BUNDLE,
} from '../../../../../data/builtinObserveDataPoints.js';
import {
  buildLiveLensBundle,
  buildObservationPins,
  computeDomainRollups,
} from '../liveBundle.js';

// Fixed baseline so freshness / ages are deterministic (matches the seed era).
const NOW_MS = Date.parse('2026-06-03T12:00:00.000Z');
const POINTS = buildBuiltinObserveDataPoints('mtc', MTC_OBSERVE_BUNDLE);

const bundle = buildLiveLensBundle({
  points: POINTS,
  nowMs: NOW_MS,
  projectName: 'Moontrance Creek',
  projectTypeLabel: 'Regenerative Farm + Silvopasture',
});

const lensById = (id: ObserveLensId) => bundle.lenses.find((l) => l.id === id)!;

describe('buildBuiltinObserveDataPoints (fixture sanity)', () => {
  it('builds 10 active MTC points with no geometry', () => {
    expect(POINTS).toHaveLength(10);
    expect(POINTS.every((p) => !p.isSuperseded)).toBe(true);
    expect(POINTS.every((p) => p.locationGeometry === null)).toBe(true);
  });
});

describe('computeDomainRollups', () => {
  const rollups = computeDomainRollups(POINTS, NOW_MS);

  it('rolls up risk-compliance as a single major-constraint capture', () => {
    const risk = rollups.get('risk-compliance')!;
    expect(risk.observationCount).toBe(1);
    expect(risk.latestStatus).toBe('major_constraint');
    expect(risk.divergenceCount).toBe(1);
  });

  it('counts unknown (people-governance) as observed but not divergent', () => {
    const people = rollups.get('people-governance')!;
    expect(people.observationCount).toBe(1);
    expect(people.divergenceCount).toBe(0);
  });

  it('reports zero for an unseeded domain (energy-resources)', () => {
    const energy = rollups.get('energy-resources')!;
    expect(energy.observationCount).toBe(0);
    expect(energy.latestStatus).toBeNull();
  });
});

describe('buildLiveLensBundle -- lenses', () => {
  it('emits all 6 lenses in canonical order', () => {
    expect(bundle.lenses.map((l) => l.id)).toEqual([...OBSERVE_LENS_IDS]);
  });

  it('aggregates per-lens observation counts from the seed rows', () => {
    expect(lensById('foundation').observations).toBe(2); // topography + land-base
    expect(lensById('climate').observations).toBe(1); // climate
    expect(lensById('water').observations).toBe(1); // hydrology
    expect(lensById('living').observations).toBe(2); // soil + ecology
    expect(lensById('human').observations).toBe(3); // vision + people + risk
    expect(lensById('infrastructure').observations).toBe(1); // access
  });

  it('summarises domains-with-data over total lens domains', () => {
    expect(lensById('human').summary).toBe('3 observations across 3/4 domains, 1 flagged');
    expect(lensById('foundation').summary).toBe('2 observations across 2/2 domains, 1 flagged');
    expect(lensById('climate').summary).toBe('1 observation across 1/2 domains');
  });

  it('rolls divergence with severity-driven priority', () => {
    // human carries the only major_constraint -> high priority.
    expect(lensById('human').divergence).toBeDefined();
    expect(lensById('human').divergence!.priority).toBe('high');
    // water carries a needs_investigation only -> medium priority.
    expect(lensById('water').divergence).toBeDefined();
    expect(lensById('water').divergence!.priority).toBe('medium');
    // climate has no divergent capture.
    expect(lensById('climate').divergence).toBeUndefined();
  });

  it('builds keyData per lens domain', () => {
    const human = lensById('human');
    expect(human.keyData).toHaveLength(4); // 4 domains in the human lens
    const visionDatum = human.keyData.find(
      (k) => k.label === UNIVERSAL_DOMAIN_LABELS['vision-intent'],
    )!;
    expect(visionDatum.value).toBe('Clear');
  });
});

describe('buildLiveLensBundle -- project + cycle', () => {
  it('totals active points and domain freshness buckets', () => {
    expect(bundle.project.name).toBe('Moontrance Creek');
    expect(bundle.project.type).toBe('Regenerative Farm + Silvopasture');
    expect(bundle.project.totalDataPoints).toBe(10);
    // 16 domains split across current/ageing+stale/missing -> sums to 16.
    const { domainsCurrentCount, domainsAgeingCount, domainsMissingCount } = bundle.project;
    expect(domainsCurrentCount + domainsAgeingCount + domainsMissingCount).toBe(16);
  });

  it('raises a single high-priority plan-revision trigger for the major constraint', () => {
    const pr = bundle.project.planRevision;
    expect(pr.active).toBe(true);
    expect(pr.count).toBe(1);
    expect(pr.priority).toBe('high');
    expect(pr.triggers[0].domain).toBe(UNIVERSAL_DOMAIN_LABELS['risk-compliance']);
  });

  it('produces a nominal 3-phase cycle window', () => {
    expect(bundle.cycle.number).toBe(1); // cycleId 0 -> display 1
    expect(bundle.cycle.totalDays).toBe(180);
    expect(bundle.cycle.phases.map((p) => p.id)).toEqual(['plan', 'act', 'obs']);
  });
});

describe('buildObservationPins', () => {
  const pins = buildObservationPins(POINTS, NOW_MS);

  it('emits one pin per active point, scattered in-bounds', () => {
    expect(pins).toHaveLength(10);
    for (const pin of pins) {
      expect(pin.x).toBeGreaterThanOrEqual(0.08);
      expect(pin.x).toBeLessThanOrEqual(0.92);
      expect(pin.y).toBeGreaterThanOrEqual(0.08);
      expect(pin.y).toBeLessThanOrEqual(0.92);
    }
  });

  it('assigns each pin to its lens and flags divergent captures', () => {
    const riskPin = pins.find((p) => p.id === 'seed:mtc-risk-setback')!;
    expect(riskPin.lens).toBe('human');
    expect(riskPin.type).toBe('divergence');
    const visionPin = pins.find((p) => p.id === 'seed:mtc-vision')!;
    expect(visionPin.lens).toBe('human');
    expect(visionPin.type).toBe('observation_note');
  });
});

describe('buildLiveLensBundle -- domain detail degrade', () => {
  it('emits a detail entry per lens with the no-specialised variant', () => {
    for (const id of OBSERVE_LENS_IDS) {
      const detail = bundle.domainDetail[id];
      expect(detail).toBeDefined();
      expect(detail!.specialised.type).toBe('none');
    }
  });

  it('maps active points into subdomain rows with divergence flags', () => {
    const human = bundle.domainDetail['human']!;
    const riskSub = human.subdomains.find(
      (s) => s.label === UNIVERSAL_DOMAIN_LABELS['risk-compliance'],
    )!;
    expect(riskSub.points).toHaveLength(1);
    expect(riskSub.points[0].isDivergence).toBe(true);
    expect(riskSub.points[0].divergenceStatus).toBe('Major constraint');
    // economics-capacity has no captures -> empty note.
    const econSub = human.subdomains.find(
      (s) => s.label === UNIVERSAL_DOMAIN_LABELS['economics-capacity'],
    )!;
    expect(econSub.points).toHaveLength(0);
    expect(econSub.emptyNote).toBeTruthy();
  });
});
