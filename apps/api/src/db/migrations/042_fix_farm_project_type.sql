-- Migration 042 — repair invalid 'farm' project_type
--
-- The builtin seeds in 029 (Three Streams Farm) and 032 (Apricot Lane Citrus)
-- originally inserted project_type = 'farm'. The projects.project_type column is
-- plain text with no DB constraint, so the bad value persisted silently — but
-- the API parses every row through the ProjectSummary Zod schema, whose
-- ProjectType enum only allows regenerative_farm | retreat_center | homestead |
-- educational_farm | conservation | multi_enterprise | moontrance. 'farm' is not
-- in that set, so GET /projects and GET /projects/builtins threw a ZodError →
-- 422 for any list containing these two builtins.
--
-- The seeds in 029/032 are now corrected to 'regenerative_farm' for fresh DBs.
-- This forward migration repairs DBs that already applied the old seeds.

UPDATE projects
SET project_type = 'regenerative_farm'
WHERE project_type = 'farm';
