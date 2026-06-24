-- 055_operational_roles.sql
-- 2026-06-24 — Operational Role Layer
-- ADR: wiki/decisions/2026-06-24-atlas-spec-operational-role-layer.md
--
-- Adds the per-membership "operational role" layer: a domain-scoped role that
-- is ORTHOGONAL to project_members.role (the system / capability role). A
-- member may hold zero or more of the six built-in operational roles; they set
-- the member's DEFAULT domain focus across Plan / Act / Observe and grant or
-- remove NO capability. Empty array ⇒ full, unfiltered view.
--
-- The six slugs are owned by
--   packages/shared/src/constants/collaboration/operationalRoles.ts
-- (and the OperationalRole zod enum in collaboration.schema.ts). Keep the CHECK
-- list below in sync with that enum if a role is ever added.
--
-- The project owner has no project_members row (owner is projects.owner_id);
-- the owner's operational roles live in projects.metadata.operationalRoles
-- (jsonb), read / written by the members route. No schema change is needed for
-- that path — projects.metadata exists since migration 012.

ALTER TABLE project_members
  ADD COLUMN operational_roles text[] NOT NULL DEFAULT '{}';

-- Array-containment guard: every element must be one of the six known slugs.
-- An empty array trivially satisfies it (the common, back-compat case). No
-- trigger — a plain CHECK is enforced on every INSERT / UPDATE.
ALTER TABLE project_members
  ADD CONSTRAINT project_members_operational_roles_valid
  CHECK (operational_roles <@ ARRAY[
    'ecology_soils',
    'food_production',
    'livestock',
    'infrastructure',
    'community_governance',
    'finance_legal'
  ]::text[]);

COMMENT ON COLUMN project_members.operational_roles IS
  'Operational Role Layer (ADR 2026-06-24). Domain-scoped default-focus roles, '
  'orthogonal to project_members.role. Slugs owned by '
  'packages/shared/src/constants/collaboration/operationalRoles.ts. '
  'Empty ⇒ full view. Owner roles live in projects.metadata.operationalRoles.';
