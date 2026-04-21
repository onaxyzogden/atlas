/**
 * download-gaez.ts — unit tests for the pure helpers (no network, no FS).
 *
 * Covers:
 *   - parseArgs CLI flag parsing
 *   - buildQueryUrl / buildWhereClause construction
 *   - sqlQuote escaping
 *   - enumerateTargets produces the exact 96-combination list matching
 *     convert-gaez-to-cog.ts parseName()
 *   - mapToFilename honors water-supply priority order + input-level match
 *   - shouldInclude substring filter
 *   - resolveTargets: given a mocked ImageServer response, returns the
 *     expected Target[] + unresolved[] split
 */

import { describe, it, expect } from 'vitest';
import {
  buildQueryUrl,
  buildWhereClause,
  sqlQuote,
  enumerateTargets,
  mapToFilename,
  shouldInclude,
  resolveTargets,
  parseArgs,
  VALID_CROPS,
  VALID_WATER_SUPPLY,
  VALID_INPUT_LEVEL,
  VALID_VARIABLE,
} from '../../scripts/download-gaez.js';

describe('sqlQuote', () => {
  it('wraps plain values in single quotes', () => {
    expect(sqlQuote('Maize')).toBe("'Maize'");
  });

  it('escapes embedded single quotes by doubling', () => {
    expect(sqlQuote("O'Brien")).toBe("'O''Brien'");
  });
});

describe('buildQueryUrl', () => {
  it('returns a URL with the expected outFields and f=json', () => {
    const url = buildQueryUrl('crop=\'Maize\'');
    expect(url).toMatch(/^https:\/\/gaez-services\.fao\.org\/server\/rest\/services\/res05\/ImageServer\/query\?/);
    expect(url).toContain('f=json');
    expect(url).toContain('returnGeometry=false');
    expect(url).toContain('outFields=');
    expect(url).toContain('download_url');
    expect(url).toContain('sub_theme_name');
  });

  it('URL-encodes the where clause', () => {
    const url = buildQueryUrl("crop='Maize' AND year='1981-2010'");
    // URLSearchParams encodes space as +, single quote as %27
    expect(url).toContain('where=crop%3D%27Maize%27');
  });
});

describe('buildWhereClause', () => {
  it('includes baseline year, model, FAO crop name, sub_theme, and variable', () => {
    const w = buildWhereClause('maize', 'suitability');
    expect(w).toContain("year='1981-2010'");
    expect(w).toContain("model='CRUTS32'");
    expect(w).toContain("crop='Maize'");
    expect(w).toContain("sub_theme_name='Suitability Class'");
    expect(w).toContain("variable='Crop suitability index in classes; current cropland in grid cell'");
  });

  it('maps our crop slug to FAO-normalized crop name', () => {
    expect(buildWhereClause('rice', 'yield')).toContain("crop='Wetland rice'");
    expect(buildWhereClause('potato', 'yield')).toContain("crop='White potato'");
    expect(buildWhereClause('sweet_potato', 'yield')).toContain("crop='Sweet potato'");
    expect(buildWhereClause('millet', 'yield')).toContain("crop='Pearl millet'");
  });

  it('covers BOTH the trailing-space and no-space sub_theme variants for yield', () => {
    // FAO stores "Agro-ecological Attainable Yield " with a trailing space.
    // Our clause must match both to survive a schema cleanup.
    const w = buildWhereClause('maize', 'yield');
    expect(w).toContain("sub_theme_name='Agro-ecological Attainable Yield'");
    expect(w).toContain("sub_theme_name='Agro-ecological Attainable Yield '");
  });
});

describe('enumerateTargets', () => {
  it('produces exactly 96 combinations', () => {
    const targets = enumerateTargets();
    expect(targets.length).toBe(
      VALID_CROPS.length * VALID_WATER_SUPPLY.length * VALID_INPUT_LEVEL.length * VALID_VARIABLE.length,
    );
    expect(targets.length).toBe(96);
  });

  it('filenames match convert-gaez-to-cog.ts naming scheme exactly', () => {
    const targets = enumerateTargets();
    const pattern = /^(wheat|maize|rice|soybean|potato|cassava|sorghum|millet|barley|oat|rye|sweet_potato)_(rainfed|irrigated)_(low|high)_(suitability|yield)\.tif$/;
    for (const t of targets) {
      expect(t.filename).toMatch(pattern);
    }
  });

  it('every filename is unique', () => {
    const targets = enumerateTargets();
    const names = new Set(targets.map((t) => t.filename));
    expect(names.size).toBe(targets.length);
  });

  it('contains the smoke-test pair (maize_rainfed_high_suitability + _yield)', () => {
    const names = enumerateTargets().map((t) => t.filename);
    expect(names).toContain('maize_rainfed_high_suitability.tif');
    expect(names).toContain('maize_rainfed_high_yield.tif');
  });
});

