-- 046_project_type_taxonomy.sql
--
-- Hard rename of the ProjectType taxonomy to the OLOS Project-Type +
-- Secondary-Layer Spec v1.2 (13 catalogue types + the `moontrance` sentinel).
-- Three legacy enum values are dropped and backfilled to their nearest v1.2
-- home so the API's ProjectSummary Zod parse keeps succeeding (a legacy value
-- would throw a ZodError -> 422 on the public list endpoints, the same class
-- of bug migration 042 fixed for 'farm'):
--
--   educational_farm  -> education
--   multi_enterprise  -> regenerative_farm
--   retreat_center    -> agritourism      (spec type is "Agritourism / Retreat")
--
-- projects.project_type is plain text (migration 001) with no DB constraint;
-- enforcement lives at the Zod boundary (packages/shared project.schema.ts).
-- This migration therefore only repairs data. Idempotent: re-running matches
-- zero rows once backfilled.

UPDATE projects SET project_type = 'education'         WHERE project_type = 'educational_farm';
UPDATE projects SET project_type = 'regenerative_farm' WHERE project_type = 'multi_enterprise';
UPDATE projects SET project_type = 'agritourism'       WHERE project_type = 'retreat_center';

-- ── Optional hardening (NOT applied) ────────────────────────────────────────
-- The three UPDATEs above cover every value that was ever in the legacy enum,
-- so no conforming row should remain outside the v1.2 set. If a future audit
-- wants a DB-level guard (the first-ever CHECK on this column), apply the two
-- statements below together: the guard first NULLs any out-of-taxonomy
-- straggler (NULL is valid per ProjectSummary.projectType.nullable()), then the
-- CHECK locks the column. Left commented because (a) the project enforces this
-- enum at the Zod layer by design, and (b) adding the CHECK changes the
-- builtins-project-type.pgtest premise from a parse-time to an insert-time
-- failure and must be verified against a PostGIS harness in the same change.
--
-- UPDATE projects SET project_type = NULL
--   WHERE project_type IS NOT NULL
--     AND project_type NOT IN (
--       'homestead','regenerative_farm','market_garden','orchard_food_forest',
--       'silvopasture','ecovillage','agritourism','education','conservation',
--       'off_grid','wellness','nursery','residential','moontrance'
--     );
-- ALTER TABLE projects ADD CONSTRAINT projects_project_type_check CHECK (
--   project_type IS NULL OR project_type IN (
--     'homestead','regenerative_farm','market_garden','orchard_food_forest',
--     'silvopasture','ecovillage','agritourism','education','conservation',
--     'off_grid','wellness','nursery','residential','moontrance'
--   )
-- );
