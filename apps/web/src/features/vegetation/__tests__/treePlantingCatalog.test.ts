/**
 * @vitest-environment happy-dom
 *
 * treePlantingCatalog — Slice 8-D invariants.
 *
 * Verifies the static shape contract every entry must hold:
 *   - 4 entries (oak-tree / pine-tree / apple-tree / shrub).
 *   - Each entry carries ≥1 NRCS 612 citation + ≥1 extension citation.
 *   - low ≤ mid ≤ high, all non-negative.
 *   - All entries declare point geometry.
 *   - `installLaborHrs` is flat per-element (not per-unit).
 *   - `scaledTreePlantingCostBand` passes a band through unchanged at
 *     scale=1.
 */

import { describe, it, expect } from 'vitest';
import {
  TREE_PLANTING_CATALOG,
  treePlantingCatalogEntryFor,
  treePlantingElementScale,
  scaledTreePlantingCostBand,
  scaledTreePlantingMaterials,
} from '../treePlantingCatalog.js';
import { TREE_PLANTING_KINDS } from '../treePlantingSpineSync.js';

describe('TREE_PLANTING_CATALOG (invariants)', () => {
  it('has one entry per TREE_PLANTING_KIND', () => {
    expect(TREE_PLANTING_CATALOG.length).toBe(TREE_PLANTING_KINDS.length);
    for (const kind of TREE_PLANTING_KINDS) {
      expect(treePlantingCatalogEntryFor(kind)).toBeDefined();
    }
  });

  it('every entry carries at least one NRCS 612 + one extension citation', () => {
    for (const entry of TREE_PLANTING_CATALOG) {
      expect(entry.sources.length).toBeGreaterThanOrEqual(2);
      const hasNrcs612 = entry.sources.some(
        (s) => s.kind === 'nrcs-practice' && s.code === '612',
      );
      const hasExtension = entry.sources.some((s) => s.kind === 'extension');
      expect(hasNrcs612).toBe(true);
      expect(hasExtension).toBe(true);
    }
  });

  it('low ≤ mid ≤ high, all non-negative', () => {
    for (const entry of TREE_PLANTING_CATALOG) {
      const { low, mid, high } = entry.costUSD;
      expect(low).toBeGreaterThanOrEqual(0);
      expect(mid).toBeGreaterThanOrEqual(low);
      expect(high).toBeGreaterThanOrEqual(mid);
    }
  });

  it('all entries declare point geometry', () => {
    for (const entry of TREE_PLANTING_CATALOG) {
      expect(entry.geometry).toBe('point');
    }
  });

  it('every entry has a flat per-element labor value (not per-unit)', () => {
    for (const entry of TREE_PLANTING_CATALOG) {
      expect(entry.installLaborHrs).toBeGreaterThan(0);
      // Reasonable upper bound for hand-planting a single tree.
      expect(entry.installLaborHrs).toBeLessThanOrEqual(4);
    }
  });

  it('materialsKit declares per-element basis (unit "each")', () => {
    for (const entry of TREE_PLANTING_CATALOG) {
      expect(entry.materialsKit.length).toBe(1);
      expect(entry.materialsKit[0]!.unit).toBe('each');
    }
  });
});

describe('scaled helpers (delegating to geometryHelpers)', () => {
  it('scaledTreePlantingCostBand passes a band through unchanged at scale=1', () => {
    const e = treePlantingCatalogEntryFor('oak-tree')!;
    const out = scaledTreePlantingCostBand(e, 1);
    expect(out.low).toBeCloseTo(e.costUSD.low);
    expect(out.mid).toBeCloseTo(e.costUSD.mid);
    expect(out.high).toBeCloseTo(e.costUSD.high);
  });

  it('scaledTreePlantingMaterials emits flat "1" note for point kinds', () => {
    const e = treePlantingCatalogEntryFor('apple-tree')!;
    const lines = scaledTreePlantingMaterials(e, 1);
    expect(lines.length).toBe(1);
    expect(lines[0]!.notes).toBe('1');
  });

  it('treePlantingElementScale returns 1 for Point geometry', () => {
    const scale = treePlantingElementScale(
      { geometry: { type: 'Point', coordinates: [0, 0] } },
      'point',
    );
    expect(scale).toBe(1);
  });
});
