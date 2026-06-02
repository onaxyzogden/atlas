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
 * The override now spans more than one catalogue: the universal baseline plus
 * the silvopasture primary + secondary livestock objectives (added 2026-06-01
 * so paddock / pasture / fence tools surface on the livestock objectives rather
 * than the coarse stratum default). Both OBJECTIVE_ACT_TOOLS_OVERRIDE and the
 * objective catalogues live in @ogden/shared (catalogue-id strings only, no app
 * deps); ACT_TOOL_CATALOG lives in the app layer (lucide icons + MapToolId
 * union). Only the app layer can import both, so the cross-package check lives
 * here.
 */

import { describe, expect, it } from 'vitest';
import {
  OBJECTIVE_ACT_TOOLS_OVERRIDE,
  UNIVERSAL_PLAN_OBJECTIVES,
  SILVOPASTURE_PRIMARY_OBJECTIVES,
  SILVOPASTURE_SECONDARY_OBJECTIVES,
  allCatalogueObjectives,
  getObjectiveActTools,
} from '@ogden/shared';
import { ACT_TOOL_CATALOG, ACT_TOOL_CATEGORIES } from '../actToolCatalog.js';

describe('Act tier-shell objective->tool coverage', () => {
  const allObjectiveIds = new Set(allCatalogueObjectives().map((o) => o.id));
  const categoryIds = new Set(ACT_TOOL_CATEGORIES.map((c) => c.id));

  it('every override key is a real catalogue objective id', () => {
    // A key must be a real objective id in SOME encoded catalogue (universal or
    // a per-type layer); a typo or stale id resolves in none and trips here.
    const stale = Object.keys(OBJECTIVE_ACT_TOOLS_OVERRIDE).filter(
      (id) => !allObjectiveIds.has(id),
    );
    expect(stale).toEqual([]);
  });

  it('every universal objective has an explicit override entry', () => {
    const missing = UNIVERSAL_PLAN_OBJECTIVES.filter(
      (o) => !(o.id in OBJECTIVE_ACT_TOOLS_OVERRIDE),
    ).map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every silvopasture objective has an explicit override entry', () => {
    // Every silvopasture standalone objective (primary + secondary additive) is
    // explicitly wired so the rail shows livestock-relevant tools instead of
    // the coarse stratum default (which omits paddocks/pasture/fencing and
    // would surface crops/orchards/harvest on monitoring objectives).
    const silvObjectives = [
      ...SILVOPASTURE_PRIMARY_OBJECTIVES,
      ...SILVOPASTURE_SECONDARY_OBJECTIVES,
    ];
    const missing = silvObjectives
      .filter((o) => !(o.id in OBJECTIVE_ACT_TOOLS_OVERRIDE))
      .map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every catalogue id emitted for any objective resolves in ACT_TOOL_CATALOG', () => {
    // Sweep every encoded catalogue objective through the resolver (override or
    // stratum default) so a tool id that does not mount is caught regardless of
    // which catalogue surfaced it.
    const unresolved: string[] = [];
    for (const objective of allCatalogueObjectives()) {
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
