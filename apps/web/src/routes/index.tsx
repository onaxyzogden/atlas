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
import ObserveShareViewerPage from '../pages/ObserveShareViewerPage.js';
import LoginPage from '../pages/LoginPage.js';
import RegisterPage from '../pages/RegisterPage.js';
import OrganizationCreatePage from '../pages/OrganizationCreatePage.js';
import { LandingPage } from '../features/landing/index.js';
import V3ProjectLayout from '../v3/V3ProjectLayout.js';
import V3HomePage from '../v3/pages/HomePage.js';
import PerProjectHomePage from '../v3/home/PerProjectHomePage.js';
import ProjectsLandingPage from '../v3/pages/ProjectsLandingPage.js';
import PortfolioHomePage from '../v3/portfolio/PortfolioHomePage.js';
import PortfolioObserveComparePage from '../v3/portfolio/observe-compare/PortfolioObserveComparePage.js';
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
import StageZeroVisionPage from '../v3/stage-zero/StageZeroVisionPage.js';
import StageCompassPage from '../v3/compass/StageCompassPage.js';
import PlanStageCompassPage from '../v3/plan/compass/PlanStageCompassPage.js';
import ActStageCompassPage from '../v3/act/compass/ActStageCompassPage.js';
import ObserveCommandCentrePage from '../v3/command/ObserveCommandCentrePage.js';
import PlanCommandCentrePage from '../v3/plan/command/PlanCommandCentrePage.js';
import ActCommandCentrePage from '../v3/act/command/ActCommandCentrePage.js';
// PROTOTYPE-ONLY: map-centric Act tier shell concept (dev route only). See
// apps/web/src/v3/act/tier-prototype/ — coexists with ActLayout, deletable.
import ActProtoTierShell from '../v3/act/tier-prototype/ActProtoTierShell.js';
import TrueNorthCompassPage from '../v3/true-north/TrueNorthCompassPage.js';
import FitGatePage from '../v3/true-north/fit-gate/FitGatePage.js';
import PlanLayout from '../v3/plan/PlanLayout.js';
import PlanReviewsPage from '../v3/plan/impact/PlanReviewsPage.js';
import PlanDecisionLogPage from '../v3/plan/decisions/PlanDecisionLogPage.js';
import PlanWorkPackagesPage from '../v3/plan/work-packages/PlanWorkPackagesPage.js';
import PlanningWorkspacePage from '../v3/plan/workspace/PlanningWorkspacePage.js';
import PlanConflictsPage from '../v3/plan/conflicts/PlanConflictsPage.js';
import PlanVersionsPage from '../v3/plan/versions/PlanVersionsPage.js';
import PlanSynthesisPage from '../v3/plan/synthesis/PlanSynthesisPage.js';
// ADR 7 Phase 4 — app-wide sync-conflict resolution surface (Keep-mine/Keep-server).
import SyncConflictsPage from '../conflicts/SyncConflictsPage.js';
import ActLayout from '../v3/act/ActLayout.js';
import ActPlaceholderPage from '../v3/pages/ActPlaceholderPage.js';
import OLOSWorkspacePage from '../v3/olos/OLOSWorkspacePage.js';
import OLOSObjectivePage from '../v3/olos/OLOSObjectivePage.js';
import { ShowcasePage } from '../showcase/routes/showcase.js';
import { ShowcaseTierPage } from '../showcase/routes/showcase.$tier.js';
import { ShowcaseCapturePage } from '../showcase/routes/showcase._capture.js';
import WizardStep1Site from '../v3/project-wizard/WizardStep1Site.js';
import WizardStepRouter from '../v3/project-wizard/WizardStepRouter.js';

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

// NewProjectPage superseded by the spec wizard at /v3/project/wizard
// (Phase 2, Slice 2.4). Component retained per feedback_no_deletion.md —
// the /new route now redirects to the wizard while preserving the
// `?prefillTemplate` / `?orgId` / `?fullSetup` query so showcase /
// stewarding entry paths keep working. Deletion deferred to Phase 7.
void NewProjectPage;

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

