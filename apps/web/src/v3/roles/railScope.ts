/**
 * railScope -- pure composition of the objective rail under the Operational
 * Role Layer (ADR 2026-06-24). Given a stratum's objectives, the viewer's
 * domain scope, and the always-surface promotion map, it produces the two
 * lists the rail renders:
 *
 *   mainList    -- IN FOCUS: in-scope objectives (original order) followed by
 *                  promoted out-of-scope objectives (the always-surface engine
 *                  said they must be seen anyway). Rendered prominently.
 *   outsideList -- OUT OF FOCUS: the remaining out-of-scope objectives,
 *                  de-emphasized behind a collapsible "Outside your focus (N)".
 *
 * THE GOLDEN RULE -- never hide, only de-emphasize. Nothing is dropped: every
 * objective lands in exactly one of the two lists, both always reachable.
 *
 * Pure + React-free so the partition/promotion/badge logic is unit-tested
 * without mounting the rail (which transitively pulls the protocol panel +
 * map tree). The rail just maps over the result.
 */

import {
  getObjectiveObserveDomains,
  roleForDomain,
  OPERATIONAL_ROLE_DEFS,
  type OperationalRole,
  type PlanStratumObjective,
  type UniversalDomain,
} from '@ogden/shared';
import { partitionByScope } from './viewScope.js';
import { mustSurface, type SurfaceReason } from './alwaysSurface.js';

/**
 * A card's scope classification:
 *   'in'           -- inside the viewer's focus (rendered as today).
 *   'out-surfaced' -- outside focus but PROMOTED back in by the always-surface
 *                     engine (open flag / cross-role dependency / shared-resource
 *                     divergence); carries an amber chip + the reasons.
 *   'out'          -- outside focus and de-emphasized (dimmed, collapsible).
 */
export type ScopeState = 'in' | 'out' | 'out-surfaced';

export interface ScopedRailEntry {
  objective: PlanStratumObjective;
  scopeState: ScopeState;
  /** Promotion reasons (canonical order); non-empty only for 'out-surfaced'. */
  reasons: SurfaceReason[];
  /**
   * Human labels of the operational roles that OWN this objective's domains --
   * context for an out-of-focus card ("this belongs to Livestock Lead").
   * Empty for in-scope cards (it is the viewer's own domain) and for unmapped
   * objectives.
   */
  roleBadges: string[];
}

export interface ScopedRail {
  /** In-focus: in-scope cards, then promoted out-of-scope cards. */
  mainList: ScopedRailEntry[];
  /** Out-of-focus, de-emphasized; render behind a "show more". */
  outsideList: ScopedRailEntry[];
  /** Count shown on the focus toggle ("N in focus") -- mainList length. */
  inFocusCount: number;
  /** Total objectives classified (mainList + outsideList). */
  totalCount: number;
}

/**
 * Per-project resolution for the rail (Option C, ADR 2026-06-24). Both fields
 * are optional and default to the built-in behavior, so every existing caller
 * (and the unit tests) stay byte-identical. A shell passes these from
 * `useResolvedOperationalRoles` so re-scoped domains drive the partition badges
 * and renamed roles show their project-natural label.
 */
export interface ScopeRailOptions {
  /** Per-project domain map. Omit for the built-in `OPERATIONAL_ROLE_DOMAINS`. */
  domainsMap?: Record<OperationalRole, ReadonlySet<UniversalDomain>>;
  /** Per-project label resolver. Omit for the built-in def label. */
  labelFor?: (slug: OperationalRole) => string;
}

/** Built-in label resolver — the default when a project has no override. */
const builtinLabelFor = (slug: OperationalRole): string =>
  OPERATIONAL_ROLE_DEFS[slug].label;

/**
 * Owning-role labels for an objective's domains, in canonical
 * `OPERATIONAL_ROLES` order, de-duplicated. Drives the out-of-focus context
 * badges. `[]` for an unmapped objective or a steward-only domain. `domainsMap`
 * / `labelFor` apply the project's Option-C re-scope + rename when supplied.
 */
function roleBadgesFor(
  objective: PlanStratumObjective,
  domainsMap?: Record<OperationalRole, ReadonlySet<UniversalDomain>>,
  labelFor: (slug: OperationalRole) => string = builtinLabelFor,
): string[] {
  const roles = new Set<OperationalRole>();
  for (const domain of getObjectiveObserveDomains(objective)) {
    for (const role of roleForDomain(domain, domainsMap)) roles.add(role);
  }
  return [...roles].map((role) => labelFor(role));
}

/**
 * Compose the rail's two lists. Caller passes the ALREADY view-filtered
 * objectives (e.g. after the source filter), the viewer's scope, and the
 * always-surface map (built once in the shell). Order is preserved within
 * each bucket; promoted cards keep their original relative order after the
 * in-scope cards.
 */
export function composeScopedRail(
  objectives: readonly PlanStratumObjective[],
  scope: ReadonlySet<UniversalDomain>,
  surfaceMap: ReadonlyMap<string, SurfaceReason[]>,
  opts?: ScopeRailOptions,
): ScopedRail {
  const { inScope, outScope } = partitionByScope(
    objectives,
    getObjectiveObserveDomains,
    scope,
  );

  const mainList: ScopedRailEntry[] = inScope.map((objective) => ({
    objective,
    scopeState: 'in' as const,
    reasons: [],
    roleBadges: [],
  }));
  const outsideList: ScopedRailEntry[] = [];

  for (const objective of outScope) {
    const verdict = mustSurface(objective.id, surfaceMap);
    const entry: ScopedRailEntry = {
      objective,
      scopeState: verdict.surface ? 'out-surfaced' : 'out',
      reasons: verdict.reasons,
      roleBadges: roleBadgesFor(objective, opts?.domainsMap, opts?.labelFor),
    };
    if (verdict.surface) mainList.push(entry);
    else outsideList.push(entry);
  }

  return {
    mainList,
    outsideList,
    inFocusCount: mainList.length,
    totalCount: mainList.length + outsideList.length,
  };
}
