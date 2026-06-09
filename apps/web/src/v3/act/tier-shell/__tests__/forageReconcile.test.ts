/**
 * planForagePaddockReconcile -- pure Record-time reconcile planner unit tests
 * (no React, no store, no DecisionList import).
 *
 * planForagePaddockReconcile is a thin, total wrapper around decodeForage +
 * diffForagePaddocks: it decodes a persisted c1 ("zones") FormValue, maps each
 * register row to the ForageZone shape (name / areaHa / forageType carried,
 * conditionClass intentionally omitted), and returns the paddock diff the
 * caller applies to the livestock store.
 *
 * Tests:
 *  1. Empty / {} c1 + empty existing -> { upserts: [], deleteIds: [] }.
 *  2. Empty / {} c1 + existing forage rows -> all forage rows in deleteIds.
 *  3. Two positive-area zones + candidate species -> 2 upserts, correct field map.
 *  4. conditionClass never fabricated in upsert notes.
 *  5. Re-Record idempotency: same c1 + existing == prior upserts -> no deletes,
 *     same ids.
 *  6. Removed zone -> its forage paddock id in deleteIds.
 *  7. Canonical (no generationId) row -> never in deleteIds or upserts.
 *  8. Zero-area zone -> skipped (no upsert).
 */

import { describe, it, expect } from 'vitest';
import {
  encodeForage,
  planForagePaddockReconcile,
} from '../ForageCapture.js';
import type { ForageZonesModel } from '../ForageCapture.js';
import { FORAGE_GENERATION_PREFIX } from '../forageZoneSync.js';
import type { Paddock } from '../../../../store/livestockStore.js';

const PROJECT = 'proj-1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a realistic c1 ("zones") FormValue via the real encoder. */
function c1Zones(
  zones: { id: string; name: string; areaHa: string; forageType?: string }[],
  candidateSpecies: ForageZonesModel['candidateSpecies'] = [],
) {
  const model: ForageZonesModel = {
    kind: 'zones',
    zones: zones.map((z) => ({
      id: z.id,
      name: z.name,
      areaHa: z.areaHa,
      forageType: z.forageType ?? '',
      condition: '',
      composition: '',
    })),
    candidateSpecies,
  };
  return encodeForage('zones', model);
}

/** Deterministic forage paddock id, mirroring diffForagePaddocks. */
function forageId(zoneId: string): string {
  return `forage-${PROJECT}-${zoneId}`;
}