// Slice 2.4 — /new is now a redirect shim to the spec wizard. Search
// params thread through so showcase template instantiation
// (`?prefillTemplate=...`), workspace context (`?orgId=...`), and the
// Stewarding handoff (`?fullSetup=true`) still drive the new flow. The
// wizard reads the same params (Slice 2.1 parity work).
const newProjectRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/new',
  component: () => null,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    prefillTemplate?: string;
    orgId?: string;
    fullSetup?: boolean;
  } => {
    const out: {
      prefillTemplate?: string;
      orgId?: string;
      fullSetup?: boolean;
    } = {};
    if (typeof search.prefillTemplate === 'string' && search.prefillTemplate) {
      out.prefillTemplate = search.prefillTemplate;
    }
    if (typeof search.orgId === 'string' && search.orgId) {
      out.orgId = search.orgId;
    }
    if (search.fullSetup === true || search.fullSetup === 'true') {
      out.fullSetup = true;
    }
    return out;
  },
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/v3/project/wizard',
      search,
    });
  },
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
      to: '/v3/project/$projectId/true-north',
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

// Phase 5 / Slice 5.3 — Portfolio Home. Urgency-ordered project cards at
// /v3/portfolio. Sibling of v3ProjectsLandingRoute (the "Property Candidates"
// landing) so both surfaces stay accessible per the no-deletion rule.
// Portfolio Home consumes useProjectUrgency to assemble the inputs and
// sortByUrgency to order the result; the score itself is never displayed.
const v3PortfolioHomeRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/v3/portfolio',
  component: PortfolioHomePage,
});

// Plan P6 — cross-project Observe comparison (spec §6). Sibling of the
// Portfolio Home route under appShellRoute. Read-only: derives entirely from
// the client-side Phase-4 ObserveDataPoint store. Optional search params seed
// the initial selection when reached from a per-project Observe domain header
// (`?from=<projectId>&domain=<domainId>`).
const v3PortfolioObserveCompareRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/v3/portfolio/observe-compare',
  component: PortfolioObserveComparePage,
  validateSearch: (search: Record<string, unknown>): {
    from?: string;
    domain?: string;
  } => ({
    from: typeof search.from === 'string' ? search.from : undefined,
    domain: typeof search.domain === 'string' ? search.domain : undefined,
  }),
});

// Phase 2 / Slice 2.1.g — Project Creation Wizard entry. `/v3/project/wizard`
// renders Step 1 (Site) WITHOUT a projectId; the project record is created
// on Step 1 "Next" and the wizard redirects to the per-project resume route
// below. Static `wizard` segment takes precedence over the `$projectId`
// sibling per TanStack Router static-over-dynamic resolution.
const v3WizardCreateRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/v3/project/wizard',
  component: WizardStep1Site,
});

// Per-project resume entry: deep links into Step 2/3/complete after Step 1
// has created the project. `$step` ∈ vision | team | complete; the router
// component switches and redirects if the wizard has already finished.
const v3WizardResumeRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'wizard/$step',
  component: WizardStepRouter,
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

