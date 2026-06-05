/**
 * Pure boundary-mapper tests — no store, no network, no timers.
 * Run bounded: `vitest run src/compost/compostMapping.test.ts --pool=forks`.
 */

import { describe, it, expect } from 'vitest';
import type { CompostPile, CompostReading } from '@ogden/shared';
import { PLAN_RECIPE, fToC } from './model.js';
import {
  cToF,
  formatReadingDate,
  seedCapturedAt,
  readingsFromApi,
  readingFromApi,
  reindexDays,
  pileCreateFromPlanRecipe,
  planRecipeFromPile,
  seedReadingToApiCreate,
  readingCreatePayload,
} from './compostMapping.js';

function makeServerReading(over: Partial<CompostReading>): CompostReading {
  return {
    id: 'srv',
    pileId: 'p1',
    tempC: 55,
    turned: false,
    source: 'manual',
    capturedAt: '2026-03-04T12:00:00.000Z',
    ...over,
  };
}

describe('°C ↔ °F boundary', () => {
  it('cToF inverts fToC at the pasteurisation + peak thresholds', () => {
    expect(fToC(131)).toBe(55); // pasteurisation
    expect(cToF(55)).toBe(131);
    expect(fToC(160)).toBe(71.1); // peak band top
    expect(cToF(71.1)).toBe(160);
  });

  it('cToF rounds to an integer °F (matches logReading)', () => {
    expect(cToF(0)).toBe(32);
    expect(cToF(100)).toBe(212);
    expect(cToF(60)).toBe(140);
  });
});

describe('formatReadingDate / seedCapturedAt', () => {
  it('formats in UTC so it is timezone-deterministic', () => {
    expect(formatReadingDate('2026-03-04T12:00:00.000Z')).toBe('Mar 04');
    expect(formatReadingDate(seedCapturedAt(0))).toBe('Mar 04');
    expect(formatReadingDate(seedCapturedAt(4))).toBe('Mar 08');
  });
});

describe('readingsFromApi', () => {
  it('sorts by capturedAt ASC and assigns day = index over shuffled input', () => {
    const list: CompostReading[] = [
      makeServerReading({ id: 'b', capturedAt: seedCapturedAt(2), tempC: 60, moisturePct: 48 }),
      makeServerReading({ id: 'a', capturedAt: seedCapturedAt(0), tempC: 20, moisturePct: 52 }),
      makeServerReading({ id: 'c', capturedAt: seedCapturedAt(1), tempC: 40, moisturePct: 50 }),
    ];
    const out = readingsFromApi(list);
    expect(out.map((r) => r.id)).toEqual(['a', 'c', 'b']);
    expect(out.map((r) => r.day)).toEqual([0, 1, 2]);
  });

  it('carries moisture forward when the server stored none', () => {
    const list: CompostReading[] = [
      makeServerReading({ id: 'a', capturedAt: seedCapturedAt(0), moisturePct: 44 }),
      makeServerReading({ id: 'b', capturedAt: seedCapturedAt(1) }), // no moisture
    ];
    const out = readingsFromApi(list);
    expect(out[1]?.moisture).toBe(44);
  });

  it('maps temp °C→°F, proofPhotoUri→boolean, and null note→empty string', () => {
    const r = readingFromApi(
      makeServerReading({ tempC: 55, proofPhotoUri: 'seed://proof', note: undefined }),
      0,
      50,
    );
    expect(r.temp).toBe(131);
    expect(r.proofPhoto).toBe(true);
    expect(r.note).toBe('');
  });
});

describe('reindexDays', () => {
  it('restamps day to array index, preserving identity when unchanged', () => {
    const a = { id: 'a', day: 0, date: 'x', temp: 1, moisture: 1, turned: false, note: '', proofPhoto: false };
    const b = { id: 'b', day: 9, date: 'y', temp: 2, moisture: 2, turned: false, note: '', proofPhoto: false };
    const out = reindexDays([a, b]);
    expect(out[0]).toBe(a); // unchanged → same reference
    expect(out[1]?.day).toBe(1);
  });
});

describe('PlanRecipe ↔ CompostPile round-trip', () => {
  it('reproduces PLAN_RECIPE exactly (targets, dims, volume, layers, objectives)', () => {
    const create = pileCreateFromPlanRecipe(PLAN_RECIPE);
    const pile: CompostPile = { ...create, id: 'p', siteId: 's', orgId: 'o' };
    const back = planRecipeFromPile(pile, PLAN_RECIPE.site);
    expect(back).toEqual(PLAN_RECIPE);
  });

  it('converts °F targets to °C on the way out', () => {
    const create = pileCreateFromPlanRecipe(PLAN_RECIPE);
    expect(create.targetTempMinC).toBe(55); // 131°F
    expect(create.targetTempMaxC).toBe(71.1); // 160°F
    expect(create.dimensions).toEqual({ lengthFt: 4, widthFt: 4, heightFt: 3 });
  });

  it('maps layer status complete→complete, else→pending', () => {
    const create = pileCreateFromPlanRecipe({
      ...PLAN_RECIPE,
      layers: [
        { id: 'x', type: 'brown', name: 'n', depth: '1 in', cnApprox: 5, status: 'complete' },
        { id: 'y', type: 'green', name: 'm', depth: '1 in', cnApprox: 5, status: 'pending' },
      ],
    });
    expect(create.recipeLayers.map((l) => l.status)).toEqual(['complete', 'pending']);
  });

  it('falls back to PLAN_RECIPE for absent optionals + default site name', () => {
    const sparse: CompostPile = {
      id: 'p',
      siteId: 's',
      orgId: 'o',
      name: 'Bare pile',
      status: 'active',
      recipeLayers: [],
      buildChecklist: [],
      objectives: [],
    };
    const back = planRecipeFromPile(sparse);
    expect(back.site).toBe(PLAN_RECIPE.site);
    expect(back.cnRatio).toBe(PLAN_RECIPE.cnRatio);
    expect(back.targetTempMin).toBe(PLAN_RECIPE.targetTempMin);
    expect(back.dimensions).toEqual(PLAN_RECIPE.dimensions);
    expect(back.volumeCuFt).toBe(PLAN_RECIPE.volumeCuFt);
  });
});

describe('reading create payloads', () => {
  it('readingCreatePayload omits an empty note and stamps manual source', () => {
    expect(readingCreatePayload(60, '', '2026-06-03T00:00:00.000Z')).toEqual({
      tempC: 60,
      turned: false,
      note: undefined,
      source: 'manual',
      capturedAt: '2026-06-03T00:00:00.000Z',
    });
  });

  it('seedReadingToApiCreate converts °F→°C and maps proofPhoto→placeholder uri', () => {
    const seed = { id: 'r5', day: 5, date: 'Mar 09', temp: 158, moisture: 48, turned: false, note: 'Max', proofPhoto: true };
    const payload = seedReadingToApiCreate(seed, seedCapturedAt(5));
    expect(payload.tempC).toBe(fToC(158)); // 70
    expect(payload.moisturePct).toBe(48);
    expect(payload.proofPhotoUri).toBe('seed://proof');
    expect(payload.source).toBe('manual');
  });
});
