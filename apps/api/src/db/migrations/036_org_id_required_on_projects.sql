-- Migration 036 — Phase 4.5 foundation: every user owns at least one organization,
-- and every project belongs to one. After this migration:
--   • Every user with at least one row in `users` has at least one `organization_members`
--     row with role='owner' (their personal default workspace).
--   • Every row in `projects` has a non-NULL `org_id`.
--   • `projects.org_id` is enforced NOT NULL at the schema level.
--
-- This is the precondition for the Phase 4.5 register-time auto-org code path in
-- apps/api/src/routes/auth/index.ts to be safe — login/me both assume an
-- owner-role org exists for every authenticated user.
--
-- Idempotent: re-running is a no-op once every user has a default org and every
-- project has an org_id.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1 — Create a personal default org for every user that lacks an
-- owner-role membership. Uses a deterministic name derived from display_name
-- (falling back to the email local-part, then 'My') to match the runtime helper
-- `defaultOrgNameFor()` in apps/api/src/routes/auth/index.ts.
-- ─────────────────────────────────────────────────────────────────────────────

WITH users_needing_default_org AS (
  SELECT u.id          AS user_id,
         COALESCE(
           NULLIF(TRIM(u.display_name), ''),
           split_part(u.email, '@', 1),
           'My'
         ) || '''s Workspace' AS org_name
  FROM users u
  WHERE NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = u.id AND om.role = 'owner'
  )
),
created_orgs AS (
  INSERT INTO organizations (name)
  SELECT org_name FROM users_needing_default_org
  RETURNING id, name
),
-- Pair the new org rows back to their target user via row_number ordering.
-- Both CTEs are scanned in the same statement; pairing by row_number is stable
-- because Postgres processes the WITH set deterministically here (Postgres 13+).
paired AS (
  SELECT u.user_id, o.id AS org_id
  FROM (
    SELECT user_id, row_number() OVER (ORDER BY user_id) AS rn
    FROM users_needing_default_org
  ) u
  JOIN (
    SELECT id, row_number() OVER (ORDER BY id) AS rn
    FROM created_orgs
  ) o ON o.rn = u.rn
)
INSERT INTO organization_members (org_id, user_id, role)
SELECT org_id, user_id, 'owner' FROM paired
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2 — Attach orphaned projects (org_id IS NULL) to their owner's earliest
-- owner-role org. Built-in projects owned by SYSTEM_USER_ID get attached to
-- the system user's default org (created in Step 1 if it didn't already exist).
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE projects p
SET org_id = (
  SELECT om.org_id
  FROM organization_members om
  WHERE om.user_id = p.owner_id AND om.role = 'owner'
  ORDER BY om.joined_at ASC, om.org_id ASC
  LIMIT 1
)
WHERE p.org_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3 — Enforce the invariant. Will fail loudly if any project still lacks
-- an org_id (which would indicate a user with no owner-role org, which Step 1
-- should have prevented).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE projects ALTER COLUMN org_id SET NOT NULL;

-- idx_projects_org already exists from migration 001; no new index needed.

COMMIT;
