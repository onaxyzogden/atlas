import React from "react";
import { createRoot } from "react-dom/client";
import { ObservePage } from "./pages/ObservePage.jsx";
import { ObserveDashboardPage } from "./pages/ObserveDashboardPage.jsx";
import { StewardSurveyPage } from "./pages/StewardSurveyPage.jsx";
import { IndigenousRegionalContextPage } from "./pages/IndigenousRegionalContextPage.jsx";
import { VisionPage } from "./pages/VisionPage.jsx";
import { EarthWaterEcologyPage } from "./pages/EarthWaterEcologyPage.jsx";
import { HumanContextDashboardPage } from "./pages/HumanContextDashboardPage.jsx";
import { CrossSectionToolPage } from "./pages/CrossSectionToolPage.jsx";
import { TopographyDashboardPage } from "./pages/TopographyDashboardPage.jsx";
import { TerrainDetailPage } from "./pages/TerrainDetailPage.jsx";
import { MacroclimateDashboardPage } from "./pages/MacroclimateDashboardPage.jsx";
import { SolarClimateDetailPage } from "./pages/SolarClimateDetailPage.jsx";
import { BuiltinProjectProvider } from "./context/BuiltinProjectContext.jsx";
import "./styles.css";

function App() {
  const path = window.location.pathname;

  if (path === "/" || path === "/observe") {
    return <ObservePage />;
  }

  if (path === "/observe/dashboard") {
    return <ObserveDashboardPage />;
  }

  if (path === "/observe/human-context/steward-survey") {
    return <StewardSurveyPage />;
  }

  if (path === "/observe/human-context") {
    return <HumanContextDashboardPage />;
  }

  if (path === "/observe/human-context/indigenous-regional-context") {
    return <IndigenousRegionalContextPage />;
  }

  if (path === "/observe/human-context/vision") {
    return <VisionPage />;
  }

  if (path === "/observe/earth-water-ecology") {
    return <EarthWaterEcologyPage />;
  }

  if (path === "/observe/macroclimate-hazards") {
    return <MacroclimateDashboardPage />;
  }

  if (path === "/observe/macroclimate-hazards/solar-climate") {
    return <SolarClimateDetailPage />;
  }

  if (path === "/observe/topography") {
    return <TopographyDashboardPage />;
  }

  if (path === "/observe/topography/terrain-detail") {
    return <TerrainDetailPage />;
  }

  if (path === "/observe/topography/cross-section-tool") {
    return <CrossSectionToolPage />;
  }

  return (
    <main className="route-fallback">
      <h1>OLOS</h1>
      <p>Screen not found.</p>
      <a href="/observe">Open Observe</a>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BuiltinProjectProvider>
      <App />
    </BuiltinProjectProvider>
  </React.StrictMode>
);
