# ADR: Full `syncService` coverage — Phase 3 (typed tables: vegetation + succession)

**Date:** 2026-05-17
**Status:** accepted (Phase 3 shipped; behind default-off `FLAGS.SYNC_STATE_BLOBS`)
**Builds on:** [2026-05-17 Phases 1–2](2026-05-17-atlas-syncservice-coverage-phase1-2.md), [Phase 4](2026-05-17-atlas-syncservice-coverage-phase4.md), [Phase 5](2026-05-17-atlas-syncservice-coverage-phase5.md)

## Context

Phases 1–2/4/5 cover the 62 `versioned-blob` stores. Two stores were pinned
`typed-table` from the start because the server should *query/reason* about
them, not treat them as an opaque envelope: `vegetationStore`
(`ogden-vegetation`) and the ACT succession store (`ogden-act-succession`).
Phase 3 (deferred at end of Phase 5) builds their real Postgres tables,
routes, and a dedicated client write-through/hydrate path so a multi-device
authenticated tester restores vegetation + succession on device B without
the blob loop ever touching them.

## Decision

**P3-c1 — schema + migration.** New migration `028_*` adds two real-column
tables (`vegetation_patches`, `succession_milestones`). `id` is **`text`,
not `uuid`** — succession ids are `sm-<ts>-<rand>`, vegetation ids are
UUID-shaped but client-minted. Zod schemas in `packages/shared`
(`vegetation.schema.ts`, `succession.schema.ts`) use `z.string().min(1)`
ids; Create input id is **optional** (server falls back to
`gen_random_uuid()::text`), exactly the `machinery_items` idiom.

**P3-c2 — routes.** Fastify collection routes mirror `design-features`:
`POST` create / `PATCH` by id / `DELETE` owner-only / `GET` list, reusing
`[authenticate, resolveProjectRole, requireRole]` and `logActivity`. The
shared mock-DB (`testApp.ts`) gained `.unsafe`/`.json` (additive,
`Object.assign`, no regression); `created_at` uses
`COALESCE(${createdAt ?? null}, now())` — an **embedded `db\`now()\``
fragment shifts the mock queue and corrupts row ordering**, so it is
forbidden in test-exercised paths. A guard test asserts neither route
source string-contains `design_features` (3.3 no-double-write, API side).

**P3-c3 — client write-through.** **Client-supplied-id, no `serverId`
field, no writeback.** The id is stable from creation, so there is no
POST→serverId→PATCH roundtrip — this is deliberate: vegetationStore is a
`temporal()` undo store and a serverId writeback would pollute the undo
stack. Create→POST under the project serverId, update→PATCH by id (content
diff, neither record carries `updatedAt`), delete→DELETE by id + dequeue.
Any API failure enqueues a typed retry op (`storeType: 'vegetation' |
'succession'` added to `SyncStoreType`); never silently dropped.
`subscribeToVegetation`/`subscribeToSuccession` ride the SAME
`FLAGS.SYNC_STATE_BLOBS` gate so typed sync cannot activate before the
Phase 5 rollout matrix.

**P3-c4 — device-B hydration.** `hydrateTypedTables(project)` mirrors
`mergeDesignFeatures` (NOT the blob path): server-wins per id, local-only
records for *this* project are pushed up so an offline-created record is
never lost, no cross-project clobber. Called from `initialSync` after
`mergeDesignFeatures`, inside the `isSyncing` window, flag-gated.

**P3-c5 — coverage guard.** `syncManifest.test.ts` pins
`ogden-vegetation`/`ogden-act-succession` to `typed-table` and asserts
neither leaks into the `versioned-blob` filter (belt-and-braces against the
blob loop double-writing the typed tables / polluting temporal undo).
Verified the guard fails on a flipped classification before locking it in.

## Consequences

- Vegetation + succession now have a queryable server home and a full
  multi-device round-trip path; the typed-table half of P0-1 is closed.
- Zero user-visible change with the flag off (parity with Phases 1–5).
- The blob loop and the typed path are mutually exclusive by manifest
  classification, enforced by the coverage guard.
- Phase 3 closes the last deferred item of the full `syncService` coverage
  plan; only the Phase 5.7 manual multi-device matrix (flag-on) remains
  operational, not code.

## Verification

`pnpm typecheck` (3/3) exit 0; web Vitest **1073/1073** (86 files, +2 new:
`syncServiceTyped`, `syncServiceTypedHydrate`; `syncManifest` 10/10 incl.
the P3-c5 pin); shared 213/213; api `vegetationSuccession` 8/8 (incl. the
3.3 no-double-write guard) + 549 passing. The 9 api failures in
boundary/smoke/telemetry/siteAssessmentsPipeline are a pre-existing branch
baseline (confirmed by stash before P3), unrelated to this work.