function makeForagePaddock(id: string, projectId: string): Paddock {
  return {
    id,
    projectId,
    name: 'Test paddock',
    color: '#7cb342',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 0.001], [0.001, 0.001], [0.001, 0], [0, 0]]],
    },
    areaM2: 10000,
    grazingCellGroup: null,
    species: [],
    stockingDensity: null,
    fencing: 'none',
    guestSafeBuffer: false,
    waterPointNote: '',
    shelterNote: '',
    phase: 'soil',
    notes: '[forage-survey] Test',
    draft: true,
    generationId: FORAGE_GENERATION_PREFIX + projectId,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeCanonicalPaddock(id: string, projectId: string): Paddock {
  return {
    id,
    projectId,
    name: 'Canonical paddock',
    color: '#000000',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
    },
    areaM2: 100000,
    grazingCellGroup: null,
    species: ['cattle'],
    stockingDensity: 2,
    fencing: 'woven_wire',
    guestSafeBuffer: false,
    waterPointNote: '',
    shelterNote: '',
    phase: 'soil',
    notes: 'Canonical',
    draft: false,
    // generationId intentionally absent (undefined)
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// Empty / missing c1
// ---------------------------------------------------------------------------

describe('planForagePaddockReconcile -- empty c1', () => {
  it('empty {} c1 with empty existing yields no upserts and no deletes', () => {
    const { upserts, deleteIds } = planForagePaddockReconcile({}, [], PROJECT);
    expect(upserts).toEqual([]);
    expect(deleteIds).toEqual([]);
  });

  it('empty {} c1 deletes all existing forage-prefixed rows', () => {
    const existing = [
      makeForagePaddock(forageId('z1'), PROJECT),
      makeForagePaddock(forageId('z2'), PROJECT),
    ];
    const { upserts, deleteIds } = planForagePaddockReconcile(
      {},
      existing,
      PROJECT,
    );
    expect(upserts).toEqual([]);
    expect(deleteIds).toEqual([forageId('z1'), forageId('z2')]);
  });
});

// ---------------------------------------------------------------------------
// Field mapping ForageZoneInput -> ForageZone -> Paddock
// ---------------------------------------------------------------------------

describe('planForagePaddockReconcile -- field map', () => {
  it('two positive-area zones produce two upserts with correct fields', () => {
    const c1 = c1Zones(
      [
        { id: 'z1', name: 'North flat', areaHa: '8.5', forageType: 'improved' },
        { id: 'z2', name: 'South paddock', areaHa: '4', forageType: 'native' },
      ],
      ['sheep'],
    );
    const { upserts, deleteIds } = planForagePaddockReconcile(c1, [], PROJECT);
    expect(deleteIds).toEqual([]);
    expect(upserts).toHaveLength(2);

    const [p1, p2] = upserts;
    expect(p1.id).toBe(forageId('z1'));
    expect(p1.name).toBe('North flat');
    expect(p1.areaM2).toBe(8.5 * 10000);
    expect(p1.species).toEqual(['sheep']);
    expect(p1.draft).toBe(true);
    expect(p1.generationId).toMatch(/^forage:/);
    // forageType carried into the notes via diffForagePaddocks.
    expect(p1.notes).toContain('improved');

    expect(p2.id).toBe(forageId('z2'));
    expect(p2.areaM2).toBe(4 * 10000);
    expect(p2.species).toEqual(['sheep']);
  });

  it('never fabricates a condition class in the upsert notes', () => {
    // c1 carries condition grades (good/fair/poor) but planner drops them, so
    // no ConditionClass key (e.g. "improved-good") should leak into notes.
    const model: ForageZonesModel = {
      kind: 'zones',
      zones: [
        {
          id: 'z1',
          name: 'North flat',
          areaHa: '8.5',
          forageType: 'improved',
          condition: 'good',
          composition: 'ryegrass',
        },
      ],
      candidateSpecies: ['sheep'],
    };
    const c1 = encodeForage('zones', model);
    const { upserts } = planForagePaddockReconcile(c1, [], PROJECT);
    expect(upserts).toHaveLength(1);
    // notes carry the zone name + forageType only; no "improved-good" class key.
    expect(upserts[0].notes).toContain('improved');
    expect(upserts[0].notes).not.toContain('improved-good');
    expect(upserts[0].notes).not.toContain('good');
  });

  it('skips zero-area zones (no upsert)', () => {
    const c1 = c1Zones(
      [
        { id: 'z1', name: 'North flat', areaHa: '8.5', forageType: 'improved' },
        { id: 'z2', name: 'Empty', areaHa: '0', forageType: 'native' },
      ],
      ['sheep'],
    );
    const { upserts } = planForagePaddockReconcile(c1, [], PROJECT);
    expect(upserts).toHaveLength(1);
    expect(upserts[0].id).toBe(forageId('z1'));
  });
});

// ---------------------------------------------------------------------------
// Idempotency + removal + non-forage invisibility
// ---------------------------------------------------------------------------

describe('planForagePaddockReconcile -- reconcile semantics', () => {
  it('re-Record with existing == prior upserts deletes nothing and keeps ids', () => {
    const c1 = c1Zones(
      [
        { id: 'z1', name: 'North flat', areaHa: '8.5', forageType: 'improved' },
        { id: 'z2', name: 'South paddock', areaHa: '4', forageType: 'native' },
      ],
      ['sheep'],
    );
    const first = planForagePaddockReconcile(c1, [], PROJECT);
    // Feed the prior upserts back in as the existing set (the store now holds them).
    const second = planForagePaddockReconcile(c1, first.upserts, PROJECT);
    expect(second.deleteIds).toEqual([]);
    expect(second.upserts.map((p) => p.id)).toEqual(
      first.upserts.map((p) => p.id),
    );
    expect(second.upserts.map((p) => p.id)).toEqual([
      forageId('z1'),
      forageId('z2'),
    ]);
  });

  it('a zone removed from c1 lands its forage paddock id in deleteIds', () => {
    // c1 now has only z1; existing store still holds z1 + z2 forage rows.
    const c1 = c1Zones(
      [{ id: 'z1', name: 'North flat', areaHa: '8.5', forageType: 'improved' }],
      ['sheep'],
    );
    const existing = [
      makeForagePaddock(forageId('z1'), PROJECT),
      makeForagePaddock(forageId('z2'), PROJECT),
    ];
    const { upserts, deleteIds } = planForagePaddockReconcile(
      c1,
      existing,
      PROJECT,
    );
    expect(upserts.map((p) => p.id)).toEqual([forageId('z1')]);
    expect(deleteIds).toEqual([forageId('z2')]);
  });

  it('canonical (no generationId) rows are never deleted or upserted', () => {
    const c1 = c1Zones(
      [{ id: 'z1', name: 'North flat', areaHa: '8.5', forageType: 'improved' }],
      ['sheep'],
    );
    const canonical = makeCanonicalPaddock('canon-1', PROJECT);
    const existing = [canonical, makeForagePaddock(forageId('z9'), PROJECT)];
    const { upserts, deleteIds } = planForagePaddockReconcile(
      c1,
      existing,
      PROJECT,
    );
    // canonical id never appears anywhere.
    expect(deleteIds).not.toContain('canon-1');
    expect(upserts.map((p) => p.id)).not.toContain('canon-1');
    // stale forage row z9 is removed; new z1 is upserted.
    expect(deleteIds).toEqual([forageId('z9')]);
    expect(upserts.map((p) => p.id)).toEqual([forageId('z1')]);
  });
});
