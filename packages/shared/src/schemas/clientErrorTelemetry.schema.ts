import { z } from 'zod';

/**
 * Client-error telemetry — a general channel for surfacing front-end
 * failures to a durable, server-side store.
 *
 * Motivation: on 2026-05-21 a zustand persist `rehydrate()` failure wiped
 * the MTC Observe baseline silently (see
 * wiki/log/2026-05-21-persist-rehydrate-instrumentation.md). The
 * `rehydrateWithLogging` helper logs such failures to `console.error`, but
 * that only helps a developer who happens to have the console open. This
 * channel captures them in production.
 *
 * Pipeline mirrors the act-interaction telemetry one (migration 024 +
 * apps/api/src/routes/telemetry/index.ts + apps/web/src/lib/actInteractionLog.ts):
 *   apps/web/src/lib/clientErrorLog.ts (buffer)
 *     → POST /api/v1/telemetry/client-errors (auth)
 *       → migration 039 (client_error_events)
 *
 * The `source` strings here mirror the SQL CHECK constraint in migration
 * 039 exactly. Both are sources of truth in their own layer; keep them in
 * lock-step by hand.
 *
 * Design notes that differ from act-interactions:
 *   - `projectId` is NULLABLE — a persist rehydrate failure happens on a
 *     global store with no project context, possibly at boot before login.
 *   - The route still requires auth (no open write endpoint); the client
 *     buffer queues until authenticated, so pre-auth failures drain once a
 *     session exists (and always hit console.error in the meantime).
 */

export const CLIENT_ERROR_SOURCES = [
  'persist_rehydrate',
  'api_client',
  'react_error_boundary',
  'unhandled_rejection',
] as const;

export const ClientErrorSource = z.enum(CLIENT_ERROR_SOURCES);
export type ClientErrorSource = z.infer<typeof ClientErrorSource>;

/**
 * Wire shape for a single client error posted from the web client.
 *
 * String fields are length-capped so a runaway stack or message cannot
 * bloat the request body or the row.
 */
export const ClientErrorEventInput = z.object({
  sessionId: z.string().min(1).max(64),
  occurredAt: z.string().datetime(),
  /** Null when the error has no project context (e.g. a global-store rehydrate). */
  projectId: z.string().uuid().nullable(),
  source: ClientErrorSource,
  /** Error constructor name, e.g. "SyntaxError". */
  name: z.string().min(1).max(200),
  /** Error message; may be empty for some thrown values. */
  message: z.string().max(4000).default(''),
  /** Optional stack trace, capped. */
  stack: z.string().max(8000).optional(),
  /** Per-source extras, e.g. { persistKey: 'ogden-conventional-crops' }. */
  context: z.record(z.string(), z.unknown()).default({}),
  /** Optional environment breadcrumbs. */
  url: z.string().max(2000).optional(),
  userAgent: z.string().max(512).optional(),
  appVersion: z.string().max(64).optional(),
});
export type ClientErrorEventInput = z.infer<typeof ClientErrorEventInput>;

export const PostClientErrorsBody = z.object({
  events: z.array(ClientErrorEventInput).min(1).max(50),
});
export type PostClientErrorsBody = z.infer<typeof PostClientErrorsBody>;

export const PostClientErrorsResult = z.object({
  ingested: z.number().int().nonnegative(),
});
export type PostClientErrorsResult = z.infer<typeof PostClientErrorsResult>;
