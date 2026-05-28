/**
 * projectRoleCapabilities — capability map + legacy-gate adapter for the
 * 8-variant ProjectRole enum.
 *
 * Background: Phase 5 Slice 5.1 extends ProjectRole from 4 legacy roles
 * (`owner | designer | reviewer | viewer`) to 8 roles, adding the OLOS
 * spec-shaped identities (`primary_steward | team_member | contractor |
 * landowner`) per the Project Creation Wizard Spec v1 and Per-Project
 * Home Spec v1.
 *
 * Two consumers care about role checks:
 *
 *   1. The 22 legacy `requireRole(...allowed: ProjectRole[])` callsites
 *      across `apps/api/src/routes/` use literal role names (e.g.
 *      `requireRole('owner', 'designer')`). They expect membership-style
 *      semantics — granted role must be in the allow list. Extending the
 *      enum without aliasing would silently lock out every primary_steward
 *      / team_member / contractor / landowner from those routes.
 *
 *   2. New code (Phase 5 Per-Project Home, Phase 6 notifications, future
 *      route refactors) wants fine-grained capability semantics: "can this
 *      role comment", "can this role manage members", without committing
 *      to a particular legacy alias.
 *
 * This module ships both:
 *
 *   - `hasCapability(role, capability)` — fine-grained capability check.
 *     The forward-compatible primitive used by new gates.
 *
 *   - `roleSatisfies(granted, required)` — adapter that makes the legacy
 *     `requireRole(...allowed)` gates work for spec-shaped granted roles.
 *     Each spec role aliases ONE legacy role chosen by closest-capability
 *     match (see ROLE_ALIAS below).
 *
 * The alias mapping is intentionally narrow:
 *
 *   - `primary_steward` → `owner` (admin equivalent — manages members,
 *     can delete the project, holds the steward seat persisted on the
 *     project via Wizard Step 3).
 *
 *   - `team_member` → `designer` (contributor equivalent — full edit
 *     access, cannot manage members or delete project).
 *
 *   - `contractor` → `designer` (write-capable at the gate layer; future
 *     Phase 5 slices add per-route scoping so a contractor can only
 *     mutate the field actions assigned to them, but the gate-level
 *     check is the same as designer).
 *
 *   - `landowner` → `viewer` (read-only at the gate; comment access is
 *     granted by extending the 2 comment-route gates to include
 *     `'landowner'` literally rather than via alias — see
 *     `apps/api/src/routes/comments/index.ts` Slice 5.1 edits).
 *
 * Legacy roles do NOT alias to anything — their semantics are unchanged.
 * `roleSatisfies('owner', 'designer')` returns false (literal-match only)
 * to preserve the existing membership-style semantics of `requireRole`.
 *
 * The capability map below is the source of truth for both functions.
 * Adding a new capability requires updating every role's entry — TS
 * `Record<ProjectRole, …>` enforces exhaustiveness.
 */

import type { ProjectRole } from '../schemas/collaboration.schema.js';

/**
 * Fine-grained project capabilities. Use `hasCapability(role, cap)` to
 * gate new code; legacy routes continue using `requireRole(...allowed)`
 * via the `roleSatisfies` adapter.
 *
 * - `read`            view project, observe, plan, act surfaces
 * - `comment`         add or resolve comments on the project
 * - `suggest_edits`   propose suggested edits (reviewer workflow)
 * - `edit`            mutate project/plan/act/observe data
 * - `manage_members`  invite, update, remove project members
 * - `delete_project`  delete the project or transfer stewardship
 */
export type ProjectRoleCapability =
  | 'read'
  | 'comment'
  | 'suggest_edits'
  | 'edit'
  | 'manage_members'
  | 'delete_project';

/**
 * Capability set per role. Source of truth — `hasCapability` reads this
 * directly. The Record type enforces TS exhaustiveness when the enum
 * gains new variants.
 */
export const PROJECT_ROLE_CAPABILITIES: Record<
  ProjectRole,
  ReadonlySet<ProjectRoleCapability>
> = {
  // Legacy roles
  owner: new Set<ProjectRoleCapability>([
    'read',
    'comment',
    'edit',
    'manage_members',
    'delete_project',
  ]),
  designer: new Set<ProjectRoleCapability>([
    'read',
    'comment',
    'edit',
  ]),
  reviewer: new Set<ProjectRoleCapability>([
    'read',
    'comment',
    'suggest_edits',
  ]),
  viewer: new Set<ProjectRoleCapability>([
    'read',
  ]),
  // OLOS spec-shaped roles (Phase 5 Slice 5.1)
  primary_steward: new Set<ProjectRoleCapability>([
    'read',
    'comment',
    'edit',
    'manage_members',
    'delete_project',
  ]),
  team_member: new Set<ProjectRoleCapability>([
    'read',
    'comment',
    'edit',
  ]),
  contractor: new Set<ProjectRoleCapability>([
    'read',
    'comment',
    'edit',
  ]),
  landowner: new Set<ProjectRoleCapability>([
    'read',
    'comment',
  ]),
};

/**
 * Legacy-role alias for each spec role. Determines how
 * `roleSatisfies(granted, required)` maps a spec-shaped granted role
 * against literal legacy role gates. Legacy roles don't alias.
 *
 * The alias preserves intent at the gate layer:
 *
 *   - primary_steward acts as owner (admin)
 *   - team_member / contractor act as designer (contributors)
 *   - landowner acts as viewer (read-only at gate; comment route adds
 *     `'landowner'` explicitly so landowners can also POST comments)
 */
const ROLE_ALIAS: Record<ProjectRole, ProjectRole | null> = {
  owner: null,
  designer: null,
  reviewer: null,
  viewer: null,
  primary_steward: 'owner',
  team_member: 'designer',
  contractor: 'designer',
  landowner: 'viewer',
};

/**
 * True if `role` carries `capability`. Use this in new code to gate
 * fine-grained actions without committing to a legacy alias.
 */
export function hasCapability(
  role: ProjectRole,
  capability: ProjectRoleCapability,
): boolean {
  return PROJECT_ROLE_CAPABILITIES[role].has(capability);
}

/**
 * True if a `granted` role satisfies a literal `required` role at a
 * legacy `requireRole(...allowed)` gate.
 *
 * Semantics:
 *   - Literal match: `granted === required` always satisfies.
 *   - Spec → legacy alias: a spec-shaped granted role satisfies its
 *     aliased legacy role per ROLE_ALIAS.
 *   - No transitive aliasing: owner does NOT satisfy designer (the
 *     legacy `requireRole('owner', 'designer')` already covers the
 *     "either one works" case via its allow list).
 *
 * Use this in the `requireRole` plugin's allow-list check. New code
 * should prefer `hasCapability` directly.
 */
export function roleSatisfies(
  granted: ProjectRole,
  required: ProjectRole,
): boolean {
  if (granted === required) return true;
  return ROLE_ALIAS[granted] === required;
}
