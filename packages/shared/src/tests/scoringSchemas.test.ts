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

describe('validateLayerSummary — unmigrated layer types', () => {
  it('passes land_cover through untouched (no schema yet)', () => {
    const res = validateLayerSummary('land_cover', { tree_canopy_pct: 'N/A', extra: 1 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.summary.tree_canopy_pct).toBe('N/A');
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
