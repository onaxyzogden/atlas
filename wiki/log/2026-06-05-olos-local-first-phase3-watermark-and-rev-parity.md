# 2026-06-05 — OLOS local-first Phase 3: per-project watermark + olos record rev-parity

**Branch.** `feat/atlas-permaculture` (6 explicit-path commits; **not pushed**).
Phase 3 of `the-goal-is-to-bright-blanket` (field-hub deployment + CRDT remain out
of scope). Closes the two threads Phase 2 left open: the clock-skew/global-scalar
watermark caveat, and the missing live/delta/conflict coverage for the three `olos_*`
record domains. ADR: [[2026-06-05-olos-watermark-and-record-rev-parity]].

**Work-stream A (`cf8f0c52`) — per-project, server-clock-safe watermark.**
`connectivityStore.lastSyncedAt` went `string | null` → `Record<localProjectId, ISO>`,
scalar setter → `get/setLastSyncedAt(projectId)`, with a `version: 1` `migrate` that
drops the old scalar, seeds `{}` (first per-project `changed-since` then sends
`since: undefined` — a `rev`-idempotent full re-pull), coerces non-objects, and
**preserves `conflictedStores`**. **Deleted all three client-clock writes** (`onOnline`
post-flush, `start` after initialSync, boot-flush `.then`) — the server-clock advance
inside `pullActRecordDelta` is now the only writer. Added primitive-returning
`selectMostRecentSync` (lexicographic max) for `OfflineBanner` + `OfflineSyncStatusCard`.
The setter signature change made `tsc` flush out every caller. Closes the Phase 2
clock-skew caveat.

**Slice 3B-1 (`639a6421`) — schema migration 053.** `ALTER TABLE
olos_{observation,proof,verification}_records ADD COLUMN rev BIGINT NOT NULL DEFAULT 0`
(0 = pre-sync sentinel, first authoritative write → 1; rev-0 row + baseRev-0 first push
satisfies `0 <= 0` so the first push wins — coherent with the 409 gate). Pure additive
DDL; `trigger_set_updated_at()` (043) already makes `updated_at` monotonic the moment
`rev` exists.

**Slice 3B-2 (`bbb28ffe`) — server rev + 409 + broadcast + changed-since.** Per olos
route: `mapRow` surfaces `rev`; create sets `rev = 1`; update is rev-gated
(`… rev = rev + 1, updated_at = now() WHERE id = $rec AND rev <= $baseRev`), 0 rows +
`baseRev` → `sync_log` + escalated `failed_records` + `409 {serverRev, serverPayload,
resolution, syncLogId}` exactly as `act-records`; `baseRev` absent → today's COALESCE
update (back-compat). Success broadcasts `record_upserted` author-excluded under
`FLAGS.SYNC_STATE_BLOBS`. Added project-scoped `GET .../olos/{...}/changed-since?since=`
and one generic `POST /:id/olos/conflicts/:syncLogId/resolve`.

**Slice 3B-3 (`042d99d2`) — shared + web wiring.** `apiClient.ts`: olos
`changedSince(serverId, sinceISO?)`, `baseRev` threaded through the three `update()`s,
`api.olos.resolveConflict`. `syncManifest.ts`: three `typed-record` descriptors —
proof/verification reuse `recordKeyedMap()`, observation gets a new
`recordByInnerField('objectiveId')` RecordShape. `syncService.ts`: a dedicated
`executeOlosRecordOp` (branched in from `executeTypedRecordOp` on
`isOlosRecordStoreKey`) handles the **server-assigns-uuid id-transition** the generic Act
transport can't — local-id (`obs-`/`proof-`/`verify-`) create POSTs through the domain
endpoint, strips server-owned fields, rekeys the store entry + `recordBaseRev` to the
returned uuid; uuid update is the rev-gated PATCH, 409 adopts `serverRev` + escalates.
New `pullOlosRecordDelta` reads/advances an **independent `${projectId}::olos`
watermark sub-key** (deliberate deviation from the plan's shared scalar — two
independent `changed-since` streams sharing one scalar would skip each other's un-pulled
gap), calls all three `changedSince`, applies via `applyIncomingRecord`.

**Slice 3B-4 (`7cb0f962`) — conflict-UI reuse (no new UI).** The server `conflicts`
query is project-scoped with no `store_key` filter, so olos conflicts surface through
the SAME `listConflicts` / `SyncConflictsPage` / keep-mine/keep-server controls — only
`resolveRecordConflict` branches the *resolve* write to `api.olos.resolveConflict`.
`hydrateActRecords` generalised → `hydrateTypedRecords(project, descriptors)` with
per-storeKey row dispatch (olos `changedSince` snapshot vs Act `list`), converging any
typed record including single-descriptor post-conflict hydration. Extended
`SyncConflictsPage.test.tsx` with an olos-storeKey fixture (same surface, only storeKey
differs).

**Slice 3B-5 (`5a961da3`) — deterministic olos sync suite.** New
`syncServiceOlosRecord.test.ts` (10 tests, mock-only): `applyIncomingRecord` honours the
SAME three guards for olos storeKeys (version-skew drop+warn-once, rev/echo + stale-rev
drop, §6 pending-push init-clobber) — proving reuse, not a fork; `pullOlosRecordDelta`
pulls all three domains, sums applied rows, and advances the `::olos` sub-key, with an
**independent-watermark regression test** (a future Act watermark must not make olos
issue `since` past its own rows); `executeTypedRecordOp → olos` create-rekey (local
`obs-` → POST → baseRev under server uuid) + stale-409 (adopts serverRev, badges store,
never clobbers). **10/10 green**, run **bounded** (`--pool=forks --testTimeout=20000`
per the Windows vitest rule). Web `tsc` exit 0 (8GB heap).

**Pre-existing, NOT this phase.** `syncManifest.test.ts`'s coverage guard fails on four
**foreign WIP stores** (`ogden-act-evidence`, `ogden-plan-tension-banner`,
`ogden-protocols`, `ogden-review-flags`) from parallel sessions — the three olos stores
classify correctly (the 7-count metadata assertion passes). Filed as a separate task;
this phase's diff is purely additive.

**Flag gate.** All new olos sync behaviour stays behind `FLAGS.SYNC_STATE_BLOBS`
(default OFF), exactly like Phase 2 — flag-off path byte-identical.

**Not automatable (operator-run).** The two-browser live gate (A→B olos
observation/proof edit propagation; B offline → A edits → B online catches up via
`pullOlosRecordDelta`; concurrent edit → existing 409 steward UI fires for the olos row)
needs two authenticated browsers + live WS against native Postgres-17 on 5432 with
`FEATURE_SYNC_STATE_BLOBS=true`. The unit suites prove every guard deterministically.

**Amanah.** Sync transport + evidence/proof capture only — no sales/finance instrument,
no CSRA/salam framing — clean.
