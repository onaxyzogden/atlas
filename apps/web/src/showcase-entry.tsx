/**
 * Lean bootstrap for the public showcase scrollytelling portal.
 *
 * Mounted by `apps/web/showcase.html` (second Vite rollup input) so the
 * showcase route's dependency graph is *physically* isolated from the
 * authed-app bundle — projectStore, the four seeders, connectivityStore,
 * authStore init, siteDataSync, syncService, AppShell, V3 pages, and the
 * Cesium chunk are all unreachable from this entry.
 *
 * See wiki ADR 2026-05-21-atlas-showcase-bundle-split (Prong B).
 *
 * Behaviour preserved vs the authed entry:
 *   • Claude-preview-window reduce-motion hack — kept verbatim
 *   • Site-annotations migrators — kept (data-safety-critical, cheap early
 *     exit when no legacy blob is present, runs every path)
 *   • body.showcase-scroll class — applied by individual scene routes
 *     (`apps/web/src/showcase/routes/showcase.tsx` etc.) on mount; no entry
 *     hook needed
 *
 * NOT mounted:
 *   • SessionExpiredBanner — its session-expired store is never triggered
 *     on showcase paths and importing it pulls authStore transitively
 *   • bootAuth / setSessionExpiredHandler / syncService — authed-only
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { showcaseRouter } from './showcase/router.js';
import { GlobalErrorBoundary } from './components/ErrorBoundary.js';
import { ToastContainer } from './components/Toast.js';
import '@ogden/ui-components/style.css';
import './app/index.css';

// Collapse infinite animations under the Claude Code preview window so the
// MCP screenshot tool can settle a frame.
if (typeof navigator !== 'undefined' && /Claude\//.test(navigator.userAgent)) {
  document.documentElement.classList.add('reduce-motion');
}

// One-time migrator: legacy `ogden-site-annotations` v3 blob → 7
// Scholar-aligned namespace stores. Cheap (localStorage-only, early-exits
// when no legacy blob is present). Data-safety-critical — runs for every
// entry including showcase. Idempotent.
import { migrateLegacyBlob, cleanupArchivedV3 } from './store/site-annotations-migrate.js';
migrateLegacyBlob();
cleanupArchivedV3();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={showcaseRouter} />
        <ToastContainer />
      </QueryClientProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