// Per-Project Home (Phase 5, Slice 5.4) is the canonical landing for
// `/v3/project/$projectId` and `/v3/project/$projectId/home`. The legacy
// V3HomePage is kept on disk + still imported above per
// `feedback_no_deletion.md`; future surfaces may reuse its primitives
// (HomeHero, ActivityList, ActionList, ObservedStamp).
const v3IndexRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: '/',
  component: PerProjectHomePage,
});
const v3HomeRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'home',
  component: PerProjectHomePage,
});
// Legacy 7-stage redirect → Observe (page components retired 2026-05-21;
// the redirects survive to preserve deep-link compatibility for any
// bookmarks or external links to /discover or /diagnose).
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
// True North — Stage 0 "define your goal" compass, rendered before Observe.
// Full-bleed (V3ProjectLayout skips LandOsShell for `true-north`).
const v3TrueNorthRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'true-north',
  component: TrueNorthCompassPage,
});
// Fit Gate — Stage 0 verdict surface the True North center unlocks into.
// Static path resolves before any sibling param routes.
const v3FitGateRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'true-north/fit-gate',
  component: FitGatePage,
});
// Stage Compass — per-project full-screen "mission select" landing for Observe.
const v3CompassRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'compass',
  component: StageCompassPage,
});
// Observe Command Centre — the aggregate "run the stage" surface the compass
// center unlocks into. Static path resolves before the `observe/$module` param.
// Stage Zero Vision Builder — full-screen questionnaire that captures the
// land vision before OBSERVE. Sibling of `observe` under the v3 project layout.
const v3StageZeroRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'stage-zero',
  component: StageZeroVisionPage,
});
const v3ObserveCommandCentreRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'observe/command-centre',
  component: ObserveCommandCentrePage,
});
// OLOS Observe Dashboard Spec v1 — Unified Land State shell route.
// Renders ObserveLayout, which reads `observeShellMode` and branches into
// ObserveDashboardLayout when dashboard is the active shell. Static
// `observe/dashboard` resolves BEFORE `observe/$module` so the legacy
// module routes remain reachable for projects that have flipped the
// toggle to module-bar.
const v3ObserveDashboardRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'observe/dashboard',
  component: ObserveLayout,
});
// Domain Detail surface (Slice 4.3). Static `observe/dashboard/domain/$domainId`
// resolves BEFORE `observe/$module` so domain detail does not collide with the
// legacy module routes. ObserveLayout reads `params.domainId` and feeds it to
// ObserveDashboardLayout, which branches between UnifiedLandStateSurface and
// DomainDetailLayout.
const v3ObserveDashboardDomainRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'observe/dashboard/domain/$domainId',
  component: ObserveLayout,
});
// Temporal Layer surface (Slice 4.5). Static
// `observe/dashboard/temporal/$domainId` sits alongside the domain route so
// the dashboard surface resolution stays static-prefix-first. ObserveLayout
// inspects the path and passes `surface='temporal'` to ObserveDashboardLayout,
// which mounts TemporalLayerSurface.
const v3ObserveDashboardTemporalRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'observe/dashboard/temporal/$domainId',
  component: ObserveLayout,
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
// Plan Stage Compass — per-stage "mission select". Static path resolves before
// the `plan/$module` param route.
const v3PlanCompassRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan/compass',
  component: PlanStageCompassPage,
});
// Plan Command Centre — the aggregate "run the stage" surface the Plan compass
// center unlocks into. Static path resolves before the `plan/$module` param.
const v3PlanCommandCentreRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan/command-centre',
  component: PlanCommandCentrePage,
});
// Plan search-param shape. Slice 2.4 introduces `?highlightIncomplete=s1`
// (wizard "Continue setup in Plan" deep link). Only 's1' is honoured
// today; future stratum hops can extend the union without a route-shape
// migration. Kept on all three plan-shell routes so a deep link reaches
// the spine regardless of whether the steward lands on /plan,
// /plan/stratum/$stratumId, or
// /plan/stratum/$stratumId/objective/$objectiveId.
type PlanSearch = { highlightIncomplete?: 's1' };

const validatePlanSearch = (
  search: Record<string, unknown>,
): PlanSearch => {
  const out: PlanSearch = {};
  if (search.highlightIncomplete === 's1') {
    out.highlightIncomplete = 's1';
  }
  return out;
};

