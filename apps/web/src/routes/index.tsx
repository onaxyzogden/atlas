/**
 * Route definitions — TanStack Router file-based routing.
 *
 * Routes:
 *   /              → Landing (public) — redirects to /home if authenticated
 *   /home          → Home (project list, authenticated)
 *   /new           → New project wizard
 *   /cycle         → Cycle wheel (Observe / Plan / Act)
 *   /project/$id   → Project view (map + dashboard)
 *   /login         → Login / register (outside AppShell)
 *   /portal/$slug  → Public project portal (outside AppShell)
 *   /showcase/three-streams           → Public showcase hero (no auth)
 *   /showcase/three-streams/$tier     → Per-tier scrollytelling (no auth)
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
import ArchivePage from '../pages/ArchivePage.js';
import { semantic } from '../lib/tokens.js';
import NewProjectPage from '../pages/NewProjectPage.js';
import LifecycleProjectPage from '../pages/LifecycleProjectPage.js';
import CompareCandidatesPage from '../features/project/compare/CompareCandidatesPage.js';
import PortalPage from '../pages/PortalPage.js';
import ReportSharePage from '../pages/ReportSharePage.js';
import LoginPage from '../pages/LoginPage.js';
import { LandingPage } from '../features/landing/index.js';
import V3ProjectLayout from '../v3/V3ProjectLayout.js';
import V3HomePage from '../v3/pages/HomePage.js';
import ProjectsLandingPage from '../v3/pages/ProjectsLandingPage.js';
import V3DesignPage from '../v3/pages/DesignPage.js';
import V3ProvePage from '../v3/pages/ProvePage.js';
import V3BuildPage from '../v3/pages/BuildPage.js';
import V3OperatePage from '../v3/pages/OperatePage.js';
import V3ReportPage from '../v3/pages/ReportPage.js';
import V3ComponentsDebugPage from '../v3/pages/ComponentsDebugPage.js';
import EthicsReferencePage from '../v3/pages/EthicsReferencePage.js';
import AffinityTelemetryDashboard from '../features/dashboard/pages/AffinityTelemetryDashboard.js';
import CyclePage from '../pages/CyclePage.js';
import ObserveLayout from '../v3/observe/ObserveLayout.js';
import PlanLayout from '../v3/plan/PlanLayout.js';
import ActLayout from '../v3/act/ActLayout.js';
import ActPlaceholderPage from '../v3/pages/ActPlaceholderPage.js';
import { ShowcasePage } from '../showcase/routes/showcase.js';
import { ShowcaseTierPage } from '../showcase/routes/showcase.$tier.js';

// ActPlaceholderPage retained per feedback_no_deletion.md — superseded by
// ActLayout but left importable for any future fallback need.
void ActPlaceholderPage;

// Legacy 7-stage + v2 page components retained per feedback_no_deletion.md —
// their routes now redirect onto the v3 forward path (Observe/Plan/Act) but
// the components stay importable for potential reuse in a later phase.
void V3DesignPage;
void V3ProvePage;
void V3BuildPage;
void V3OperatePage;
void LifecycleProjectPage;
void CyclePage;

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

// App shell wrapper for main routes. Authenticated routes only — any nested
// route inherits this guard, so /home, /new, /project/*, /v3/project/* all
// redirect unauthenticated visitors to /login with the intended path
// preserved in ?redirect=. Public surfaces (/, /login, /portal/*,
// /report-share/*) are siblings of this route and stay unaffected.
const appShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
  },
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

const archiveRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/archive',
  component: ArchivePage,
});

const newProjectRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/new',
  component: NewProjectPage,
});

// Legacy v2 routes redirect onto the v3 forward path. Components stay
// importable per feedback_no_deletion.md (void-referenced near the top).
const cycleRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/cycle',
  component: () => null,
  beforeLoad: () => {
    throw redirect({ to: '/v3/project' });
  },
});

const projectRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/project/$projectId',
  component: () => null,
  beforeLoad: ({ params }) => {
    const { projectId } = params as { projectId: string };
    throw redirect({
      to: '/v3/project/$projectId/observe',
      params: { projectId },
    });
  },
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

// ─── Atlas 3.0 (parallel route tree under /v3) ───────────────────────────
// Lifecycle workspace: 7 stages + home, all under the V3ProjectLayout shell.
// Phase 1 stubs render a placeholder per stage; later phases swap in real pages.
const v3ProjectLayoutRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/v3/project/$projectId',
  component: V3ProjectLayout,
});

// /v3/project (no project ID) — projects landing rendered in the Property
// Candidates format. Sibling of v3ProjectLayoutRoute so it isn't gated on a
// projectId param.
const v3ProjectsLandingRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/v3/project',
  component: ProjectsLandingPage,
});

// ─── Atlas 3.0 — reference surfaces (sidebar footer P0 utilities) ───────
// Nested under v3ProjectLayoutRoute so the lifecycle sidebar persists.
const v3EthicsReferenceRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'reference/ethics',
  component: EthicsReferencePage,
});

// Dev-only: observed Act-module touch counts vs. v1 affinity ranking.
// Sidebar + Home tile entries are both gated by VITE_ATLAS_TELEMETRY_ENABLED;
// the route itself stays mounted so direct links keep working in development
// even when the env flag is off.
const v3AffinityTelemetryRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'reference/affinity-telemetry',
  component: AffinityTelemetryDashboard,
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
// Legacy discover/diagnose routes redirect to the new Observe shell.
// The underlying page components remain in the repo for reuse in Plan/Act
// surfaces (Phase C) — only the routes are reshaped.
const v3DiscoverRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'discover',
  component: () => null,
  beforeLoad: ({ params }) => {
    const { projectId } = params as { projectId: string };
    throw redirect({
      to: '/v3/project/$projectId/observe/$module',
      params: { projectId, module: 'human-context' },
    });
  },
});
const v3DiagnoseRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'diagnose',
  component: () => null,
  beforeLoad: ({ params }) => {
    const { projectId } = params as { projectId: string };
    throw redirect({
      to: '/v3/project/$projectId/observe/$module',
      params: { projectId, module: 'human-context' },
    });
  },
});
const v3ObserveIndexRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'observe',
  component: ObserveLayout,
});
const v3ObserveModuleRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'observe/$module',
  component: ObserveLayout,
});
const v3PlanRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan',
  component: PlanLayout,
});
const v3PlanModuleRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan/$module',
  component: PlanLayout,
});
const v3ActRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'act',
  component: ActLayout,
});
const v3ActModuleRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'act/$module',
  component: ActLayout,
});
// Legacy 7-stage routes redirect onto the v3 forward path (Observe/Plan/Act).
// Page components stay importable per feedback_no_deletion.md (void-referenced
// near the top) for potential reuse in a later phase.
const v3DesignRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'design',
  component: () => null,
  beforeLoad: ({ params }) => {
    const { projectId } = params as { projectId: string };
    throw redirect({ to: '/v3/project/$projectId/plan', params: { projectId } });
  },
});
const v3ProveRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'prove',
  component: () => null,
  beforeLoad: ({ params }) => {
    const { projectId } = params as { projectId: string };
    throw redirect({ to: '/v3/project/$projectId/plan', params: { projectId } });
  },
});
const v3BuildRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'build',
  component: () => null,
  beforeLoad: ({ params }) => {
    const { projectId } = params as { projectId: string };
    throw redirect({ to: '/v3/project/$projectId/act', params: { projectId } });
  },
});
const v3OperateRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'operate',
  component: () => null,
  beforeLoad: ({ params }) => {
    const { projectId } = params as { projectId: string };
    throw redirect({ to: '/v3/project/$projectId/act', params: { projectId } });
  },
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
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = search.redirect;
    return typeof r === 'string' ? { redirect: r } : {};
  },
});

// ─── Portal page (outside AppShell — own layout) ─────────────────────────
const portalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/portal/$slug',
  component: PortalPage,
});

// ─── Public report share (outside AppShell, no auth) ─────────────────────
const reportShareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/report-share/$token',
  component: ReportSharePage,
});

// ─── Showcase (public scrollytelling — outside AppShell, no auth) ────────
const showcaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/showcase/three-streams',
  component: ShowcasePage,
});

const showcaseTierRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/showcase/three-streams/$tier',
  component: ShowcaseTierPage,
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
    archiveRoute,
    newProjectRoute,
    cycleRoute,
    projectRoute,
    compareCandidatesRoute,
    v3ComponentsDebugRoute,
    v3ProjectsLandingRoute,
    v3ProjectLayoutRoute.addChildren([
      v3IndexRoute,
      v3HomeRoute,
      v3DiscoverRoute,
      v3DiagnoseRoute,
      v3ObserveIndexRoute,
      v3ObserveModuleRoute,
      v3PlanRoute,
      v3PlanModuleRoute,
      v3ActRoute,
      v3ActModuleRoute,
      v3DesignRoute,
      v3ProveRoute,
      v3BuildRoute,
      v3OperateRoute,
      v3ReportRoute,
      v3EthicsReferenceRoute,
      v3AffinityTelemetryRoute,
    ]),
    notFoundRoute,
  ]),
  landingRoute,
  loginRoute,
  portalRoute,
  reportShareRoute,
  showcaseRoute,
  showcaseTierRoute,
]);

export const router = createRouter({ routeTree });

// Type-safe router declaration
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
