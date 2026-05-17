# ADR: Full `syncService` coverage — Phase 4 (hydration + version-skew + visible conflict)

**Date:** 2026-05-17
**Status:** accepted (Phase 4 of 5 shipped; still behind default-off `FLAGS.SYNC_STATE_BLOBS`)
**Builds on:** [2026-05-17 Phases 1–2](2026-05-17-atlas-syncservice-coverage-phase1-2.md)

## Context

Phases 1–2 shipped the registry + a **push-only shadow**: 62 `versioned-blob`
stores write their project slice to `project_state_blobs`, but nothing read
it back, so device B still restored nothing — P0-1's read half was open. The
conflict path logged-and-swallowed (`"conflict surface pending Phase 4"`).
Phase 4 closes the read side: hydration, the version-skew guard, temporal
undo-frame suppression, and the visible (never-silent) conflict surface.

## Decision

**P4 manifest — `applyForProject`.** Each blob helper became a `BlobShape`
`{ select, apply }` (was select-only); `blob()` populates both
`selectForProject` and `applyForProject` on all 62 descriptors. `apply` is
the inverse of `select` and **project-isolated**: it writes only the active
project's rows via `store.setState((st) => patch)` and leaves every other
project's rows untouched (`whole` shallow-merges; `byKey` sets
`record[pid]` / `record[pid][leaf]`; `tagged` replaces this project's rows
in each field, keeping others; `taggedFind` replaces the single owned row;
`agribusinessSelect` mixed). The coverage guard now also asserts every blob
descriptor has a callable `applyForProject` and round-trips select→apply.

**P4.1/4.3 — hydration.** New `hydrateProjectStateBlobs(project,
descriptors=SYNCED_STORES)` (descriptors injectable for tests) is called
from `initialSync`'s step-4 per-project loop, **inside the existing
`isSyncing = true` window** so `applyForProject` mutations do not bounce
back out through `subscribeVersionedBlobs` as fresh pushes. It `GET`s all
blobs, matches each by `storeKey` to a `versioned-blob` descriptor, applies
the slice, adopts the server `rev` as the next push's `baseRev` (no instant
409 storm after restore), and for `usesTemporal` stores calls
`temporal.getState().clear()` so the restore is not a user-undoable frame.
Gated by `FLAGS.SYNC_STATE_BLOBS` (still default-off).

**P4.2 — version-skew guard.** A blob whose `schemaVersion` exceeds this
client's descriptor version is **skipped** (never downcast through a stale
`migrate`), the `rev` is **not** adopted, the stale local slice is **not**
pushed back, and a single per-session `toast.warning` ("update Atlas")
fires.

**P4.4 — visible conflict surface.** `connectivityStore` gains
`conflictedStores: string[]` + `addConflictedStore`/`clearConflictedStore`.
`executeStateBlobOp`'s 409 branch now badges the store and warns the user
once per newly-conflicted store — the local slice is still **not** clobbered
(the reconcile is the user's; no silent auto-pick).

**P4.5 WebSocket push-notify — deferred.** Additive realtime; not required
for the multi-device-restore gate.

## Consequences

- Device B now actually restores the full versioned-blob design surface
  once `FLAGS.SYNC_STATE_BLOBS` is enabled — the durable P0-1 fix is
  functionally complete end-to-end (read + write), pending only the phased
  enable + multi-device manual matrix (Phase 5).
- Still zero user-visible change with the flag off; `projectBundle.ts`
  remains the offline backup until Phase 5.
- TDD RED→GREEN throughout (each guard watched fail first). Test isolation
  note: `blobBaseRev` and the version-skew-warned flag are module-global —
  hydration tests must use distinct project ids, not `beforeEach` resets.
- Phase 3 (typed tables for vegetation/succession) and Phase 5 (phased
  enable + multi-device matrix + relabel `projectBundle.ts` offline-only)
  remain.

## Verification

`tsc --noEmit` (web, 8 GB) exit 0; web Vitest **981/981** (80 files, +2 new
test files: `syncServiceHydrate`, `syncServiceConflict`; `syncManifest`
+2 round-trip tests); shared 201/201; api `projectState` 4/4. Targeted
sync suite 18/18 incl. apply-isolation, version-skew skip-and-warn,
temporal-clear, and 409 badge-and-warn-no-clobber. Multi-device manual
matrix is the Phase 5 gate (requires the flag enabled).
