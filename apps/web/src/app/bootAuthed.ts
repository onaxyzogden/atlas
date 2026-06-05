/**
 * Authed-app bootstrap — extracted from `main.tsx` for Phase 3.5 bundle-split.
 *
 * Everything in this module is dead weight for cold visitors on the public
 * `/showcase/*` scrollytelling portal: projectStore (~358 KB chunk) + four
 * seeders (each cascading the stores they touch) + connectivityStore +
 * authStore init (blocks first paint up to 1.5 s) + siteDataSync subscriber +
 * syncService listener. Gating these behind the route check in main.tsx keeps
 * the showcase entry graph clean.
 *
 * Side-effect imports (projectStore, connectivityStore, the four seeders)
 * live at the top of this module so the authed app's behaviour is identical
 * to the pre-split main.tsx — module-eval order is preserved.
 *
 * See wiki ADR 2026-05-21-atlas-showcase-bundle-split (Prong A).
 */

// Side-effect store imports — these register subscriptions, hydrate from
// localStorage, and (for the seeders) attach project-load auto-run hooks.
// Importing them as bare specifiers runs their top-level effects.
import '../store/projectStore.js';
import '../store/connectivityStore.js';

// Dev seeders — each registers a `window.__ogdenSeed*` handle and (where
// applicable) a one-shot projectStore.subscribe auto-run. Idempotent via
// localStorage sentinels; do not modify behaviour, just gate invocation.
import '../dev/seedFertilitySample.js';
import '../dev/seedGoalCompassPlan.js';
import '../dev/seedThreeStreamsFarm.js';
import '../dev/seedApricotLane.js';
import '../dev/seedMtcObserveBaseline.js';
import '../dev/seedMtcRotationFixture.js';

import { useAuthStore } from '../store/authStore.js';
import { useSessionExpiredStore } from '../store/sessionExpiredStore.js';
import { useConnectivityStore } from '../store/connectivityStore.js';
import {
  setSessionExpiredHandler,
  setApiClientErrorReporter,
  setApiSuccessHandler,
} from '../lib/apiClient.js';
import { syncService } from '../lib/syncService.js';
import { useProjectStore } from '../store/projectStore.js';
import { recordClientError, setClientErrorProjectIdResolver } from '../lib/clientErrorLog.js';
import { installGlobalErrorHandlers } from '../lib/globalErrorHandlers.js';

/**
 * Block first paint on auth init so the apiClient module-level token is
 * populated before any route effect / store subscriber fires authed fetches.
 * Hard 1500 ms ceiling — if `/auth/me` hangs we proceed as unauthenticated
 * rather than freezing the app.
 */
async function bootAuth(): Promise<void> {
  const init = useAuthStore.getState().initFromStorage();
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1500));
  await Promise.race([init, timeout]);
}

/**
 * Run the full authed-app bootstrap. Awaited from `main.tsx` only when the
 * current path is NOT `/showcase/*`. Behaviour preserved verbatim from the
 * pre-split main.tsx (lines 62-91 of that file).
 */
export async function bootAuthedShell(): Promise<void> {
  await bootAuth();

  // Client-error telemetry wiring (authed-only — see showcase bundle-split
  // ADR). Register the active-project resolver so boundary / unhandled-
  // rejection errors get a projectId, then install the global handlers.
  setClientErrorProjectIdResolver(() => useProjectStore.getState().activeProjectId ?? null);
  installGlobalErrorHandlers();

  // Wire the apiClient → client-error sink (source: 'api_client'). projectId is
  // omitted so the resolver registered above stamps the active project. The
  // telemetry-endpoint loop guard lives inside apiClient's reportApiFailure.
  setApiClientErrorReporter((r) => {
    recordClientError({
      source: 'api_client',
      name: r.name,
      message: r.message,
      context: { code: r.code, status: r.status, method: r.method, path: r.path },
    });
    // A network-level rejection (status 0) means the backend is unreachable —
    // surface it globally via the ApiReachabilityStatus chip. Real HTTP errors
    // (4xx/5xx) prove the server IS reachable, so they don't flip this.
    if (r.code === 'NETWORK_ERROR') {
      useConnectivityStore.getState().setApiReachable(false);
    }
  });

  // Mirror: any successful response flips reachability back to true so the
  // banner auto-clears when the server recovers (no browser 'online' event
  // fires on a server restart).
  setApiSuccessHandler(() => useConnectivityStore.getState().setApiReachable(true));

  // Wire the apiClient → sessionExpiredStore bridge BEFORE createRoot so any
  // fetch fired during the first render (or a stale-token sync on boot)
  // triggers the global banner instead of leaking raw 401 copy into cards.
  setSessionExpiredHandler(() => useSessionExpiredStore.getState().trigger());

  // siteDataSync subscribes to projectStore at import-time and would fire
  // authed fetches as soon as a project boundary lands. Import AFTER auth is
  // initialised so the Authorization header is always present.
  await import('../store/siteDataSync.js');

  if (useAuthStore.getState().token) {
    syncService.start();
  }

  // React to auth changes: start sync on login, stop on logout.
  useAuthStore.subscribe((state, prev) => {
    if (state.token && !prev.token) {
      syncService.start();
    } else if (!state.token && prev.token) {
      syncService.stop();
    }
  });
}
