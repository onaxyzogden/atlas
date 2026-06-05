# 2026-05-25 — Builtin `project_type='farm'` enum-conformance fix (422 on /projects/builtins)

**Branch.** `feat/atlas-permaculture`, commit `4ab1e52d` (4 files, +137/−2). Data-integrity
fix for the built-in showcase seeds, plus a forward repair migration and a regression-lock
integration test.

## Problem
The builtin seeds `029_builtin_three_streams_farm.sql` (Three Streams Farm) and
`032_builtin_apricot_lane_citrus.sql` (Apricot Lane Showcase) both inserted
`project_type='farm'`. `projects.project_type` is plain `text` with no DB constraint
(`001_initial.sql:51`), so the bad value persisted silently — but the API parses every row
through the `ProjectSummary` Zod schema, whose `ProjectType` enum allows only
`regenerative_farm | retreat_center | homestead | educational_farm | conservation |
multi_enterprise | moontrance`. `'farm'` is not in that set.

**Effect.** The PUBLIC `GET /api/v1/projects/builtins` and `GET /api/v1/projects` both call
`ProjectSummary.parse(toCamelCase(r))` (`routes/projects/index.ts:75` and `:205`) and threw a
`ZodError` → the global handler returned **422** for any list containing those two builtins.
The web client's `initialSync` (`apps/web/src/lib/syncService.ts`) only `console.error`s and
falls back to local data, so server sync had silently never run. Critically, when
`FLAGS.SYNC_STATE_BLOBS` flips on, blob hydration (`hydrateProjectStateBlobs`, later in the
same `initialSync` try-block) never executes because step 1 already threw — so this is a
prerequisite for the blob-sync flag's hydration path to work end-to-end.

## Decision
Chose **fix-the-seeds** (option a) over **widen-the-enum** (option b). Both showcases are
explicitly *regenerative rehabilitation* projects (Apricot Lane / *The Biggest Little Farm*
polyculture arcs), so `'regenerative_farm'` is the semantically correct type; adding a generic
`'farm'` to the enum would overlap awkwardly with the existing `regenerative_farm` /
`educational_farm` members. User confirmed option (a). The other builtins (016/017) already use
a valid value (`'homestead'`); only 029/032 carried the bad literal. **No new ADR** — contained
bugfix, no architectural choice (the enum and its rationale already exist upstream).

## Change
- Corrected both seeds: `'farm'` → `'regenerative_farm'` (fixes fresh DBs).
- New forward migration `042_fix_farm_project_type.sql`:
  `UPDATE projects SET project_type='regenerative_farm' WHERE project_type='farm'` (repairs
  already-migrated DBs; the migration runner applies it once, tracked in `schema_migrations`).
- New `apps/api/src/tests/integration/builtins-project-type.pgtest.ts` — self-seeding and
  order-independent (seeds its own `org_id` since `resetDb` truncates the migration builtins).

## Verification
Ran the real-PostGIS opt-in suite (`pnpm --filter @ogden/api test:integration`) against a fresh
`postgis/postgis:16-3.4` container; all 46 migrations applied including the corrected 029/032 and
new 042. Both new tests **passed**:
- `returns 200 for a builtin with the corrected regenerative_farm type`
- `reproduces the 422 regression for a legacy farm row, then 042 repairs it` (executes the actual
  042 file, re-hits the public endpoint → 200, asserts zero remaining `'farm'` rows).

This is equivalent to the requested `curl GET /api/v1/projects/builtins → HTTP 200` against a
migrated DB.

## Incidental finding (out of scope, flagged separately)
The same run exposed a **pre-existing** breakage: the shared fixture `seedProject`
(`tests/integration/fixtures.ts`) inserts without `org_id`, which migration 036 made NOT NULL —
so 7 unrelated pgtests fail with `null value in column "org_id" … violates not-null constraint`
(plus environmental Redis `ECONNREFUSED`). My test passes because it seeds `org_id` explicitly.
Left as a separate task chip — not touched here.

## Links
- Unblocks [[concepts/local-first-architecture]] blob-sync (`SYNC_STATE_BLOBS`) hydration.
- Foreign WIP untouched per [[feedback-no-deletion]]; committed by explicit path immediately per
  [[feedback-commit-immediately-on-rebased-branches]].
- Follows [[log/2026-05-25-observe-need-card-as-button-x-dismiss]].
