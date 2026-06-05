# 2026-05-03 — `GET /projects/builtins` API endpoint + migration 016


New public (unauthenticated) endpoint in `apps/api/src/routes/projects/index.ts`
returns the 351 House demo project by sentinel UUID
(`00000000-0000-0000-0000-0000005a3791`).

**Migration `016_builtin_sample_project.sql`** — inserts a sentinel service
user (`00000000-0000-0000-0000-000000000001`, `auth_provider = 'system'`) and
the 351 House project row with `ON CONFLICT DO NOTHING`. Applied against
local dev DB (row already existed from earlier manual seed — idempotent).

**Route** — `GET /projects/builtins` registered before `/:id` (avoids
Fastify matching `"builtins"` as a param). No `preHandler` — fully public.
`acreage` and `data_completeness_score` cast to `float8` in the SELECT to
prevent Zod `invalid_type` errors (PostgreSQL `numeric` columns are returned
as strings by the postgres.js driver).

**CORS** — `CORS_ORIGIN` changed from a single string to a comma-separated
list; `app.ts` splits it into an array. Default now includes both
`http://localhost:5200` (apps/web) and `http://localhost:5300` (apps/atlas-ui).
Production deployments set `CORS_ORIGIN` explicitly as a single value.

**Smoke test** — `atlas-ui` browser context (`localhost:5300`) fetches the
endpoint cross-origin: `status 200 · name "351 House — Atlas Sample" · CA/ON ·
11.95 ha · hasParcelBoundary true`.

Next: replace `builtin-sample.js` static `project`/`siteBanner` top-level
constants with a `useBuiltinProject()` hook that reads from this endpoint.
