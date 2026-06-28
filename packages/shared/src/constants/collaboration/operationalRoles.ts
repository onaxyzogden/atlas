/**
 * operationalRoles — the six built-in operational roles, their default
 * domain scopes, and the pure helper layer the Operational Role Layer is
 * built on (ADR 2026-06-24-atlas-spec-operational-role-layer).
 *
 * OLOS has two orthogonal role layers:
 *
 *   - SYSTEM role (`ProjectRole`, collaboration.schema.ts) governs which
 *     SURFACES a user can reach (read / comment / edit / manage_members …).
 *     Enforced by `relationships/projectRoleCapabilities.ts`.
 *
 *   - OPERATIONAL role (this module) governs which DOMAINS are a member's
 *     default focus WITHIN those surfaces. It scopes the view; it NEVER
 *     grants or removes a capability. Stored per-membership
 *     (`ProjectMemberRecord.operationalRoles`), so one person can hold
 *     different operational roles across different projects.
 *
 * The scope axis is the 16 `UniversalDomain`s (NOT the 7 UI-only
 * `STEWARD_DOMAINS`, which serve s1-steward decision-rights capture).
 * Roles STACK: a member's scope is the union of their roles' domains
 * (`scopeForRoles`). The union of all six roles is every domain except
 * `vision-intent`, which is primary-steward-only.
 *
 * View filtering built on this map is advisory — "never hide, only
 * de-emphasize". The Plan resolver it feeds (`objectiveObserveDomains.ts`)
 * is intentionally coarse, so an empty or over-wide scope always degrades
 * to the full view rather than a blank screen.
 */

import { z } from 'zod';

import { OperationalRole } from '../../schemas/collaboration.schema.js';
import type { ProjectRole } from '../../schemas/collaboration.schema.js';
import { UniversalDomain } from '../../schemas/universalDomain.schema.js';

/** Ordered tuple of the six built-in operational-role slugs. */
export const OPERATIONAL_ROLES = OperationalRole.options;

export interface OperationalRoleDef {
  readonly slug: OperationalRole;
  readonly label: string;
  readonly description: string;
}

/** Human-facing label + one-line description per role (ADR §Decision). */
export const OPERATIONAL_ROLE_DEFS: Record<OperationalRole, OperationalRoleDef> = {
  ecology_soils: {
    slug: 'ecology_soils',
    label: 'Ecology & Soils Steward',
    description: 'Custodian of land-health data and the monitoring system.',
  },
  food_production: {
    slug: 'food_production',
    label: 'Food Production Lead',
    description: 'Owns cultivated food output and the propagation pipeline.',
  },
  livestock: {
    slug: 'livestock',
    label: 'Livestock Lead',
    description: 'Owns all livestock systems and their ecological function.',
  },
  infrastructure: {
    slug: 'infrastructure',
    label: 'Infrastructure Lead',
    description: 'Builds and maintains the physical built systems on the land.',
  },
  community_governance: {
    slug: 'community_governance',
    label: 'Community & Governance Coordinator',
    description: 'Facilitates the human systems that hold the project together.',
  },
  finance_legal: {
    slug: 'finance_legal',
    label: 'Finance & Legal Lead',
    description: 'Owns financial integrity and legal compliance.',
  },
};

/**
 * Domains permanently reserved to the Primary Steward — never part of any
 * operational-role default scope (ADR §Primary-Steward-Only Domains). Only
 * `vision-intent` is a `UniversalDomain`; the ADR's other reserved items
 * (threshold gates, Act-mandate approval, Raise-a-Concern) are ceremonies,
 * not domains in the 16-axis, and are governed by capabilities instead.
 */
export const PRIMARY_STEWARD_ONLY_DOMAINS: ReadonlySet<UniversalDomain> =
  new Set<UniversalDomain>(['vision-intent']);

/**
 * Per-project override of ONE built-in role's presentation + default scope
 * (ADR Option C — rename + re-scope). Every field is optional: an absent
 * field falls back to the built-in. Stored (per slug) in
 * `projects.metadata.operationalRoleDefs`, which is open jsonb — the member's
 * stored slug never changes, so migration 055's CHECK and the closed
 * `OperationalRole` enum stay untouched. `.strict()` rejects typo fields.
 */
