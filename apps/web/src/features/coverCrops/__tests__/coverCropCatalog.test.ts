/**
 * coverCropCatalog — integrity + helper-function tests (B5.1 Part 2).
 *
 * Asserts catalog citation coverage, PLANT_CATALOG resolution, year-wrap in
 * livingRootMonthsFor, and the covenant lock.
 */

import { describe, it, expect } from 'vitest';
import {
  COVER_CROP_CATALOG,
  coverCropEntryFor,
  livingRootMonthsFor,
} from '../coverCropCatalog.js';
import { CATALOG_BY_ID } from '../../../data/plantCatalog.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

describe('COVER_CROP_CATALOG — integrity', () => {
  it('is non-empty', () => {
    expect(COVER_CROP_CATALOG.length).toBeGreaterThan(0);
  });

  it('every speciesId resolves in PLANT_CATALOG', () => {
    for (const entry of COVER_CROP_CATALOG) {
      expect(CATALOG_BY_ID[entry.speciesId], `speciesId "${entry.speciesId}"`).toBeDefined();
    }
  });

  it('every entry has non-empty roles, livingRootSeasons, rationale, citation', () => {
    for (const entry of COVER_CROP_CATALOG) {
      expect(entry.roles.length, `${entry.speciesId}.roles`).toBeGreaterThan(0);
      expect(entry.livingRootSeasons.length, `${entry.speciesId}.livingRootSeasons`).toBeGreaterThan(0);
      expect(entry.rationale.trim().length, `${entry.speciesId}.rationale`).toBeGreaterThan(0);
      expect(entry.citation.trim().length, `${entry.speciesId}.citation`).toBeGreaterThan(0);
    }
  });

  it('has no duplicate speciesIds', () => {
    const ids = COVER_CROP_CATALOG.map((e) => e.speciesId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('plantingMonthWindow values are 1..12 inclusive', () => {
    for (const entry of COVER_CROP_CATALOG) {
      const [a, b] = entry.plantingMonthWindow;
      expect(a, `${entry.speciesId}.startMonth`).toBeGreaterThanOrEqual(1);
      expect(a).toBeLessThanOrEqual(12);
      expect(b, `${entry.speciesId}.endMonth`).toBeGreaterThanOrEqual(1);
      expect(b).toBeLessThanOrEqual(12);
    }
  });
});

describe('coverCropEntryFor', () => {
  it('returns the entry for a known speciesId', () => {
    const e = coverCropEntryFor('clover');
    expect(e?.speciesId).toBe('clover');
  });
  it('returns undefined for an unknown speciesId (no throw)', () => {
    expect(coverCropEntryFor('not_a_species')).toBeUndefined();
  });
});

describe('livingRootMonthsFor', () => {
  it('returns inclusive months for a simple within-year window', () => {
    expect(livingRootMonthsFor({ startMonth: 4, endMonth: 9 })).toEqual([4, 5, 6, 7, 8, 9]);
  });
  it('handles year-wrap (Oct→Mar)', () => {
    expect(livingRootMonthsFor({ startMonth: 10, endMonth: 3 })).toEqual([10, 11, 12, 1, 2, 3]);
  });
  it('returns a single month when start===end', () => {
    expect(livingRootMonthsFor({ startMonth: 7, endMonth: 7 })).toEqual([7]);
  });
  it('full year for Jan→Dec', () => {
    expect(livingRootMonthsFor({ startMonth: 1, endMonth: 12 })).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    );
  });
  it('returns [] for out-of-range months', () => {
    expect(livingRootMonthsFor({ startMonth: 0, endMonth: 5 })).toEqual([]);
    expect(livingRootMonthsFor({ startMonth: 1, endMonth: 13 })).toEqual([]);
  });
  it('returns [] for non-finite input', () => {
    expect(livingRootMonthsFor({ startMonth: Number.NaN, endMonth: 5 })).toEqual([]);
  });
});

describe('covenant lock', () => {
  it('coverCropCatalog.ts source contains no riba/gharar/CSRA/salam/investor/financing/cost-of-capital', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, '../coverCropCatalog.ts'), 'utf8');
    // strip doc-comments so the negative-declaration in the file docstring is allowed.
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '');
    const re = /\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i;
    expect(re.test(stripped)).toBe(false);
  });
});
