/**
 * alwaysSurface -- the "never miss a signal" half of the Operational Role
 * Layer (ADR 2026-06-24). Scoping de-emphasizes out-of-focus work; this engine
 * PROMOTES specific out-of-scope objectives back into focus so a role filter
 * can never bury something the steward must act on. It is the safety valve that
 * makes "never hide, only de-emphasize" safe to default ON.
 *
 * Three promotion signals, all drawn from EXISTING substrate (no new data):
 *
 *   1. open-review-flag        -- the objective carries >=1 open ObjectiveReviewFlag
 *      (reviewFlagStore). A live amber "Review" marker must be seen regardless
 *      of domain focus.
 *   2. cross-role-dependency   -- the objective FEEDS INTO an in-scope objective
 *      (`feedsInto`): an in-focus decision structurally depends on this
 *      out-of-focus output, so hiding it would hide a blocker.
 *   3. shared-resource-divergence -- the objective's footprint touches a diverged
 *      domain that is SHARED across operational roles (a resource no single role
 *      owns, e.g. hydrology). Shared resources affect everyone, so a divergence
 *      there surfaces even outside your focus.
 *
 * Pure + React-free: the hook layer reads the stores (reviewFlagStore open-flag
 * ids, Observe diverged domains) and the resolved objective set, then calls
 * `collectAlwaysSurface`. EMPTY SCOPE = FULL VIEW: the engine no-ops (everything
 * is already shown, nothing to promote).
 */

import {
  OPERATIONAL_ROLES,
  OPERATIONAL_ROLE_DOMAINS,
  getObjectiveObserveDomains,
  type PlanStratumObjective,
  type UniversalDomain,
} from '@ogden/shared';
import { objectiveInScope } from './viewScope.js';

export type SurfaceReason =
  | 'open-review-flag'
  | 'cross-role-dependency'
  | 'shared-resource-divergence';

/** Canonical, stable ordering for a promoted objective's reasons. */
const REASON_ORDER: readonly SurfaceReason[] = [
  'open-review-flag',
  'cross-role-dependency',
  'shared-resource-divergence',
];

export interface SurfaceVerdict {
  /** True when this objective must be promoted into focus despite being out-of-scope. */
  surface: boolean;
  /** The signals that promoted it, in canonical order (empty when surface=false). */
  reasons: SurfaceReason[];
}

const NO_SURFACE: SurfaceVerdict = { surface: false, reasons: [] };

/**
 * A "shared resource" is any Observe domain owned by 2+ operational roles --
 * derived from the role->domain map so it stays correct if the map changes
 * (today this is `hydrology`, shared by ecology_soils + infrastructure). A
 * divergence in a shared resource is everyone's concern, so it surfaces across
 * role focus.
 */
export const SHARED_RESOURCE_DOMAINS: ReadonlySet<UniversalDomain> =
  computeSharedResourceDomains();

function computeSharedResourceDomains(): Set<UniversalDomain> {
  const count = new Map<UniversalDomain, number>();
  for (const role of OPERATIONAL_ROLES) {
    for (const domain of OPERATIONAL_ROLE_DOMAINS[role]) {
      count.set(domain, (count.get(domain) ?? 0) + 1);
    }
  }
  const shared = new Set<UniversalDomain>();
  for (const [domain, n] of count) {
    if (n >= 2) shared.add(domain);
  }
  return shared;
}

export interface AlwaysSurfaceInput {
  /** The project's resolved Plan objective set (universal + catalogue). */
  objectives: readonly PlanStratumObjective[];
  /** The viewer's domain scope. Empty ⇒ full view ⇒ engine no-ops. */
  scope: ReadonlySet<UniversalDomain>;
  /** Objective ids carrying >=1 open review flag (reviewFlagStore counts keys). */
  openFlagObjectiveIds: ReadonlySet<string>;
  /** Observe domains diverged this cycle; drives shared-resource surfacing. */
  divergedDomains?: readonly UniversalDomain[];
}

/**
 * Compute which OUT-of-scope objectives must be promoted into focus, mapped to
 * their dedup, canonically-ordered reasons. In-scope objectives never appear
 * (they are already shown). Empty scope ⇒ empty map (full view).
 */
export function collectAlwaysSurface(
  input: AlwaysSurfaceInput,
): Map<string, SurfaceReason[]> {
  const { objectives, scope, openFlagObjectiveIds, divergedDomains = [] } = input;
  const out = new Map<string, SurfaceReason[]>();
  if (scope.size === 0) return out; // full view -- nothing to promote.

  // Classify once: which ids are in focus, which objectives are out of focus.
  const inScopeIds = new Set<string>();
  const outOfScope: PlanStratumObjective[] = [];
  for (const obj of objectives) {
    if (objectiveInScope(obj, scope)) inScopeIds.add(obj.id);
    else outOfScope.push(obj);
  }

  const divergedShared = new Set<UniversalDomain>(
    divergedDomains.filter((d) => SHARED_RESOURCE_DOMAINS.has(d)),
  );

  const add = (id: string, reason: SurfaceReason): void => {
    const list = out.get(id);
    if (list) {
      if (!list.includes(reason)) list.push(reason);
    } else {
      out.set(id, [reason]);
    }
  };

  for (const obj of outOfScope) {
    // 1. open review flag on this objective.
    if (openFlagObjectiveIds.has(obj.id)) add(obj.id, 'open-review-flag');

    // 2. cross-role dependency: this out-of-scope objective feeds an in-scope one.
    const feedsInScope = obj.checklist.some((item) =>
      item.feedsInto.some((targetId) => inScopeIds.has(targetId)),
    );
    if (feedsInScope) add(obj.id, 'cross-role-dependency');

    // 3. shared-resource divergence: footprint touches a diverged shared domain.
    if (divergedShared.size > 0) {
      const domains = getObjectiveObserveDomains(obj);
      if (domains.some((d) => divergedShared.has(d))) {
        add(obj.id, 'shared-resource-divergence');
      }
    }
  }

  // Normalize each reason list to canonical order.
  for (const [id, reasons] of out) {
    out.set(id, REASON_ORDER.filter((r) => reasons.includes(r)));
  }
  return out;
}

/**
 * Lookup convenience over a `collectAlwaysSurface` map: does this objective
 * need promoting, and why? Returns a stable no-surface verdict when absent.
 */
export function mustSurface(
  objectiveId: string,
  surfaceMap: ReadonlyMap<string, SurfaceReason[]>,
): SurfaceVerdict {
  const reasons = surfaceMap.get(objectiveId);
  if (!reasons || reasons.length === 0) return NO_SURFACE;
  return { surface: true, reasons };
}