describe('mapToFilename', () => {
  it('returns filename when water_supply + input_level match', () => {
    const name = mapToFilename(
      { water_supply: 'Rainfed', input_level: 'High' },
      'maize', 'rainfed', 'high', 'yield',
    );
    expect(name).toBe('maize_rainfed_high_yield.tif');
  });

  it('accepts "Gravity Irrigation" under the irrigated bucket', () => {
    const name = mapToFilename(
      { water_supply: 'Gravity Irrigation', input_level: 'Low' },
      'wheat', 'irrigated', 'low', 'suitability',
    );
    expect(name).toBe('wheat_irrigated_low_suitability.tif');
  });

  it('accepts "Irrigation" as fallback under the irrigated bucket (e.g. Cassava)', () => {
    const name = mapToFilename(
      { water_supply: 'Irrigation', input_level: 'High' },
      'cassava', 'irrigated', 'high', 'yield',
    );
    expect(name).toBe('cassava_irrigated_high_yield.tif');
  });

  it('rejects non-matching water_supply (e.g. Rainfed when seeking irrigated)', () => {
    expect(mapToFilename(
      { water_supply: 'Rainfed', input_level: 'High' },
      'maize', 'irrigated', 'high', 'yield',
    )).toBeNull();
  });

  it('rejects non-matching input_level', () => {
    expect(mapToFilename(
      { water_supply: 'Rainfed', input_level: 'Low' },
      'maize', 'rainfed', 'high', 'yield',
    )).toBeNull();
  });

  it('rejects the "Rainfed All Phases" pseudo-category', () => {
    // FAO has "Rainfed All Phases " (trailing space) which is a
    // different assessment than "Rainfed" — we ignore it.
    expect(mapToFilename(
      { water_supply: 'Rainfed All Phases ', input_level: 'High' },
      'maize', 'rainfed', 'high', 'yield',
    )).toBeNull();
  });

  it('returns null on missing attributes', () => {
    expect(mapToFilename({}, 'maize', 'rainfed', 'high', 'yield')).toBeNull();
    expect(mapToFilename({ water_supply: 'Rainfed' }, 'maize', 'rainfed', 'high', 'yield')).toBeNull();
  });
});

describe('shouldInclude', () => {
  it('returns true when no filter is given', () => {
    expect(shouldInclude('maize_rainfed_high_yield.tif')).toBe(true);
    expect(shouldInclude('anything.tif')).toBe(true);
  });

  it('matches substrings case-insensitively', () => {
    expect(shouldInclude('maize_rainfed_high_yield.tif', 'maize')).toBe(true);
    expect(shouldInclude('maize_rainfed_high_yield.tif', 'MAIZE')).toBe(true);
    expect(shouldInclude('maize_rainfed_high_yield.tif', 'rainfed_high')).toBe(true);
  });

  it('returns false when substring not present', () => {
    expect(shouldInclude('maize_rainfed_high_yield.tif', 'wheat')).toBe(false);
    expect(shouldInclude('maize_rainfed_high_yield.tif', 'irrigated')).toBe(false);
  });

  it('smoke-test filter "maize_rainfed_high" matches exactly the 2 expected files', () => {
    const targets = enumerateTargets();
    const matches = targets.filter((t) => shouldInclude(t.filename, 'maize_rainfed_high'));
    expect(matches.map((t) => t.filename).sort()).toEqual([
      'maize_rainfed_high_suitability.tif',
      'maize_rainfed_high_yield.tif',
    ]);
  });
});

describe('parseArgs', () => {
  it('defaults: dryRun=false, concurrency=4, no filter', () => {
    const o = parseArgs([]);
    expect(o.dryRun).toBe(false);
    expect(o.concurrency).toBe(4);
    expect(o.filter).toBeUndefined();
  });

  it('parses --filter, --dry-run, --concurrency together', () => {
    const o = parseArgs(['--filter', 'maize', '--dry-run', '--concurrency', '8']);
    expect(o.filter).toBe('maize');
    expect(o.dryRun).toBe(true);
    expect(o.concurrency).toBe(8);
  });
});

