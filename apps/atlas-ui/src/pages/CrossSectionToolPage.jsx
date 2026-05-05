import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Beaker,
  ChevronDown,
  Droplet,
  Download,
  Eye,
  Layers,
  Leaf,
  Mountain,
  Plus,
  Ruler,
  Save,
  Settings,
  SlidersHorizontal,
  Sun,
  Trees,
  Triangle
} from "lucide-react";
import {
  AppShell,
  CroppedArt,
  QaOverlay,
  SurfaceCard,
  TopStageBar,
  ProjectDataStatus
} from "../components/index.js";
import { observeNav } from "../data/navConfig.js";
import { screenCatalog } from "../screenCatalog.js";
import { crossSectionTool as vm } from "../data/builtin-sample.js";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";
import crossSectionChart from "../assets/generated/cross-section-tool/cross-section-chart.png";
import transectMap from "../assets/generated/cross-section-tool/transect-map.png";
import seasonalChart from "../assets/generated/cross-section-tool/seasonal-chart.png";

const metadata = screenCatalog.find((screen) => screen.route === "/observe/topography/cross-section-tool");

const crossIconMap = { ruler: Ruler, mountain: Mountain, triangle: Triangle, sun: Sun, trees: Trees, droplet: Droplet, layers: Layers, eye: Eye, beaker: Beaker };

export function CrossSectionToolContent() {
  return (
    <div className="detail-page cross-section-page">
      <section className="cross-layout">
        <div className="cross-main">
          <CrossHeader />
          <CrossKpis />
          <CrossChartPanel />
          <section className="cross-bottom-grid">
            <ObservationPanel />
            <TransectLibrary />
            <SeasonalPanel />
          </section>
        </div>
        <CrossSidebar />
      </section>
      <CrossActionBar />
    </div>
  );
}

export function CrossSectionToolPage() {
  return (
    <AppShell navConfig={observeNav}>
      <TopStageBar stage="Stage 1 of 3" module="Roots & Diagnosis — Module 3" />
      <ProjectDataStatus />
      <CrossSectionToolContent />
      {import.meta.env.DEV && metadata ? (
        <QaOverlay reference={metadata.reference} nativeWidth={metadata.viewport.width} nativeHeight={metadata.viewport.height} />
      ) : null}
    </AppShell>
  );
}

function CrossHeader() {
  return (
    <header className="cross-header">
      <Link to="/observe/topography" className="back-link"><ArrowLeft /> Back to module overview</Link>
      <div className="module-title-row">
        <b>3</b>
        <div>
          <h1>{vm.header.title}</h1>
          <p>{vm.header.copy}</p>
        </div>
      </div>
    </header>
  );
}

function CrossKpis() {
  const { assessment } = useBuiltinProject();
  const terrain = assessment?.terrainAnalysis ?? null;
  const elevMin = Math.round(parseFloat(terrain?.elevation?.minM ?? 240));
  const elevMax = Math.round(parseFloat(terrain?.elevation?.maxM ?? 268));
  const elevChange = (elevMax - elevMin).toFixed(1);
  const slopeMean = parseFloat(terrain?.slope?.meanDeg ?? vm.kpis[2][2]).toFixed(1);

  const kpis = [
    [vm.kpis[0][0], vm.kpis[0][1], vm.kpis[0][2], vm.kpis[0][3]],
    ["mountain",    "Elevation change", `${elevChange} m`,           "High to low"],
    ["triangle",    "Average slope",    `${slopeMean}°`,              "Overall grade"],
    [vm.kpis[3][0], vm.kpis[3][1], vm.kpis[3][2], vm.kpis[3][3]],
    [vm.kpis[4][0], vm.kpis[4][1], vm.kpis[4][2], vm.kpis[4][3]],
  ];

  return (
    <SurfaceCard className="cross-kpi-strip">
      {kpis.map(([iconKey, label, value, note]) => {
        const Icon = crossIconMap[iconKey];
        return (
          <div className="cross-kpi" key={label}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        );
      })}
    </SurfaceCard>
  );
}

