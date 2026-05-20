# 2026-05-17 — Full `syncService` coverage: Phase 4 (hydration + version-skew + visible conflict)


**Branch.** `feat/atlas-permaculture`.

**What.** Executed Phase 4 of the approved Full `syncService` Coverage plan
— the read half P0-1 was still missing (Phase 2 shipped a push-only
shadow). (1) **P4 manifest:** every blob helper became a `BlobShape
{select,apply}`; `applyForProject` now on all 62 `versioned-blob`
descriptors — the project-isolated inverse of `select` via
`store.setState((st)=>patch)` (other projects' rows untouched). (2)
**P4.1/4.3:** new `hydrateProjectStateBlobs(project)` called from
`initialSync`'s step-4 per-project loop **inside `isSyncing=true`** so
applies don't bounce back as pushes; adopts the server `rev` as the next
`baseRev`; clears `temporal()` undo history post-hydrate. (3) **P4.2:**
version-skew guard skips a blob whose `schemaVersion` exceeds the local
descriptor (no stale-`migrate` downcast, rev not adopted, stale slice not
pushed back, one per-session "update Atlas" toast). (4) **P4.4:**
`connectivityStore.conflictedStores` + `add/clearConflictedStore`;
`executeStateBlobOp`'s 409 branch badges the store + warns once — local
slice still not clobbered. P4.5 WebSocket deferred (additive realtime, not
a restore-gate blocker). All behind default-off `FLAGS.SYNC_STATE_BLOBS`.

**TDD.** RED→GREEN watched fail-first for each guard (`syncManifest.test.ts`
+2 round-trip tests, new `syncServiceHydrate.test.ts`,
`syncServiceConflict.test.ts`). Isolation gotcha: `blobBaseRev` and the
skew-warned flag are module-global — hydration tests use distinct project
ids rather than `beforeEach` resets.

**Verify.** `tsc --noEmit` (web, 8 GB) exit 0; web Vitest **981/981**
(80 files); shared 201/201; api projectState 4/4; targeted sync 18/18.
Device B now functionally restores end-to-end with the flag on.

**ADR.** `decisions/2026-05-17-atlas-syncservice-coverage-phase4.md`.
