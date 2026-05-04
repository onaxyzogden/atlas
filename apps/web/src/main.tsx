import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './routes/index.js';
import { GlobalErrorBoundary } from './components/ErrorBoundary.js';
import { ToastContainer } from './components/Toast.js';
import '@ogden/ui-components/style.css';
import './app/index.css';

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
// Init auth from localStorage before first render (non-blocking — sets isLoaded when done)
import { useAuthStore } from './store/authStore.js';
import { syncService } from './lib/syncService.js';

// Boot auth, then start sync if authenticated
useAuthStore.getState().initFromStorage().then(() => {
  if (useAuthStore.getState().token) {
    syncService.start();
  }
});

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
        <RouterProvider router={router} />
        <ToastContainer />
      </QueryClientProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