const v3PlanRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan',
  component: PlanLayout,
  validateSearch: validatePlanSearch,
});
// Plan Reviews — Observe→Plan impact-flag triage. Static path resolves before
// the `plan/$module` param route. Nucleus of the future Plan Operation Centre.
const v3PlanReviewRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan/review',
  component: PlanReviewsPage,
});
// Plan Decision Log — the durable authored record behind Plan Review verbs
// (Phase 2). Static path resolves before the `plan/$module` param route.
const v3PlanDecisionLogRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan/decisions',
  component: PlanDecisionLogPage,
});
// Plan Work Packages — field work handed from accepted decisions to Act
// (Phase 3). Static path resolves before the `plan/$module` param route.
const v3PlanWorkPackagesRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan/work-packages',
  component: PlanWorkPackagesPage,
});
// Planning Workspace — the focused, per-decision surface with side-by-side
// response options (Phase 4). Static prefix resolves before the `plan/$module`
// param route. Reached from the Decision Log only ("Open workspace →").
const v3PlanWorkspaceRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan/workspace/$decisionId',
  component: PlanningWorkspacePage,
});
// Plan Conflicts — new observations that may contradict an existing decision
// (Phase 5a). Static path resolves before the `plan/$module` param route.
const v3PlanConflictsRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan/conflicts',
  component: PlanConflictsPage,
});
// Plan Versions — point-in-time snapshots of the whole plan (Phase 5b). Static
// path resolves before the `plan/$module` param route.
const v3PlanVersionsRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan/versions',
  component: PlanVersionsPage,
});
// Plan Synthesis — Plan-Operation roll-up + advisory approval (Phase 5c).
// Static path resolves before the `plan/$module` param route.
const v3PlanSynthesisRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan/synthesis',
  component: PlanSynthesisPage,
});
// OLOS Plan Navigation Spec v1 - stratum-spine routes. Both render PlanLayout,
// which reads `planShellMode` and branches into PlanStratumShell when the stratum
// spine is the active shell. The static `plan/stratum/...` prefix resolves
// BEFORE `plan/$module` so the legacy module routes remain reachable for
// projects that have flipped the toggle to module-bar.
const v3PlanStratumRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan/stratum/$stratumId',
  component: PlanLayout,
  validateSearch: validatePlanSearch,
});
const v3PlanStratumObjectiveRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan/stratum/$stratumId/objective/$objectiveId',
  component: PlanLayout,
  validateSearch: validatePlanSearch,
});
const v3PlanModuleRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'plan/$module',
  component: PlanLayout,
});
// Act Stage Compass — per-stage "mission select". Static path resolves before
// the `act/$module` param route.
const v3ActCompassRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'act/compass',
  component: ActStageCompassPage,
});
// OLOS Act Command Center spec — field-action routes. Both mount ActLayout,
// which reads `actShellMode` and branches into ActFieldActionLayout when
// field-action is the active shell. Static `act/field-action/...` prefixes
// resolve BEFORE `act/$module` so the legacy module routes remain reachable
// for projects that have flipped the toggle to command-centre.
// PROTOTYPE-ONLY: map-centric Act tier shell concept. Static path resolves
// before `act/$module`. Standalone dev route (no toggle into the live flow);
// the whole tier-prototype/ folder is deletable once look/feel is validated.
const v3ActTierPrototypeRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'act/tier-prototype',
  component: ActProtoTierShell,
});
const v3ActFieldActionRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'act/field-action',
  component: ActLayout,
});
const v3ActFieldActionObjectiveRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'act/field-action/$objectiveId',
  component: ActLayout,
  validateSearch: (search: Record<string, unknown>): { taskId?: string } => ({
    taskId: typeof search.taskId === 'string' ? search.taskId : undefined,
  }),
});
// Promoted map-centric tier shell (default Act mode). Static `act/tier-shell`
// + `act/tier-shell/$objectiveId` prefixes resolve BEFORE `act/$module`; a
// second bare `$param` sibling under `act/` would collide with `act/$module`,
// so deep-linked objective selection rides the static prefix. Both mount
// ActLayout, which branches on `actShellMode` into ActTierShell.
const v3ActTierShellRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'act/tier-shell',
  component: ActLayout,
});
const v3ActTierShellObjectiveRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'act/tier-shell/$objectiveId',
  component: ActLayout,
  validateSearch: (search: Record<string, unknown>): { taskId?: string } => ({
    taskId: typeof search.taskId === 'string' ? search.taskId : undefined,
  }),
});
// Act Command Centre — the aggregate "run the stage" surface the Act compass
// center unlocks into. Static path resolves before the `act/$module` param.
const v3ActCommandCentreRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'act/command-centre',
  component: ActCommandCentrePage,
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

// ─── OLOS workspace (Stage × Domain × Objective navigation) ──────────────
// Parallel to /observe|/plan|/act compass surfaces — those legacy routes
// stay intact per feedback_no_deletion. OLOS is the forward IA.
const v3OlosIndexRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'olos',
  component: OLOSWorkspacePage,
  validateSearch: (search: Record<string, unknown>): { stage?: string } => {
    const out: { stage?: string } = {};
    if (typeof search.stage === 'string') out.stage = search.stage;
    return out;
  },
});
const v3OlosStageRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'olos/$stage',
  component: OLOSWorkspacePage,
});
const v3OlosObjectiveRoute = createRoute({
  getParentRoute: () => v3ProjectLayoutRoute,
  path: 'olos/$stage/$domain',
  component: OLOSObjectivePage,
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

// ─── Register page (outside AppShell — Phase 4 sibling) ────────────────
// Dedicated /register surface so the Three Streams showcase ContactCTA
// can hand off into tier-aware post-register routing. Search params
// drive the post-register behaviour:
//   ?next=instantiate&template=<slug>           → instant-instantiate (Dreaming)
//   ?next=instantiate&template=<slug>&drawFirst=true   → draw-boundary-first (Transitioning)
//   ?next=instantiate&template=<slug>&fullSetup=true   → org-creation-first (Stewarding)
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    next?: string;
    template?: string;
    drawFirst?: boolean;
    fullSetup?: boolean;
  } => {
    const out: {
      next?: string;
      template?: string;
      drawFirst?: boolean;
      fullSetup?: boolean;
    } = {};
    if (typeof search.next === 'string') out.next = search.next;
    if (typeof search.template === 'string') out.template = search.template;
    if (search.drawFirst === true || search.drawFirst === 'true') {
      out.drawFirst = true;
    }
    if (search.fullSetup === true || search.fullSetup === 'true') {
      out.fullSetup = true;
    }
    return out;
  },
});

