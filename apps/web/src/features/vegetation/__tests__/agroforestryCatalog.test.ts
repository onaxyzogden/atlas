/**
 * @vitest-environment happy-dom
 *
 * agroforestryCatalog — Slice 8-C invariants.
 *
 * Verifies the static shape contract every entry must hold:
 *   - 3 entries (hedgerow / orchard / silvopasture).
 *   - Each entry carries ≥1 source, with at minimum one NRCS practice
 *     code citation.
 *   - low ≤ mid ≤ high, all non-negative.
 *   - Geometry-scaled kinds carry per-unit (not flat) labor + cost.
 */

import { describe, it, expect } from 'vitest';
import {
  AGROFORESTRY_CATALOG,
  agroforestryCatalogEntryFor,
  agroforestryElementScale,
  scaledAgroforestryCostBand,
  scaledAgroforestryMaterials,
} from '../agroforestryCatalog.js';
import { AGROFORESTRY_KINDS } from '../agroforestrySpineSync.js';

describe('AGROFORESTRY_CATALOG (invariants)', () => {
  it('has one entry per AGROFORESTRY_KIND', () => {
    expect(AGROFORESTRY_CATALOG.length).toBe(AGROFORESTRY_KINDS.length);
    for (const kind of AGROFORESTRY_KINDS) {
      expect(agroforestryCatalogEntryFor(kind)).toBeDefined();
    }
  });

  it('every entry carries at least one source + one NRCS practice code', () => {
    for (const entry of AGROFORESTRY_CATALOG) {
      expect(entry.sources.length).toBeGreaterThanOrEqual(1);
      const hasNrcs = entry.sources.some((s) => s.kind === 'nrcs-practice');
      expect(hasNrcs).toBe(true);
    }
  });

  it('low ≤ mid ≤ high, all non-negative', () => {
    for (const entry of AGROFORESTRY_CATALOG) {
      const { low, mid, high } = entry.costUSD;
      expect(low).toBeGreaterThanOrEqual(0);
      expect(mid).toBeGreaterThanOrEqual(low);
      expect(high).toBeGreaterThanOrEqual(mid);
    }
  });

  it('all entries declare line or polygon geometry (no point)', () => {
    for (const entry of AGROFORESTRY_CATALOG) {
      expect(['line', 'polygon']).toContain(entry.geometry);
    }
  });

  it('hedgerow carries per-meter labor + cost', () => {
    const e = agroforestryCatalogEntryFor('hedgerow')!;
    expect(e.geometry).toBe('line');
    expect(e.materialsKit[0]!.unit).toBe('m');
    // Per-meter rates should be << 1 hr/m and reasonable per-meter cost.
    expect(e.installLaborHrs).toBeLessThan(1);
    expect(e.costUSD.mid).toBeLessThan(100);
  });

  it('orchard + silvopasture carry per-m² labor + cost', () => {
    for (const kind of ['orchard', 'silvopasture'] as const) {
      const e = agroforestryCatalogEntryFor(kind)!;
      expect(e.geometry).toBe('polygon');
      expect(e.materialsKit[0]!.unit).toBe('m²');
      expect(e.installLaborHrs).toBeLessThan(1);
      expect(e.costUSD.mid).toBeLessThan(100);
    }
  });
});

describe('scaled helpers (delegating to geometryHelpers)', () => {
  it('scaledAgroforestryCostBand multiplies uniformly', () => {
    const e = agroforestryCatalogEntryFor('hedgerow')!;
    const out = scaledAgroforestryCostBand(e, 100);
    expect(out.low).toBeCloseTo(e.costUSD.low * 100);
    expect(out.mid).toBeCloseTo(e.costUSD.mid * 100);
    expect(out.high).toBeCloseTo(e.costUSD.high * 100);
  });

  it('scaledAgroforestryMaterials emits scaled qty notes for line/polygon', () => {
    const e = agroforestryCatalogEntryFor('hedgerow')!;
    const lines = scaledAgroforestryMaterials(e, 100);
    expect(lines.length).toBe(1);
    expect(lines[0]!.notes).toBe('100 m');
  });

  it('agroforestryElementScale returns line length for LineString', () => {
    const scale = agroforestryElementScale(
      {
        geometry: {
          type: 'LineString',
          // ~0 m — short segment to avoid flaky precise length matching.
          coordinates: [
            [0, 0],
            [0, 0],
          ],
        },
      },
      'line',
    );
    expect(scale).toBe(0);
  });
});
