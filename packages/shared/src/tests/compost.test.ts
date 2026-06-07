/**
 * Compost vertical tests — enum coverage and round-trip parsing of the
 * Site / Pile / Reading schemas. Mirrors the OLOS foundation tests.
 */

import { describe, it, expect } from 'vitest';

import {
  CompostSiteSchema,
} from '../schemas/compost/compostSite.schema.js';
import {
  CompostPileSchema,
  CompostPileStatus,
  CompostLayerType,
  CompostObjectiveStatus,
} from '../schemas/compost/compostPile.schema.js';
import {
  CompostReadingSchema,
  CompostReadingSource,
} from '../schemas/compost/compostReading.schema.js';

// ─── Enums ─────────────────────────────────────────────────────────────────────

describe('Compost enums', () => {
  it('pile status covers the lifecycle', () => {
    for (const s of ['planning', 'building', 'active', 'curing', 'complete']) {
      expect(CompostPileStatus.parse(s)).toBe(s);
    }
    expect(CompostPileStatus.safeParse('done').success).toBe(false);
  });
  it('layer type is brown | green', () => {
    expect(CompostLayerType.parse('brown')).toBe('brown');
    expect(CompostLayerType.parse('green')).toBe('green');
    expect(CompostLayerType.safeParse('blue').success).toBe(false);
  });
  it('reading source is manual | sensor', () => {
    expect(CompostReadingSource.parse('manual')).toBe('manual');
    expect(CompostReadingSource.parse('sensor')).toBe('sensor');
    expect(CompostReadingSource.safeParse('guess').success).toBe(false);
  });
  it('objective status is locked | available | complete', () => {
    expect(CompostObjectiveStatus.options).toEqual([
      'locked',
      'available',
      'complete',
    ]);
  });
});

// ─── Round-trip parsing ─────────────────────────────────────────────────────────

describe('CompostSite schema', () => {
  it('parses a pinned site and defaults optionals', () => {
    const site = CompostSiteSchema.parse({
      id: 'site-1',
      orgId: 'org-1',
      name: 'Millbrook Compost Yard',
      location: { latitude: 41.51, longitude: -73.98 },
    });
    expect(site.name).toBe('Millbrook Compost Yard');
    expect(site.location?.latitude).toBeCloseTo(41.51);
  });
  it('rejects out-of-range coordinates', () => {
    expect(
      CompostSiteSchema.safeParse({
        id: 's', orgId: 'o', name: 'x',
        location: { latitude: 200, longitude: 0 },
      }).success,
    ).toBe(false);
  });
});

describe('CompostPile schema', () => {
  it('parses a recipe pile and applies array defaults', () => {
    const pile = CompostPileSchema.parse({
      id: 'pile-1',
      siteId: 'site-1',
      orgId: 'org-1',
      name: 'Batch 1 — Spring Build',
      status: 'active',
      dimensions: { lengthFt: 4, widthFt: 4, heightFt: 3 },
      targetCnRatio: 30,
      targetTempMinC: 55,
      targetTempMaxC: 71,
      recipeLayers: [
        { id: 'l1', type: 'brown', name: 'Dry straw', depth: '4 in', cnApprox: 80, status: 'complete' },
      ],
    });
    expect(pile.recipeLayers).toHaveLength(1);
    expect(pile.buildChecklist).toEqual([]);
    expect(pile.objectives).toEqual([]);
    expect(pile.status).toBe('active');
  });
});

describe('CompostReading schema', () => {
  it('parses a manual reading and defaults source + turned', () => {
    const r = CompostReadingSchema.parse({
      id: 'r-1',
      pileId: 'pile-1',
      tempC: 68.5,
      capturedAt: '2026-03-09T08:00:00.000Z',
    });
    expect(r.source).toBe('manual');
    expect(r.turned).toBe(false);
  });
  it('accepts a sensor reading with a device id', () => {
    const r = CompostReadingSchema.parse({
      id: 'r-2',
      pileId: 'pile-1',
      tempC: 70.2,
      source: 'sensor',
      deviceId: 'dev-abc',
      capturedAt: '2026-03-09T08:00:00.000Z',
    });
    expect(r.source).toBe('sensor');
    expect(r.deviceId).toBe('dev-abc');
  });
  it('rejects an implausible temperature', () => {
    expect(
      CompostReadingSchema.safeParse({
        id: 'r', pileId: 'p', tempC: 500, capturedAt: '2026-03-09T08:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});
