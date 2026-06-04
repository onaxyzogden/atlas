// Tests for the design-tension → objective mapping (Plan Nav v1.1 §8). Each of
// the 13 DESIGN_TENSIONS carries an authored `relatedObjectiveIds` list; the
// helper `getTensionConcernObjectiveIds` resolves it against a project's actual
// resolved objective set (presence-filtered, with a resolution-stratum
// fallback). These tests pin both the authored content and the helper behaviour.

import { describe, it, expect } from 'vitest';
import {
  DESIGN_TENSIONS,
  getActiveTensions,
  getTensionConcernObjectiveIds,
  type DesignTension,
} from '../relationshipMatrix.js';
import { resolveProjectObjectives } from '../../../relationships/resolveProjectObjectives.js';
import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import type { ProjectTypeId } from '../../../schemas/plan/projectTypeTaxonomy.schema.js';

// residential is the only type that cannot stand alone as a primary; for every
// other type we can resolve it as primary with the partner layered secondary.
const NON_PRIMARY: ReadonlySet<ProjectTypeId> = new Set(['residential']);

/**
 * Resolve every objective set in which BOTH types of a pairing co-exist — i.e.
 * each valid (primary, secondary) arrangement. The union of these covers a
 * type's primary-role ids AND its `*-sec-*` secondary-role ids, which is what
 * the role-agnostic authored mapping lists.
 */
function resolveArrangements(
  typeA: ProjectTypeId,
  typeB: ProjectTypeId,
): PlanStratumObjective[][] {
  const sets: PlanStratumObjective[][] = [];
  if (!NON_PRIMARY.has(typeA)) {
    sets.push(
      resolveProjectObjectives({
        primaryTypeId: typeA,
        secondaryTypeIds: [typeB],
      }).objectives.slice(),
    );
  }
  if (!NON_PRIMARY.has(typeB)) {
    sets.push(
      resolveProjectObjectives({
        primaryTypeId: typeB,
        secondaryTypeIds: [typeA],
      }).objectives.slice(),
    );
  }
  return sets;
}

describe('DESIGN_TENSIONS — authored relatedObjectiveIds', () => {
  it('every tension carries a non-empty relatedObjectiveIds list', () => {
    for (const t of DESIGN_TENSIONS) {
      expect(t.relatedObjectiveIds, t.id).toBeDefined();
      expect(t.relatedObjectiveIds!.length, t.id).toBeGreaterThan(0);
    }
  });

  it('includes the universal anchor for its resolution stratum', () => {
    const ANCHOR: Record<string, string> = {
      's4-foundation-decisions': 's4-zones',
      's5-system-design': 's5-access',
    };
    for (const t of DESIGN_TENSIONS) {
      const anchor = ANCHOR[t.resolutionStratumId];
      if (!anchor) continue;
      expect(t.relatedObjectiveIds, t.id).toContain(anchor);
    }
  });

  it('every authored id resolves in at least one arrangement of its pairing', () => {
    for (const t of DESIGN_TENSIONS) {
      const sets = resolveArrangements(t.typeA, t.typeB);
      const present = new Set(sets.flat().map((o) => o.id));
      for (const id of t.relatedObjectiveIds ?? []) {
        expect(present.has(id), `${t.id} → ${id}`).toBe(true);
      }
    }
  });
});

describe('getTensionConcernObjectiveIds', () => {
  it('yields ≥1 present id for every tension against a project with both types', () => {
    for (const t of DESIGN_TENSIONS) {
      const primary = NON_PRIMARY.has(t.typeA) ? t.typeB : t.typeA;
      const secondary = primary === t.typeA ? t.typeB : t.typeA;
      const { objectives, activeTensions } = resolveProjectObjectives({
        primaryTypeId: primary,
        secondaryTypeIds: [secondary],
      });
      // sanity: the resolver agrees this tension is active for the pairing
      expect(activeTensions.map((x) => x.id), t.id).toContain(t.id);
      expect(getActiveTensions(primary, [secondary]).map((x) => x.id)).toContain(
        t.id,
      );

      const ids = getTensionConcernObjectiveIds(t, objectives);
      expect(ids.length, t.id).toBeGreaterThan(0);
      const presentIds = new Set(objectives.map((o) => o.id));
      for (const id of ids) {
        expect(presentIds.has(id), `${t.id} returned absent id ${id}`).toBe(true);
        expect(t.relatedObjectiveIds, `${t.id} returned unmapped id ${id}`).toContain(
          id,
        );
      }
    }
  });

  it('de-dupes and preserves first-seen order', () => {
    const objectives = [
      { id: 'a', stratumId: 's4-foundation-decisions' },
      { id: 'b', stratumId: 's4-foundation-decisions' },
      { id: 'c', stratumId: 's4-foundation-decisions' },
    ] as unknown as PlanStratumObjective[];
    const tension = {
      id: 'fake',
      typeA: 'wellness',
      typeB: 'agritourism',
      resolutionStratumId: 's4-foundation-decisions',
      resolutionStratumLabel: 'S4',
      description: 'x',
      relatedObjectiveIds: ['c', 'a', 'c', 'b', 'a'],
    } as DesignTension;
    expect(getTensionConcernObjectiveIds(tension, objectives)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('drops authored ids that are absent from the resolved set', () => {
    const objectives = [
      { id: 's4-zones', stratumId: 's4-foundation-decisions' },
    ] as unknown as PlanStratumObjective[];
    const tension = {
      id: 'fake',
      typeA: 'wellness',
      typeB: 'agritourism',
      resolutionStratumId: 's4-foundation-decisions',
      resolutionStratumLabel: 'S4',
      description: 'x',
      relatedObjectiveIds: ['s4-zones', 'not-present-id'],
    } as DesignTension;
    expect(getTensionConcernObjectiveIds(tension, objectives)).toEqual([
      's4-zones',
    ]);
  });

  it('falls back to all objectives at the resolution stratum when no mapping is present', () => {
    const objectives = [
      { id: 'x', stratumId: 's5-system-design' },
      { id: 'y', stratumId: 's5-system-design' },
      { id: 'z', stratumId: 's4-foundation-decisions' },
    ] as unknown as PlanStratumObjective[];
    const noMapping = {
      id: 'fake',
      typeA: 'wellness',
      typeB: 'agritourism',
      resolutionStratumId: 's5-system-design',
      resolutionStratumLabel: 'S5',
      description: 'x',
    } as DesignTension;
    expect(getTensionConcernObjectiveIds(noMapping, objectives)).toEqual([
      'x',
      'y',
    ]);

    const mappingAllAbsent = {
      ...noMapping,
      relatedObjectiveIds: ['totally-absent'],
    } as DesignTension;
    expect(getTensionConcernObjectiveIds(mappingAllAbsent, objectives)).toEqual([
      'x',
      'y',
    ]);
  });
});
