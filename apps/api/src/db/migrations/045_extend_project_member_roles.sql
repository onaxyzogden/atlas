-- Migration 045 — Extend project_members.role enum to 8 variants.
--
-- Phase 5 Slice 5.1 of the OLOS Project/Act/Observe rollout adds four
-- spec-shaped roles to the ProjectRole enum (`primary_steward |
-- team_member | contractor | landowner`) alongside the original four
-- legacy roles (`owner | designer | reviewer | viewer`).
--
-- The `role` column has no CHECK constraint today (see migration 005),
-- so this migration is additive: it tightens the column to the 8-value
-- whitelist now that we have a closed enum. All existing rows are
-- inside the legacy 4-role set, which is a subset of the new whitelist,
-- so no row migration is required.
--
-- We also add an index on `role` to support Phase 5 Slice 5.2 portfolio
-- queries that filter project_members by role (e.g. "list all projects
-- where I am a contractor").

ALTER TABLE project_members
  ADD CONSTRAINT project_members_role_check CHECK (role IN (
    'owner',
    'designer',
    'reviewer',
    'viewer',
    'primary_steward',
    'team_member',
    'contractor',
    'landowner'
  ));

COMMENT ON COLUMN project_members.role IS
  'Per-project role. 8 variants: 4 legacy (owner, designer, reviewer, '
  'viewer) plus 4 OLOS spec-shaped (primary_steward, team_member, '
  'contractor, landowner). Authorization at the route layer uses '
  'capability sets — see packages/shared/src/relationships/'
  'projectRoleCapabilities.ts.';

CREATE INDEX idx_pm_role ON project_members (role);