// Phase 4.5 — /organizations/new prelude. Sibling-of-appShellRoute so it
// renders without the authed app shell, but is itself auth-gated: the
// component redirects to /register if no token is present. Search params
// thread the post-handoff route just like /register does, so the
// Stewarding ContactCTA can chain showcase → /register → /organizations/new
// → /new without losing the template selection.
const organizationCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/organizations/new',
  component: OrganizationCreatePage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { next?: string; template?: string } => {
    const out: { next?: string; template?: string } = {};
    if (typeof search.next === 'string') out.next = search.next;
    if (typeof search.template === 'string') out.template = search.template;
    return out;
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

// ─── Public Observe presentation share (outside AppShell, no auth) ───────
// Phase 4 Slice 4.5 — token-based read-only viewer for the four
// Presentation Mode sections. Token resolves client-side against the
// local-first `presentationShareStore`; expired / unknown tokens land
// on a friendly empty state.
const observeShareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/v3/observe/share/$token',
  component: ObserveShareViewerPage,
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

// Dev-only capture route — mounted as a public sibling of the showcase
// routes so the Playwright snapshot script can navigate Chromium to it.
// The component itself short-circuits to a 404-equivalent when
// import.meta.env.DEV is false, so even though the route is registered in
// production builds it never renders the capture surface there. Path uses
// an underscore prefix on the static segment to signal "internal" and to
// take precedence over the dynamic `$tier` route via TanStack Router's
// static-over-dynamic resolution.
const showcaseCaptureRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/showcase/three-streams/_capture',
  component: ShowcaseCapturePage,
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

// ADR 7 Phase 4 — app-wide Sync Conflicts surface. Top-level under the authed
// app shell (not project-scoped); the page resolves the active project
// internally. The OfflineBanner conflict badge links here (/conflicts).
const conflictsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/conflicts',
  component: SyncConflictsPage,
});

// ─── Router ────────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  appShellRoute.addChildren([
    homeRoute,
    conflictsRoute,
    archiveRoute,
    newProjectRoute,
    cycleRoute,
    projectRoute,
    compareCandidatesRoute,
    v3ComponentsDebugRoute,
    v3ProjectsLandingRoute,
    v3PortfolioHomeRoute,
    v3PortfolioObserveCompareRoute,
    v3WizardCreateRoute,
    v3ProjectLayoutRoute.addChildren([
      v3WizardResumeRoute,
      v3IndexRoute,
      v3HomeRoute,
      v3DiscoverRoute,
      v3DiagnoseRoute,
      v3TrueNorthRoute,
      v3FitGateRoute,
      v3CompassRoute,
      v3StageZeroRoute,
      v3ObserveCommandCentreRoute,
      v3ObserveDashboardTemporalRoute,
      v3ObserveDashboardDomainRoute,
      v3ObserveDashboardRoute,
      v3ObserveIndexRoute,
      v3ObserveModuleRoute,
      v3PlanCompassRoute,
      v3PlanCommandCentreRoute,
      v3PlanRoute,
      v3PlanReviewRoute,
      v3PlanDecisionLogRoute,
      v3PlanWorkPackagesRoute,
      v3PlanWorkspaceRoute,
      v3PlanConflictsRoute,
      v3PlanVersionsRoute,
      v3PlanSynthesisRoute,
      v3PlanStratumRoute,
      v3PlanStratumObjectiveRoute,
      v3PlanModuleRoute,
      v3ActCompassRoute,
      v3ActCommandCentreRoute,
      v3ActTierPrototypeRoute,
      v3ActTierShellRoute,
      v3ActTierShellObjectiveRoute,
      v3ActFieldActionRoute,
      v3ActFieldActionObjectiveRoute,
      v3ActRoute,
      v3ActModuleRoute,
      v3DesignRoute,
      v3ProveRoute,
      v3BuildRoute,
      v3OperateRoute,
      v3ReportRoute,
      v3OlosIndexRoute,
      v3OlosStageRoute,
      v3OlosObjectiveRoute,
      v3EthicsReferenceRoute,
      v3AffinityTelemetryRoute,
    ]),
    notFoundRoute,
  ]),
  landingRoute,
  loginRoute,
  registerRoute,
  organizationCreateRoute,
  portalRoute,
  reportShareRoute,
  observeShareRoute,
  showcaseRoute,
  showcaseCaptureRoute,
  showcaseTierRoute,
]);

export const router = createRouter({ routeTree });

// Type-safe router declaration
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
