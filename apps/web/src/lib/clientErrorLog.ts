/**
 * Client-error telemetry buffer — a general front-end error sink.
 *
 * Module-level in-memory queue + debounced flush to
 * POST /api/v1/telemetry/client-errors (migration 039). First consumer:
 * the zustand persist `rehydrateWithLogging` helper, whose failures were
 * previously only visible via console.error (see
 * wiki/log/2026-05-21-persist-rehydrate-instrumentation.md). Also consumed by
 * the React error boundaries (`react_error_boundary`, via a lazy dynamic
 * import to stay out of the showcase chunk) and the global unhandled-
 * rejection handler (`unhandled_rejection`, see globalErrorHandlers.ts).
 * Future consumer: apiClient failures (`api_client`).
 *
 * Shape deliberately mirrors actInteractionLog.ts (queue + idle/ceiling/
 * beacon flush + capped retry + flag gate + session id + __test hooks) so
 * the two telemetry buffers stay easy to reason about together.
 *
 * Flush triggers:
 *   - 1500ms idle (debounced)
 *   - 50-event ceiling
 *   - `beforeunload` / tab-hide via navigator.sendBeacon (best-effort;
 *     beacons cannot carry the Bearer header, so they only land if/when
 *     cookie auth exists — the authenticated idle/ceiling path is the
 *     reliable one).
 *
 * Queue-until-auth: a persist rehydrate failure can fire at boot before
 * login. A 401 flush does NOT count against the retry cap, so such events
 * survive in the queue until a session exists and a later flush drains
 * them. Non-auth failures are retried up to MAX_RETRIES then dropped so the
 * queue never leaks unboundedly.
 *
 * Privacy posture: gated behind `VITE_ATLAS_TELEMETRY_ENABLED`. When the
 * flag is unset or 'false', `recordClientError` is a no-op.
 *
 * Self-protecting: `recordClientError` never throws into its caller — error
 * instrumentation must never break the code path it is observing.
 */

import type { ClientErrorEventInput, ClientErrorSource } from '@ogden/shared';
import { api } from './apiClient';

// ─── Flag gate ───────────────────────────────────────────────────────────────

const TELEMETRY_ENABLED =
  (import.meta.env.VITE_ATLAS_TELEMETRY_ENABLED ?? (import.meta.env.DEV ? 'true' : 'false')) ===
  'true';

export const isClientErrorTelemetryEnabled = (): boolean => TELEMETRY_ENABLED;

// ─── Project-id resolver ─────────────────────────────────────────────────────
//
// Non-React emitters (the React error boundaries, the global unhandled-
// rejection handler) have no project context of their own. Rather than make
// them import projectStore directly — which would drag the authed store graph
// into the always-mounted code path and regress the showcase bundle split
// (see wiki ADR 2026-05-21-atlas-showcase-bundle-split) — the authed
// bootstrap registers a resolver here. recordClientError uses it only when a
// caller omits projectId; an explicit value (including explicit null from the
// persist helper) always wins.

let projectIdResolver: (() => string | null) | null = null;

/** Register a resolver for the active project id. Called from bootAuthed. */
export function setClientErrorProjectIdResolver(fn: () => string | null): void {
  projectIdResolver = fn;
}

const safeResolveProjectId = (): string | null => {
  if (!projectIdResolver) return null;
  try {
    return projectIdResolver();
  } catch {
    // Resolver must never break the observed code path.
    return null;
  }
};

// ─── Session id ──────────────────────────────────────────────────────────────

let sessionId: string | null = null;

const getSessionId = (): string => {
  if (sessionId) return sessionId;
  sessionId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return sessionId;
};

// ─── Queue + flush ───────────────────────────────────────────────────────────

const MAX_QUEUE = 50;
const IDLE_MS = 1500;
const MAX_RETRIES = 5;

interface QueuedError extends ClientErrorEventInput {
  __retries?: number;
}

let queue: QueuedError[] = [];
let idleTimer: ReturnType<typeof setTimeout> | null = null;

const cancelIdle = () => {
  if (idleTimer != null) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
};

const scheduleFlush = () => {
  cancelIdle();
  idleTimer = setTimeout(() => {
    void flush();
  }, IDLE_MS);
};

