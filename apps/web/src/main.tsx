import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './routes/index.js';
import { GlobalErrorBoundary } from './components/ErrorBoundary.js';
import { ToastContainer } from './components/Toast.js';
import './app/index.css';

// Dev-only: axe-core a11y audit runs on every render and logs violations to
// the console. Tree-shaken out of prod bundles via the DEV gate.
if (import.meta.env.DEV) {
  void import('@axe-core/react').then(({ default: axe }) => {
    console.info('[axe] dev-mode a11y audit armed (1s debounce)');
    axe(React, ReactDOM, 1000);
  });
}
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
