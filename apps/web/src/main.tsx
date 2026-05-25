import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './routes/index.js';
import { GlobalErrorBoundary } from './components/ErrorBoundary.js';
import { ToastContainer } from './components/Toast.js';
import SessionExpiredBanner from './components/SessionExpiredBanner.js';
import ApiReachabilityBanner from './components/ApiReachabilityBanner.js';
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
// Scholar-aligned namespace stores. Cheap (localStorage-only, early-exits
// when no legacy blob is present) and data-safety-critical — runs for every
// path including showcase. Idempotent.
// See ADR 2026-04-30-site-annotations-store-scholar-aligned-namespaces.md
// and 2026-04-30-archive-v3-blob-cleanup.md.
import { migrateLegacyBlob, cleanupArchivedV3 } from './store/site-annotations-migrate.js';
migrateLegacyBlob();
cleanupArchivedV3();

// Route-aware bootstrap (Phase 3.5 Prong A). The authed-app store graph
// (projectStore + 4 seeders + connectivityStore + bootAuth + siteDataSync +
// syncService) is dead weight for cold visitors on `/showcase/*`. Gate the
// heavy boot behind a path prefix check so the showcase chunk graph stays
// clean. See wiki ADR 2026-05-21-atlas-showcase-bundle-split.
const isShowcase =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/showcase/');

if (!isShowcase) {
  const { bootAuthedShell } = await import('./app/bootAuthed.js');
  await bootAuthedShell();
}

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
        {/* SessionExpiredBanner subscribes to sessionExpiredStore, which is
            never triggered on the showcase path; mounting it is free. */}
        <SessionExpiredBanner />
        {/* ApiReachabilityBanner reads connectivity + auth stores, which stay
            at their defaults on the showcase path; mounting it is free. */}
        <ApiReachabilityBanner />
        <RouterProvider router={router} />
        <ToastContainer />
      </QueryClientProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
