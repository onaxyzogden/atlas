/**
 * WebSocket event schemas — shared contract between API and web client.
 *
 * All messages over the wire conform to WsEvent (server→client)
 * or WsClientMessage (client→server).
 */

import { z } from 'zod';

// ─── Event types ────────────────────────────────────────────────────────────

export const WsEventType = z.enum([
  // Design feature mutations
  'feature_created',
  'feature_updated',
  'feature_deleted',
  'features_bulk_created',
  // Comment mutations
  'comment_added',
  'comment_resolved',
  'comment_deleted',
  // Generic synced-record mutations (typed-record Act stores via synced_records)
  'record_upserted',
  'record_deleted',
  // Data pipeline & exports
  'layer_complete',
  'export_ready',
  // Presence
  'presence_join',
  'presence_leave',
  'presence_heartbeat',
  'presence_sync',
  // Typing indicators
  'typing_start',
  'typing_stop',
]);

export type WsEventType = z.infer<typeof WsEventType>;

// ─── Server → Client envelope ───────────────────────────────────────────────

export const WsEvent = z.object({
  type: WsEventType,
  payload: z.record(z.unknown()),
  userId: z.string(),
  userName: z.string().nullable(),
  timestamp: z.string(),
});

export type WsEvent = z.infer<typeof WsEvent>;

// ─── Synced-record event payload ────────────────────────────────────────────
//
// Carried by `record_upserted` / `record_deleted`. Receivers look up the
// store by `storeKey` in the client SYNCED_STORES registry, drop the message
// when `rev` is not newer than what they already hold, and otherwise apply
// `payload` (null for a delete) inside the sync guard. `rev` is the same
// monotonic synced_records.rev used by the push/conflict path.

export const SyncedRecordEventPayload = z.object({
  storeKey: z.string(),
  projectId: z.string(),
  recordId: z.string(),
  rev: z.number(),
  schemaVersion: z.number(),
  payload: z.record(z.unknown()).nullable(),
});

export type SyncedRecordEventPayload = z.infer<typeof SyncedRecordEventPayload>;

// ─── Client → Server messages ───────────────────────────────────────────────

export const WsClientMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('presence_heartbeat') }),
  z.object({
    type: z.literal('typing_start'),
    payload: z.object({ action: z.string() }),
  }),
  z.object({ type: z.literal('typing_stop') }),
]);

export type WsClientMessage = z.infer<typeof WsClientMessage>;
