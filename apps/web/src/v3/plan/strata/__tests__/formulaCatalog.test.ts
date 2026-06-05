// @vitest-environment happy-dom
/**
 * Cross-package guard for the Plan formula catalogue (mirrors
 * actToolCoverage.test.ts). `packages/shared` owns only the
 * `ObjectiveFormulaId` enum + per-item `formulaBinding`s; the app-layer
 * `FORMULA_CATALOG` joins each id to a widget + summarize. These invariants
 * fail the build the moment the enum and the catalogue drift, or a catalogue
 * binding points at an id the app cannot render.
 */

import { describe, expect, it } from 'vitest';
import {
  ObjectiveFormulaId,
  SILVOPASTURE_PRIMARY_OBJECTIVES,
  SILVOPASTURE_SECONDARY_OBJECTIVES,
} from '@ogden/shared';
import { FORMULA_CATALOG, resolveFormula } from '../formulaCatalog.js';

describe('Plan formula catalogue coverage', () => {
  it('every ObjectiveFormulaId enum value has a catalogue entry keyed and id-matched', () => {
    for (const id of ObjectiveFormulaId.options) {
      const spec = FORMULA_CATALOG[id];
      expect(spec, `missing FORMULA_CATALOG entry for ${id}`).toBeDefined();
      expect(spec.id).toBe(id);
    }
  });

  it('catalogue has no extra entries beyond the enum', () => {
    const enumIds = new Set<string>(ObjectiveFormulaId.options);
    const extra = Object.keys(FORMULA_CATALOG).filter((k) => !enumIds.has(k));
    expect(extra).toEqual([]);
  });

  it('resolveFormula returns the same spec as direct keying', () => {
    for (const id of ObjectiveFormulaId.options) {
      expect(resolveFormula(id)).toBe(FORMULA_CATALOG[id]);
    }
  });

  it('every formulaBinding across the silvopasture catalogue resolves in FORMULA_CATALOG', () => {
    const objectives = [
      ...SILVOPASTURE_PRIMARY_OBJECTIVES,
      ...SILVOPASTURE_SECONDARY_OBJECTIVES,
    ];
    const bindings = objectives
      .flatMap((o) => o.checklist)
      .filter((item) => item.formulaBinding != null)
      .map((item) => item.formulaBinding!.formulaId);

    // The silvopasture catalogue is where the bindings were authored, so this
    // must be non-empty (a guard against the catalogue silently losing them).
    expect(bindings.length).toBeGreaterThan(0);

    const unresolved = bindings.filter((id) => !(id in FORMULA_CATALOG));
    expect(unresolved).toEqual([]);
  });

  it('the deferred break-even formula never auto-satisfies', () => {
    const summary = FORMULA_CATALOG['enterprise-break-even'].summarize('any');
    expect(summary.hasResult).toBe(false);
  });
});
