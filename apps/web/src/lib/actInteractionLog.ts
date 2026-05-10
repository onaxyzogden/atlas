/**
 * Act-stage interaction telemetry buffer.
 *
 * Module-level in-memory queue + debounced flush to
 * POST /api/v1/telemetry/act-interactions. Backs the affinity-validation
 * dashboard so we can move past the pen-and-paper review of the
 * project-type → Act module affinity table.
 *
 * Flush triggers:
 *   - 1500ms idle (debounced)
 *   - 50-event ceiling
 *   - `beforeunload` via navigator.sendBeacon
 *
 * Privacy posture: gated behind `VITE_ATLAS_TELEMETRY_ENABLED`. When the
 * flag is unset or 'false', `recordInteraction` is a no-op. A consent
 * surface is a precondition for any non-developer steward — see ADR
 * wiki/decisions/2026-05-10-atlas-act-affinity-telemetry-pipeline.md.
 */

import { useCallback, useMemo } from 'react';
import type {
  ActInteractionEventInput,
  ActInteractionEventType,
  ActModuleId,
  PlanProjectTypeId,
} from '@ogden/shared';
import { api } from './apiClient';

// ─── Flag gate ───────────────────────────────────────────────────────────────

const TELEMETRY_ENABLED =
  (import.meta.env.VITE_ATLAS_TELEMETRY_ENABLED ?? (import.meta.env.DEV ? 'true' : 'false')) ===
  'true';

export const isActTelemetryEnabled = (): boolean => TELEMETRY_ENABLED;

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
const MAX_RETRIES = 3;

interface QueuedEvent extends ActInteractionEventInput {
  __retries?: number;
}

let queue: QueuedEvent[] = [];
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

export async function flush(): Promise<void> {
  cancelIdle();
  if (queue.length === 0) return;

  const batch = queue.splice(0, MAX_QUEUE);
  // Strip the retry counter before send.
  const events: ActInteractionEventInput[] = batch.map(({ __retries: _r, ...evt }) => evt);

  try {
    await api.telemetry.postActInteractions(events);
  } catch (err) {
    // Retain failed events with a capped retry; drop after MAX_RETRIES so
    // we don't accumulate a leaky in-memory queue across the session.
    const survivors: QueuedEvent[] = [];
    for (let i = 0; i < batch.length; i += 1) {
      const item = batch[i];
      const tries = (item.__retries ?? 0) + 1;
      if (tries < MAX_RETRIES) {
        survivors.push({ ...item, __retries: tries });
      }
    }
    queue = [...survivors, ...queue];
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[act-telemetry] flush failed', err, '— retained', survivors.length);
    }
  }
}

const beaconFlush = () => {
  if (queue.length === 0) return;
  const events: ActInteractionEventInput[] = queue.map(({ __retries: _r, ...evt }) => evt);
  queue = [];
  try {
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const body = new Blob([JSON.stringify({ events })], { type: 'application/json' });
      navigator.sendBeacon('/api/v1/telemetry/act-interactions', body);
      return;
    }
  } catch {
    // fall through to async path
  }
  void api.telemetry.postActInteractions(events).catch(() => {
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

// ─── Public record API ───────────────────────────────────────────────────────

export interface ActTelemetryContext {
  projectId: string;
  projectType: PlanProjectTypeId | null;
}

export interface RecordInteractionInput {
  module: ActModuleId;
  eventType: ActInteractionEventType;
  payload?: Record<string, unknown>;
}

export function recordInteraction(
  ctx: ActTelemetryContext,
  input: RecordInteractionInput,
): void {
  if (!TELEMETRY_ENABLED) return;
  if (!ctx.projectId) return;

  ensureUnloadHook();

  const evt: QueuedEvent = {
    projectId: ctx.projectId,
    sessionId: getSessionId(),
    occurredAt: new Date().toISOString(),
    projectType: ctx.projectType ?? null,
    module: input.module,
    eventType: input.eventType,
    payload: input.payload ?? {},
  };

  queue.push(evt);

  if (queue.length >= MAX_QUEUE) {
    void flush();
  } else {
    scheduleFlush();
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
  },
  getQueueLength: () => queue.length,
  getQueueSnapshot: () => [...queue],
};

// ─── React binding ───────────────────────────────────────────────────────────

/**
 * Tiny hook to keep call-sites tidy. Captures the current
 * (projectId, projectType) and returns a `record(input)` that prefills them.
 */
export function useActTelemetry(ctx: ActTelemetryContext) {
  const stableCtx = useMemo<ActTelemetryContext>(
    () => ({ projectId: ctx.projectId, projectType: ctx.projectType }),
    [ctx.projectId, ctx.projectType],
  );
  return useCallback(
    (input: RecordInteractionInput) => recordInteraction(stableCtx, input),
    [stableCtx],
  );
}
