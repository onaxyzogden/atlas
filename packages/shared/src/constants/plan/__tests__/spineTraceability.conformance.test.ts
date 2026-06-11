// spineTraceability.conformance.test.ts
//
// Global static conformance for the seven-tier spine gate, filed as deferred
// remediation #2 of the 2026-06-11 stratum traceability audit
// (STRATUM_TRACEABILITY_AUDIT_2026-06-11.md §9). Where
// `spineGate.conformance.test.ts` resolves REPRESENTATIVE project-type combos
// through the resolver, THIS suite sweeps EVERY authored objective in EVERY
// encoded catalogue statically (via `allCatalogueObjectives()`), so a future
// catalogue edit cannot introduce a violation on a combo the resolver suite
// does not exercise. It proves:
//
//   1. STRATUM_PREREQS itself is well-formed — every gate id is a universal
//      objective in the immediately prior stratum (the linear spine).
//   2. Universal-ids-only — every prerequisiteObjectiveId on every authored
//      objective references a universal objective. This is the documented
//      CRITICAL INVARIANT from authoring.ts: a prereq pointing at a
//      non-universal id silently locks the objective FOREVER for any
//      primary+secondary combo that drops the referenced objective
//      (`computeObjectiveStatus` treats an absent prereq as not-complete,
//      with no diagnostic).
//   3. Strictly-earlier-stratum — every prereq lives in a lower stratum than
//      the objective it gates, so the prereq graph is acyclic by construction
//      and the gate can never deadlock.
//   4. Transitive S1–S3 traceability — every S4+ objective reaches Stratum 1,
//      2, AND 3 through the prereq chain, and every non-S1 objective reaches
//      S1. This codifies the audit's structural-PASS verdict: no design or
//      phasing decision (S4–S7) is reachable without the foundation (S1),
//      land reading (S2), and systems reading (S3) completing first.
//   5. The legacy fallback skeleton (PLAN_STRATUM_OBJECTIVES, live as the
//      level-3 resolution for null-type projects) satisfies the same
//      invariants within its own self-contained id space.
//
// If a deliberately ungated objective (explicit `[]` opt-out outside S1) is
// ever authored, assertion 4 will fail HERE first — relaxing it must be a
// conscious edit with the silent-lock invariant in view, not an accident.

import { describe, it, expect } from 'vitest';
import type {
  PlanStratumId,
  PlanStratumObjective,
} from '../../../schemas/plan/planStratumObjective.schema.js';
import { STRATUM_PREREQS } from '../catalogues/authoring.js';
import {
  UNIVERSAL_PLAN_OBJECTIVES,
  allCatalogueObjectives,
} from '../catalogues/index.js';
import { PLAN_STRATUM_OBJECTIVES } from '../stratumObjectives.js';

const STRATUM_ORDER: Record<PlanStratumId, number> = {
  's1-project-foundation': 1,
  's2-land-reading': 2,
  's3-systems-reading': 3,
  's4-foundation-decisions': 4,
  's5-system-design': 5,
  's6-integration-design': 6,
  's7-phasing-resourcing': 7,
};

const ALL_STRATA = Object.keys(STRATUM_ORDER) as PlanStratumId[];

const UNIVERSAL_BY_ID: ReadonlyMap<string, PlanStratumObjective> = new Map(
  UNIVERSAL_PLAN_OBJECTIVES.map((o) => [o.id, o]),
);

const SKELETON_BY_ID: ReadonlyMap<string, PlanStratumObjective> = new Map(
  PLAN_STRATUM_OBJECTIVES.map((o) => [o.id, o]),
);

const ALL_AUTHORED = allCatalogueObjectives();

/**
 * Walk the prereq graph from `start` (resolving ids in `byId`) and collect the
 * strata of every objective reachable through prerequisite chains. A visited
 * set guards against cycles (assertion 3 proves there are none, but the walk
 * must terminate either way so the failure surfaces as a missing stratum, not
 * a hang). Unresolvable ids are skipped here — they fail their own dedicated
 * assertion with a precise message.
 */
function reachableStrata(
  start: PlanStratumObjective,
  byId: ReadonlyMap<string, PlanStratumObjective>,
): Set<PlanStratumId> {
  const visited = new Set<string>();
  const strata = new Set<PlanStratumId>();
  const queue = [...start.prerequisiteObjectiveIds];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const o = byId.get(id);
    if (!o) continue;
    strata.add(o.stratumId);
    queue.push(...o.prerequisiteObjectiveIds);
  }
  return strata;
}

