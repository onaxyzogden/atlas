# 2026-05-10 — Fix `numeric`-as-string serialization in projects routes


End-to-end verification of the Affinity telemetry pipeline surfaced a
latent bug in the projects HTTP API: every SELECT/RETURNING projection
in `apps/api/src/routes/projects/index.ts` was returning `acreage` and
`data_completeness_score` as JS strings (postgres-js's faithful default
for `numeric` columns), and the shared `ProjectSummary` Zod schema
requires `z.number().nullable()`. Both `GET /api/v1/projects` (auth'd)
and `GET /api/v1/projects/builtins` (public) were therefore 500-ing
whenever any returned row had a non-null acreage or DCS — which is the
common case.

Symptom on the v3 client: `syncService.initialSync()` errored silently,
the projectStore never gained the current user's projects, and
`hydrateBuiltins()` always fell through to `LOCAL_BUILTIN_FALLBACK`.
Stale local-only entries from prior sessions persisted, producing
"No project loaded" for any URL whose project id wasn't reflected in
the cached `ogden-projects` localStorage key.

Fix: cast both columns to `float8` at the SQL boundary in all six call
sites (`/builtins`, `/`, POST `/`, GET `/:id`, PATCH `/:id`, POST
`/:id/boundary`). Matches the existing convention already used by the
`/builtins/assessment` route (`sa.overall_score::float8`).

Files:

- `apps/api/src/routes/projects/index.ts` — six casts added.

Verification:

- `curl /api/v1/projects/builtins` → 200, valid `ProjectSummary[]`.
- `curl -H "Authorization: …" /api/v1/projects` → 200, returns the
  authenticated user's owned + shared + builtin projects.
- Browser at `/v3/project/<owned-id>/home` now renders the live project
  (verdict, health strip, bento Affinity-telemetry tile populated).
