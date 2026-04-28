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
import V3ProjectLayout from '../v3/V3ProjectLayout.js';
import V3HomePage from '../v3/pages/HomePage.js';
import V3DiscoverPage from '../v3/pages/DiscoverPage.js';
import V3DiagnosePage from '../v3/pages/DiagnosePage.js';
import V3DesignPage from '../v3/pages/DesignPage.js';
import V3ProvePage from '../v3/pages/ProvePage.js';
import V3BuildPage from '../v3/pages/BuildPage.js';
import V3OperatePage from '../v3/pages/OperatePage.js';
import V3ReportPage from '../v3/pages/ReportPage.js';
import V3ComponentsDebugPage from '../v3/pages/ComponentsDebugPage.js';
import EthicsReferencePage from '../v3/pages/EthicsReferencePage.js';

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

// ─── Atlas 3.0 — debug route (Phase 2 storybook gate) ───────────────────
const v3ComponentsDebugRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/v3/components',
  component: V3ComponentsDebugPage,
});

// ─── Atlas 3.0 — reference surfaces (sidebar footer P0 utilities) ───────
const v3EthicsReferenceRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/v3/reference/ethics',
  component: EthicsReferencePage,
});

// ─── Atlas 3.0 (parallel route tree under /v3) ───────────────────────────
// Lifecycle workspace: 7 stages + home, all under the V3ProjectLayout shell.
// Phase 1 stubs render a placeholder per stage; later phases swap in real pages.
const v3ProjectLayoutRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/v3/project/$projectId',
  component: V3ProjectLayout,
});

const v3IndexRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: '/',
  component: V3HomePage,
});
const v3HomeRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'home',
  component: V3HomePage,
});
const v3DiscoverRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'discover',
  component: V3DiscoverPage,
});
const v3DiagnoseRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'diagnose',
  component: V3DiagnosePage,
});
const v3DesignRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'design',
  component: V3DesignPage,
});
const v3ProveRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'prove',
  component: V3ProvePage,
});
const v3BuildRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'build',
  component: V3BuildPage,
});
const v3OperateRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'operate',
  component: V3OperatePage,
});
const v3ReportRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'report',
  component: V3ReportPage,
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
    v3ComponentsDebugRoute,
    v3EthicsReferenceRoute,
    v3ProjectLayoutRoute.addChildren([
      v3IndexRoute,
      v3HomeRoute,
      v3DiscoverRoute,
      v3DiagnoseRoute,
      v3DesignRoute,
      v3ProveRoute,
      v3BuildRoute,
      v3OperateRoute,
      v3ReportRoute,
    ]),
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
