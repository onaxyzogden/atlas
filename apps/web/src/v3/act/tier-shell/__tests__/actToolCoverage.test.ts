/**
 * Conformance guard for the Act tier-shell objective->tool wiring.
 *
 * This is the check whose ABSENCE let the override map silently rot: its keys
 * had been authored against an older objective-id vocabulary, so 18 of 19
 * universal objectives quietly fell through to the coarse stratum default and
 * showed tools their checklist never called for (terrain showing soil +
 * vegetation, etc.). These invariants fail the build the moment that drift
 * recurs.
 *
 * Two packages meet here: OBJECTIVE_ACT_TOOLS_OVERRIDE + UNIVERSAL_PLAN_OBJECTIVES
 * live in @ogden/shared (catalogue-id strings only, no app deps); ACT_TOOL_CATALOG
 * lives in the app layer (lucide icons + MapToolId union). Only the app layer can
 * import both, so the cross-package check lives here.
 */

import { describe, expect, it } from 'vitest';
import {
  OBJECTIVE_ACT_TOOLS_OVERRIDE,
  UNIVERSAL_PLAN_OBJECTIVES,
  getObjectiveActTools,
} from '@ogden/shared';
import {
  ACT_TOOL_CATALOG,
  ACT_TOOL_CATEGORIES,
} from '../actToolCatalog.js';

describe('Act tier-shell objective->tool coverage', () => {
  const objectiveIds = new Set(UNIVERSAL_PLAN_OBJECTIVES.map((o) => o.id));
  const categoryIds = new Set(ACT_TOOL_CATEGORIES.map((c) => c.id));

  it('every override key is a real universal objective id', () => {
    const stale = Object.keys(OBJECTIVE_ACT_TOOLS_OVERRIDE).filter(
      (id) => !objectiveIds.has(id),
    );
    expect(stale).toEqual([]);
  });

  it('every universal objective has an explicit override entry', () => {
    const missing = UNIVERSAL_PLAN_OBJECTIVES.filter(
      (o) => !(o.id in OBJECTIVE_ACT_TOOLS_OVERRIDE),
    ).map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every catalogue id emitted for any objective resolves in ACT_TOOL_CATALOG', () => {
    const unresolved: string[] = [];
    for (const objective of UNIVERSAL_PLAN_OBJECTIVES) {
      for (const id of getObjectiveActTools(objective)) {
        if (!(id in ACT_TOOL_CATALOG)) {
          unresolved.push(`${objective.id} -> ${id}`);
        }
      }
    }
    expect(unresolved).toEqual([]);
  });

  it('every catalogue tool declares a known category and matching id', () => {
    for (const [key, tool] of Object.entries(ACT_TOOL_CATALOG)) {
      expect(tool.id).toBe(key);
      expect(categoryIds.has(tool.category)).toBe(true);
    }
  });
});
