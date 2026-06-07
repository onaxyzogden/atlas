// specialisedBuilders.test.ts -- the read-side "compiler" that turns captured
// proof items into the six Observe-lens specialised viz payloads.
//
// Pure functions only (no React, no stores): we hand-build a fixture slot
// resolver (`makeGetSlot`) that maps each test slotId to a ProofSchemaSlot
// carrying a measurementBinding, plus sample proof items whose loggedResult
// rows carry the captured numbers. We assert (a) each lens emits its real
// Specialised union member when >=1 bound row exists, (b) the honest
// { type: 'none' } degrade when no bound row exists, and (c) the read-side
// derived fields (infiltration x/status, slope pct, wind-rose histogram +
// km/h, capacity colour, partial-pH degrade).
//
// Run BOUNDED on Windows (pool:'forks' + explicit timeout); never unbounded.
import { describe, it, expect } from 'vitest';

import type {
  FieldActionProofItem,
  ProofSchemaSlot,
  MeasurementBinding,
} from '@ogden/shared';
import {
  buildSpecialisedForLens,
  type SlotResolver,
} from '../specialisedBuilders.js';

// ── fixtures ────────────────────────────────────────────────────────────────

// A slot id -> binding table for the test. The builder only reads the slot's
// `measurementBinding`; the other slot fields are filler to satisfy the type.
function makeGetSlot(
  table: Record<string, MeasurementBinding>,
): SlotResolver {
  const slots = new Map<string, ProofSchemaSlot>();
  for (const [id, binding] of Object.entries(table)) {
    slots.set(id, {
      id,
      proofType: 'logged_result',
      label: id,
      instruction: 'fixture',
      required: false,
      measurementBinding: binding,
    } as ProofSchemaSlot);
  }
  return (slotId: string) => slots.get(slotId);
}

let counter = 0;
function proof(
  slotId: string,
  loggedResult: Record<string, unknown>,
): FieldActionProofItem {
  counter += 1;
  return {
    id: `proof-${counter}`,
    slotId,
    proofType: 'logged_result',
    capturedAt: '2026-06-03T10:00:00.000Z',
    loggedResult,
  } as FieldActionProofItem;
}

// ── degrade: no bound captures -> honest { type: 'none' } ────────────────────

describe('buildSpecialisedForLens -- degrade', () => {
  const noSlots: SlotResolver = () => undefined;

  it('returns { type: none } for every lens with no proof items', () => {
    for (const lens of [
      'water',
      'living',
      'foundation',
      'climate',
      'human',
      'infrastructure',
    ] as const) {
      expect(buildSpecialisedForLens(lens, [], noSlots).type).toBe('none');
    }
  });

  it('returns { type: none } when proof items resolve to no binding', () => {
    const items = [proof('unbound', { zone: 'A', ph: 6.5 })];
    expect(buildSpecialisedForLens('living', items, noSlots).type).toBe('none');
  });
});

// ── water (hydrology) ────────────────────────────────────────────────────────

describe('buildSpecialisedForLens -- water', () => {
  const getSlot = makeGetSlot({
    inf: { lens: 'water', vizField: 'water.infiltrationData' },
    src: { lens: 'water', vizField: 'water.sources' },
  });
  const items = [
    proof('inf', { zone: 'Upper', rate: 48 }),
    proof('inf', { zone: 'Mid', rate: 26 }),
    proof('inf', { zone: 'Creek flat', rate: 8 }),
    proof('src', {
      label: 'Seasonal creek',
      sourceType: 'surface',
      status: 'flashy',
      confidence: 'medium',
    }),
  ];

  const data = buildSpecialisedForLens('water', items, getSlot);

  it('emits the hydrology member', () => {
    expect(data.type).toBe('hydrology');
  });

  it('derives status bands + min-max normalised x for infiltration', () => {
    if (data.type !== 'hydrology') throw new Error('expected hydrology');
    expect(data.infiltrationData.map((r) => r.status)).toEqual([
      'good',
      'moderate',
      'risk',
    ]);
    // x is min-max over [8,26,48] -> 1, mid, 0.
    expect(data.infiltrationData[0]!.x).toBeCloseTo(1);
    expect(data.infiltrationData[2]!.x).toBeCloseTo(0);
    expect(data.sources).toHaveLength(1);
    expect(data.sources[0]!.type).toBe('surface');
  });
});

// ── living (soil) -- incl. partial pH degrade ────────────────────────────────

