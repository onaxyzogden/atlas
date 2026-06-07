# ADR: Per-project server-clock watermark + olos record rev-parity sync

**Date:** 2026-06-05
**Status:** accepted

**Context:**
Phase 3 of the local-first hardening plan `the-goal-is-to-bright-blanket`
(field-hub deployment + CRDT migration remain explicitly out of scope). Phase 2
([[2026-06-04-olos-local-first-record-broadcast-reconnect-delta]]) shipped live
broadcast + reconnect delta-pull for the four typed-record **Act** stores and
knowingly left two threads open:

- **Thread A — the watermark.** `pullActRecordDelta` advances `lastSyncedAt` to
  the newest *server* `updated_at` (clock-skew-immune), but `onOnline`/`start`
  then overwrote it with the *client* wall clock — a fast/skewed clock could skip
  rows stamped in the skew window. Exploration surfaced a second, latent bug: the
  watermark was a single **global scalar** while `changed-since` is issued **per
  project**, so project A's pull advanced the shared value past project B's last
  real sync and B silently skipped the gap.
- **Thread B — olos coverage.** The three `olos_*` record domains (observations,
  proofs, verifications; tables in migration 043) carried no `rev` column, weren't
  in `SYNCED_STORES`, are keyed differently (observations by `objectiveId`,
  proofs/verifications by `taskId`+id), and the only consumer pulled once on mount.
  They had no live/delta/conflict parity with the Act path.

**Decision:**

1. **Watermark becomes a per-project, server-clock-only map.**
   `connectivityStore.lastSyncedAt: string | null` → `Record<string, string>` keyed
   by **local** `projectId` (stable; `serverId` is only the API arg). Replaced the
   scalar setter with `getLastSyncedAt(projectId)` / `setLastSyncedAt(projectId, ts)`;
   added `version: 1` + a `migrate` that drops the old scalar and seeds `{}` (empty
   map ⇒ first post-upgrade `changed-since` per project sends `since: undefined`, a
   full epoch re-pull that is `rev`/`updatedAt`-idempotent), coercing a non-object
   value to `{}` and **preserving `conflictedStores`**. **Deleted all three
   client-clock writes** (`onOnline` post-flush, `start` after initialSync, boot-flush
   `.then`) — the per-project server-clock advance inside `pullActRecordDelta` is now
   the *only* writer. An exported, primitive-returning `selectMostRecentSync(state)`
   (lexicographic max over the map — ISO-8601 sorts correctly) feeds the two global
   chrome consumers (`OfflineBanner`, `OfflineSyncStatusCard`). The setter
   signature change makes `tsc` flag every un-migrated caller — the cheap guarantee
   nothing was missed.

2. **olos records get full rev-parity by reuse, not rebuild.** Canonical data stays
   single-sourced in the `olos_*` tables (we add `rev` there, migration 053 — `BIGINT
   NOT NULL DEFAULT 0`, 0 = pre-sync sentinel, first authoritative write → 1). Per
   route: `mapRow` surfaces `rev`; create sets `rev = 1`; update is rev-gated
   (`UPDATE … SET …, rev = rev + 1, updated_at = now() WHERE id = $rec AND rev <=
   $baseRev`), 0 rows + supplied `baseRev` → write `sync_log` + escalated
   `failed_records` and `reply.code(409)` with `{serverRev, serverPayload, resolution,
   syncLogId}` exactly as `act-records`; `baseRev` absent → today's COALESCE update
   (back-compat for non-sync callers). Create/update success broadcasts
   `record_upserted` author-excluded when `FLAGS.SYNC_STATE_BLOBS`. Added project-scoped
   `GET .../olos/{...}/changed-since?since=` and one generic
   `POST /:id/olos/conflicts/:syncLogId/resolve` (keep_mine UPDATEs the table picked by
   `sync_log.store_key`; keep_server is a read no-op).

3. **storeKeys = the stores' persist names** (`ogden-olos-observation-records`,
   `ogden-olos-proof-records`, `ogden-olos-verification-records`), registered as three
   `typed-record` descriptors in `syncManifest.ts`. Proof/verification reuse
   `recordKeyedMap()`; observation needed a minimal new `recordByInnerField('objectiveId')`
   RecordShape (select emits one entry per inner value keyed by `String(value.id)`; apply
   replaces the inner entry whose `.id === recordId`, else sets `byProject[pid][objectiveId]`).