export const OperationalRoleDefOverride = z
  .object({
    label: z.string().min(1).max(40).optional(),
    description: z.string().max(160).optional(),
    domains: z.array(UniversalDomain).optional(),
  })
  .strict();
export type OperationalRoleDefOverride = z.infer<typeof OperationalRoleDefOverride>;

/**
 * A project's full set of role overrides — a partial map keyed by the six
 * built-in slugs (unknown keys rejected). `vision-intent` can never be added
 * to a role's `domains`: it is permanently reserved to the Primary Steward
 * (`PRIMARY_STEWARD_ONLY_DOMAINS`). This is the shape persisted at
 * `projects.metadata.operationalRoleDefs` and validated by the
 * `PATCH /projects/:id/operational-role-defs` route.
 */
export const OperationalRoleDefsOverride = z
  .record(OperationalRole, OperationalRoleDefOverride)
  .superRefine((defs, ctx) => {
    for (const [slug, def] of Object.entries(defs)) {
      for (const domain of def?.domains ?? []) {
        if (PRIMARY_STEWARD_ONLY_DOMAINS.has(domain)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [slug, 'domains'],
            message: `"${domain}" is reserved to the Primary Steward and cannot be assigned to an operational role.`,
          });
        }
      }
    }
  });
export type OperationalRoleDefsOverride = z.infer<typeof OperationalRoleDefsOverride>;

/**
 * Default domain scope per operational role. Source of truth for the
 * view-filtering layer. The `Record<OperationalRole, …>` type enforces
 * exhaustiveness when a role is added.
 *
 * `monitoring-records` sits with ecology_soils for the *default view* (it
 * is the observational custodian), but WRITES to it remain cross-cutting —
 * write access is governed by `PROJECT_ROLE_CAPABILITIES`, not this map.
 * `hydrology` intentionally appears under both ecology_soils (natural
 * water) and infrastructure (engineered / built water).
 */
export const OPERATIONAL_ROLE_DOMAINS: Record<
  OperationalRole,
  ReadonlySet<UniversalDomain>
> = {
  ecology_soils: new Set<UniversalDomain>([
    'land-base',
    'climate',
    'topography',
    'hydrology',
    'soil',
    'ecology',
    'monitoring-records',
  ]),
  food_production: new Set<UniversalDomain>(['plants-food']),
  livestock: new Set<UniversalDomain>(['animals-livestock']),
  infrastructure: new Set<UniversalDomain>([
    'built-infrastructure',
    'access-circulation',
    'energy-resources',
    'hydrology',
  ]),
  community_governance: new Set<UniversalDomain>(['people-governance']),
  finance_legal: new Set<UniversalDomain>([
    'economics-capacity',
    'risk-compliance',
  ]),
};

/**
 * Union of the domain scopes for the given roles (role stacking). Each
 * domain appears once. Tolerates stale slugs — a role removed in a future
 * release that still lingers in persisted membership data is skipped, not
 * thrown on. Never includes a steward-only domain (none of the role maps
 * list one).
 */
export function scopeForRoles(
  roles: readonly OperationalRole[],
  domainsMap: Record<
    OperationalRole,
    ReadonlySet<UniversalDomain>
  > = OPERATIONAL_ROLE_DOMAINS,
): Set<UniversalDomain> {
  const scope = new Set<UniversalDomain>();
  for (const role of roles) {
    const domains = domainsMap[role];
    if (!domains) continue; // defensive: stale / unknown slug
    for (const domain of domains) scope.add(domain);
  }
  return scope;
}

/**
 * Inverse lookup — the operational roles whose default scope includes
 * `domain`, in canonical `OPERATIONAL_ROLES` order. Drives the role badges
 * on an objective / module tile. Returns `[]` for primary-steward-only
 * domains.
 */
