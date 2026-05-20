/**
 * beneficialFunctionCatalog.test — verifies the cited B5 catalog and the
 * tag/kind → BeneficialCategory mappers.
 *
 *   - every plant entry's `tag` is in the PLANT_CATALOG ecologicalFunction union
 *   - every structure entry's `kind` is a real elementCatalog DesignKind
 *   - every entry carries a non-empty `categories`, `rationale`, `citation`
 *   - beneficialCategoriesForPlant aggregates from a plant's ecologicalFunction tags
 *   - beneficialCategoriesForStructure returns the kind's categories
 *   - unknown species / unknown kind → empty array (no throw)
 *   - covenant lock: no riba/gharar/csra/salam/investor/financing/cost-of-capital
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  BENEFICIAL_PLANT_FUNCTIONS,
  BENEFICIAL_STRUCTURE_FUNCTIONS,
  beneficialCategoriesForPlant,
  beneficialCategoriesForStructure,
} from '../beneficialFunctionCatalog.js';
import { PLANT_CATALOG } from '../../../data/plantCatalog.js';
import { findElementSpec } from '../../../v3/plan/canvas/elementCatalog.js';

const ECOLOGICAL_FUNCTION_VALUES = new Set<string>([
  'n_fixer',
  'dynamic_accumulator',
  'insectary',
  'pollinator',
  'wildlife_food',
  'edible_yield',
  'timber',
  'fodder',
  'medicinal',
]);


describe('BENEFICIAL_PLANT_FUNCTIONS catalog', () => {
  it('is non-empty', () => {
    expect(BENEFICIAL_PLANT_FUNCTIONS.length).toBeGreaterThan(0);
  });

  it('every tag is in the EcologicalFunction union', () => {
    for (const entry of BENEFICIAL_PLANT_FUNCTIONS) {
      expect(ECOLOGICAL_FUNCTION_VALUES.has(entry.tag)).toBe(true);
    }
  });

  it('every entry has non-empty categories + rationale + citation', () => {
    for (const entry of BENEFICIAL_PLANT_FUNCTIONS) {
      expect(entry.categories.length).toBeGreaterThan(0);
      expect(entry.rationale.trim().length).toBeGreaterThan(0);
      expect(entry.citation.trim().length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate tags', () => {
    const tags = BENEFICIAL_PLANT_FUNCTIONS.map((e) => e.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe('BENEFICIAL_STRUCTURE_FUNCTIONS catalog', () => {
  it('is non-empty', () => {
    expect(BENEFICIAL_STRUCTURE_FUNCTIONS.length).toBeGreaterThan(0);
  });

  it('every kind resolves in the design-element catalog', () => {
    for (const entry of BENEFICIAL_STRUCTURE_FUNCTIONS) {
      expect(findElementSpec(entry.kind)).not.toBeNull();
    }
  });

  it('every entry has non-empty categories + rationale + citation', () => {
    for (const entry of BENEFICIAL_STRUCTURE_FUNCTIONS) {
      expect(entry.categories.length).toBeGreaterThan(0);
      expect(entry.rationale.trim().length).toBeGreaterThan(0);
      expect(entry.citation.trim().length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate kinds', () => {
    const kinds = BENEFICIAL_STRUCTURE_FUNCTIONS.map((e) => e.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });
});

describe('beneficialCategoriesForPlant', () => {
  it('returns empty array for an unknown species id', () => {
    expect(beneficialCategoriesForPlant('not-a-real-species')).toEqual([]);
  });

  it('aggregates categories from a plant with a single beneficial tag', () => {
    // yarrow carries insectary + pollinator tags in PLANT_CATALOG
    const yarrow = PLANT_CATALOG.find((p) => p.id === 'yarrow');
    if (yarrow) {
      const cats = beneficialCategoriesForPlant('yarrow');
      // insectary contributes 'predatory_insectary' + 'pollinator';
      // pollinator contributes 'pollinator' (deduped). Expect both insectary cats.
      expect(cats).toContain('predatory_insectary');
      expect(cats).toContain('pollinator');
    }
  });

  it('dedupes overlapping categories', () => {
    const cats = beneficialCategoriesForPlant('yarrow');
    expect(new Set(cats).size).toBe(cats.length);
  });

  it('returns empty array for a species with no beneficial tags', () => {
    // Pick any plant whose ecologicalFunction omits all four beneficial tags.
    const nonBeneficial = PLANT_CATALOG.find(
      (p) =>
        !(p.ecologicalFunction ?? []).some((t) =>
          ['pollinator', 'insectary', 'wildlife_food', 'n_fixer'].includes(t),
        ),
    );
    if (nonBeneficial) {
      expect(beneficialCategoriesForPlant(nonBeneficial.id)).toEqual([]);
    }
  });
});

describe('beneficialCategoriesForStructure', () => {
  it('returns categories for a known kind', () => {
    expect(beneficialCategoriesForStructure('hedgerow')).toContain(
      'avian_shelter',
    );
    expect(beneficialCategoriesForStructure('pond')).toContain(
      'amphibian_predator',
    );
    expect(beneficialCategoriesForStructure('shrub')).toContain(
      'small_bird_nesting',
    );
  });

  it('returns empty array for an unknown / non-habitat kind', () => {
    expect(beneficialCategoriesForStructure('road')).toEqual([]);
    expect(beneficialCategoriesForStructure('not-a-kind')).toEqual([]);
  });
});

describe('beneficialFunctionCatalog covenant lock', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const moduleText = readFileSync(
    resolve(__dirname, '../beneficialFunctionCatalog.ts'),
    'utf-8',
  );

  it('contains no riba/gharar/csra/salam/investor/financing/cost-of-capital framing', () => {
    // Strip the doc-comment negative declaration before scanning.
    const stripped = moduleText.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripped).not.toMatch(
      /\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i,
    );
  });
});
