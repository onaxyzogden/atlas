/**
 * Project-state versioned-blob schemas — the generic catch-all sync
 * transport (Phase 2 of Full syncService Coverage, the durable P0-1 fix).
 *
 * One row per (project, storeKey) carries an opaque `payload` plus the
 * metadata the stale-write-reject conflict model needs:
 *  - `schemaVersion` — the store's own persist `version`; anchors the
 *    version-skew guard (an old client refuses a newer blob).
 *  - `baseRev` (request) / `rev` (row) — per-store monotonic revision; the
 *    server `409`s a write whose `baseRev` is behind the stored `rev`.
 *  - `envelopeSchema` — the wire-envelope version itself, pinned to 1 so a
 *    future envelope change is detectable independently of `schemaVersion`.
 *
 * `payload` is deliberately `z.unknown()`: the blob path must not reason
 * about per-store shape (that is the typed-table path's job). Geometry-
 * bearing design elements never travel here — they stay on the
 * `design_features` typed path (no double-write).
 */

import { z } from 'zod';

/** Client → server upsert for one (project, storeKey) slice. */
export const UpsertProjectStateInput = z.object({
  /** Wire-envelope version. Pinned literal — bump only on envelope changes. */
  envelopeSchema: z.literal(1),
  /** The store's own persist `version` (drives the version-skew guard). */
  schemaVersion: z.number().int().min(1),
  /** The `rev` the client last saw; server rejects if it is now behind. */
  baseRev: z.number().int().min(0),
  /** Opaque persisted store slice — the blob path never inspects this. */
  payload: z.unknown(),
});
export type UpsertProjectStateInput = z.infer<typeof UpsertProjectStateInput>;

/** Server row shape returned by GET / on conflict. */
export const ProjectStateBlob = z.object({
  projectId: z.string().uuid(),
  storeKey: z.string().min(1),
  payload: z.unknown(),
  schemaVersion: z.number().int().min(1),
  rev: z.number().int().min(1),
  updatedBy: z.string().uuid().nullable(),
  updatedAt: z.string().datetime({ offset: true }),
});
export type ProjectStateBlob = z.infer<typeof ProjectStateBlob>;
