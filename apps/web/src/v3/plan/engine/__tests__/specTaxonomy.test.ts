// @vitest-environment happy-dom
/**
 * specTaxonomy — rich model → spec §3.2 six-category projection.
 *
 *  - Barren/Compacted has strict precedence over any zone category.
 *  - Explicit zone category maps before physical/temporal fallbacks.
 *  - Ground cover / succession resolve a category when none was tagged.
 *  - resolveZoneSpecCategory reads observed patches via vegetationResolver.
 */

import { describe, expect, it } from 'vitest';
import {
  resolveSpecCategory,
  resolveZoneSpecCategory,
  zoneRequiresRegeneration,
  isBarrenCompactedCover,
} from '../specTaxonomy.js';
import type { LandZone } from '../../../../store/zoneStore.js';
import type { VegetationPatch } from '../../../../store/vegetationStore.js';

function square(lng0: number, lat0: number, side: number): GeoJSON.Polygon {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lng0, lat0],
        [lng0 + side, lat0],
        [lng0 + side, lat0 + side],
        [lng0, lat0 + side],
        [lng0, lat0],
      ],
    ],
  };
}

function makeZone(over: Partial<LandZone> = {}): LandZone {
  return {
    id: 'z1',
    projectId: 'p1',
    name: 'Zone',
    category: 'food_production',
    color: '#000',
    primaryUse: '',
    secondaryUse: '',
    notes: '',
    geometry: square(0, 0, 0.01),
    areaM2: 1000,
    createdAt: '2026-05-15T00:00:00Z',
    updatedAt: '2026-05-15T00:00:00Z',
    ...over,
  };
}

function makePatch(over: Partial<VegetationPatch> = {}): VegetationPatch {
  return {
    id: 'vp1',
    projectId: 'p1',
    geometry: square(0, 0, 0.01),
    successionStage: 'pioneer',
    groundCover: 'sparse-grasses',
    createdAt: '2026-05-15T00:00:00Z',
    ...over,
  };
}

describe('resolveSpecCategory', () => {
  it('barren ground cover wins over any zone category (system obligation)', () => {
    expect(
      resolveSpecCategory({ category: 'food_production', groundCover: 'barren' }),
    ).toBe('barren_compacted');
    expect(
      resolveSpecCategory({ category: 'infrastructure', groundCover: 'barren' }),
    ).toBe('barren_compacted');
  });

  it('maps explicit categories to spec buckets', () => {
    expect(resolveSpecCategory({ category: 'food_production' })).toBe('active_growing');
    expect(resolveSpecCategory({ category: 'livestock' })).toBe('grazing_pasture');
    expect(resolveSpecCategory({ category: 'water_retention' })).toBe('water_features');
    expect(resolveSpecCategory({ category: 'infrastructure' })).toBe('infrastructure');
    expect(resolveSpecCategory({ category: 'conservation' })).toBe('woodland_shelter');
  });

  it('falls back to ground cover / succession when no category', () => {
    expect(resolveSpecCategory({ groundCover: 'wetland' })).toBe('water_features');
    expect(resolveSpecCategory({ groundCover: 'forest' })).toBe('woodland_shelter');
    expect(resolveSpecCategory({ successionStage: 'climax' })).toBe('woodland_shelter');
    expect(resolveSpecCategory({ groundCover: 'thriving-grasses' })).toBe('grazing_pasture');
    expect(resolveSpecCategory({})).toBe('active_growing');
  });

  it('treats only barren as degraded, not bare-soil/sand/rocky', () => {
    expect(isBarrenCompactedCover('barren')).toBe(true);
    expect(isBarrenCompactedCover('bare-soil')).toBe(false);
    expect(isBarrenCompactedCover('sand')).toBe(false);
    expect(isBarrenCompactedCover(null)).toBe(false);
  });
});

describe('resolveZoneSpecCategory', () => {
  it('uses zone override ground cover (barren) over food_production category', () => {
    const zone = makeZone({ category: 'food_production', groundCover: 'barren' });
    expect(resolveZoneSpecCategory(zone, [])).toBe('barren_compacted');
    expect(zoneRequiresRegeneration(zone, [])).toBe(true);
  });

  it('derives barren from overlapping observed patch when zone has no override', () => {
    const zone = makeZone({ category: 'food_production' });
    const patches = [makePatch({ groundCover: 'barren', successionStage: 'disturbed' })];
    expect(resolveZoneSpecCategory(zone, patches)).toBe('barren_compacted');
  });

  it('non-degraded food zone resolves to active_growing', () => {
    const zone = makeZone({ category: 'food_production', groundCover: 'bare-soil' });
    expect(zoneRequiresRegeneration(zone, [])).toBe(false);
    expect(resolveZoneSpecCategory(zone, [])).toBe('active_growing');
  });
});