describe('resolveTargets', () => {
  /** Build a synthetic ImageServer row matching one bucket. */
  const row = (
    crop: string,
    water_supply: string,
    input_level: string,
    urlName: string,
  ) => ({
    attributes: {
      crop,
      water_supply,
      input_level,
      download_url: `https://s3.eu-west-1.amazonaws.com/data.gaezdev.aws.fao.org/res05/CRUTS32/Hist/8110H/${urlName}.tif`,
    },
  });

  it('resolves a single smoke-test pair from a mocked fetcher', async () => {
    const want = enumerateTargets().filter((t) => shouldInclude(t.filename, 'maize_rainfed_high'));
    expect(want).toHaveLength(2);

    const fetcher = async (url: string) => {
      // Router: URLSearchParams encodes spaces as '+'. Look for unique tokens
      // in each variable's `where` clause to route the mocked response.
      const decoded = decodeURIComponent(url.replace(/\+/g, ' '));
      if (decoded.includes('Crop suitability index in classes')) {
        return { features: [row('Maize', 'Rainfed', 'High', 'scHr_mze')] };
      }
      if (decoded.includes('Average attainable yield of current cropland')) {
        return { features: [row('Maize', 'Rainfed', 'High', 'ayHr_mze')] };
      }
      return { features: [] };
    };

    const { resolved, unresolved } = await resolveTargets(want, fetcher);
    expect(unresolved).toHaveLength(0);
    expect(resolved).toHaveLength(2);
    const names = resolved.map((t) => t.filename).sort();
    expect(names).toEqual([
      'maize_rainfed_high_suitability.tif',
      'maize_rainfed_high_yield.tif',
    ]);
    for (const t of resolved) {
      expect(t.url).toMatch(/^https:\/\/s3\.eu-west-1\.amazonaws\.com\/data\.gaezdev\.aws\.fao\.org\/.*\.tif$/);
    }
  });

  it('reports unresolved when the ImageServer returns no matching row', async () => {
    const want = enumerateTargets().filter((t) => shouldInclude(t.filename, 'cassava_irrigated_low'));
    // Cassava has NO Irrigation Low row on FAO (only High). Mock empty features.
    const fetcher = async (_url: string) => ({ features: [] });
    const { resolved, unresolved } = await resolveTargets(want, fetcher);
    expect(resolved).toHaveLength(0);
    expect(unresolved).toHaveLength(2); // suitability + yield for the missing bucket
  });

  it('prefers "Gravity Irrigation" over "Irrigation" when both rows exist', async () => {
    const want = enumerateTargets().filter((t) => t.filename === 'wheat_irrigated_high_yield.tif');
    const fetcher = async (_url: string) => ({
      features: [
        row('Wheat', 'Irrigation', 'High', 'ayHi_whe'),            // fallback
        row('Wheat', 'Gravity Irrigation', 'High', 'ayHg_whe'),    // preferred
      ],
    });
    const { resolved } = await resolveTargets(want, fetcher);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.url).toContain('ayHg_whe'); // the Gravity variant
  });

  it('falls back to "Irrigation" when "Gravity Irrigation" is absent', async () => {
    const want = enumerateTargets().filter((t) => t.filename === 'cassava_irrigated_high_suitability.tif');
    const fetcher = async (_url: string) => ({
      features: [row('Cassava', 'Irrigation', 'High', 'scHi_csv')],
    });
    const { resolved, unresolved } = await resolveTargets(want, fetcher);
    expect(unresolved).toHaveLength(0);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.url).toContain('scHi_csv');
  });

  it('surfaces ImageServer error responses', async () => {
    const want = enumerateTargets().filter((t) => shouldInclude(t.filename, 'maize_rainfed_high_yield'));
    const fetcher = async (_url: string) => ({ error: { code: 400, message: 'bad where clause' } });
    await expect(resolveTargets(want, fetcher)).rejects.toThrow(/bad where clause/);
  });

  it('makes one query per (crop, variable) pair — not per bucket', async () => {
    const want = enumerateTargets().filter((t) => t.crop === 'maize'); // 8 buckets
    let calls = 0;
    const fetcher = async (_url: string) => { calls++; return { features: [] }; };
    await resolveTargets(want, fetcher);
    // 1 crop (maize) x 2 variables (suitability, yield) = 2 queries.
    expect(calls).toBe(2);
  });
});
