/**
 * forageZoneSync -- pure adapter unit tests (no store, no DOM).
 *
 * Tests:
 *  1. DSE_PRESETS verbatim: all 14 values, exact numbers, table size.
 *  2. Empty zones + empty existing -> no upserts, no deletes.
 *  3. One positive zone -> one upsert with correct fields.
 *  4. Zero-area zones are skipped (areaHa "0" and "").
 *  5. Removed zone -> deleteId in result.
 *  6. Non-forage rows (canonical, other-generation) are never touched.
 *  7. Area-dropped-to-zero zone -> delete, not upsert.
 */

import { describe, it, expect } from 'vitest';
import {
  DSE_PRESETS,
  diffForagePaddocks,
} from '../forageZoneSync.js';
import type { ForageZone } from '../forageZoneSync.js';
import type { Paddock } from '../../../../store/livestockStore.js';

// ---------------------------------------------------------------------------
// Tiny factory helpers so tests are concise.
// ---------------------------------------------------------------------------

function makeZone(id: string, name: string, areaHa: string): ForageZone {
  return { id, name, areaHa };
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
    generationId: 'forage:' + projectId,
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

function makeOtherGenPaddock(id: string, projectId: string): Paddock {
  return {
    ...makeCanonicalPaddock(id, projectId),
    generationId: 'auto:xyz',
  };
}

// ---------------------------------------------------------------------------
// 1. DSE_PRESETS verbatim
// ---------------------------------------------------------------------------

describe('DSE_PRESETS', () => {
  it('has exactly 14 entries', () => {
    expect(Object.keys(DSE_PRESETS).length).toBe(14);
  });

  it('Improved class values are correct', () => {
    expect(DSE_PRESETS['improved-excellent']).toBe(15);
    expect(DSE_PRESETS['improved-good']).toBe(10);
    expect(DSE_PRESETS['improved-fair']).toBe(6);
    expect(DSE_PRESETS['improved-poor']).toBe(3);
  });

  it('Native class values are correct', () => {
    expect(DSE_PRESETS['native-good']).toBe(6);
    expect(DSE_PRESETS['native-fair']).toBe(3);
    expect(DSE_PRESETS['native-poor']).toBe(1.5);
  });

  it('Mixed class values are correct', () => {
    expect(DSE_PRESETS['mixed-good']).toBe(8);
    expect(DSE_PRESETS['mixed-fair']).toBe(4);
  });

  it('Riparian class values are correct (4 entries)', () => {
    expect(DSE_PRESETS['riparian-good']).toBe(2);
    expect(DSE_PRESETS['riparian-fair']).toBe(1);
    expect(DSE_PRESETS['riparian-browse']).toBe(1.5);
    expect(DSE_PRESETS['riparian-bare']).toBe(0.5);
  });

  it('Degraded value is correct', () => {
    expect(DSE_PRESETS['degraded']).toBe(0.8);
  });
});

// ---------------------------------------------------------------------------
// 2. Empty zones + empty existing -> no upserts, no deletes
// ---------------------------------------------------------------------------

describe('diffForagePaddocks -- empty inputs', () => {
  it('returns empty arrays when zones and existing are both empty', () => {
    const result = diffForagePaddocks([], [], 'p1', ['sheep']);
    expect(result.upserts).toEqual([]);
    expect(result.deleteIds).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. One positive zone -> one upsert with correct fields
// ---------------------------------------------------------------------------

describe('diffForagePaddocks -- one positive zone', () => {
  const zone = makeZone('z1', 'North flat', '5');
  const result = diffForagePaddocks([zone], [], 'p1', ['sheep']);

  it('produces exactly one upsert', () => {
    expect(result.upserts).toHaveLength(1);
    expect(result.deleteIds).toEqual([]);
  });

  const p = result.upserts[0]!;

  it('has deterministic id derived from projectId + zoneId', () => {
    expect(p.id).toBe('forage-p1-z1');
  });

  it('has correct projectId', () => {
    expect(p.projectId).toBe('p1');
  });

  it('has areaM2 = ha * 10000', () => {
    expect(p.areaM2).toBe(5 * 10000);
  });

  it('carries candidate species', () => {
    expect(p.species).toEqual(['sheep']);
  });

  it('is marked as draft', () => {
    expect(p.draft).toBe(true);
  });

  it('has generationId forage:<projectId>', () => {
    expect(p.generationId).toBe('forage:p1');
  });

  it('notes starts with "[forage-survey] "', () => {
    expect(p.notes.startsWith('[forage-survey] ')).toBe(true);
  });

  it('geometry is a valid closed Polygon', () => {
    expect(p.geometry.type).toBe('Polygon');
    const ring = p.geometry.coordinates[0]!;
    expect(ring.length).toBeGreaterThanOrEqual(4);
    // First coord deep-equals last coord (ring is closed)
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('name is the zone name', () => {
    expect(p.name).toBe('North flat');
  });
});

// ---------------------------------------------------------------------------
// 4. Zero-area zones are skipped
// ---------------------------------------------------------------------------

describe('diffForagePaddocks -- zero-area zones skipped', () => {
  it('skips zone with areaHa "0"', () => {
    const zone = makeZone('z1', 'Empty field', '0');
    const result = diffForagePaddocks([zone], [], 'p1', []);
    expect(result.upserts).toHaveLength(0);
    expect(result.deleteIds).toHaveLength(0);
  });

  it('skips zone with areaHa ""', () => {
    const zone = makeZone('z2', 'Blank field', '');
    const result = diffForagePaddocks([zone], [], 'p1', []);
    expect(result.upserts).toHaveLength(0);
    expect(result.deleteIds).toHaveLength(0);
  });

  it('skips zone with areaHa "NaN" string', () => {
    const zone = makeZone('z3', 'NaN field', 'NaN');
    const result = diffForagePaddocks([zone], [], 'p1', []);
    expect(result.upserts).toHaveLength(0);
    expect(result.deleteIds).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Removed zone -> deleteId
// ---------------------------------------------------------------------------

describe('diffForagePaddocks -- removed zone produces deleteId', () => {
  it('adds forage-p1-z1 to deleteIds when zone is absent from current zones', () => {
    const existing: Paddock[] = [makeForagePaddock('forage-p1-z1', 'p1')];
    const result = diffForagePaddocks([], existing, 'p1', []);
    expect(result.deleteIds).toContain('forage-p1-z1');
    expect(result.upserts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Non-forage rows are never touched
// ---------------------------------------------------------------------------

describe('diffForagePaddocks -- non-forage rows untouched', () => {
  it('canonical paddock (no generationId) never appears in deleteIds or upserts', () => {
    const canonical = makeCanonicalPaddock('canon1', 'p1');
    const result = diffForagePaddocks([], [canonical], 'p1', []);
    expect(result.deleteIds).not.toContain('canon1');
    expect(result.upserts.map((u) => u.id)).not.toContain('canon1');
  });

  it('other-generation paddock never appears in deleteIds or upserts', () => {
    const other = makeOtherGenPaddock('other1', 'p1');
    const result = diffForagePaddocks([], [other], 'p1', []);
    expect(result.deleteIds).not.toContain('other1');
    expect(result.upserts.map((u) => u.id)).not.toContain('other1');
  });

  it('mix: forage-owned row deleted, canonical + other-gen untouched', () => {
    const forage = makeForagePaddock('forage-p1-z9', 'p1');
    const canonical = makeCanonicalPaddock('canon1', 'p1');
    const other = makeOtherGenPaddock('other1', 'p1');
    const result = diffForagePaddocks([], [forage, canonical, other], 'p1', []);
    expect(result.deleteIds).toContain('forage-p1-z9');
    expect(result.deleteIds).not.toContain('canon1');
    expect(result.deleteIds).not.toContain('other1');
  });
});

// ---------------------------------------------------------------------------
// 7. Area-dropped-to-zero -> delete, not upsert
// ---------------------------------------------------------------------------

describe('diffForagePaddocks -- area dropped to zero', () => {
  it('deletes existing forage paddock when its zone now has areaHa "0"', () => {
    const zone = makeZone('z1', 'North flat', '0');
    const existing: Paddock[] = [makeForagePaddock('forage-p1-z1', 'p1')];
    const result = diffForagePaddocks([zone], existing, 'p1', []);
    expect(result.deleteIds).toContain('forage-p1-z1');
    expect(result.upserts).toHaveLength(0);
  });
});
