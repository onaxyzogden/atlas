import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './routes/index.js';
import { GlobalErrorBoundary } from './components/ErrorBoundary.js';
import { ToastContainer } from './components/Toast.js';
import '@ogden/ui-components/style.css';
import './app/index.css';

// Collapse infinite animations under the Claude Code preview window so the
// MCP screenshot tool can settle a frame (the capture renderer waits for
// paint to quiesce, which never happens with an endless animation).
// See wiki ADR 2026-05-19-atlas-preview-screenshot-verification-standard.
if (typeof navigator !== 'undefined' && /Claude\//.test(navigator.userAgent)) {
  document.documentElement.classList.add('reduce-motion');
}

// One-time migrator: legacy `ogden-site-annotations` v3 blob → 7
// Scholar-aligned namespace stores. Must run BEFORE any of the new stores
// rehydrate (they live under `apps/web/src/store/` and are reached via
// the side-effect imports below). Idempotent.
// See ADR 2026-04-30-site-annotations-store-scholar-aligned-namespaces.md.
import { migrateLegacyBlob, cleanupArchivedV3 } from './store/site-annotations-migrate.js';
migrateLegacyBlob();
// Remove the `ogden-site-annotations.archived-v3` rollback hatch on every
// boot — obsolete now that the namespace consolidation has shipped.
// See ADR 2026-04-30-archive-v3-blob-cleanup.md.
cleanupArchivedV3();

// Import projectStore to trigger seed-on-hydration (side-effect import)
import './store/projectStore.js';
// Import connectivityStore to register online/offline listeners (side-effect import)
import './store/connectivityStore.js';
// Register window.__ogdenSeedFertilitySample dev handle for Plan-stage
// zoneThresholds smoke-testing. Function reference only; no auto-execution.
import './dev/seedFertilitySample.js';
// Register window.__ogdenSeedGoalCompassPlan dev handle for D2
// regenerate-preservation smoke-testing. Function reference only; no
// auto-execution.
import './dev/seedGoalCompassPlan.js';
import { useAuthStore } from './store/authStore.js';
import { useSessionExpiredStore } from './store/sessionExpiredStore.js';
import { setSessionExpiredHandler } from './lib/apiClient.js';
import SessionExpiredBanner from './components/SessionExpiredBanner.js';
import { syncService } from './lib/syncService.js';

// Block first paint on auth init so the apiClient module-level token is
// populated before any route effect / store subscriber fires authed fetches.
// Hard 1500ms ceiling — if /auth/me hangs we proceed as unauthenticated
// rather than freezing the app.
async function bootAuth(): Promise<void> {
  const init = useAuthStore.getState().initFromStorage();
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1500));
  await Promise.race([init, timeout]);
}

await bootAuth();

// Wire the apiClient → sessionExpiredStore bridge BEFORE createRoot so any
// fetch fired during the first render (or a stale-token sync on boot)
// triggers the global banner instead of leaking raw 401 copy into cards.
setSessionExpiredHandler(() => useSessionExpiredStore.getState().trigger());

// siteDataSync subscribes to projectStore at import-time and would fire
// authed fetches as soon as a project boundary lands. Import AFTER auth
// is initialised so the Authorization header is always present.
await import('./store/siteDataSync.js');

if (useAuthStore.getState().token) {
  syncService.start();
}

// React to auth changes: start sync on login, stop on logout
useAuthStore.subscribe((state, prev) => {
  if (state.token && !prev.token) {
    syncService.start();
  } else if (!state.token && prev.token) {
    syncService.stop();
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SessionExpiredBanner />
        <RouterProvider router={router} />
        <ToastContainer />
      </QueryClientProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
