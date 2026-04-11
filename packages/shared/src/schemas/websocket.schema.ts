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
  // Comment mutations
  'comment_added',
  'comment_resolved',
  'comment_deleted',
  // Data pipeline & exports
  'layer_complete',
  'export_ready',
  // Presence
  'presence_join',
  'presence_leave',
  'presence_heartbeat',
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
