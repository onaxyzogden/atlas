/**
 * Sync-conflict schemas — the durable conflict model for the typed per-record
 * Act transport (ADR 7 Phase 3; ADR 12 §6 —
 * wiki/decisions/2026-05-29-atlas-spec-offline-sync-priority-queues.md).
 *
 * Phase 1 shipped the never-clobber envelope at runtime: a stale per-record
 * write 409s, the client keeps local and adopts the server rev, and surfaces a
 * badge. Phase 3 makes that conflict DURABLE and adds escalation:
 *  - `sync_log` — every 409 writes one row capturing BOTH payloads + revs +
 *    observed-at timestamps + the resolution the server chose. This is the
 *    audit trail and the data source for the Phase 4 Keep-mine/Keep-server UI.
 *  - `failed_records` — the open work-queue: one row per record whose conflict
 *    could NOT be auto-resolved (the steward must decide). Deleted on
 *    resolution; the lifecycle/history lives on the `sync_log` row.
 *
 * Resolution is decided server-side under the ratified last-write-wins policy
 * (ADR 12 amendment), keyed on `observed_at`:
 *  - `auto_resolved` — the local edit is provably the loser (server
 *    `observed_at` >= local `observed_at`; a tie goes to the server per §6.1).
 *    LWW resolved it deterministically and the loser is preserved in the log,
 *    so the client stays quiet (no badge, no toast).
 *  - `escalated` — the local edit is strictly newer (or either timestamp is
 *    missing/unparseable, so safety can NOT be proven). Never auto-applied —
 *    local is retained, the conflict is surfaced, and a `failed_records` row
 *    awaits a steward decision.
 *  - `resolved` — a steward closed an escalation through the Phase 4 surface.
 *
 * This mirrors Observe's shipped non-destructive `isSuperseded`/`supersededBy`
 * model: keep both copies, flag the loser, never silently destroy.
 */

import { z } from 'zod';

/**
 * Lifecycle of a logged conflict. The CHECK constraint on
 * `sync_log.resolution_status` (migration 048) mirrors this tuple
 * character-for-character — keep both in sync.
 */
export const SyncResolutionStatus = z.enum([
  'auto_resolved',
  'escalated',
  'resolved',
]);
export type SyncResolutionStatus = z.infer<typeof SyncResolutionStatus>;

/**
 * The subset a 409 carries back to the client. No `resolved` — that is a later
 * steward action through the Phase 4 surface, never the outcome of a push.
 */
export const ConflictResolution = z.enum(['auto_resolved', 'escalated']);
export type ConflictResolution = z.infer<typeof ConflictResolution>;

/**
 * One durable conflict-log row. `localRev` is the `baseRev` the local edit was
 * built on (nullable/0 for a never-synced record); `serverRev` is the
 * authoritative rev that beat it. Payloads are `z.unknown()` — the transport
 * never reasons about per-store shape (same contract as SyncedRecord.payload).
 */
export const SyncLogEntry = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  storeKey: z.string().min(1),
  recordId: z.string().min(1),
  localPayload: z.unknown(),
  serverPayload: z.unknown(),
  localRev: z.number().int().min(0).nullable(),
  serverRev: z.number().int().min(1).nullable(),
  observedAtLocal: z.string().datetime({ offset: true }).nullable(),
  observedAtServer: z.string().datetime({ offset: true }).nullable(),
  resolutionStatus: SyncResolutionStatus,
  detectedAt: z.string().datetime({ offset: true }),
  detectedBy: z.string().uuid().nullable(),
  resolvedAt: z.string().datetime({ offset: true }).nullable(),
  resolvedBy: z.string().uuid().nullable(),
});
export type SyncLogEntry = z.infer<typeof SyncLogEntry>;

/**
 * One open escalation awaiting a steward decision. FK to the `sync_log` row
 * that captured the conflicting payloads. Unique per (project, store, record):
 * a re-escalation of the same still-open record updates the pointer rather than
 * stacking duplicates.
 */
export const FailedRecord = z.object({
  id: z.string().uuid(),
  syncLogId: z.string().uuid(),
  projectId: z.string().uuid(),
  storeKey: z.string().min(1),
  recordId: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
});
export type FailedRecord = z.infer<typeof FailedRecord>;

/**
 * The conflict-resolution detail block the act-records PUT adds to its 409
 * envelope (alongside the Phase 1 `serverRev` / `serverPayload`). The client
 * reads `resolution` to decide whether to surface (escalated) or stay quiet
 * (auto_resolved), and `syncLogId` for traceability into the Phase 4 surface.
 */
export const ConflictDetails = z.object({
  serverRev: z.number().int().min(1).nullable(),
  serverPayload: z.unknown(),
  resolution: ConflictResolution,
  syncLogId: z.string().uuid().nullable(),
});
export type ConflictDetails = z.infer<typeof ConflictDetails>;

// ─── Phase 4 — Keep-mine / Keep-server resolution surface ────────────────────

/**
 * The steward's choice when closing an escalated conflict through the Phase 4
 * surface (ADR 7 Phase 4 — the dedicated Conflicts panel):
 *  - `keep_server` — accept the authoritative server copy; the local edit is
 *    discarded (the loser is already preserved on the `sync_log` row). No write
 *    to `synced_records` — the server row already won the 409.
 *  - `keep_mine` — the steward overrides LWW and reinstates the local copy: the
 *    server force-writes `sync_log.local_payload` as a NEW rev. This is the one
 *    sanctioned clobber of a newer server rev — an explicit human decision,
 *    durably attributed (`resolved_by`), never a silent overwrite.
 */
export const ConflictResolutionChoice = z.enum(['keep_mine', 'keep_server']);
export type ConflictResolutionChoice = z.infer<typeof ConflictResolutionChoice>;

/**
 * One open conflict as the Phase 4 surface lists it: a `failed_records`
 * escalation joined to the `sync_log` row that captured both payloads. Keyed by
 * `syncLogId` (what the resolve endpoint takes). Only escalated/open conflicts
 * appear here — `auto_resolved` never escalates, and `resolved` rows have been
 * deleted from `failed_records` (their history stays on the `sync_log` row).
 */
export const ConflictListItem = z.object({
  syncLogId: z.string().uuid(),
  failedRecordId: z.string().uuid(),
  storeKey: z.string().min(1),
  recordId: z.string().min(1),
  localPayload: z.unknown(),
  serverPayload: z.unknown(),
  localRev: z.number().int().min(0).nullable(),
  serverRev: z.number().int().min(1).nullable(),
  observedAtLocal: z.string().datetime({ offset: true }).nullable(),
  observedAtServer: z.string().datetime({ offset: true }).nullable(),
  detectedAt: z.string().datetime({ offset: true }),
});
export type ConflictListItem = z.infer<typeof ConflictListItem>;

/** Request body for `POST …/conflicts/:syncLogId/resolve`. */
export const ResolveConflictInput = z.object({
  choice: ConflictResolutionChoice,
});
export type ResolveConflictInput = z.infer<typeof ResolveConflictInput>;

/**
 * What the resolve endpoint returns: the authoritative record state AFTER
 * resolution, so the client converges its local store and per-record `baseRev`.
 * `rev`/`payload` reflect the winning copy (the server's for `keep_server`, the
 * reinstated local for `keep_mine`); `resolutionStatus` is always `resolved`.
 */
export const ResolveConflictResult = z.object({
  storeKey: z.string().min(1),
  recordId: z.string().min(1),
  rev: z.number().int().min(1),
  payload: z.unknown(),
  resolutionStatus: SyncResolutionStatus,
});
export type ResolveConflictResult = z.infer<typeof ResolveConflictResult>;
