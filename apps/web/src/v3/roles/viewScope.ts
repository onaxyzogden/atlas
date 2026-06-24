/**
 * viewScope -- pure, React-free scope predicates for the Operational Role
 * Layer (ADR 2026-06-24). Given a viewer's domain scope (the union of their
 * operational roles' domains, built by `scopeForRoles`), these helpers decide
 * which Plan objectives / Act+Observe modules are "in focus".
 *
 * THE GOLDEN RULE -- never hide, only de-emphasize. These predicates only
 * classify in/out; the rendering layer keeps every out-of-scope item reachable
 * (dimmed, collapsed, or behind a "show more"), and the always-surface engine
 * (`alwaysSurface.ts`) can promote an out-of-scope item back into focus.
 *
 * EMPTY SCOPE = FULL VIEW. When `scope.size === 0` the layer is disengaged
 * (the viewer holds no roles, is solo, or chose Full view), so EVERYTHING is
 * in scope. A misconfigured/empty role can never produce an empty screen.
 *
 * UNMAPPED OBJECTIVE = IN SCOPE. The objective->domain map
 * (`getObjectiveObserveDomains`) is coarse and seed-scoped; an objective that
 * resolves to NO domains cannot be confidently classified as "out", so it
 * stays in focus rather than being dimmed for every role. Better to under-dim
 * than to bury genuinely-relevant work.
 */

import {
  getObjectiveObserveDomains,
  type PlanStratumObjective,
  type UniversalDomain,
} from '@ogden/shared';

/** True when the layer is disengaged (full, unfiltered view). */
export function scopeIsFull(scope: ReadonlySet<UniversalDomain>): boolean {
  return scope.size === 0;
}

/**
 * Is this Act/Observe module (a `UniversalDomain`) within the viewer's focus?
 * Full view ⇒ always true. Otherwise true iff the domain is in scope.
 */
export function moduleInScope(
  domain: UniversalDomain,
  scope: ReadonlySet<UniversalDomain>,
): boolean {
  if (scope.size === 0) return true;
  return scope.has(domain);
}

/**
 * Is this Plan objective within the viewer's focus? Full view ⇒ true.
 * Unmapped objective (no observe domains) ⇒ true (see module header).
 * Otherwise true iff ANY of the objective's domains intersects the scope.
 */
export function objectiveInScope(
  objective: PlanStratumObjective,
  scope: ReadonlySet<UniversalDomain>,
): boolean {
  if (scope.size === 0) return true;
  const domains = getObjectiveObserveDomains(objective);
  if (domains.length === 0) return true;
  return domains.some((d) => scope.has(d));
}

export interface ScopePartition<T> {
  /** Items inside the viewer's focus, in original order. */
  inScope: T[];
  /** Items outside the viewer's focus, in original order (de-emphasized). */
  outScope: T[];
}

/**
 * Partition any list by scope membership, preserving original order within
 * each bucket. Generic over the item's domain accessor so it serves both the
 * objective rail (`getObjectiveObserveDomains`) and the module rails (identity
 * on the domain). Full view ⇒ everything lands in `inScope`, `outScope` empty.
 *
 * An item whose `getDomains` returns `[]` is treated as in-scope (consistent
 * with `objectiveInScope`): we never dim what we cannot classify.
 */
export function partitionByScope<T>(
  items: readonly T[],
  getDomains: (item: T) => readonly UniversalDomain[],
  scope: ReadonlySet<UniversalDomain>,
): ScopePartition<T> {
  if (scope.size === 0) {
    return { inScope: [...items], outScope: [] };
  }
  const inScope: T[] = [];
  const outScope: T[] = [];
  for (const item of items) {
    const domains = getDomains(item);
    const isIn = domains.length === 0 || domains.some((d) => scope.has(d));
    (isIn ? inScope : outScope).push(item);
  }
  return { inScope, outScope };
}
