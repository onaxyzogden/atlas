import { createRoute, createRootRoute, createRouter, redirect, Outlet, Link } from "@tanstack/react-router";
import { ObservePage } from "../pages/ObservePage.jsx";
import { ObserveDashboardPage } from "../pages/ObserveDashboardPage.jsx";
import { HumanContextDashboardPage } from "../pages/HumanContextDashboardPage.jsx";
import { StewardSurveyPage } from "../pages/StewardSurveyPage.jsx";
import { IndigenousRegionalContextPage } from "../pages/IndigenousRegionalContextPage.jsx";
import { VisionPage } from "../pages/VisionPage.jsx";
import { MacroclimateDashboardPage } from "../pages/MacroclimateDashboardPage.jsx";
import { SolarClimateDetailPage } from "../pages/SolarClimateDetailPage.jsx";
import { TopographyDashboardPage } from "../pages/TopographyDashboardPage.jsx";
import { TerrainDetailPage } from "../pages/TerrainDetailPage.jsx";
import { CrossSectionToolPage } from "../pages/CrossSectionToolPage.jsx";
import { EarthWaterEcologyPage } from "../pages/EarthWaterEcologyPage.jsx";
import { SectorsMicroclimatesDashboardPage } from "../pages/SectorsMicroclimatesDashboardPage.jsx";
import { SectorCompassPage } from "../pages/SectorCompassPage.jsx";
import { CartographicDetailPage } from "../pages/CartographicDetailPage.jsx";
import { SwotDashboardPage } from "../pages/SwotDashboardPage.jsx";
import { SwotJournalPage } from "../pages/SwotJournalPage.jsx";
import { SwotDiagnosisReportPage } from "../pages/SwotDiagnosisReportPage.jsx";

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: () => (
    <main className="route-fallback">
      <h1>OLOS</h1>
      <p>Screen not found.</p>
      <Link to="/observe">Open Observe</Link>
    </main>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => { throw redirect({ to: "/observe" }); },
});

const observeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe",
  component: ObservePage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/dashboard",
  component: ObserveDashboardPage,
});

const humanContextRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/human-context",
  component: HumanContextDashboardPage,
});

const stewardSurveyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/human-context/steward-survey",
  component: StewardSurveyPage,
});

const indigenousContextRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/human-context/indigenous-regional-context",
  component: IndigenousRegionalContextPage,
});

const visionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/human-context/vision",
  component: VisionPage,
});

const macroclimateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/macroclimate-hazards",
  component: MacroclimateDashboardPage,
});

const solarClimateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/macroclimate-hazards/solar-climate",
  component: SolarClimateDetailPage,
});

const topographyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/topography",
  component: TopographyDashboardPage,
});

const terrainDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/topography/terrain-detail",
  component: TerrainDetailPage,
});

const crossSectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/topography/cross-section-tool",
  component: CrossSectionToolPage,
});

const earthWaterEcologyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/earth-water-ecology",
  component: EarthWaterEcologyPage,
});

const sectorsZonesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/sectors-zones",
  component: SectorsMicroclimatesDashboardPage,
});

const sectorCompassRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/sectors-zones/sector-compass",
  component: SectorCompassPage,
});

const cartographicDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/sectors-zones/cartographic-detail",
  component: CartographicDetailPage,
});

const swotDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/swot",
  component: SwotDashboardPage,
});

const swotJournalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/swot/journal",
  component: SwotJournalPage,
});

const swotDiagnosisReportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observe/swot/diagnosis-report",
  component: SwotDiagnosisReportPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  observeRoute,
  dashboardRoute,
  humanContextRoute,
  stewardSurveyRoute,
  indigenousContextRoute,
  visionRoute,
  macroclimateRoute,
  solarClimateRoute,
  topographyRoute,
  terrainDetailRoute,
  crossSectionRoute,
  earthWaterEcologyRoute,
  sectorsZonesRoute,
  sectorCompassRoute,
  cartographicDetailRoute,
  swotDashboardRoute,
  swotJournalRoute,
  swotDiagnosisReportRoute,
]);

export const router = createRouter({ routeTree });