describe('spine traceability — STRATUM_PREREQS well-formedness', () => {
  it('S1 is the ungated entry tier', () => {
    expect(STRATUM_PREREQS['s1-project-foundation']).toEqual([]);
  });

  it('every gate id is a universal objective in the immediately prior stratum', () => {
    for (const stratumId of ALL_STRATA) {
      for (const prereqId of STRATUM_PREREQS[stratumId]) {
        const prereq = UNIVERSAL_BY_ID.get(prereqId);
        expect(prereq, `${stratumId} gate -> ${prereqId} not universal`).toBeDefined();
        expect(
          STRATUM_ORDER[prereq!.stratumId],
          `${stratumId} gate -> ${prereqId} not in the prior stratum`,
        ).toBe(STRATUM_ORDER[stratumId] - 1);
      }
    }
  });

  it('every stratum after S1 carries a non-empty gate', () => {
    for (const stratumId of ALL_STRATA) {
      if (stratumId === 's1-project-foundation') continue;
      expect(
        STRATUM_PREREQS[stratumId].length,
        `${stratumId} gate is empty`,
      ).toBeGreaterThan(0);
    }
  });
});

describe('spine traceability — global catalogue sweep', () => {
  it('sweeps the full encoded surface (sanity floor, audit counted 222 standalone)', () => {
    // Floor, not exact count: catalogues only grow. If this ever trips, the
    // sweep below has gone vacuous (a catalogue dropped out of the registry).
    expect(ALL_AUTHORED.length).toBeGreaterThanOrEqual(222);
  });

  it('universal-ids-only: every prereq on every authored objective is universal', () => {
    const violations: Array<{ objectiveId: string; prereqId: string }> = [];
    for (const o of ALL_AUTHORED) {
      for (const prereqId of o.prerequisiteObjectiveIds) {
        if (!UNIVERSAL_BY_ID.has(prereqId)) {
          violations.push({ objectiveId: o.id, prereqId });
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('strictly-earlier-stratum: every prereq gates from a lower stratum (acyclic)', () => {
    const violations: Array<{
      objectiveId: string;
      prereqId: string;
      objectiveStratum: PlanStratumId;
      prereqStratum: PlanStratumId;
    }> = [];
    for (const o of ALL_AUTHORED) {
      for (const prereqId of o.prerequisiteObjectiveIds) {
        const prereq = UNIVERSAL_BY_ID.get(prereqId);
        if (!prereq) continue; // reported by the universal-ids-only assertion
        if (STRATUM_ORDER[prereq.stratumId] >= STRATUM_ORDER[o.stratumId]) {
          violations.push({
            objectiveId: o.id,
            prereqId,
            objectiveStratum: o.stratumId,
            prereqStratum: prereq.stratumId,
          });
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('every non-S1 objective reaches Stratum 1 transitively', () => {
    const unreachable: string[] = [];
    for (const o of ALL_AUTHORED) {
      if (o.stratumId === 's1-project-foundation') continue;
      const strata = reachableStrata(o, UNIVERSAL_BY_ID);
      if (!strata.has('s1-project-foundation')) unreachable.push(o.id);
    }
    expect(unreachable).toEqual([]);
  });

  it('every S4+ objective reaches Stratum 1, 2, AND 3 transitively (the audit verdict)', () => {
    const s4plus = ALL_AUTHORED.filter(
      (o) => STRATUM_ORDER[o.stratumId] >= 4,
    );
    // The audit counted 222 standalone S4-S7 + S1-S3 objectives overall, of
    // which the S4+ population is the majority of the design surface; the
    // floor proves this loop is not running over an empty set.
    expect(s4plus.length).toBeGreaterThanOrEqual(200);

    const gaps: Array<{ objectiveId: string; missing: PlanStratumId[] }> = [];
    for (const o of s4plus) {
      const strata = reachableStrata(o, UNIVERSAL_BY_ID);
      const missing = (
        [
          's1-project-foundation',
          's2-land-reading',
          's3-systems-reading',
        ] as const
      ).filter((s) => !strata.has(s));
      if (missing.length > 0) gaps.push({ objectiveId: o.id, missing });
    }
    expect(gaps).toEqual([]);
  });
});

describe('spine traceability — feedsInto forward wiring (audit remediation #1)', () => {
  // The prereq graph proves the spine gate BLOCKS downstream until the
  // foundation completes (BACKWARD gating). feedsInto is the FORWARD signal:
  // it names which later-stratum design decision a given survey/decision item
  // is intended to inform, surfaced as "Feeds" chips. It is a display-only
  // annotation (not a gate), so a dangling target degrades to a raw-id label
  // rather than locking anything — but the audit asked for the wiring to be
  // real, so these assertions keep it referentially sound.
  const GLOBAL_BY_ID: ReadonlyMap<string, PlanStratumObjective> = new Map([
    ...UNIVERSAL_PLAN_OBJECTIVES.map(
      (o) => [o.id, o] as [string, PlanStratumObjective],
    ),
    ...ALL_AUTHORED.map((o) => [o.id, o] as [string, PlanStratumObjective]),
  ]);

  it('every feedsInto target resolves to a known objective', () => {
    const dangling: Array<{ objectiveId: string; itemId: string; target: string }> = [];
    for (const o of ALL_AUTHORED) {
      for (const item of o.checklist) {
        for (const target of item.feedsInto) {
          if (!GLOBAL_BY_ID.has(target)) {
            dangling.push({ objectiveId: o.id, itemId: item.id, target });
          }
        }
      }
    }
    expect(dangling).toEqual([]);
  });

  it('every feedsInto target sits in a strictly later stratum than its source item', () => {
    const violations: Array<{
      itemId: string;
      target: string;
      sourceStratum: PlanStratumId;
      targetStratum: PlanStratumId;
    }> = [];
    for (const o of ALL_AUTHORED) {
      for (const item of o.checklist) {
        for (const target of item.feedsInto) {
          const t = GLOBAL_BY_ID.get(target);
          if (!t) continue; // reported by the resolve assertion
          if (STRATUM_ORDER[t.stratumId] <= STRATUM_ORDER[o.stratumId]) {
            violations.push({
              itemId: item.id,
              target,
              sourceStratum: o.stratumId,
              targetStratum: t.stratumId,
            });
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('each S4/S5 universal consumer the audit named receives at least one feed', () => {
    // Floor pin for audit remediation #1: the five transitive-only S4/S5
    // consumers the audit flagged must each be the target of >=1 feedsInto so
    // the forward wiring never silently regresses to fully unwired.
    const fed = new Set<string>();
    for (const o of ALL_AUTHORED) {
      for (const item of o.checklist) {
        for (const target of item.feedsInto) fed.add(target);
      }
    }
    for (const consumer of [
      's4-water-strategy',
      's4-zones',
      's5-access',
      's5-water-infrastructure',
      's5-soil-improvement',
    ]) {
      expect(fed.has(consumer), `${consumer} receives no feed`).toBe(true);
    }
  });
});

describe('spine traceability — legacy fallback skeleton (level-3 resolution)', () => {
  it('every skeleton prereq resolves within the skeleton id space', () => {
    const dangling: Array<{ objectiveId: string; prereqId: string }> = [];
    for (const o of PLAN_STRATUM_OBJECTIVES) {
      for (const prereqId of o.prerequisiteObjectiveIds) {
        if (!SKELETON_BY_ID.has(prereqId)) {
          dangling.push({ objectiveId: o.id, prereqId });
        }
      }
    }
    expect(dangling).toEqual([]);
  });

  it('every skeleton prereq gates from a strictly lower stratum (acyclic)', () => {
    for (const o of PLAN_STRATUM_OBJECTIVES) {
      for (const prereqId of o.prerequisiteObjectiveIds) {
        const prereq = SKELETON_BY_ID.get(prereqId);
        if (!prereq) continue;
        expect(
          STRATUM_ORDER[prereq.stratumId],
          `${o.id} -> ${prereqId}`,
        ).toBeLessThan(STRATUM_ORDER[o.stratumId]);
      }
    }
  });

  it('every skeleton S4+ objective reaches Stratum 1, 2, AND 3 transitively', () => {
    const s4plus = PLAN_STRATUM_OBJECTIVES.filter(
      (o) => STRATUM_ORDER[o.stratumId] >= 4,
    );
    expect(s4plus.length).toBeGreaterThan(0);
    for (const o of s4plus) {
      const strata = reachableStrata(o, SKELETON_BY_ID);
      for (const required of [
        's1-project-foundation',
        's2-land-reading',
        's3-systems-reading',
      ] as const) {
        expect(strata.has(required), `${o.id} does not reach ${required}`).toBe(
          true,
        );
      }
    }
  });
});