const isAuthError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { status?: number }).status === 401;

const strip = (events: QueuedError[]): ClientErrorEventInput[] =>
  events.map(({ __retries: _r, ...evt }) => evt);

export async function flush(): Promise<void> {
  cancelIdle();
  if (queue.length === 0) return;

  const batch = queue.splice(0, MAX_QUEUE);

  try {
    await api.telemetry.postClientErrors(strip(batch));
  } catch (err) {
    const authFail = isAuthError(err);
    const survivors: QueuedError[] = [];
    for (const item of batch) {
      // Queue-until-auth: a 401 means "not logged in yet" — retain without
      // burning a retry so boot-time errors drain after login. Other
      // failures are capped so the queue cannot leak forever.
      const tries = authFail ? (item.__retries ?? 0) : (item.__retries ?? 0) + 1;
      if (authFail || tries < MAX_RETRIES) {
        survivors.push({ ...item, __retries: tries });
      }
    }
    queue = [...survivors, ...queue];
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[client-error-telemetry] flush failed', err, '— retained', survivors.length);
    }
  }
}

const beaconFlush = () => {
  if (queue.length === 0) return;
  const events = strip(queue);
  queue = [];
  try {
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const body = new Blob([JSON.stringify({ events })], { type: 'application/json' });
      navigator.sendBeacon('/api/v1/telemetry/client-errors', body);
      return;
    }
  } catch {
    // fall through to async path
  }
  void api.telemetry.postClientErrors(events).catch(() => {
    /* unload — nowhere to retry */
  });
};

let unloadHookInstalled = false;
const ensureUnloadHook = () => {
  if (unloadHookInstalled || typeof window === 'undefined') return;
  window.addEventListener('beforeunload', beaconFlush);
  // visibilitychange catches mobile background-tab cases where beforeunload
  // doesn't always fire.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') beaconFlush();
  });
  unloadHookInstalled = true;
};

// ─── Public record API ─────────────────────────────────────────────────────────

export interface RecordClientErrorInput {
  source: ClientErrorSource;
  /** Error constructor name, e.g. "SyntaxError". Falls back to "Error". */
  name: string;
  message?: string;
  stack?: string;
  /** Null/undefined when the error has no project context. */
  projectId?: string | null;
  /** Per-source extras, e.g. { persistKey }. */
  context?: Record<string, unknown>;
}

const cap = (s: string | undefined, max: number): string => (s ?? '').slice(0, max);

const readAppVersion = (): string | undefined => {
  const v = (import.meta.env as Record<string, unknown>).VITE_APP_VERSION;
  return typeof v === 'string' && v.length > 0 ? v.slice(0, 64) : undefined;
};

/**
 * Record a client error. Best-effort, never throws, no-op when telemetry is
 * disabled. Enqueues for batched flush to the backend sink.
 */
export function recordClientError(input: RecordClientErrorInput): void {
  if (!TELEMETRY_ENABLED) return;
  try {
    ensureUnloadHook();

    const evt: QueuedError = {
      sessionId: getSessionId(),
      occurredAt: new Date().toISOString(),
      projectId: input.projectId !== undefined ? input.projectId : safeResolveProjectId(),
      source: input.source,
      name: cap(input.name, 200) || 'Error',
      message: cap(input.message, 4000),
      stack: input.stack ? cap(input.stack, 8000) : undefined,
      context: input.context ?? {},
      url: typeof location !== 'undefined' ? cap(location.href, 2000) : undefined,
      userAgent: typeof navigator !== 'undefined' ? cap(navigator.userAgent, 512) : undefined,
      appVersion: readAppVersion(),
    };

    queue.push(evt);

    if (queue.length >= MAX_QUEUE) {
      void flush();
    } else {
      scheduleFlush();
    }
  } catch {
    // Instrumentation must never break the observed code path.
  }
}

// ─── Test hooks ──────────────────────────────────────────────────────────────

/** @internal — for tests only. */
export const __test = {
  reset: () => {
    cancelIdle();
    queue = [];
    sessionId = null;
    unloadHookInstalled = false;
    projectIdResolver = null;
  },
  getQueueLength: () => queue.length,
  getQueueSnapshot: () => [...queue],
};
