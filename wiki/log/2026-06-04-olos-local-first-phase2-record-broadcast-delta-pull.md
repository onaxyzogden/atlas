# 2026-06-04 — OLOS local-first Phase 2: typed-record WS broadcast + reconnect delta-pull

**Branch.** `feat/atlas-permaculture` (4 explicit-path commits; **not pushed**).
Phase 2 of the local-first hardening plan `the-goal-is-to-bright-blanket`
(Phases 1–2 only; field-hub deployment + CRDT out of scope). Closes the two
real-time gaps for the four typed-record Act stores — which all flow through the
single generic `synced_records` PUT transport, each row carrying its own monotonic
BIGINT `rev` + `updated_at`. **Problem A (live):** an Act mutation never reached
currently-connected peers. **Problem B (the bigger gap):** a device offline for
hours pushed its queued edits on reconnect but had no *pull* path to learn what
others changed while disconnected — broadcast alone can't fix this since it only
reaches peers connected at broadcast time. ADR:
[[2026-06-04-olos-local-first-record-broadcast-reconnect-delta]].

**Slice 2A (`d2fd8930`) — wire schema.** Added generic `record_upserted` /
`record_deleted` to the `WsEventType` enum + a `SyncedRecordEventPayload` zod
schema (`{ storeKey, projectId, recordId, rev, schemaVersion, payload }`) in
`packages/shared/src/schemas/websocket.schema.ts`. One generic pair, not
one-per-domain — receivers drop any message whose `rev` is not strictly newer.

**Slice 2B (`2298eceb`) — server broadcast + changed-since.** `act-records` route:
the `synced_records` PUT now broadcasts `record_upserted` author-excluded
(`wsBroadcast(projectId, evt, req.userId)`) — one site covers all four stores via
the generic registry. New `GET /act-records/project/:projectId/changed-since?since=<ISO>`
(`WHERE project_id = $1 AND updated_at > $since ORDER BY updated_at ASC`,
`since` defaults to epoch). Client: `api.actRecords.changedSince(serverId, sinceISO?)`
in `apiClient.ts`.

**Slice 2C (`6d4619d7`) — guarded apply + delta-pull + dispatch.** New
`applyIncomingRecord` in `syncService.ts` — the **single guarded apply** shared by
the live WS handler and the reconnect delta-pull. Owns per-record `rev` bookkeeping
(`recordBaseRev`) and three guards: rev/echo (drop non-strictly-newer → author never
double-applies own echo; out-of-order delivery discarded), version-skew (newer-client
record dropped, never downcast, one-shot `toast.warning`), init-clobber (record with a
pending un-synced local push never overwritten — its queued push reconciles). Applies
inside the `setSyncGuard()`/`isSyncing` window so write-through doesn't re-enqueue an
echo. New `pullActRecordDelta` fetches changed-since, applies each row, advances
`lastSyncedAt` to the **newest server `updated_at` seen** (not client wall-clock →
clock-skew-immune); runs FIRST in `onOnline` (before the no-pending early-return) so an
idle all-day-offline device still catches up. `wsService.ts`: dispatch cases route
`record_upserted` → `handleRecordUpserted` (resolves server→local projectId,
fire-and-forget `applyIncomingRecord`); `record_deleted` logs-and-skips (upsert-only
wire, no generic remove hook — forward-compatible, no dead code).

**Slice 2D (`4d8f3b7a`) — verification.** New `syncServiceIncomingRecord.test.ts`,
9 deterministic unit tests pinning every guard (fresh-apply records baseRev; echo +
stale rev dropped; strictly-newer applies; version-skew drop+warn; init-clobber guard;
unknown storeKey no-op) and the delta-pull watermark contract (applies rows + advances
to newest server `updatedAt`; no-rows leaves watermark; null-serverId no API call).
**9/9 + 8/8 sibling regression green**, run **bounded** (`--pool=forks` per the Windows
vitest rule). Web `tsc` exit 0 (clean) confirmed during 2C.

**Behavior changes / caveats (from ADR).**
- **`reconcileOnReconnect` activated** — was defined-but-never-called; now fires on WS
  *re*-open (not first connect), so features + comments also re-fetch on reconnect
  alongside the Act delta-pull.
- **Clock-skew caveat (accepted):** `onOnline`'s post-flush `setLastSyncedAt(client-now)`
  can clobber the server-clock watermark; re-pull is `rev`-idempotent so worst case is one
  redundant fetch. Deferred follow-up.
- **olos observations/proofs broadcasts deferred** — separate tables, no registry-routable
  typed-record client consumer.

**Flag gate.** All typed-record subscribe/hydrate (and these handlers' live effect) stay
behind `FEATURE_SYNC_STATE_BLOBS` (`FLAGS.SYNC_STATE_BLOBS`), default OFF — live
two-browser verification requires the env flag ON.

**Not automatable (operator-run).** The plan's two-browser gate (live A→B propagation;
B offline → A edits → B online catches up via delta-pull; author no self-echo; concurrent
edit → existing 409 steward UI still fires) needs two authenticated browsers + live WS and
`FEATURE_SYNC_STATE_BLOBS=true`; handed to the operator with exact steps. The unit suite
proves every guard deterministically; the live test confirms the wire end-to-end.

**Predecessor.** Phase 1 (`0dae9cdf`, prior session, unlogged until now): moved the four
`SYNCED_STORES` from `localStorage` to an IndexedDB persist backend so a full offline day
doesn't hit the ~5–10 MB origin cap.
