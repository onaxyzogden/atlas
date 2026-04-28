/**
 * Route definitions — TanStack Router file-based routing.
 *
 * Routes:
 *   /              → Landing (public) — redirects to /home if authenticated
 *   /home          → Home (project list, authenticated)
 *   /new           → New project wizard
 *   /project/$id   → Project view (map + dashboard)
 *   /login         → Login / register (outside AppShell)
 *   /portal/$slug  → Public project portal (outside AppShell)
 */

import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import AppShell from '../app/AppShell.js';
import HomePage from '../pages/HomePage.js';
import { semantic } from '../lib/tokens.js';
import NewProjectPage from '../pages/NewProjectPage.js';
import LifecycleProjectPage from '../pages/LifecycleProjectPage.js';
import CompareCandidatesPage from '../features/project/compare/CompareCandidatesPage.js';
import PortalPage from '../pages/PortalPage.js';
import LoginPage from '../pages/LoginPage.js';
import { LandingPage } from '../features/landing/index.js';

// Auth gate used by the public landing route. Reads the persisted token
// directly so the redirect fires before AppShell mounts (avoiding a flash
// of LandingPage for already-signed-in users).
const AUTH_TOKEN_KEY = 'ogden-auth-token';
function isAuthenticated(): boolean {
  try {
    return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
  } catch {
    return false;
  }
}

// ─── Root layout (with AppShell) ──────────────────────────────────────────
const rootRoute = createRootRoute({
  component: Outlet,
});

// App shell wrapper for main routes
const appShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

// ─── Main pages (inside AppShell) ─────────────────────────────────────────
const homeRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/home',
  component: HomePage,
});

const newProjectRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/new',
  component: NewProjectPage,
});

const projectRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/project/$projectId',
  component: LifecycleProjectPage,
});

const compareCandidatesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/projects/compare',
  component: CompareCandidatesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    ids: typeof search.ids === 'string' ? search.ids : '',
  }),
});

// ─── Landing page (outside AppShell — public marketing) ─────────────────
const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: '/home' });
    }
  },
});

// ─── Login page (outside AppShell — own centered layout) ─────────────────
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

// ─── Portal page (outside AppShell — own layout) ─────────────────────────
const portalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/portal/$slug',
  component: PortalPage,
});

// ─── 404 catch-all ─────────────────────────────────────────────────────────
const notFoundRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '*',
  component: () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <h2 style={{ color: 'var(--color-text)', fontSize: 20, margin: 0 }}>Page not found</h2>
      <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>The page you're looking for doesn't exist.</p>
      <a href="/" style={{ color: semantic.sidebarActive, textDecoration: 'underline' }}>Back to projects</a>
    </div>
  ),
});

// ─── Router ────────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  appShellRoute.addChildren([
    homeRoute,
    newProjectRoute,
    projectRoute,
    compareCandidatesRoute,
    notFoundRoute,
  ]),
  landingRoute,
  loginRoute,
  portalRoute,
]);

export const router = createRouter({ routeTree });

// Type-safe router declaration
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
