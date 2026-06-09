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
  getMeasurementSlot,
  type ObserveLensId,
} from '@ogden/shared';
import {
  buildBuiltinObserveDataPoints,
  MTC_OBSERVE_BUNDLE,
} from '../../../../../data/builtinObserveDataPoints.js';
import {
  buildLiveLensBundle,
  buildObservationPins,
  buildDeclaredIntentPoint,
  computeDomainRollups,
} from '../liveBundle.js';
import { OBSERVE_COPY } from '../../../../copy/index.js';
import type { LocalProject } from '../../../../../store/projectStore.js';

// Fixed baseline so freshness / ages are deterministic (matches the seed era).
const NOW_MS = Date.parse('2026-06-03T12:00:00.000Z');
const POINTS = buildBuiltinObserveDataPoints('mtc', MTC_OBSERVE_BUNDLE);

const bundle = buildLiveLensBundle({
  points: POINTS,
  nowMs: NOW_MS,
  projectName: 'Moontrance Creek',
  projectTypeLabel: 'Regenerative Farm + Silvopasture',
  getSlot: getMeasurementSlot,
});

const lensById = (id: ObserveLensId) => bundle.lenses.find((l) => l.id === id)!;

describe('buildBuiltinObserveDataPoints (fixture sanity)', () => {
  it('builds 10 active MTC points, each carrying seeded Point geometry', () => {
    expect(POINTS).toHaveLength(10);
    expect(POINTS.every((p) => !p.isSuperseded)).toBe(true);
    // Each MTC seed row now carries a `location` -> Point geometry (Task 6),
    // so the live map can place pins at true coordinates.
    expect(POINTS.every((p) => p.locationGeometry?.type === 'Point')).toBe(true);
  });

  it('resolves a live map payload from the seeded MTC point geometry', () => {
    // This builder call passes no parcelBoundary/isDemoGeometry (the hook
    // useLiveLensBundle supplies those); the map still resolves from the
    // georeferenced points, with bbox derived from the markers.
    expect(bundle.map).not.toBeNull();
    expect(bundle.map!.markers).toHaveLength(10);
    expect(bundle.map!.boundary).toBeNull();
    expect(bundle.map!.demoGeometry).toBe(false);
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
    expect(pr.triggers[0]!.domain).toBe(UNIVERSAL_DOMAIN_LABELS['risk-compliance']);
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

describe('buildLiveLensBundle -- specialised from seed captures', () => {
  it('lights up each lens with its real specialised member from MTC proofs', () => {
    // The MTC seed carries measurement-bound proof captures on one domain per
    // lens; with getMeasurementSlot resolving the bindings, every lens emits
    // its real viz member rather than the { type: 'none' } degrade.
    const expected: Record<ObserveLensId, string> = {
      water: 'hydrology',
      living: 'soil',
      foundation: 'topography',
      climate: 'climate',
      human: 'human',
      infrastructure: 'infrastructure_empty',
    };
    for (const id of OBSERVE_LENS_IDS) {
      const detail = bundle.domainDetail[id];
      expect(detail).toBeDefined();
      expect(detail!.specialised.type).toBe(expected[id]);
    }
  });

  it('computes derived viz fields from the captured rows', () => {
    const water = bundle.domainDetail['water']!.specialised;
    if (water.type !== 'hydrology') throw new Error('expected hydrology');
    expect(water.infiltrationData).toHaveLength(3);
    expect(water.infiltrationData.map((r) => r.status)).toEqual([
      'good',
      'moderate',
      'risk',
    ]);
    expect(water.sources).toHaveLength(2);

    const foundation = bundle.domainDetail['foundation']!.specialised;
    if (foundation.type !== 'topography') throw new Error('expected topography');
    // slope area share 12000/11000/5000 -> 43/39/18 (rounded).
    expect(foundation.slopeBreakdown.map((s) => s.pct)).toEqual([43, 39, 18]);

    const climate = bundle.domainDetail['climate']!.specialised;
    if (climate.type !== 'climate') throw new Error('expected climate');
    expect(climate.windRose).toHaveLength(8); // all 8 compass petals
    expect(climate.windRose.find((w) => w.dir === 'SW')!.freq).toBe(3);

    const living = bundle.domainDetail['living']!.specialised;
    if (living.type !== 'soil') throw new Error('expected soil');
    // third pH row is pH-only (partial degrade).
    expect(living.phData[2]!.om).toBeUndefined();
  });

  it('keeps the honest none degrade when no bound captures resolve', () => {
    // Without the slot resolver, bindings never resolve -> every lens degrades.
    const plain = buildLiveLensBundle({
      points: POINTS,
      nowMs: NOW_MS,
      projectName: 'Moontrance Creek',
      projectTypeLabel: 'Regenerative Farm + Silvopasture',
    });
    for (const id of OBSERVE_LENS_IDS) {
      expect(plain.domainDetail[id]!.specialised.type).toBe('none');
    }
  });

  it('maps active points into subdomain rows with divergence flags', () => {
    const human = bundle.domainDetail['human']!;
    const riskSub = human.subdomains.find(
      (s) => s.label === UNIVERSAL_DOMAIN_LABELS['risk-compliance'],
    )!;
    expect(riskSub.points).toHaveLength(1);
    expect(riskSub.points[0]!.isDivergence).toBe(true);
    expect(riskSub.points[0]!.divergenceStatus).toBe('Major constraint');
    // economics-capacity has no captures -> empty note.
    const econSub = human.subdomains.find(
      (s) => s.label === UNIVERSAL_DOMAIN_LABELS['economics-capacity'],
    )!;
    expect(econSub.points).toHaveLength(0);
    expect(econSub.emptyNote).toBeTruthy();
  });
});

describe('buildDeclaredIntentPoint', () => {
  // The composer only touches project.metadata.visionProfile; a partial cast
  // keeps the fixtures minimal without standing up a full LocalProject.
  const projectWith = (visionProfile: unknown): LocalProject =>
    ({ metadata: { visionProfile } }) as unknown as LocalProject;

  it('returns null when the project carries no visionProfile', () => {
    expect(buildDeclaredIntentPoint(undefined)).toBeNull();
    expect(
      buildDeclaredIntentPoint({ metadata: {} } as unknown as LocalProject),
    ).toBeNull();
    expect(buildDeclaredIntentPoint(projectWith(undefined))).toBeNull();
  });

  it('returns null when the visionProfile has no surfaceable content', () => {
    expect(buildDeclaredIntentPoint(projectWith({}))).toBeNull();
    expect(buildDeclaredIntentPoint(projectWith({ landIdentity: ['   '] }))).toBeNull();
    expect(buildDeclaredIntentPoint(projectWith({ primaryOutcomes: [] }))).toBeNull();
  });

  it('composes a low-confidence declaration point from a full visionProfile', () => {
    const pt = buildDeclaredIntentPoint(
      projectWith({
        landIdentity: ['A quiet regenerative homestead for the family'],
        primaryOutcomes: ['soil_regeneration', 'food_for_community'],
        budgetRange: 'over_500k', // known id (ASCII label)
        timelineProgress: 'immediately', // known id
        resourceConstraints: ['part_time_solo'], // wizard-local id -> humanized
        updatedAt: '2026-05-20T10:00:00.000Z',
      }),
    );
    expect(pt).not.toBeNull();
    expect(pt!.type).toBe('declaration');
    expect(pt!.confidence).toBe('low');
    expect(pt!.label).toBe('Declared project intent');
    // The free-text statement wins as the headline value.
    expect(pt!.value).toBe('A quiet regenerative homestead for the family');
    // Notes compose known-id labels + a humanized fallback, omitting absent fields.
    expect(pt!.notes).toContain('Vision: A quiet regenerative homestead for the family');
    expect(pt!.notes).toContain('Goals: Soil regeneration, Food for family / community');
    expect(pt!.notes).toContain('Budget: $500,000+');
    expect(pt!.notes).toContain('Timeline: Immediately');
    expect(pt!.notes).toContain('Labour: Part time solo');
    expect(pt!.recordedAt).toBe('20 May 2026');
    expect(pt!.observedAt).toBe('20 May 2026');
  });

  it('falls back to outcome labels for the value when no statement exists', () => {
    const pt = buildDeclaredIntentPoint(
      projectWith({ primaryOutcomes: ['soil_regeneration'] }),
    );
    expect(pt).not.toBeNull();
    expect(pt!.value).toBe('Soil regeneration');
    expect(pt!.notes).toBe('Goals: Soil regeneration');
    // No date fields when the profile has no updatedAt/completedAt.
    expect(pt!.recordedAt).toBeUndefined();
  });

  it('surfaces a statement-only profile', () => {
    const pt = buildDeclaredIntentPoint(projectWith({ landIdentity: ['Just a vision'] }));
    expect(pt!.value).toBe('Just a vision');
    expect(pt!.notes).toBe('Vision: Just a vision');
  });
});

describe('buildLiveLensBundle -- declaredIntent injection (vision-intent only)', () => {
  const VISION_LABEL = UNIVERSAL_DOMAIN_LABELS['vision-intent'];
  const declared = buildDeclaredIntentPoint(
    { metadata: { visionProfile: { landIdentity: ['A regenerative homestead'] } } } as unknown as LocalProject,
  )!;

  const baseInput = {
    nowMs: NOW_MS,
    projectName: 'Greenfield',
    projectTypeLabel: 'Homestead',
    getSlot: getMeasurementSlot,
  } as const;

  // A project with ZERO observe points -- the real-world case the feature targets.
  const emptyWith = buildLiveLensBundle({ ...baseInput, points: [], declaredIntent: declared });
  const emptyNull = buildLiveLensBundle({ ...baseInput, points: [], declaredIntent: null });

  const humanKeyDatum = (b: typeof emptyWith) =>
    b.lenses.find((l) => l.id === 'human')!.keyData.find((k) => k.label === VISION_LABEL)!;
  const visionSub = (b: typeof emptyWith) =>
    b.domainDetail['human']!.subdomains.find((s) => s.label === VISION_LABEL)!;

  it('surfaces "Declared" in the vision-intent keyData row when 0 real observations', () => {
    expect(humanKeyDatum(emptyWith).value).toBe('Declared');
    expect(humanKeyDatum(emptyWith).confidence).toBe('low');
    // Without a declaration the same row honestly reads the land-vocabulary
    // empty label ("Not yet read").
    expect(humanKeyDatum(emptyNull).value).toBe(OBSERVE_COPY.notYetRead);
  });

  it('prepends the declared-intent row into the vision-intent slide-up and clears the empty note', () => {
    const sub = visionSub(emptyWith);
    expect(sub.points).toHaveLength(1);
    expect(sub.points[0]!.id).toBe('declared-intent');
    expect(sub.points[0]!.type).toBe('declaration');
    expect(sub.emptyNote).toBeUndefined();
    // The null build keeps the honest empty state.
    expect(visionSub(emptyNull).points).toHaveLength(0);
    expect(visionSub(emptyNull).emptyNote).toBeTruthy();
  });

  it('exposes a row glyph for the declaration type via the live typeIcon table', () => {
    expect(emptyWith.typeIcon.declaration).toBe('◆');
  });

  it('HONESTY: the declaration inflates no observation count', () => {
    // Every count-bearing field is byte-identical to the declaredIntent:null build.
    expect(emptyWith.project.totalDataPoints).toBe(emptyNull.project.totalDataPoints);
    expect(emptyWith.project.totalDataPoints).toBe(0);
    expect(emptyWith.project.domainsMissingCount).toBe(emptyNull.project.domainsMissingCount);
    expect(emptyWith.project.domainsCurrentCount).toBe(emptyNull.project.domainsCurrentCount);
    expect(emptyWith.project.domainsAgeingCount).toBe(emptyNull.project.domainsAgeingCount);
    // Per-lens observation badges + freshness unchanged.
    for (const id of OBSERVE_LENS_IDS) {
      const w = emptyWith.lenses.find((l) => l.id === id)!;
      const n = emptyNull.lenses.find((l) => l.id === id)!;
      expect(w.observations).toBe(n.observations);
      expect(w.observations).toBe(0);
      expect(w.freshness).toBe(n.freshness);
      expect(w.summary).toBe(n.summary);
    }
  });

  it('does not override an observed status: real observations win the keyData headline', () => {
    // The MTC seed carries a real vision-intent observation; a declaration must
    // not replace its observed status, but still appears in the slide-up.
    const withDecl = buildLiveLensBundle({
      points: POINTS,
      nowMs: NOW_MS,
      projectName: 'Moontrance Creek',
      projectTypeLabel: 'Regenerative Farm + Silvopasture',
      getSlot: getMeasurementSlot,
      declaredIntent: declared,
    });
    const kd = withDecl.lenses.find((l) => l.id === 'human')!.keyData.find((k) => k.label === VISION_LABEL)!;
    expect(kd.value).not.toBe('Declared');
    // Observation count is unchanged from the no-declaration build.
    expect(withDecl.lenses.find((l) => l.id === 'human')!.observations).toBe(
      bundle.lenses.find((l) => l.id === 'human')!.observations,
    );
    // The slide-up shows the declaration prepended ahead of the real observation.
    const sub = withDecl.domainDetail['human']!.subdomains.find((s) => s.label === VISION_LABEL)!;
    expect(sub.points[0]!.id).toBe('declared-intent');
    expect(sub.points.length).toBeGreaterThanOrEqual(2);
  });
});
