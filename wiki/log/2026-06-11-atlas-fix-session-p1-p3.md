# 2026-06-11 — Fix session: P1–P2 backlog executed, 3 audit findings corrected

**Branch:** main (canonical line; nothing pushed — push requires operator approval). **Scope:** execute the P1–P3 backlog from the same-day deep audit. Operator decisions: P2 = ClaudeClient on-demand wiring only (SocialFabric/InfraCondition port deferred to its own session); P3 = document-only (all are intentional phase deferrals).

## Commits (all main, unpushed)

| Commit | What |
|---|---|
| `c2f12f08` | fix(api): Scalar spec path `'../../openapi.yaml'` → `'../openapi.yaml'` (the endpoint itself was never missing — see corrections below) |
| `da54f252` | fix(api): `@fastify/jwt` ^9.0.1 → ^10.1.0, clearing fast-jwt 5.0.6's three critical advisories (GHSA-mvf2-f6gm-w987, GHSA-rp9m-7r4c-75qg, GHSA-gmvf-9v4p-v8jc) |
| `aebb284f` | ci(api): `pnpm audit --prod --audit-level high` gate |
| `34919805` | feat(api): portal per-route rate limits (60/min JSON, 10/min PDF, env-tunable) + best-effort 5-min Redis cache `portal:v1:<token>` with explicit invalidation from all 3 mutations; no negative caching; PDF uncached. Closes the API half of decision D2+D4; CDN/ISR half still open. 24/24 tests |
| `911059ec` | feat(web): `layer_complete` WS bursts → per-project 2 s debounced `refreshProject`; shared `siteFetchArgs.ts` centroid/bbox helper. 6/6 tests |
| `a9adc990` | feat(ai): `POST /ai/project/:projectId/generate-outputs` (auth + RBAC, 503 unconfigured, 5-min freshness debounce, `force`); web `aiEnrichment` narrative/recommendation rewired to it, deleting the duplicated client-side prompts. 8/8 route tests + 38/38 adjacent AI tests |

Verification: all vitest runs bounded (`--pool=forks`, explicit timeouts); api + web `tsc --noEmit` clean (web requires `NODE_OPTIONS=--max-old-space-size=8192`).

## Corrections of record — supersedes the audit entry's backlog claims

This entry **supersedes** three claims in [[2026-06-11-atlas-deep-audit-report-only]] (and the corresponding rows in `ATLAS_DEEP_AUDIT_2026-06-11.md` §3, now corrected by its appended §7 resolution log):

1. **P2 #5 "observeCycleStore has no server bootstrap" was FALSE.** The store is registered for typed-record sync at `syncManifest.ts:870` (`recordKeyedMap('currentCycleId')`); `hydrateTypedRecords` bootstraps it per-project on load; WS `record_upserted` applies multi-device updates. localStorage is the offline-first layer, not the only hydration. No stale-cycle-id corruption path exists when `MULTI_USER` sync is on. Nothing was built; the record is corrected.
2. **P1 #4 "Scalar docs dep unused" was FALSE.** Registered since 04-11 (`app.ts:419-427`, dev-only `/api/docs`). The real defect was the spec path, fixed in `c2f12f08`.
3. **P1 #3's CVE claim was wrong.** The audit cited CVE-2023-48223 (fast-jwt <3.3.2 — did not apply). The live `pnpm audit` showed fast-jwt **5.0.6** with three *different* criticals, fixed via the jwt major bump above.

Also partially stale: P2 #8 — since `96f69390` the ClaudeClient narrative/design-rec methods WERE called by the `narrative-generation` BullMQ worker; only the on-demand trigger + client-side prompt duplication remained, now closed.

## Amanah note

No fiqh-relevant content touched. Portal caching holds only already-published read-only payloads; unpublish invalidation is immediate and awaited (no stale public exposure of withdrawn content).

## Deferred (recorded, not forgotten)

- SocialFabric/InfraCondition capture port from phase-3d — own session (operator decision), see [[project-phase3d-canonical]] context.
- vitest v2→v3 major; serialize-javascript dev-chain high; 3 pinned prod moderates (maplibre-gl→protocol-buffers-schema, bullmq→uuid, @aws-sdk→fast-xml-parser).
- `trustProxy` unset — behind a reverse proxy all visitors share one IP rate-limit bucket (pre-launch follow-up).
- CDN/ISR half of decision D2; all P3 phased items stand in their owning backlogs.