function CrossChartPanel() {
  return (
    <SurfaceCard className="cross-chart-panel">
      <CroppedArt src={crossSectionChart} className="cross-chart-image" />
      <div className="segment-strip">
        <span><b>Segment stats</b>Click a segment on chart</span>
        {vm.segments.map(([n, range, slope, drop]) => (
          <span key={n}><b>{n}</b>{range}<small>{slope} · {drop}</small></span>
        ))}
      </div>
    </SurfaceCard>
  );
}

function ObservationPanel() {
  return (
    <SurfaceCard className="cross-panel">
      <h2>Section observations</h2>
      {vm.observations.map(([title, text, tone]) => (
        <p className={tone} key={title}><Leaf /> <b>{title}</b><span>{text}</span></p>
      ))}
      <button className="outlined-button" type="button"><Plus /> Add observation</button>
    </SurfaceCard>
  );
}

function TransectLibrary() {
  return (
    <SurfaceCard className="cross-panel transect-library">
      <h2>Section library</h2>
      {vm.library.map(([n, title, note, tag]) => (
        <div className="transect-row" key={title}>
          <b>{n}</b>
          <span>{title}<small>{note}</small></span>
          {tag ? <em>{tag}</em> : null}
        </div>
      ))}
      <button className="outlined-button" type="button"><Plus /> New transect</button>
    </SurfaceCard>
  );
}

function SeasonalPanel() {
  return (
    <SurfaceCard className="cross-panel seasonal-panel">
      <h2>Seasonal comparison <small>(solar exposure)</small></h2>
      <div className="season-tabs">
        {vm.seasons.map((tab, index) => <button className={index === 0 ? "is-active" : ""} type="button" key={tab}>{tab}</button>)}
      </div>
      <CroppedArt src={seasonalChart} className="seasonal-chart-image" />
    </SurfaceCard>
  );
}

function CrossSidebar() {
  return (
    <aside className="cross-sidebar">
      <SurfaceCard className="transect-map-card">
        <h2>Transect map</h2>
        <CroppedArt src={transectMap} className="transect-map-image" />
        <button className="outlined-button" type="button"><Settings /> Center on map</button>
      </SurfaceCard>
      <SurfaceCard className="tools-panel">
        <h2>Overlays & tools</h2>
        {vm.overlays.map(([iconKey, title, note]) => <ToggleRow key={title} icon={crossIconMap[iconKey]} title={title} note={note} />)}
      </SurfaceCard>
      <SurfaceCard className="tools-panel analysis-panel">
        <h2>Seasonal & analysis</h2>
        <button type="button"><Sun /> Seasonal comparison <b>Compare</b></button>
        <button type="button"><Droplet /> Water simulation <b>Simulate</b></button>
        <button type="button"><Download /> Export section <b>Export</b></button>
      </SurfaceCard>
      <SurfaceCard className="earthworks-panel">
        <h2>Estimated earthworks</h2>
        <dl>
          {vm.earthworks.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <button className="outlined-button" type="button">Details</button>
      </SurfaceCard>
    </aside>
  );
}

function ToggleRow({ icon: Icon, title, note }) {
  return (
    <div className="toggle-row">
      <Icon />
      <span>{title}<small>{note}</small></span>
      <button type="button" aria-label={`${title} enabled`}><i /></button>
    </div>
  );
}

function CrossActionBar() {
  return (
    <SurfaceCard className="cross-action-bar">
      <button type="button"><Plus /> Add design element</button>
      <button type="button"><Sun /> Toggle solar overlay</button>
      <button type="button"><Droplet /> Run water simulation</button>
      <button className="green-button" type="button"><Save /> Save transect</button>
      <button type="button">Save as...</button>
      <button type="button" aria-label="More options"><SlidersHorizontal /></button>
    </SurfaceCard>
  );
}
