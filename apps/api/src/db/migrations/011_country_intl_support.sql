-- 011_country_intl_support.sql
-- 2026-04-22 — extend projects.country to accept 'INTL'
--
-- Background:
--   Prior to this migration, projects.country was an unconstrained text column
--   populated from the shared Zod enum z.enum(['US', 'CA']). With the Country
--   enum widening to ['US', 'CA', 'INTL'] to unlock NasaPowerAdapter routing
--   under ADAPTER_REGISTRY.climate.INTL, we add a CHECK constraint so the
--   storage layer enforces the same closed set.
--
-- Why CHECK, not an ENUM type:
--   - ENUM type requires ALTER TABLE with data rewrite; CHECK is additive.
--   - Existing rows are all 'US' or 'CA' — the constraint passes without touching them.
--   - CHECK can be relaxed later by DROP + ADD with a wider list; ENUM types
--     require CREATE TYPE ... AS + ALTER COLUMN dance that's easier to get wrong.
--
-- Column width: the original schema declared `country character(2)` (fixed
-- width 2 chars) which can't hold 'INTL' (4 chars). We widen to text before
-- attaching the CHECK constraint — pg casts existing 'US'/'CA' values cleanly
-- (the trailing-space padding from character(2) is stripped by the USING
-- expression's explicit rtrim so the CHECK compares against literal 'US'/'CA').

ALTER TABLE projects
  ALTER COLUMN country TYPE text
  USING rtrim(country);

ALTER TABLE projects
  ALTER COLUMN country SET DEFAULT 'US';

ALTER TABLE projects
  ADD CONSTRAINT projects_country_chk
  CHECK (country IN ('US', 'CA', 'INTL'));
