// spineGate.conformance.test.ts
//
// Resolver-level conformance for the seven-tier spine gate (STRATUM_PREREQS,
// auto-applied by `obj()` in catalogues/authoring.ts). Where
// `stratumObjectiveStatus.test.ts` exercises the pure engine on a synthetic
// two-objective chain, THIS suite resolves the REAL per-type catalogues for a
// spread of representative project-type combos and proves the gate:
//
//   1. has NO dangling prereq refs — every prerequisiteObjectiveId resolves to
//      an objective present in the set (the silent-permanent-lock invariant from
//      the STRATUM_PREREQS doc note; dropped-secondary combos are the risk).
//   2. BINDS at zero progress — S1 is reachable (s1-vision available) while every
//      downstream objective (S2..S7) is locked, so "can't design planting (S5)
//      before zones + terrain (S4<-S3<-S2)" physically holds.
//   3. RELEASES — completing the S1..S4 reads/decisions unlocks S5 (the gate is a
//      gate, not a wall).
//   4. rolls up to stratum states — S1 available; S5/S6/S7 locked at zero
//      progress.
//
// If a future catalogue edit points a prereq at a non-universal id, combo (a)
// that drops that secondary will fail assertion 1 here rather than silently
// freezing the objective in the running app.

import { describe, it, expect } from 'vitest';
import {
  resolveProjectObjectives,
  type ResolveProjectObjectivesInput,
} from '../resolveProjectObjectives.js';
import { computeAllObjectiveStatuses } from '../stratumObjectiveStatus.js';
import { computeAllStratumStates } from '../stratumState.js';
import type {
  PlanChecklistProgress,
  PlanStratumId,
  PlanStratumObjective,
} from '../../schemas/plan/planStratumObjective.schema.js';

const STRATA: readonly PlanStratumId[] = [
  's1-project-foundation',
  's2-land-reading',
  's3-systems-reading',
  's4-foundation-decisions',
  's5-system-design',
  's6-integration-design',
  's7-phasing-resourcing',
];

/** Representative combos. Each must resolve a valid, gate-binding set. */
const COMBOS: ReadonlyArray<{ label: string; input: ResolveProjectObjectivesInput }> = [
  {
    label: 'regenerative_farm (primary only)',
    input: { primaryTypeId: 'regenerative_farm' },
  },
  {
    // The MTC (Moontrance Creek) shape — the project the gate originally failed on.
    label: 'regenerative_farm + [silvopasture, orchard_food_forest] (MTC)',
    input: {
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['silvopasture', 'orchard_food_forest'],
    },
  },
  {
    label: 'regenerative_farm + [residential] (patch-bearing secondary)',
    input: { primaryTypeId: 'regenerative_farm', secondaryTypeIds: ['residential'] },
  },
  {
    label: 'silvopasture (primary only)',
    input: { primaryTypeId: 'silvopasture' },
  },
  {
    label: 'orchard_food_forest (primary only)',
    input: { primaryTypeId: 'orchard_food_forest' },
  },
  {
    // Unencoded-primary path → universal-only baseline (no per-type layer).
    label: 'nursery (universal-only baseline)',
    input: { primaryTypeId: 'nursery' },
  },
  {
    // The operator's own composition (2026-06-11): an ecovillage (intentional
    // community) with orchards/food-forest guilds, silvopasture, and a nursery.
    // All three secondaries sit on 'A' cells of the ecovillage matrix column.
    label: 'ecovillage + [orchard_food_forest, silvopasture, nursery] (operator composition)',
    input: {
      primaryTypeId: 'ecovillage',
      secondaryTypeIds: ['orchard_food_forest', 'silvopasture', 'nursery'],
    },
  },
];

/** Build a progress map that checks every REQUIRED item of every objective whose
 *  stratum is in `strataToComplete`. Used to drive the gate from locked→released
 *  without hard-coding item ids. */
function completeStrata(
  objectives: readonly PlanStratumObjective[],
  strataToComplete: ReadonlySet<PlanStratumId>,
): PlanChecklistProgress {
  const progress: Record<string, boolean> = {};
  for (const o of objectives) {
    if (!strataToComplete.has(o.stratumId)) continue;
    for (const item of o.checklist) {
      if (!item.optional) progress[item.id] = true;
    }
  }
  return progress;
}

describe.each(COMBOS)('spine gate — $label', ({ input }) => {
  const { objectives } = resolveProjectObjectives(input);
  const idSet = new Set(objectives.map((o) => o.id));

  it('resolves a non-empty set carrying every universal backbone id', () => {
    expect(objectives.length).toBeGreaterThan(0);
    // The backbone the gate references must always be present.
    for (const id of ['s1-vision', 's2-terrain', 's3-soil', 's4-zones']) {
      expect(idSet.has(id)).toBe(true);
    }
  });

  it('has no dangling prereq refs (every prereq id resolves in the set)', () => {
    const dangling: Array<{ objectiveId: string; missingPrereq: string }> = [];
    for (const o of objectives) {
      for (const prereqId of o.prerequisiteObjectiveIds) {
        if (!idSet.has(prereqId)) {
          dangling.push({ objectiveId: o.id, missingPrereq: prereqId });
        }
      }
    }
    expect(dangling).toEqual([]);
  });

  it('binds at zero progress — S1 reachable, everything downstream locked', () => {
    const statuses = computeAllObjectiveStatuses(objectives, {});
    // S1 entry objective is reachable.
    expect(statuses['s1-vision']).toBe('available');
    // Every non-S1 objective is locked (nothing upstream is complete yet).
    const leaked = objectives
      .filter((o) => o.stratumId !== 's1-project-foundation')
      .filter((o) => statuses[o.id] !== 'locked')
      .map((o) => ({ id: o.id, stratumId: o.stratumId, status: statuses[o.id] }));
    expect(leaked).toEqual([]);
  });

  it('releases — completing S1..S4 reads/decisions unlocks S5', () => {
    const progress = completeStrata(
      objectives,
      new Set<PlanStratumId>([
        's1-project-foundation',
        's2-land-reading',
        's3-systems-reading',
        's4-foundation-decisions',
      ]),
    );
    const statuses = computeAllObjectiveStatuses(objectives, progress);
    const s5 = objectives.filter((o) => o.stratumId === 's5-system-design');
    expect(s5.length).toBeGreaterThan(0);
    // Every S5 objective must now be reachable (available/active/complete) —
    // none may remain locked once its S4 prerequisites are complete.
    const stillLocked = s5
      .filter((o) => statuses[o.id] === 'locked')
      .map((o) => o.id);
    expect(stillLocked).toEqual([]);
  });

  it('rolls up to stratum states — S1 available; S5/S6/S7 locked at zero progress', () => {
    const statuses = computeAllObjectiveStatuses(objectives, {});
    const states = computeAllStratumStates(STRATA, objectives, statuses);
    expect(states['s1-project-foundation']).toBe('available');
    expect(states['s5-system-design']).toBe('locked');
    expect(states['s6-integration-design']).toBe('locked');
    expect(states['s7-phasing-resourcing']).toBe('locked');
  });
});
