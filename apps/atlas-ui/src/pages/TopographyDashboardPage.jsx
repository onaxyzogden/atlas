import {
  ArrowRight,
  CheckCircle2,
  Droplet,
  Home,
  Layers,
  Leaf,
  Map,
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
  ProgressRing,
  QaOverlay,
  SlideUpPane,
  SurfaceCard,
  TopStageBar,
  ProjectDataStatus
} from "../components/index.js";
import { observeNav } from "../data/navConfig.js";
import { screenCatalog } from "../screenCatalog.js";
import { topographyDashboard as vm } from "../data/builtin-sample.js";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";
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
        <TopographyFooter />
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
  return (
    <section className="topography-metric-grid">
      {vm.metrics.map(([iconKey, label, value, pill, note]) => {
        const Icon = topoIconMap[iconKey];
        return (
          <SurfaceCard className="topography-metric-card" key={label}>
            <Icon aria-hidden="true" />
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
              {pill ? <em>{pill}</em> : null}
            </div>
            <p>{note}</p>
          </SurfaceCard>
        );
      })}
    </section>
  );
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
      <SurfaceCard className="topography-side-card implications">
        <h2>Design implications</h2>
        {vm.implications.map(([iconKey, title, text]) => {
          const Icon = topoIconMap[iconKey];
          return <p key={title}><Icon aria-hidden="true" /><b>{title}</b><span>{text}</span></p>;
        })}
      </SurfaceCard>
      <SurfaceCard className="topography-side-card feature-list">
        <h2>Detected terrain features <b>{vm.detectedFeatures.length}</b></h2>
        {vm.detectedFeatures.map(([label, value]) => (
          <p key={label}><Map aria-hidden="true" /><span>{label}</span><b>{value}</b></p>
        ))}
      </SurfaceCard>
      <SurfaceCard className="topography-side-card actions-list">
        <h2>Recommended next actions</h2>
        {vm.nextActions.map(([label, priority]) => (
          <p key={label}><CheckCircle2 aria-hidden="true" /><span>{label}</span><em>{priority}</em></p>
        ))}
      </SurfaceCard>
      <SurfaceCard className="topography-health-card">
        <h2>Module health <strong>Good</strong></h2>
        <i><b /></i>
        <p>All key topographic data captured. You're ready to move into design.</p>
        <ProgressRing value={vm.modulePct} label={`${vm.modulePct}%`} />
      </SurfaceCard>
    </aside>
  );
}

function TopographyFooter() {
  const { siteBanner } = useBuiltinProject();
  return (
    <footer className="diagnostics-footer topography-footer">
      <span><b>Site:</b> {siteBanner.siteName}</span>
      <span><b>Location:</b> {siteBanner.location}</span>
      <span><b>Elevation:</b> {siteBanner.elevationRange}</span>
      <span><b>Project start:</b> {siteBanner.projectStart}</span>
      <span><b>Last updated:</b> {siteBanner.lastUpdatedAbsolute} by {siteBanner.lastUpdatedBy}</span>
      <span className="synced-dot">{siteBanner.syncStatus}</span>
    </footer>
  );
}
