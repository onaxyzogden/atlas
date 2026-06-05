/**
 * Showcase-only TanStack Router instance — mounted by `showcase-entry.tsx`
 * via the second Vite rollup input (`apps/web/showcase.html`).
 *
 * Phase 3.5 Prong B: keep the authed-app route graph (AppShell, V3 pages,
 * Cesium-adjacent code) physically out of the showcase entry's dependency
 * tree. Only the three showcase routes are registered here; everything else
 * 404s back to the hero.
 *
 * Type registration intentionally NOT re-declared here — the main router in
 * `apps/web/src/routes/index.tsx` owns the global `@tanstack/react-router`
 * `Register` module augmentation. The showcase router uses local typing
 * inferred from `createRouter`'s return type.
 *
 * See wiki ADR 2026-05-21-atlas-showcase-bundle-split (Prong B).
 */

import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { ShowcasePage } from './routes/showcase.js';
import { ShowcaseTierPage } from './routes/showcase.$tier.js';
import { ShowcaseCapturePage } from './routes/showcase._capture.js';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

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

// Dev-only Playwright capture target. Static segment takes precedence over
// the dynamic `$tier` route per TanStack Router resolution.
const showcaseCaptureRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/showcase/three-streams/_capture',
  component: ShowcaseCapturePage,
});

// Anything that isn't a showcase path → redirect to the hero. Keeps the
// showcase entry's surface tight; no authed routes are reachable from it.
const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  beforeLoad: () => {
    throw redirect({ to: '/showcase/three-streams' });
  },
  component: () => null,
});

const routeTree = rootRoute.addChildren([
  showcaseRoute,
  showcaseCaptureRoute,
  showcaseTierRoute,
  catchAllRoute,
]);

export const showcaseRouter = createRouter({ routeTree });
