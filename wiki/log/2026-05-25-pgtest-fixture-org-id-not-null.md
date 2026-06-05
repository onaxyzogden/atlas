# 2026-05-25 — fix(api): pgtest `seedProject` seeds `org_id` (NOT NULL since migration 036)

Branch `feat/atlas-permaculture`. Closed the pre-existing fixture bug flagged at
the end of the 2026-05-25 `project_type` enum-conformance entry
([[entities/api]]).

## Problem
Migration `036_org_id_required_on_projects.sql` made `projects.org_id` NOT NULL,
but the shared integration-test fixture `seedProject`
(`apps/api/src/tests/integration/fixtures.ts:29`) inserted a project row without
`org_id`:

```
INSERT INTO projects (owner_id, name, country, acreage) VALUES (...)
```

Every pgtest that calls `seedProject` failed at insert time with
`null value in column "org_id" of relation "projects" violates not-null
constraint` — 7 integration tests across `replay-evidence-audit`,
`site-assessment-writer`, `regeneration-events`, `boundary`,
`telemetry-client-errors`, and `telemetry-act-interactions`. They had been
green only when Docker was absent and the suite green-skipped.

## Fix
Option (a) — least disruptive. `seedProject` now creates an organization
internally (`orgId = opts.orgId ?? await seedOrganization(sql)`) and includes
`org_id` in the INSERT. Added an optional `orgId` opt so callers can share one
org if needed. No existing callers required changes — they pass only
`name`/`country`/`acreage`. Pattern mirrors `builtins-project-type.pgtest.ts`,
which already seeded `org_id` explicitly via `seedOrganization`.

## Verification
`pnpm --filter @ogden/api test:integration` against a live
`postgis/postgis:16-3.4` testcontainer (Docker Linux-containers): **7 files /
12 tests passed** (≈26s). All formerly-failing suites now green.

Redis `ECONNREFUSED 127.0.0.1:6379` log noise is environmental (no Redis
running) and no assertion depends on it — left untouched per the task brief.

## Files
- `apps/api/src/tests/integration/fixtures.ts` (only file changed)
