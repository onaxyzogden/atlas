/**
 * Synced-record schemas — the typed per-record sync transport for the Act
 * stores (ADR 7 Phase 1; wiki/decisions/2026-05-29-atlas-spec-act-map-first-surface.md).
 *
 * Where `project_state_blobs` carries ONE opaque row per (project, storeKey),
 * `synced_records` carries one typed row per (project, storeKey, recordId) so
 * an individual FieldAction / Observe feed event / Observe data point / Observe
 * cycle is first-class on the wire — each with its own monotonic `rev`. This is
 * what lets ADR 12's 5-tier priority queue tier records by semantics
 * (`source_type` / `cycle_id` / `task_type`) instead of erasing them inside a
 * per-project blob.
 *
 * The conflict model is identical to the blob path and shares its envelope
 * fields:
 *  - `schemaVersion` — the store's own persist `version`; anchors the
 *    version-skew guard (an old client refuses a newer record).
 *  - `baseRev` (request) / `rev` (row) — per-record monotonic revision; the
 *    server `409`s a write whose `baseRev` is behind the stored `rev`.
 *  - `envelopeSchema` — the wire-envelope version, pinned to 1.
 *
 * `payload` is `z.unknown()`: the transport never reasons about per-store
 * shape (that is the store's job). The denormalised `observedAt` / `sourceType`
 * / `cycleId` / `taskType` hints are best-effort copies of fields already
 * inside `payload`, surfaced as columns so the server/queue can tier and index
 * without parsing the blob. They are nullable — a store whose records lack a
 * given field (e.g. Observe cycles have no `taskType`) simply sends `null`.
 */

import { z } from 'zod';

/** Client → server upsert for one (project, storeKey, recordId) typed record. */
export const UpsertSyncedRecordInput = z.object({
  /** Wire-envelope version. Pinned literal — bump only on envelope changes. */
  envelopeSchema: z.literal(1),
  /** The store's own persist `version` (drives the version-skew guard). */
  schemaVersion: z.number().int().min(1),
  /** The `rev` the client last saw; server rejects if it is now behind. */
  baseRev: z.number().int().min(0),
  /** Opaque persisted record — the transport never inspects this. */
  payload: z.unknown(),
  /** Denormalised tier/sort hints (best-effort; authoritative copy in payload). */
  observedAt: z.string().datetime({ offset: true }).nullable().optional(),
  sourceType: z.string().min(1).nullable().optional(),
  cycleId: z.string().min(1).nullable().optional(),
  taskType: z.string().min(1).nullable().optional(),
});
export type UpsertSyncedRecordInput = z.infer<typeof UpsertSyncedRecordInput>;

/** Server row shape returned by GET / on conflict. */
export const SyncedRecord = z.object({
  projectId: z.string().uuid(),
  storeKey: z.string().min(1),
  recordId: z.string().min(1),
  payload: z.unknown(),
  schemaVersion: z.number().int().min(1),
  rev: z.number().int().min(1),
  observedAt: z.string().datetime({ offset: true }).nullable(),
  sourceType: z.string().nullable(),
  cycleId: z.string().nullable(),
  taskType: z.string().nullable(),
  updatedBy: z.string().uuid().nullable(),
  updatedAt: z.string().datetime({ offset: true }),
});
export type SyncedRecord = z.infer<typeof SyncedRecord>;