describe('buildSpecialisedForLens -- living', () => {
  const getSlot = makeGetSlot({
    ph: { lens: 'living', vizField: 'soil.phData' },
  });
  const items = [
    proof('ph', { zone: 'North', ph: 6.1, om: 2.4, compaction: 'high' }),
    proof('ph', { zone: 'Creek edge', ph: 6.8 }), // pH alone -> partial
  ];
  const data = buildSpecialisedForLens('living', items, getSlot);

  it('emits the soil member with full + partial rows', () => {
    if (data.type !== 'soil') throw new Error('expected soil');
    expect(data.phData).toHaveLength(2);
    expect(data.phData[0]!.om).toBe(2.4);
    expect(data.phData[0]!.compaction).toBe('high');
    // partial row leaves om/compaction undefined (renderer guards the spans).
    expect(data.phData[1]!.om).toBeUndefined();
    expect(data.phData[1]!.compaction).toBeUndefined();
  });
});

// ── foundation (topography) -- slope pct of area ─────────────────────────────

describe('buildSpecialisedForLens -- foundation', () => {
  const getSlot = makeGetSlot({
    elev: { lens: 'foundation', vizField: 'topography.elevationZones' },
    slope: { lens: 'foundation', vizField: 'topography.slopeBreakdown' },
  });
  const items = [
    proof('elev', {
      label: 'Upper terrace',
      areaM2: 14000,
      aspect: 'South',
      use: 'Silvopasture',
    }),
    proof('slope', { band: '0-5%', areaM2: 30 }),
    proof('slope', { band: '5-10%', areaM2: 10 }),
  ];
  const data = buildSpecialisedForLens('foundation', items, getSlot);

  it('emits topography with ha formatting + area-share pct', () => {
    if (data.type !== 'topography') throw new Error('expected topography');
    expect(data.elevationZones[0]!.area).toBe('1.4 ha');
    expect(data.slopeBreakdown.map((s) => s.pct)).toEqual([75, 25]);
  });
});

// ── climate -- wind rose histogram + microclimates ───────────────────────────

describe('buildSpecialisedForLens -- climate', () => {
  const getSlot = makeGetSlot({
    wind: { lens: 'climate', vizField: 'climate.windRose' },
    micro: { lens: 'climate', vizField: 'climate.microclimates' },
  });
  const items = [
    proof('wind', { dir: 'SW', speedMs: 5 }),
    proof('wind', { dir: 'SW', speedMs: 7 }),
    proof('wind', { dir: 'W', speedMs: 10 }),
    proof('micro', {
      label: 'Creek frost pocket',
      sizeHa: 0.6,
      character: 'Cold-air drainage',
      risk: 'high',
    }),
  ];
  const data = buildSpecialisedForLens('climate', items, getSlot);

  it('emits all 8 compass petals, aggregating freq + mean km/h', () => {
    if (data.type !== 'climate') throw new Error('expected climate');
    expect(data.windRose).toHaveLength(8);
    const sw = data.windRose.find((w) => w.dir === 'SW')!;
    expect(sw.freq).toBe(2);
    expect(sw.speed).toBe(Math.round(6 * 3.6)); // mean 6 m/s -> 22 km/h
    const n = data.windRose.find((w) => w.dir === 'N')!;
    expect(n.freq).toBe(0); // unobserved direction -> zero petal
    expect(data.microclimates[0]!.size).toBe('0.6 ha');
  });
});

// ── human -- capacity colour + consent ───────────────────────────────────────

describe('buildSpecialisedForLens -- human', () => {
  const getSlot = makeGetSlot({
    cap: { lens: 'human', vizField: 'human.capacityBars' },
    consent: { lens: 'human', vizField: 'human.consentItems' },
  });
  const items = [
    proof('cap', { label: 'Steward availability', pct: 80 }),
    proof('cap', { label: 'Budget secured', pct: 30 }),
    proof('consent', {
      label: 'Conservation permit',
      status: 'pending',
      weeks: '4-6 wks',
    }),
  ];
  const data = buildSpecialisedForLens('human', items, getSlot);

  it('emits human with threshold colours + consent rows', () => {
    if (data.type !== 'human') throw new Error('expected human');
    expect(data.capacityBars[0]!.color).toBe('#5AAF72'); // >=70 green
    expect(data.capacityBars[1]!.color).toBe('#C45A4A'); // <40 red
    expect(data.consentItems[0]!.weeks).toBe('4-6 wks');
  });
});

// ── infrastructure -- suggested tasks ────────────────────────────────────────

describe('buildSpecialisedForLens -- infrastructure', () => {
  const getSlot = makeGetSlot({
    task: {
      lens: 'infrastructure',
      vizField: 'infrastructure.suggestedTasks',
    },
  });
  const items = [
    proof('task', {
      label: 'Inspect culvert',
      domain: 'Access',
      priority: 'high',
    }),
  ];
  const data = buildSpecialisedForLens('infrastructure', items, getSlot);

  it('emits the infrastructure_empty member with suggested tasks', () => {
    if (data.type !== 'infrastructure_empty') {
      throw new Error('expected infrastructure_empty');
    }
    expect(data.suggestedTasks).toHaveLength(1);
    expect(data.suggestedTasks[0]!.priority).toBe('high');
  });
});
