import { describe, expect, it } from 'vitest';
import { PLANT_CATALOG, CATALOG_BY_ID, findEntry } from '../plantCatalog.js';
import { PLANT_ID_ALIASES, resolveSpeciesId } from '../plantCatalogAliases.js';

describe('plantCatalog', () => {
  it('has no duplicate canonical ids', () => {
    const ids = PLANT_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry id is snake_case (no pl-XXX)', () => {
    for (const e of PLANT_CATALOG) {
      expect(e.id).not.toMatch(/^pl-/);
      expect(e.id).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('CATALOG_BY_ID round-trips every entry', () => {
    for (const e of PLANT_CATALOG) {
      expect(CATALOG_BY_ID[e.id]).toBe(e);
    }
  });
});

describe('plantCatalogAliases', () => {
  it('every alias target exists in the canonical catalog', () => {
    for (const target of Object.values(PLANT_ID_ALIASES)) {
      expect(CATALOG_BY_ID[target]).toBeDefined();
    }
  });

  it('resolveSpeciesId is identity on snake_case ids', () => {
    expect(resolveSpeciesId('apple')).toBe('apple');
    expect(resolveSpeciesId('comfrey')).toBe('comfrey');
  });

  it('resolveSpeciesId is identity on unknown ids', () => {
    expect(resolveSpeciesId('not_a_plant')).toBe('not_a_plant');
    expect(resolveSpeciesId('pl-999')).toBe('pl-999');
  });

  it('resolveSpeciesId maps every known pl-XXX to a canonical entry', () => {
    for (const [legacy, canonical] of Object.entries(PLANT_ID_ALIASES)) {
      expect(resolveSpeciesId(legacy)).toBe(canonical);
      expect(CATALOG_BY_ID[canonical]).toBeDefined();
    }
  });
});

describe('findEntry', () => {
  it('resolves canonical ids', () => {
    expect(findEntry('apple')?.commonName).toBe('Apple');
  });

  it('resolves legacy pl-XXX ids via the alias map', () => {
    expect(findEntry('pl-101')?.id).toBe('apple');
    expect(findEntry('pl-001')?.id).toBe('black_walnut');
    expect(findEntry('pl-501')?.id).toBe('grape');
  });

  it('returns undefined on unknown ids', () => {
    expect(findEntry('not_a_plant')).toBeUndefined();
  });
});
