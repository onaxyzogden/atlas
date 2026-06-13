// reviewFlagResolver.ts
//
// The reverse, data-derived consumer of `feedsInto` — the second half of
// the feeds-into data model (ADR 2026-05-29-atlas-spec-feeds-into-data-model)
// and the trigger substrate for Cyclical Review Mode (ADR
// 2026-05-29-atlas-spec-cyclical-review-mode).
//
// When an Observe domain diverges (a data point reads needs_investigation /
// major_constraint / potential_disqualifier, or a legacy feed entry is
// flagged diverged), the Plan objectives connected to that domain go amber
// "Review". ADR 5 ratified `feedsInto` as the SINGLE source for this flag:
// the objectives to flag are derived from the graph, not hand-authored.
//
// Three signals make up the flagged set (the operator chose the union of all
// three for the best long-term UX):
//
//   1. membership  — objectives whose own Observe footprint
//      (`getObjectiveObserveDomains`) overlaps a diverged domain. This is the
//      pre-existing `computeObserveRevisionFlag` behaviour, folded in here.
//   2. downstream  — objectives that a membership objective's checklist items
//      `feedsInto` (forward edges): the decisions that CONSUMED the changed
//      read and may now need revisiting.
//   3. upstream    — objectives whose checklist items `feedsInto` a membership
//      objective (reverse edges): the reads/decisions that FED the changed
//      objective and may explain the divergence.
//
// IMPORTANT (Amanah / spec): this flag is ADVISORY ONLY. It prompts a review;
// it never locks an objective, never auto-edits a decision, and is never a
// gate. A `feedsInto` target that does not resolve in the project's objective
// set is simply dropped (project-scoping below) — exactly mirroring the
// forward channel's "dangling target degrades to a label" non-gating contract.
//
// Pure + I/O-free: operates over the project's already-resolved objective set
// passed by the caller. All store / React wiring lives in apps/web.

import type { PlanStratumObjective } from '../schemas/plan/planStratumObjective.schema.js';
import type { UniversalDomain } from '../schemas/universalDomain.schema.js';
import { getObjectiveObserveDomains } from './objectiveObserveDomains.js';

/** How an objective came to be flagged for cyclical review. */
export type ReviewFlagVia = 'membership' | 'upstream' | 'downstream';

/** Attribution for a single flagged objective. */
export interface ReviewFlagAttribution {
  /** The signals that flagged this objective (deduped, stable order). */
  via: ReviewFlagVia[];
  /** The diverged domains responsible for the flag (deduped). */
  domains: UniversalDomain[];
}

export interface ResolveReviewFlagsInput {
  /** The project's resolved Plan objective set (universal + catalogue). */
  objectives: readonly PlanStratumObjective[];
  /** The Observe domains that have diverged this cycle. */
  divergedDomains: readonly UniversalDomain[];
}

const VIA_ORDER: readonly ReviewFlagVia[] = ['membership', 'upstream', 'downstream'];

interface MutableAttribution {
  via: Set<ReviewFlagVia>;
  domains: Set<UniversalDomain>;
}

/**
 * Resolve the objectives to flag amber "Review" given a set of diverged
 * Observe domains, attributed by signal (`via`) and the responsible diverged
 * domains. Project-scoped: only objectives present in `objectives` appear in
 * the result; `feedsInto` targets that do not resolve in the set are dropped.
 *
 * Returns an empty map when no domains diverged (clears all stale amber) or
 * when no objective connects to a diverged domain.
 */
export function resolveReviewFlaggedObjectives(
  input: ResolveReviewFlagsInput,
): Map<string, ReviewFlagAttribution> {
  const { objectives, divergedDomains } = input;

  if (divergedDomains.length === 0 || objectives.length === 0) {
    return new Map();
  }

  const divergedSet = new Set<UniversalDomain>(divergedDomains);
  const objectiveIds = new Set<string>();
  for (const obj of objectives) objectiveIds.add(obj.id);

  const acc = new Map<string, MutableAttribution>();
  const note = (
    id: string,
    via: ReviewFlagVia,
    domains: readonly UniversalDomain[],
  ): void => {
    // Project-scoping: never flag an id that is not in this project's set.
    if (!objectiveIds.has(id)) return;
    let entry = acc.get(id);
    if (!entry) {
      entry = { via: new Set(), domains: new Set() };
      acc.set(id, entry);
    }
    entry.via.add(via);
    for (const d of domains) entry.domains.add(d);
  };

  // --- 1. membership: objectives whose footprint overlaps a diverged domain.
  // Also records, per membership objective, the diverged domains responsible
  // so upstream/downstream edges can inherit them for attribution.
  const membershipDomains = new Map<string, UniversalDomain[]>();
  for (const obj of objectives) {
    const overlap: UniversalDomain[] = [];
    for (const domain of getObjectiveObserveDomains(obj)) {
      if (divergedSet.has(domain)) overlap.push(domain);
    }
    if (overlap.length > 0) {
      membershipDomains.set(obj.id, overlap);
      note(obj.id, 'membership', overlap);
    }
  }

  if (membershipDomains.size === 0) {
    // No objective's footprint touches a diverged domain, so there are no
    // forward/reverse edges to follow either. Nothing to flag.
    return finalize(acc);
  }

  // --- 2. downstream: forward `feedsInto` targets of membership objectives.
  // The decision that consumed the changed read; inherits the feeder's domains.
  for (const obj of objectives) {
    const memDomains = membershipDomains.get(obj.id);
    if (!memDomains) continue;
    for (const item of obj.checklist) {
      for (const targetId of item.feedsInto) {
        note(targetId, 'downstream', memDomains);
      }
    }
  }

  // --- 3. upstream: objectives whose items feed INTO a membership objective.
  // The read/decision that fed the changed objective; inherits the
  // membership target's diverged domains.
  for (const obj of objectives) {
    if (membershipDomains.has(obj.id)) continue; // self already flagged
    const inheritedDomains = new Set<UniversalDomain>();
    let feedsAMember = false;
    for (const item of obj.checklist) {
      for (const targetId of item.feedsInto) {
        const targetDomains = membershipDomains.get(targetId);
        if (targetDomains) {
          feedsAMember = true;
          for (const d of targetDomains) inheritedDomains.add(d);
        }
      }
    }
    if (feedsAMember) {
      note(obj.id, 'upstream', [...inheritedDomains]);
    }
  }

  return finalize(acc);
}

function finalize(
  acc: Map<string, MutableAttribution>,
): Map<string, ReviewFlagAttribution> {
  const out = new Map<string, ReviewFlagAttribution>();
  for (const [id, entry] of acc) {
    const via = VIA_ORDER.filter((v) => entry.via.has(v));
    out.set(id, { via, domains: [...entry.domains] });
  }
  return out;
}
