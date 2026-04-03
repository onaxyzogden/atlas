import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './routes/index.js';
import { GlobalErrorBoundary } from './components/ErrorBoundary.js';
import { ToastContainer } from './components/Toast.js';
import './app/index.css';
// Import projectStore to trigger seed-on-hydration (side-effect import)
import './store/projectStore.js';
// Init auth from localStorage before first render (non-blocking — sets isLoaded when done)
import { useAuthStore } from './store/authStore.js';
useAuthStore.getState().initFromStorage();

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