4. **`applyIncomingRecord` is already storeKey-generic — reused verbatim** for olos.
   But the **server assigns uuids** while local drafts use `obs-`/`proof-`/`verify-`
   prefixes, an id-transition the generic Act PUT transport can't model. So a dedicated
   `executeOlosRecordOp` owns the olos push: a local-id create POSTs through the domain
   endpoint (reading `taskId` from the payload), strips server-owned fields, rekeys the
   store entry to the returned uuid, and re-homes `recordBaseRev` under the uuid; a
   uuid update is the rev-gated PATCH, and a 409 adopts `serverRev` + escalates via the
   existing steward surface. `executeTypedRecordOp` branches to it on
   `isOlosRecordStoreKey(storeKey)`.

5. **A second, independent watermark sub-key for olos** — `${projectId}::olos` — NOT
   the shared Act watermark. **This is a deliberate deviation from the plan**, which
   specified one shared per-project scalar. Act and olos are two *independent*
   `changed-since` streams; advancing one shared scalar from Act's newest row would
   make the olos stream issue `since` past its own un-pulled rows (and vice-versa) —
   the exact gap-skip class this phase set out to kill. `pullOlosRecordDelta` reads/
   advances only the `::olos` sub-key; `selectMostRecentSync`'s lexicographic max still
   folds both (both ISO) for display.

6. **No new conflict UI.** The server `conflicts` query is project-scoped with no
   `store_key` filter, so olos conflicts surface through the SAME
   `api.actRecords.listConflicts` / `SyncConflictsPage` / keep-mine/keep-server
   controls. Only the *resolve* write branches: `resolveRecordConflict` dispatches to
   `api.olos.resolveConflict` for olos storeKeys. `hydrateActRecords` was generalised
   to `hydrateTypedRecords(project, descriptors)` with per-storeKey row dispatch
   (`api.olos.*.changedSince` snapshot for olos, `api.actRecords.list` for Act) so one
   function converges any typed record, including single-descriptor post-conflict
   convergence.

**Consequences:**
- The watermark is now correct per project and never written from the client clock;
  the skew caveat accepted in the Phase 2 ADR is **closed**.
- olos observations/proofs/verifications have full rev-based parity with Act —
  real-time broadcast, reconnect delta-pull, and 409 stale-write conflict surfaced
  through the existing steward UI — all gated behind `FLAGS.SYNC_STATE_BLOBS`
  (default OFF), so the flag-off path is byte-identical to today.
- **olos always escalates** on conflict — there is no `observed_at` auto-resolve tier
  (unlike act-records), because an olos record is a deliberate field observation/proof,
  not a coalescible counter.
- Verified by deterministic unit suites: `connectivityStore.test.ts` (migration drops
  scalar, preserves `conflictedStores`; `selectMostRecentSync` max + empty → null);
  the extended `syncServiceIncomingRecord.test.ts` (per-project read/advance, A-doesn't-
  clobber-B, empty-map → `since: undefined`); `syncServiceOlosRecord.test.ts` (the three
  guards on olos storeKeys; `pullOlosRecordDelta` across all three domains; the
  **independent-watermark regression test**; create-rekey + stale-409 on
  `executeTypedRecordOp`); the olos server integration suite; and extended
  `SyncConflictsPage.test.tsx` + `syncManifest.test.ts` (+3 classified). The plan's
  two-browser live gate (A→B olos edit propagation; B offline → A edits → B catches up;
  concurrent edit → steward UI) remains operator-run with `FEATURE_SYNC_STATE_BLOBS=true`.

**Pre-existing, out of scope (flagged separately):** `syncManifest.test.ts`'s coverage
guard fails on **four foreign WIP stores** (`ogden-act-evidence`,
`ogden-plan-tension-banner`, `ogden-protocols`, `ogden-review-flags`) introduced by
parallel sessions — *not* the olos stores, which classify correctly. Filed as its own
follow-up task; this phase's diff is purely additive.

Commits (branch `feat/atlas-permaculture`, **not pushed**): `cf8f0c52` (A),
`639a6421` (3B-1), `bbb28ffe` (3B-2), `042d99d2` (3B-3), `7cb0f962` (3B-4),
`5a961da3` (3B-5). Builds directly on Phase 2
([[2026-06-04-olos-local-first-record-broadcast-reconnect-delta]]) and the syncService
coverage line ([[2026-05-31-atlas-project-sync-hardening]],
[[2026-05-25-atlas-sync-circuit-breaker]]).

Amanah: sync transport + evidence/proof capture only — no sales/finance instrument,
no CSRA/salam framing — clean.
