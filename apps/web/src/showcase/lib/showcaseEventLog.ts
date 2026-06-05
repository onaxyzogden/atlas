/**
 * Showcase visitor telemetry buffer — the Phase 5 public observation loop for
 * the `/showcase/three-streams` scrollytelling portal.
 *
 * Module-level in-memory queue + debounced flush to the PUBLIC
 * POST /api/v1/telemetry/showcase-events (migration 040). Captures cold-visitor
 * tier-conversion signal: which audience tier visitors pick, whether they click
 * a CTA, register, or instantiate a template.
 *
 * Shape mirrors clientErrorLog.ts / actInteractionLog.ts (queue + idle/ceiling/
 * beacon flush + flag gate + session id + __test hooks) so the telemetry buffers
 * stay easy to reason about together — with two deliberate differences:
 *
 *   1. PLAIN fetch / sendBeacon, NOT the apiClient. The showcase route ships as
 *      a lean SSG bundle (see the Phase 3.5 bundle-split ADR); pulling apiClient
 *      would drag authStore / projectStore into the showcase chunk. This logger
 *      imports only fetch + the shared type — nothing app-stateful.
 *   2. sessionStorage-persisted sessionId, so a multi-page scroll across the
 *      tier sibling routes (dreaming / transitioning / stewarding) shares one
 *      visitor session.
 *
 * The endpoint is public (no auth), so no queue-until-auth dance is needed: a
 * cold visitor has no token and the route accepts anonymous writes. A failed
 * flush is retried up to MAX_RETRIES then dropped so the queue never leaks.
 *
 * Privacy posture: gated behind `VITE_ATLAS_TELEMETRY_ENABLED`. When the flag is
 * unset or 'false', `recordShowcaseEvent` is a no-op.
 *
 * Self-protecting: `recordShowcaseEvent` never throws into its caller — visitor
 * instrumentation must never break the scrolly it is observing.
 */

import type { ShowcaseEventType, ShowcaseTier } from '@ogden/shared';

// ─── Flag gate ───────────────────────────────────────────────────────────────

const TELEMETRY_ENABLED =
  (import.meta.env.VITE_ATLAS_TELEMETRY_ENABLED ?? (import.meta.env.DEV ? 'true' : 'false')) ===
  'true';

export const isShowcaseTelemetryEnabled = (): boolean => TELEMETRY_ENABLED;

const ENDPOINT = '/api/v1/telemetry/showcase-events';
const SESSION_KEY = 'ogden-showcase-session';

// ─── Session id (persisted across the tier sibling routes) ───────────────────

let sessionId: string | null = null;

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getSessionId = (): string => {
  if (sessionId) return sessionId;
  try {
    if (typeof sessionStorage !== 'undefined') {
      const existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) {
        sessionId = existing;
        return sessionId;
      }
      sessionId = newId();
      sessionStorage.setItem(SESSION_KEY, sessionId);
      return sessionId;
    }
  } catch {
    // sessionStorage unavailable (private mode / SSR) — fall through to memory.
  }
  sessionId = newId();
  return sessionId;
};

// ─── Wire shape ──────────────────────────────────────────────────────────────

interface ShowcaseEventPayload {
  sessionId: string;
  occurredAt: string;
  eventType: ShowcaseEventType;
  tier: ShowcaseTier | null;
  projectId: string | null;
  payload: Record<string, unknown>;
}

interface QueuedEvent extends ShowcaseEventPayload {
  __retries?: number;
}

// ─── Queue + flush ───────────────────────────────────────────────────────────

const MAX_QUEUE = 50;
const IDLE_MS = 1500;
const MAX_RETRIES = 5;

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

const strip = (events: QueuedEvent[]): ShowcaseEventPayload[] =>
  events.map(({ __retries: _r, ...evt }) => evt);

export async function flush(): Promise<void> {
  cancelIdle();
  if (queue.length === 0) return;

  const batch = queue.splice(0, MAX_QUEUE);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: strip(batch) }),
      // Keep the request lean and anonymous — no credentials needed.
      keepalive: true,
    });
    if (!res.ok) throw new Error(`showcase telemetry HTTP ${res.status}`);
  } catch (err) {
    const survivors: QueuedEvent[] = [];
    for (const item of batch) {
      const tries = (item.__retries ?? 0) + 1;
      if (tries < MAX_RETRIES) survivors.push({ ...item, __retries: tries });
    }
    queue = [...survivors, ...queue];
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[showcase-telemetry] flush failed', err, '— retained', survivors.length);
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
      navigator.sendBeacon(ENDPOINT, body);
      return;
    }
  } catch {
    // fall through to async path
  }
  void fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
    keepalive: true,
  }).catch(() => {
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

export interface RecordShowcaseEventInput {
  eventType: ShowcaseEventType;
  /** Null/undefined before a tier is chosen (e.g. the initial showcase_view). */
  tier?: ShowcaseTier | null;
  /** Set only once a template_instantiated event names a project. */
  projectId?: string | null;
  /** Per-event-type extras, e.g. { sceneId } or { href }. */
  payload?: Record<string, unknown>;
}

/**
 * Record a showcase visitor event. Best-effort, never throws, no-op when
 * telemetry is disabled. Enqueues for batched flush to the public sink.
 */
export function recordShowcaseEvent(input: RecordShowcaseEventInput): void {
  if (!TELEMETRY_ENABLED) return;
  try {
    ensureUnloadHook();

    const evt: QueuedEvent = {
      sessionId: getSessionId(),
      occurredAt: new Date().toISOString(),
      eventType: input.eventType,
      tier: input.tier ?? null,
      projectId: input.projectId ?? null,
      payload: input.payload ?? {},
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
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  },
  getQueueLength: () => queue.length,
  getQueueSnapshot: () => [...queue],
};
