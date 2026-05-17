# ADR: Full `syncService` coverage — Phase 1 (registry) + Phase 2 (generic versioned-blob transport)

**Date:** 2026-05-17
**Status:** accepted (Phases 1–2 of 5 shipped; behind a default-off flag)
**Supersedes the deferral in:** [2026-05-16 Multi-device project-bundle escape hatch](2026-05-16-atlas-multi-device-bundle-escape-hatch.md)

## Context

The bundle-escape-hatch ADR shipped a *manual* whole-namespace export/import
and documented the partial-sync boundary, but explicitly deferred the durable
fix (P0-1): `syncService` write-through covered only 4 slices
(projects/zones/structures/comments); ~62 other project-scoped `ogden-`
persist stores were localStorage-only even when authenticated, so a
multi-device tester silently lost the entire v3 design surface. This ADR
records the durable fix, executed per the approved phased plan, Phases 1–2.

## Decision

**Phase 1 — registry as single source of truth.** New
`apps/web/src/lib/syncManifest.ts`: `SYNCED_STORES: SyncedStoreDescriptor[]`
classifying every project-scoped store as `typed-design-feature` (already on
the `design_features` path — blob path forbidden, no double-write),
`typed-table` (vegetation/succession, Phase 3), or `versioned-blob` (the
write-mostly remainder). Explicit `DEVICE_GLOBAL` set mirrors the
`projectBundle.ts` denylist. A Vitest coverage guard
(`__tests__/syncManifest.test.ts`) scans store source for the persist
`name:` (resolving const-referenced keys) and **fails the build** the moment
a persisted `ogden-` store is neither in `SYNCED_STORES` nor `DEVICE_GLOBAL`
— that enumeration gap was the original P0-1 and is now un-regressable.

**Phase 2 — generic versioned-blob transport (push-only shadow).**
- Backend: migration `027_project_state_blobs.sql`
  (`PRIMARY KEY (project_id, store_key)`, monotonic `rev`, `schema_version`,
  `ON DELETE CASCADE`); Fastify `routes/project-state/` reusing
  `[authenticate, resolveProjectRole, requireRole]`; PUT does
  `INSERT … ON CONFLICT … DO UPDATE … WHERE rev <= :baseRev`. A stale write
  is **not thrown** (the default Fastify error serializer drops `details`) —
  it is sent explicitly as `reply.code(409)` with `{ serverRev,
  serverPayload }` so the conflict contract survives the wire.
- Shared: Zod `projectState.schema.ts` (`payload: z.unknown()`), exported
  from the package index.
- Client: `blobSync.ts` (`buildBlobEnvelope` pins `envelopeSchema: 1`;
  `pushProjectStateBlob` → `ok`/`conflict`, conflict duck-typed on
  `err.status === 409` because module mocks split `ApiError` identity);
  `'state-blob'` added to `SyncStoreType`; `executeStateBlobOp` queue case
  (resolves serverId at flush, not enqueue); a generic flag-gated
  subscription loop (`subscribeVersionedBlobs`, per-store ~800 ms debounce,
  `isSyncing` guard) wired into `syncService.start()`.
- **Phase 2.5b (this session's deliverable):** all **62** `versioned-blob`
  descriptors now carry a live store handle + `scope`
  (`active-singleton`/`byProject`/`projectId-tagged`) + `schemaVersion`
  (= persist `version`) + `usesTemporal` + a total `selectForProject`
  (scope-typed helpers `whole`/`byKey`/`tagged`/`taggedFind`, plus a bespoke
  `agribusinessSelect` for its mixed tagged+byProject shape). An in-memory
  `blobBaseRev` map prevents repeated pushes colliding on rev 0 → permanent
  409; on conflict the client adopts `serverRev` as the new base and logs
  (the **visible** reconcile — toast + Connectivity badge — is Phase 4, and
  the local slice is deliberately **not** silently clobbered back).

## Consequences

- The whole generic path is gated by the default-off
  `FLAGS.SYNC_STATE_BLOBS` (`packages/shared/src/constants/flags.ts`):
  Phase 2 is a **push-only shadow** — no hydration, zero user-visible change
  until enabled. Hydration ordering, version-skew guard, and the visible
  conflict surface are **Phase 4**; typed tables for vegetation/succession
  are **Phase 3**.
- The manifest now imports all 62 stores into the `syncService` graph; full
  web suite **973/973** green and `tsc --noEmit` clean confirm no regression.
- TDD throughout (RED watched fail first): a long-standing 2-failing-test
  mystery in `blobSync.test.ts` was diagnosed as a Vitest artifact —
  `vi.mock` + `importActual` + a wrapper around a `vi.fn()` double-tracks the
  mock's rejection as an independent uncaught failure even when production
  code catches it; remedy is `vi.spyOn` on the real imported object. Tests
  importing Zustand `persist` stores need `// @vitest-environment happy-dom`.
- `projectBundle.ts` stays the offline backup; its data-loss banner is not
  dropped until the phased enable completes (Phase 5).

## Verification

`tsc --noEmit` (web) exit 0; web Vitest 973/973 (78 files); shared schema
7/7; api `projectState` 4/4 incl. the 409-staleness spec; manifest coverage
guard + transport-metadata + selector-smoke guards green. Phase 2 gate met:
generic transport exercised behind the disabled flag; 409 rejects a stale
rev without clobber or infinite retry. Multi-device manual matrix is a
Phase 4/5 gate (requires hydration, not yet enabled).
