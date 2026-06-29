/**
 * useResolvedOperationalRoles -- the single per-project resolver for the
 * Operational Role Layer's Option C (rename + re-scope, ADR 2026-06-24).
 *
 * A project may relabel and re-scope its six built-in operational roles. Those
 * overrides ride `projects.metadata.operationalRoleDefs` (open jsonb, no
 * migration) as a toCamelCase-safe ARRAY of `{ slug, label?, description?,
 * domains? }`. This hook reads that blob off the cached project, validates it
 * defensively, and hands every consumer the project-resolved view:
 *
 *   defs          -- six built-in defs with per-project label/description merged.
 *   domainsMap    -- per-role default scope with per-project re-scoping merged.
 *   labelFor      -- resolved label for a slug (project-natural name).
 *   descriptionFor-- resolved description for a slug.
 *   scopeFor      -- union scope for a role set, using THIS project's map.
 *   roleForDomain -- owning roles for a domain, using THIS project's map.
 *   overrides     -- the validated override array (undefined when none) for the
 *                    editor to pre-fill + the "customized vs default" affordance.
 *   hasOverrides  -- true when at least one override is stored.
 *
 * SAFE DEGRADATION: a project with no overrides (the overwhelming majority) gets
 * the built-in defs + domains from every accessor -- byte-identical to the
 * pre-Option-C behavior. Malformed metadata (a legacy slug-keyed object that the
 * API's toCamelCase would have mangled, an unknown slug, a steward-only domain,
 * the wrong type) is rejected by the schema and degrades to built-ins rather
 * than throwing. The pure core (`resolveOperationalRolesFromMetadata`) is
 * exported and unit-tested without React.
 *
 * REACT-QUERY v5 DISCIPLINE: `useProject(...).data` is a stable reference while
 * the query result is unchanged, so we memoize the entire resolved bundle off
 * `project?.metadata`. The bound `scopeFor` mints a fresh `Set` per call (by
 * design -- callers build their own memo), but the hook itself never returns a
 * freshly-built `Set` from render; the Set-bearing `domainsMap` is memoized.
 */

import { useMemo } from 'react';
import {
  OPERATIONAL_ROLES,
  OPERATIONAL_ROLE_DEFS,
  OperationalRoleDefsOverride,
  resolveOperationalRoleDefs,
  resolveOperationalRoleDomains,
  scopeForRoles,
  roleForDomain as roleForDomainShared,
  type OperationalRole,
  type OperationalRoleDef,
  type OperationalRoleDefsOverride as OperationalRoleDefsOverrideType,
  type UniversalDomain,
} from '@ogden/shared';
import { useProject } from '../../hooks/useProjectQueries.js';

export interface ResolvedOperationalRoles {
  /** Validated per-project override array, or `undefined` when none/invalid. */
  overrides: OperationalRoleDefsOverrideType | undefined;
  /** True when this project stores at least one (valid) override. */
  hasOverrides: boolean;
  /** Six built-in defs with per-project label/description merged (canonical order). */
  defs: readonly OperationalRoleDef[];
  /** Per-role default domain scope with per-project re-scoping merged. */
  domainsMap: Record<OperationalRole, ReadonlySet<UniversalDomain>>;
  /** Project-resolved label for a slug. */
  labelFor: (slug: OperationalRole) => string;
  /** Project-resolved description for a slug. */
  descriptionFor: (slug: OperationalRole) => string;
  /** Union scope for a set of roles, using THIS project's domain map. */
  scopeFor: (roles: readonly OperationalRole[]) => Set<UniversalDomain>;
  /** Owning roles for a domain, using THIS project's domain map. */
  roleForDomain: (domain: UniversalDomain) => OperationalRole[];
}

/**
 * Pure core: resolve the operational-role bundle from a project's raw
 * `metadata`. Exported for unit testing without mounting the hook. Accepts
 * `unknown` because the metadata is read back un-validated (GET runs it through
 * `toCamelCase` only). Never throws -- malformed input degrades to built-ins.
 */
export function resolveOperationalRolesFromMetadata(
  metadata: unknown,
): ResolvedOperationalRoles {
  const raw = (metadata as { operationalRoleDefs?: unknown } | null | undefined)
    ?.operationalRoleDefs;
  // `safeParse` rejects the legacy slug-keyed object shape (mangled by
  // toCamelCase), unknown slugs, steward-only domains, and dup slugs alike.
  const parsed =
    raw == null ? undefined : OperationalRoleDefsOverride.safeParse(raw);
  const overrides = parsed && parsed.success ? parsed.data : undefined;
  const hasOverrides = !!overrides && overrides.length > 0;

  const defs = resolveOperationalRoleDefs(overrides);
  const domainsMap = resolveOperationalRoleDomains(overrides);
  const defBySlug = {} as Record<OperationalRole, OperationalRoleDef>;
  for (const def of defs) defBySlug[def.slug] = def;

  return {
    overrides,
    hasOverrides,
    defs,
    domainsMap,
    labelFor: (slug) => defBySlug[slug]?.label ?? OPERATIONAL_ROLE_DEFS[slug].label,
    descriptionFor: (slug) =>
      defBySlug[slug]?.description ?? OPERATIONAL_ROLE_DEFS[slug].description,
    scopeFor: (roles) => scopeForRoles(roles, domainsMap),
    roleForDomain: (domain) => roleForDomainShared(domain, domainsMap),
  };
}

/**
 * Read this project's operational-role overrides (if any) and return the
 * project-resolved bundle. Memoized off `project?.metadata` so the Set-bearing
 * `domainsMap` is referentially stable while the cached project is unchanged.
 */
export function useResolvedOperationalRoles(
  projectId: string,
): ResolvedOperationalRoles {
  const { data: project } = useProject(projectId);
  const metadata = project?.metadata ?? null;
  return useMemo(
    () => resolveOperationalRolesFromMetadata(metadata),
    [metadata],
  );
}

/** Re-export so consumers can spread the canonical slug list without a second import. */
export { OPERATIONAL_ROLES };
