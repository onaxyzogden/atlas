# 2026-05-17 — Phase 5.7 automatable subset: real-Postgres blobSync integration spec


**Branch.** `feat/atlas-permaculture`.

Closed the last open item of the Full syncService Coverage plan — the
Phase 5.7 multi-device A→B matrix — at its automatable boundary. A true
two-device run is an operator action; the *mechanical core* (route → real
Postgres round-trip, cross-project isolation, `ON CONFLICT` rev gate +
409 no-clobber + recovery) is now locked by a new real-Postgres
integration spec `apps/api/src/tests/blobSync.integration.test.ts`. It
mirrors the auto-skip-without-DB convention (live DB via
`INTEGRATION_DATABASE_URL`, default the docker-compose dev DB; otherwise
`console.warn` + skip) so the mock-DB unit gate is never broken — the
FIFO `helpers/testApp.ts` ignores SQL params and cannot prove a
`(project_id, store_key)→payload` round-trip. Cases A (PUT baseRev:0 →
200 rev 1 + direct `SELECT` confirms physical persistence), B (P1 two
keys + P2 one key → `GET /project/P1` returns only P1's two, P2 absent),
C (stale baseRev → 409 `{serverRev,serverPayload}`, unchanged-server
GET, then correct-baseRev recovery bumps rev). **Run blocked here:**
`docker: command not found` (no Docker/Postgres in sandbox) → spec
auto-skipped cleanly (3 skipped); `pnpm --filter @ogden/api test` 549
passing (9 boundary/smoke/telemetry/siteAssessmentsPipeline failures =
unchanged pre-existing branch/env baseline, not a regression);
`pnpm typecheck` 3/3 exit 0; no web/shared product code touched. Phase 5
wiki note's 5.7 table filled truthfully (A/B/C "harness added & passing
where a live DB exists; blocked here"; D/E operator-only) + addendum +
**gated follow-up**: `FEATURE_SYNC_STATE_BLOBS` flag NOT flipped
(`flags.ts`/`vite.config.ts` untouched, default-off); flag-flip deferred
until a real two-device A–E pass.