export function roleForDomain(
  domain: UniversalDomain,
  domainsMap: Record<
    OperationalRole,
    ReadonlySet<UniversalDomain>
  > = OPERATIONAL_ROLE_DOMAINS,
): OperationalRole[] {
  return OPERATIONAL_ROLES.filter(
    (role) => domainsMap[role]?.has(domain) ?? false,
  );
}

/**
 * The operational-role layer is suppressed on a solo project — a lone
 * steward owns 100% of every domain, so filtering only adds noise (ADR
 * §Solo Steward). True when the project has exactly one member who holds
 * the steward seat. Accepts the legacy `owner` alias alongside the
 * spec-shaped `primary_steward`, so a legacy solo owner is also detected
 * as solo (and shown the full view) rather than an empty layer.
 */
export function isSoloProject(
  memberCount: number,
  viewerSystemRole: ProjectRole | null | undefined,
): boolean {
  return (
    memberCount === 1 &&
    (viewerSystemRole === 'primary_steward' || viewerSystemRole === 'owner')
  );
}

/**
 * Whether the operational-role layer applies to a member with this system
 * role at all (ADR §Two-Layer Role Model: "Team Member / Steward or
 * Primary Steward" only). Contractors, landowners, reviewers and viewers
 * are unaffected.
 *
 * Back-compat: the legacy aliases `owner` (≈ primary_steward) and `designer`
 * (≈ team_member) predate the role rename and can still tag older persisted
 * memberships / pre-migration rows, so they are accepted here to keep those
 * members in scope rather than silently dropping the layer for them. Safe
 * degradation: any unknown / null / undefined role falls through to `false`
 * (the layer simply does not engage) — an unrecognised role is never treated
 * as in-scope by default.
 */
export function operationalRolesApplyTo(
  systemRole: ProjectRole | null | undefined,
): boolean {
  return (
    systemRole === 'primary_steward' ||
    systemRole === 'team_member' ||
    systemRole === 'owner' ||
    systemRole === 'designer'
  );
}

/**
 * Per-project role definitions (ADR Option C — rename + re-scope). Merges a
 * project's `operationalRoleDefs` override (from `projects.metadata`) over the
 * six built-in defs: an overridden `label` / `description` replaces the
 * built-in, an absent one falls back. The slug set is always the six
 * built-ins in canonical order — Option C renames + re-scopes, it never adds
 * or removes roles (net-new roles stay deferred). Pure: the shared package
 * cannot read project metadata, so the resolved override is passed in (a
 * frontend hook reads it from `useProject`).
 */
export function resolveOperationalRoleDefs(
  overrides?: OperationalRoleDefsOverride,
): readonly OperationalRoleDef[] {
  return OPERATIONAL_ROLES.map((slug) => {
    const base = OPERATIONAL_ROLE_DEFS[slug];
    const override = overrides?.[slug];
    if (!override) return base;
    return {
      slug,
      label: override.label ?? base.label,
      description: override.description ?? base.description,
    };
  });
}

/**
 * Per-project default domain scope per role (ADR Option C — re-scope). Merges
 * a project's `operationalRoleDefs[slug].domains` override over
 * `OPERATIONAL_ROLE_DOMAINS`: an overridden `domains` array REPLACES the
 * built-in scope for that slug (steward-only domains stripped defensively —
 * the schema already rejects them); an absent one keeps the built-in. Feed
 * the result to `scopeForRoles` / `roleForDomain` as their `domainsMap`.
 */
export function resolveOperationalRoleDomains(
  overrides?: OperationalRoleDefsOverride,
): Record<OperationalRole, ReadonlySet<UniversalDomain>> {
  const resolved = {} as Record<OperationalRole, ReadonlySet<UniversalDomain>>;
  for (const slug of OPERATIONAL_ROLES) {
    const override = overrides?.[slug];
    resolved[slug] = override?.domains
      ? new Set<UniversalDomain>(
          override.domains.filter((d) => !PRIMARY_STEWARD_ONLY_DOMAINS.has(d)),
        )
      : OPERATIONAL_ROLE_DOMAINS[slug];
  }
  return resolved;
}
