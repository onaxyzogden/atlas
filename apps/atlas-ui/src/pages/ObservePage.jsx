import { BookOpen, CalendarDays, Leaf, Layers3, Sprout } from "lucide-react";
import { ActionCard } from "../components/ActionCard.jsx";
import { CroppedArt } from "../components/CroppedArt.jsx";
import { MetricStrip } from "../components/MetricStrip.jsx";
import { ModuleCard } from "../components/ModuleCard.jsx";
import { QaOverlay } from "../components/QaOverlay.jsx";
import { screenCatalog } from "../screenCatalog.js";
import {
  observeStageMetrics,
  observeModules,
  steward
} from "../data/builtin-sample.js";
import heroLandscape from "../assets/generated/observe/hero-landscape.png";
import moduleHuman from "../assets/generated/observe/module-human.png";
import moduleClimate from "../assets/generated/observe/module-climate.png";
import moduleTopography from "../assets/generated/observe/module-topography.png";
import moduleEarthWater from "../assets/generated/observe/module-earth-water.png";
import moduleSectors from "../assets/generated/observe/module-sectors.png";
import moduleSwot from "../assets/generated/observe/module-swot.png";
import actionSeedling from "../assets/generated/observe/action-seedling.png";
import actionFieldTip from "../assets/generated/observe/action-field-tip.png";

const observeMetadata = screenCatalog.find((screen) => screen.route === "/observe");

const moduleArt = {
  people: moduleHuman,
  weather: moduleClimate,
  topo: moduleTopography,
  soil: moduleEarthWater,
  sector: moduleSectors,
  swot: moduleSwot
};

const metrics = [
  {
    type: "progress",
    progress: observeStageMetrics.modulesProgressPct,
    progressLabel: `${observeStageMetrics.modulesProgressPct}%`,
    label: "Modules complete",
    value: `${observeStageMetrics.modulesComplete} of ${observeStageMetrics.modulesTotal} modules`,
    note: `Next up: ${observeStageMetrics.nextModule}`
  },
  {
    icon: Layers3,
    label: "Observation coverage",
    value: `${observeStageMetrics.observationCoveragePct}%`,
    note: `Site data captured across ${observeStageMetrics.siteAreaHa} ha`
  },
  {
    icon: Leaf,
    label: "Key diagnostics",
    value: `${observeStageMetrics.diagnosticsLogged} / ${observeStageMetrics.diagnosticsTotal}`,
    note: "Critical observations logged so far"
  },
  {
    icon: CalendarDays,
    label: "Updated",
    value: steward.updatedRelative,
    note: `By ${steward.initials}\n${steward.updatedAbsolute}`
  }
];

const modules = observeModules;

export function ObservePage() {
  return (
    <main className="observe-screen">
      <section className="observe-frame" aria-labelledby="observe-title">
        <HeroPanel />
        <MetricStrip metrics={metrics} ariaLabel="Stage summary metrics" />

        <section className="modules-section" aria-labelledby="modules-title">
          <h2 id="modules-title">6 Modules in this stage</h2>
          <div className="module-grid">
            {modules.map((module) => (
              <ModuleCard
                key={module.number}
                {...module}
                artClassName={module.art}
                artSrc={moduleArt[module.art]}
              />
            ))}
          </div>
        </section>

        <section className="action-grid" aria-label="Stage actions">
          <ActionCard
            className="primary-action"
            icon={<BookOpen />}
            title="Open Stage Dashboard"
            action
            to="/observe/dashboard"
          />
          <ActionCard icon={<BookOpen />} title="View Stage Guide" />
          <ActionCard
            className="quote-card"
            title="Observation reveals"
            body="patterns before intervention."
            art={<SeedlingArt />}
          />
          <ActionCard
            className="tips-card"
            icon={<FootprintArt />}
            title="Field tips"
            body="Walk slowly • Notice edges • Record anomalies • Revisit after rain"
            action
          />
        </section>
      </section>
      {import.meta.env.DEV ? (
        <QaOverlay
          reference={observeMetadata.reference}
          nativeWidth={observeMetadata.viewport.width}
          nativeHeight={observeMetadata.viewport.height}
        />
      ) : null}
    </main>
  );
}

function HeroPanel() {
  return (
    <header className="hero-panel-handbuilt">
      <div className="brand-mark" aria-hidden="true">
        <Sprout />
      </div>
      <div className="hero-copy-block">
        <p className="stage-kicker">Stage 1 of 3 — Roots & Diagnosis</p>
        <h1 id="observe-title">Observe — read the land before designing it.</h1>
        <p>
          Six modules that ground the design in reality. Capture human context,
          climate, topography, water and ecology diagnostics, sectors, and a
          living SWOT record before moving into planning.
        </p>
      </div>
      <div className="landscape-art" aria-hidden="true">
        <CroppedArt src={heroLandscape} />
      </div>
    </header>
  );
}

function SeedlingArt() {
  return <CroppedArt className="seedling-art" src={actionSeedling} />;
}

function FootprintArt() {
  return <CroppedArt className="footprint-art" src={actionFieldTip} />;
}
