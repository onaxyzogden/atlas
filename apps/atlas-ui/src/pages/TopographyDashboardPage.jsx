import {
  ArrowRight,
  Droplet,
  Home,
  Layers,
  Leaf,
  Mountain,
  Ruler,
  ShieldAlert,
  SlidersHorizontal,
  Sun,
  Triangle
} from "lucide-react";
import { useState } from "react";
import {
  AppShell,
  CroppedArt,
  ModuleHeroCard,
  ModuleKpiStrip,
  ModuleSynthesisPanel,
  QaOverlay,
  SlideUpPane,
  SurfaceCard,
  TopStageBar,
  ProjectDataStatus
} from "../components/index.js";
import { observeNav } from "../data/navConfig.js";
import { screenCatalog } from "../screenCatalog.js";
import { topographyDashboard as vm } from "../data/builtin-sample.js";
import { TerrainDetailContent } from "./TerrainDetailPage.jsx";
import { CrossSectionToolContent } from "./CrossSectionToolPage.jsx";
import heroTerrain from "../assets/generated/topography-dashboard/hero-terrain.png";
import terrainPreview from "../assets/generated/topography-dashboard/terrain-preview.png";
import crossSectionPreview from "../assets/generated/topography-dashboard/cross-section-preview.png";

const metadata = screenCatalog.find((screen) => screen.route === "/observe/topography");

const topoIconMap = { triangle: Triangle, mountain: Mountain, ruler: Ruler, sliders: SlidersHorizontal, layers: Layers, droplet: Droplet, leaf: Leaf, home: Home, shield: ShieldAlert, sun: Sun };

export function TopographyDashboardPage() {
  const [pane, setPane] = useState(null);
  const close = () => setPane(null);
  return (
    <AppShell navConfig={observeNav}>
      <div className="detail-page topography-page module-frame">
        <TopStageBar stage="Stage 1 of 3" module="Roots & Diagnosis — Module 3" />
        <ProjectDataStatus />
        <section className="topography-layout">
          <div className="topography-main">
            <ModuleHeroCard
              moduleNumber="Module 3"
              title="Topography & Base Map"
              icon={Mountain}
              copy={vm.header.copy}
              progressPct={vm.header.progressPct}
              metrics={vm.header.metrics}
              heroImage={heroTerrain}
            />
            <TopographyMetrics />
            <TopographySynthesis />
            <section className="topography-tool-grid">
              <TerrainToolCard onAction={() => setPane("terrain")} />
              <CrossSectionToolCard onAction={() => setPane("crossSection")} />
            </section>
          </div>
          <TopographySidebar />
        </section>
      </div>
      <SlideUpPane open={pane === "terrain"} title="Terrain detail" onClose={close}>
        <TerrainDetailContent />
      </SlideUpPane>
      <SlideUpPane open={pane === "crossSection"} title="Cross-section tool" onClose={close}>
        <CrossSectionToolContent />
      </SlideUpPane>
      {import.meta.env.DEV && metadata ? (
        <QaOverlay reference={metadata.reference} nativeWidth={metadata.viewport.width} nativeHeight={metadata.viewport.height} />
      ) : null}
    </AppShell>
  );
}

function TopographyMetrics() {
  const TONES = ["green", "gold", "green", "gold", "green"];
  const items = vm.metrics.map(([iconKey, label, value, pill, note], i) => [
    iconKey,
    label,
    value,
    pill || note,
    TONES[i % TONES.length],
  ]);
  return <ModuleKpiStrip items={items} iconMap={topoIconMap} />;
}

function TopographySynthesis() {
  return (
    <SurfaceCard className="topography-synthesis">
      <div className="topography-synthesis-copy">
        <span>{vm.synthesis.kicker}</span>
        <h2>{vm.synthesis.headline}</h2>
        <p>{vm.synthesis.body}</p>
      </div>
      {vm.synthesis.items.map(([iconKey, title, text]) => {
        const Icon = topoIconMap[iconKey];
        return (
          <article key={title}>
            <Icon aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        );
      })}
    </SurfaceCard>
  );
}

function TerrainToolCard({ onAction }) {
  return (
    <SurfaceCard className="topography-tool-card">
      <header>
        <h2>Terrain detail</h2>
        <span>Primary map</span>
      </header>
      <p>Explore the site in detail with contour maps, slope analysis, aspect, and elevation layers.</p>
      <div className="tool-card-body">
        <dl>
          {vm.terrainTool.rows.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <CroppedArt src={terrainPreview} className="topography-tool-image" />
      </div>
      <div className="tool-card-actions">
        <button className="green-button" type="button" onClick={onAction}>Open terrain detail <ArrowRight aria-hidden="true" /></button>
        <small>Best for: Detailed analysis of slope, aspect, elevation and landforms.</small>
      </div>
    </SurfaceCard>
  );
}

function CrossSectionToolCard({ onAction }) {
  return (
    <SurfaceCard className="topography-tool-card">
      <header>
        <h2>Cross-section tool</h2>
        <span>Advanced analysis</span>
      </header>
      <p>Analyze transects across the site to understand elevation change, water flow and solar exposure.</p>
      <div className="tool-card-body">
        <dl>
          {vm.crossSectionTool.rows.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <CroppedArt src={crossSectionPreview} className="topography-tool-image" />
      </div>
      <div className="tool-card-actions">
        <button className="green-button" type="button" onClick={onAction}>Open cross-section tool <ArrowRight aria-hidden="true" /></button>
        <small>Best for: Understanding elevation change, solar exposure, drainage swales, dams, buildings and cut/fill balance.</small>
      </div>
    </SurfaceCard>
  );
}

function TopographySidebar() {
  return (
    <aside className="topography-sidebar">
      <ModuleSynthesisPanel
        title="Topography Synthesis"
        synthesis={vm.synthesis}
        alignmentLabel="Terrain Alignment"
      />
    </aside>
  );
}

