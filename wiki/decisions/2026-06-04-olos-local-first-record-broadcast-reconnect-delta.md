# ADR: Generic record WS broadcast + reconnect delta-pull for typed-record Act stores

**Date:** 2026-06-04
**Status:** accepted

**Context:**
OLOS is being hardened as a *local-first* app for a small (2–6 person) trusted
field team where full days offline are the normal case, not the exception (plan
`the-goal-is-to-bright-blanket`, Phases 1–2 only; on-site field-hub deployment
and CRDT migration explicitly out of scope). The existing real-time layer
broadcast only design features, comments, and presence. The four typed-record
Act stores (`ogden-field-actions`, `ogden-observe-feed`,
`ogden-observe-data-points`, `ogden-observe-cycles`) — all of which flow through
the single generic `synced_records` PUT transport, each row carrying its own
monotonic BIGINT `rev` and `updated_at` — had **two gaps**:

- **Problem A (live):** a teammate's Act mutation never reached currently-connected
  peers — they only saw it on a later full refetch.
- **Problem B (catch-up, the bigger gap):** a device offline for hours *pushed*
  its queued edits on reconnect but had no *pull* path to learn what others
  changed while it was disconnected. Live WS broadcast alone cannot solve this —
  it only reaches peers connected *at broadcast time*.

**Decision:**
1. **One generic pair of WS events**, not one-per-domain:
   `record_upserted` / `record_deleted` carrying
   `{ storeKey, projectId, recordId, rev, schemaVersion, payload }`
   (`SyncedRecordEventPayload` in `websocket.schema.ts`). Receivers drop any
   message whose `rev` is not strictly newer than what they hold.
2. **Server broadcasts on the `synced_records` PUT** (`act-records` route),
   author-excluded via `wsBroadcast(projectId, event, req.userId)`. This single
   site covers all four typed-record stores via the generic registry.
3. **A single guarded client apply — `applyIncomingRecord`** in `syncService.ts`
   — shared by both the live WS handler and the reconnect delta-pull. It owns the
   per-record `rev` bookkeeping (`recordBaseRev`) and three guards: rev/echo
   (drop non-strictly-newer → author never double-applies own echo; out-of-order
   delivery discarded), version-skew (a record saved by a newer client is dropped,
   never downcast, with a one-shot `toast.warning`), and the init-clobber guard
   (a record with a pending un-synced local push is never overwritten — its queued
   push reconciles instead). The apply runs inside the `setSyncGuard()` /
   `isSyncing` window so the write-through subscription does not re-enqueue an echo.
4. **A reconnect delta-pull — `pullActRecordDelta`** — fetches a new
   `GET /act-records/project/:projectId/changed-since?since=<ISO>` endpoint
   (server-side `WHERE updated_at > $since ORDER BY updated_at ASC`), applies each
   row through `applyIncomingRecord`, and advances the `lastSyncedAt` watermark to
   the **newest server `updated_at` seen** (not client wall-clock → immune to
   client clock skew). It runs FIRST in `onOnline` (before the no-pending
   early-return) so an idle, all-day-offline device still catches up.
5. **`record_deleted` is handled defensively (log-and-skip)** this phase: the wire
   is upsert-only and the `SyncedStoreDescriptor` registry has no generic remove
   hook. Forward-compatible, no dead code.
6. **olos observations/proofs broadcasts deferred** — they live on separate tables
   with no registry-routable typed-record client consumer; out of this phase's
   clean surface.

**Consequences:**
- Phase 2 ships entirely on the generic registry surface — no per-domain wiring,
  so future typed-record stores get live + catch-up sync for free.
- **`reconcileOnReconnect` was activated.** It was previously defined-but-never-called;
  it now fires on WS *re*-open (not first connect). Side effect: features and
  comments now also re-fetch on reconnect, alongside the new Act delta-pull.
- **Clock-skew caveat (accepted, not fixed):** `onOnline`'s post-flush
  `setLastSyncedAt(client-now)` can clobber the server-clock watermark that
  `pullActRecordDelta` sets. Accepted for a trusted small team — re-pull is
  `rev`-idempotent, so the worst case is one redundant fetch. Flagged as a deferred
  follow-up.
- All typed-record subscribe/hydrate (and therefore these handlers' live effect)
  remain gated behind `FEATURE_SYNC_STATE_BLOBS` (`FLAGS.SYNC_STATE_BLOBS`),
  default OFF — so live two-browser verification requires the env flag ON.
- Verified by 9 deterministic unit tests (`syncServiceIncomingRecord.test.ts`,
  commit `4d8f3b7a`) covering every guard + the watermark contract; the two-browser
  live test is operator-run (cannot be honestly automated single-session).

Builds on Phase 1 (commit `0dae9cdf`, prior session): the four `SYNCED_STORES`
moved from `localStorage` to an IndexedDB persist backend so a full offline day
does not hit the ~5–10 MB origin cap. Continues the syncService coverage line:
[2026-05-17-atlas-syncservice-coverage-phase1-2](2026-05-17-atlas-syncservice-coverage-phase1-2.md),
[2026-05-31-atlas-project-sync-hardening](2026-05-31-atlas-project-sync-hardening.md),
[2026-05-25-atlas-sync-circuit-breaker](2026-05-25-atlas-sync-circuit-breaker.md).
