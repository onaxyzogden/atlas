/**
 * Route definitions — TanStack Router file-based routing.
 *
 * Routes:
 *   /              → Home (project list)
 *   /new           → New project wizard
 *   /project/$id   → Project view (map + dashboard)
 */

import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';
import AppShell from '../app/AppShell.js';
import HomePage from '../pages/HomePage.js';
import NewProjectPage from '../pages/NewProjectPage.js';
import ProjectPage from '../pages/ProjectPage.js';
import PortalPage from '../pages/PortalPage.js';

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
  path: '/',
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
  component: ProjectPage,
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
      <a href="/" style={{ color: '#c4a265', textDecoration: 'underline' }}>Back to projects</a>
    </div>
  ),
});

// ─── Router ────────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  appShellRoute.addChildren([
    homeRoute,
    newProjectRoute,
    projectRoute,
    notFoundRoute,
  ]),
  portalRoute,
]);

export const router = createRouter({ routeTree });

// Type-safe router declaration
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
