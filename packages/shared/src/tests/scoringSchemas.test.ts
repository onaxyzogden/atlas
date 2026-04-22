import { describe, it, expect } from 'vitest';
import { validateLayerSummary } from '../scoring/schemas.js';

describe('validateLayerSummary — wetlands_flood', () => {
  it('coerces sentinel strings in numeric slots to null and lists them as coercions', () => {
    const res = validateLayerSummary('wetlands_flood', {
      flood_zone: 'Zone X',
      wetland_pct: 'Unknown',
      riparian_buffer_m: 'N/A',
      wetland_types: ['Palustrine'],
      regulated_area_pct: 'Yes — SFHA restrictions apply',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.summary.wetland_pct).toBeNull();
    expect(res.summary.riparian_buffer_m).toBeNull();
    expect(res.summary.flood_zone).toBe('Zone X');
    expect(res.summary.regulated_area_pct).toBe('Yes — SFHA restrictions apply');
    expect(res.summary.wetland_types).toEqual(['Palustrine']);
    const keys = res.coercions.map((c) => c.path[0]);
    expect(keys).toContain('wetland_pct');
    expect(keys).toContain('riparian_buffer_m');
  });

  it('passes valid numeric values through with no coercions', () => {
    const res = validateLayerSummary('wetlands_flood', {
      flood_zone: 'Zone X',
      flood_risk: 'low',
      wetland_pct: 3.2,
      wetland_types: [],
      riparian_buffer_m: 30,
      regulated_area_pct: 'No',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.summary.wetland_pct).toBe(3.2);
    expect(res.coercions).toEqual([]);
  });
});

describe('validateLayerSummary — soils', () => {
  it('coerces non-numeric soil numeric fields to null', () => {
    const res = validateLayerSummary('soils', {
      drainage_class: 'well drained',
      organic_matter_pct: 'N/A',
      depth_to_bedrock_m: 'Unknown',
      hydrologic_group: 'B',
      ph_range: '6.0 - 7.0',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.summary.organic_matter_pct).toBeNull();
    expect(res.summary.depth_to_bedrock_m).toBeNull();
    expect(res.summary.ph_range).toBe('6.0 - 7.0');
  });
});

describe('validateLayerSummary — watershed', () => {
  it('coerces sentinel strings to null', () => {
    const res = validateLayerSummary('watershed', {
      huc_code: '041001020304',
      watershed_name: 'Upper Susquehanna',
      nearest_stream_m: 'Estimated',
      stream_order: 'N/A',
      catchment_area_ha: 'N/A',
      flow_direction: 'SE',
      nearest_stream_note: 'Estimated',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.summary.nearest_stream_m).toBeNull();
    expect(res.summary.stream_order).toBeNull();
    expect(res.summary.catchment_area_ha).toBeNull();
    expect(res.summary.huc_code).toBe('041001020304');
    expect(res.summary.nearest_stream_note).toBe('Estimated');
    const keys = res.coercions.map((c) => c.path[0]);
    expect(keys).toContain('nearest_stream_m');
    expect(keys).toContain('stream_order');
  });

  it('passes valid numeric values through with no coercions', () => {
    const res = validateLayerSummary('watershed', {
      huc_code: '041001020304',
      watershed_name: 'Upper Susquehanna',
      nearest_stream_m: 420,
      stream_order: 2,
      catchment_area_ha: 845,
      flow_direction: 'SE',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.summary.nearest_stream_m).toBe(420);
    expect(res.coercions).toEqual([]);
  });
});

describe('validateLayerSummary — land_cover', () => {
  it('coerces sentinel strings in numeric slots to null', () => {
    const res = validateLayerSummary('land_cover', {
      primary_class: 'Deciduous Forest',
      tree_canopy_pct: 'N/A',
      impervious_pct: 'Unknown',
      cropland_pct: 'N/A',
      classes: { Forest: 60, Cropland: 40 },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.summary.tree_canopy_pct).toBeNull();
    expect(res.summary.impervious_pct).toBeNull();
    expect(res.summary.cropland_pct).toBeNull();
    expect(res.summary.primary_class).toBe('Deciduous Forest');
    expect(res.summary.classes).toEqual({ Forest: 60, Cropland: 40 });
  });

  it('passes valid numeric values through with no coercions', () => {
    const res = validateLayerSummary('land_cover', {
      primary_class: 'Deciduous Forest',
      tree_canopy_pct: 35,
      impervious_pct: 5,
      classes: { Forest: 60, Cropland: 40 },
      worldcover_code: 10,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.summary.tree_canopy_pct).toBe(35);
    expect(res.coercions).toEqual([]);
  });
});

describe('validateLayerSummary — unmigrated layer types', () => {
  it('passes zoning through untouched (no schema yet)', () => {
    const res = validateLayerSummary('zoning', { min_lot_size_ac: 'Unknown', extra: 1 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.summary.min_lot_size_ac).toBe('Unknown');
    expect(res.summary.extra).toBe(1);
    expect(res.coercions).toEqual([]);
  });
});

describe('validateLayerSummary — passthrough of unknown keys', () => {
  it('keeps extra keys the schema does not know about', () => {
    const res = validateLayerSummary('climate', {
      annual_precip_mm: 900,
      annual_temp_mean_c: 9,
      growing_season_days: 180,
      hardiness_zone: '5a',
      prevailing_wind: 'W',
      annual_sunshine_hours: 2100,
      koppen_classification: 'Dfb',
      koppen_label: 'Warm-summer humid continental',
      freeze_thaw_cycles_per_year: 60,
      snow_months: 4,
      solar_radiation_kwh_m2_day: 4.2,
      solar_radiation_monthly: [1, 2, 3],
      _monthly_normals: { foo: 'bar' },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.summary._monthly_normals).toEqual({ foo: 'bar' });
  });
});
