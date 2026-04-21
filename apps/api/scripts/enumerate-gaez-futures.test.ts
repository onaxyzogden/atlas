/**
 * enumerate-gaez-futures.ts — unit tests for the pure helpers (no network).
 *
 * Covers:
 *   - extractEmissions: parses FAO model strings (CRUTS32, ENSEMBLE_MEAN_RCP45, rcp2p6, etc.)
 *   - computeScenarioId: baseline / RCP pairs → `{bucket}_{yr}_{yr}` IDs
 *   - computeScenarioId: regex acceptance (^[a-z0-9_]{1,64}$)
 *   - computeCompleteness: all-96 rows → fully_covered, no gaps, 12 crops
 *   - computeCompleteness: partial rows → gaps populated when a cell is missing
 */

import { describe, it, expect } from 'vitest';
import {
  extractEmissions,
  computeScenarioId,
  computeCompleteness,
} from './enumerate-gaez-futures.js';

// ── Fixture builder ─────────────────────────────────────────────────────────

const CROPS_FAO = [
  'Wheat', 'Maize', 'Wetland rice', 'Soybean', 'White potato', 'Cassava',
  'Sorghum', 'Pearl millet', 'Barley', 'Oat', 'Rye', 'Sweet potato',
];

function buildFullFeatureSet(): Array<{
  crop: string;
  water_supply: string;
  input_level: string;
  variable: string;
  sub_theme_name: string;
}> {
  const rows: Array<{
    crop: string;
    water_supply: string;
    input_level: string;
    variable: string;
    sub_theme_name: string;
  }> = [];
  for (const crop of CROPS_FAO) {
    for (const ws of ['Rainfed', 'Gravity Irrigation']) {
      for (const il of ['Low', 'High']) {
        // Suitability row
        rows.push({
          crop,
          water_supply: ws,
          input_level: il,
          variable: 'Crop suitability index in classes; current cropland in grid cell',
          sub_theme_name: 'Suitability Class',
        });
        // Yield row
        rows.push({
          crop,
          water_supply: ws,
          input_level: il,
          variable: 'Average attainable yield of current cropland',
          sub_theme_name: 'Agro-ecological Attainable Yield',
        });
      }
    }
  }
  return rows;
}

// ── extractEmissions ────────────────────────────────────────────────────────

describe('extractEmissions', () => {
  it('maps CRUTS32 to baseline', () => {
    expect(extractEmissions('CRUTS32')).toBe('baseline');
  });

  it('maps common RCP encodings', () => {
    expect(extractEmissions('ENSEMBLE_MEAN_RCP45')).toBe('rcp45');
    expect(extractEmissions('ensemble_mean_rcp2p6')).toBe('rcp26');
    expect(extractEmissions('HadGEM2-ES_RCP8.5')).toBe('rcp85');
    expect(extractEmissions('GCM_RCP60')).toBe('rcp60');
  });

  it('returns unknown for unrecognized models', () => {
    expect(extractEmissions('SSP245')).toBe('unknown');
  });
});

// ── computeScenarioId ───────────────────────────────────────────────────────

describe('computeScenarioId', () => {
  it('builds the canonical RCP45 2041-2070 id', () => {
    expect(computeScenarioId('ENSEMBLE_MEAN_RCP45', '2041-2070')).toBe('rcp45_2041_2070');
  });

  it('builds the baseline id for CRUTS32 / 1981-2010', () => {
    expect(computeScenarioId('CRUTS32', '1981-2010')).toBe('baseline_1981_2010');
  });

  it('accepts all generated ids against the ^[a-z0-9_]{1,64}$ regex', () => {
    const pairs: Array<[string, string]> = [
      ['CRUTS32', '1981-2010'],
      ['ENSEMBLE_MEAN_RCP26', '2011-2040'],
      ['ENSEMBLE_MEAN_RCP45', '2041-2070'],
      ['ENSEMBLE_MEAN_RCP60', '2071-2100'],
      ['ENSEMBLE_MEAN_RCP85', '2071-2100'],
    ];
    const re = /^[a-z0-9_]{1,64}$/;
    for (const [m, y] of pairs) {
      expect(computeScenarioId(m, y)).toMatch(re);
    }
  });
});

// ── computeCompleteness ─────────────────────────────────────────────────────

describe('computeCompleteness', () => {
  it('reports fully_covered when all 96 cells are present', () => {
    const rows = buildFullFeatureSet();
    expect(rows).toHaveLength(96);
    const result = computeCompleteness(rows);
    expect(result.fully_covered).toBe(true);
    expect(result.crops_covered).toBe(12);
    expect(result.gaps).toEqual([]);
  });

  it('populates gaps when maize / irrigated / high / suitability row is absent', () => {
    const rows = buildFullFeatureSet().filter((r) => {
      // Remove the (maize, irrigated=Gravity Irrigation, high, suitability) cell.
      return !(
        r.crop === 'Maize' &&
        r.water_supply === 'Gravity Irrigation' &&
        r.input_level === 'High' &&
        r.sub_theme_name === 'Suitability Class'
      );
    });
    expect(rows).toHaveLength(95);
    const result = computeCompleteness(rows);
    expect(result.fully_covered).toBe(false);
    // Maize is still "covered" (it still has 7 cells present) — crops_covered
    // counts crops with >=1 cell, not fully-covered crops.
    expect(result.crops_covered).toBe(12);
    const maizeGap = result.gaps.find((g) => g.crop === 'maize');
    expect(maizeGap).toBeDefined();
    expect(maizeGap!.missing).toContain('irrigated_high_suitability');
  });
});
