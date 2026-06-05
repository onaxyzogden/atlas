/**
 * Global error handlers — installs a `window.unhandledrejection` listener that
 * feeds the client-error telemetry sink (source `unhandled_rejection`).
 *
 * This module statically imports `clientErrorLog` (which pulls in apiClient),
 * so it MUST only be imported from authed-only code — `bootAuthed.ts` — never
 * from always-mounted code, or it would regress the showcase bundle split
 * (wiki ADR 2026-05-21-atlas-showcase-bundle-split). The showcase portal
 * intentionally ships no client-error telemetry.
 *
 * Scope: only uncaught promise rejections. `window.onerror` (uncaught
 * synchronous errors) is deliberately not handled — there is no matching
 * telemetry source enum value, and React render errors are already covered by
 * the error boundaries.
 *
 * Install is idempotent (mirrors the `ensureUnloadHook` guard in
 * clientErrorLog.ts) so repeated bootstrap calls register the listener once.
 */

import { recordClientError } from './clientErrorLog.js';

let installed = false;

export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const err = reason instanceof Error ? reason : undefined;
    recordClientError({
      source: 'unhandled_rejection',
      name: err?.name ?? 'UnhandledRejection',
      message: err?.message ?? String(reason),
      stack: err?.stack,
    });
  });

  installed = true;
}

/** @internal — for tests only. */
export const __test = {
  reset: () => {
    installed = false;
  },
};
