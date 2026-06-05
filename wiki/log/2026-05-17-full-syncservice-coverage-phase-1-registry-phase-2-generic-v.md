# 2026-05-17 — Full `syncService` coverage: Phase 1 registry + Phase 2 generic versioned-blob transport


**Branch.** `feat/atlas-permaculture`.

**What.** Executed Phases 1–2 of the approved Full `syncService` Coverage
plan — the durable P0-1 fix deferred by the 2026-05-16 bundle-escape-hatch
ADR. Phase 1: `lib/syncManifest.ts` registry + CI coverage guard
(every project-scoped `ogden-` persist store must be classified or the
build fails). Phase 2: `027_project_state_blobs.sql` migration,
`routes/project-state/` Fastify route (explicit `reply.code(409)` so the
`{serverRev,serverPayload}` conflict envelope survives Fastify's
detail-dropping serializer), shared `projectState.schema.ts`, client
`blobSync.ts` + `'state-blob'` queue type + `executeStateBlobOp`. **P2.5b**
(user chose "full 62-store manifest now"): every `versioned-blob`
descriptor given a live store handle + `scope` + `schemaVersion` +
`usesTemporal` + total `selectForProject`; generic flag-gated
(`SYNC_STATE_BLOBS`, default off) debounced subscription loop wired into
`syncService.start()`; in-memory `blobBaseRev` to avoid rev-0 409 lockout.

**TDD.** RED→GREEN throughout. Diagnosed a Vitest mock-tracking artifact
(`vi.mock`+`importActual`+wrapper double-tracks a caught rejection) →
`vi.spyOn` on the real object; `happy-dom` pragma required for persist-store
imports.

**Verify.** `tsc --noEmit` web exit 0; web Vitest **973/973** (78 files,
no regression from 62-store import); shared 7/7; api projectState 4/4 incl.
409-staleness. Phase 2 gate met (transport exercised behind disabled flag;
409 no-clobber/no-infinite-retry). Phases 3 (typed tables) + 4 (hydration,
version-skew, visible conflict surface) + 5 (phased enable) deferred.

**ADR.** `decisions/2026-05-17-atlas-syncservice-coverage-phase1-2.md` +
index pointer. Committed + pushed (single checkpoint commit; the branch's
parallel geodesic-acreage follow-on rode along — `shared/index.ts`
entangles both exports, non-interactive partial-stage unsafe).
