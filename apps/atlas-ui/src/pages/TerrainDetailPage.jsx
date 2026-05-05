import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Download,
  Droplet,
  Layers,
  MapPin,
  Mountain,
  Plus,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Triangle,
  Waves
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
import { terrainDetail as vm } from "../data/builtin-sample.js";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";
import mainTerrainMap from "../assets/generated/terrain-detail/main-terrain-map.png";
import slopeMap from "../assets/generated/terrain-detail/slope-map.png";
import elevationHistogram from "../assets/generated/terrain-detail/elevation-histogram.png";
import elevationProfile from "../assets/generated/terrain-detail/elevation-profile.png";

const metadata = screenCatalog.find((screen) => screen.route === "/observe/topography/terrain-detail");

const terrainIconMap = { triangle: Triangle, mountain: Mountain, sliders: SlidersHorizontal, waves: Waves, mapPin: MapPin };

function slopeBand(deg) {
  if (deg < 5) return "Gentle";
  if (deg < 10) return "Moderate";
  if (deg < 15) return "Steep";
  return "Very steep";
}

function tpiLabel(cls) {
  const map = {
    ridge: "Ridges & upper slopes",
    upper_slope: "Upper slopes",
    mid_slope: "Mid-slopes & lower rises",
    flat: "Flat plains",
    lower_slope: "Lower slopes",
    valley: "Valley floors",
  };
  return map[cls] ?? cls ?? "—";
}

function aspectBearing(dir) {
  const map = { N: "0°", NE: "45°", E: "90°", SE: "135°", S: "180°", SW: "225°", W: "270°", NW: "315°" };
  return map[dir] ?? "—";
}

export function TerrainDetailContent() {
  const { assessment } = useBuiltinProject();
  const terrain = assessment?.terrainAnalysis ?? null;
  return (
    <div className="detail-page terrain-detail-page">
      <TerrainHeader />
      <TerrainMetrics terrain={terrain} />
      <section className="terrain-workspace">
        <div className="terrain-main-column">
          <TerrainMapPanel />
          <section className="terrain-lower-grid">
            <ElevationProfilePanel />
            <DetectedFeaturesPanel />
          </section>
        </div>
        <TerrainSidebar terrain={terrain} />
      </section>
      <TerrainFooter />
    </div>
  );
}

export function TerrainDetailPage() {
  return (
    <AppShell navConfig={observeNav}>
      <TopStageBar stage="Stage 1 of 3" module="Roots & Diagnosis - Module 3" />
      <ProjectDataStatus />
      <TerrainDetailContent />
      {import.meta.env.DEV && metadata ? (
        <QaOverlay reference={metadata.reference} nativeWidth={metadata.viewport.width} nativeHeight={metadata.viewport.height} />
      ) : null}
    </AppShell>
  );
}

function TerrainHeader() {
  return (
    <header className="terrain-header">
      <div>
        <h1>{vm.header.title}</h1>
        <p>{vm.header.copy}</p>
      </div>
      <div className="terrain-header-actions">
        <button className="green-button" type="button"><Plus aria-hidden="true" /> Create transect</button>
        <button className="outlined-button" type="button"><Download aria-hidden="true" /> Export terrain report</button>
        <button className="outlined-button" type="button"><Layers aria-hidden="true" /> Compare layers</button>
      </div>
    </header>
  );
}

function TerrainMetrics({ terrain }) {
  const slopeMean = parseFloat(terrain?.slope?.meanDeg ?? vm.metrics[0][2]);
  const elevMin   = Math.round(parseFloat(terrain?.elevation?.minM ?? 240));
  const elevMax   = Math.round(parseFloat(terrain?.elevation?.maxM ?? 268));
  const elevRange = elevMax - elevMin;
  const aspect    = terrain?.aspectDominant ?? "SE";
  const tpiClass  = terrain?.tpi?.dominantClass ?? "mid_slope";

  const metrics = [
    ["triangle", "Mean slope",       `${slopeMean.toFixed(1)} degrees`, slopeBand(slopeMean),       "Predominantly gentle slopes."],
    ["mountain", "Elevation range",  `${elevMin}–${elevMax} m`,         `${elevRange} m total range`, "Lowest to highest point on site."],
    ["sliders",  "Aspect tendency",  aspect,                            aspectBearing(aspect),        `Slopes face mainly ${aspect}.`],
    ["waves",    "Dominant landforms", tpiLabel(tpiClass),              "",                           "Rolling terrain with gentle benches."],
    ["mapPin",   vm.metrics[4][1],   vm.metrics[4][2],                  vm.metrics[4][3],             vm.metrics[4][4]],
  ];

  return (
    <section className="terrain-metric-grid">
      {metrics.map(([iconKey, label, value, pill, note]) => {
        const Icon = terrainIconMap[iconKey];
        return (
          <SurfaceCard className="terrain-metric-card" key={label}>
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

function TerrainMapPanel() {
  return (
    <SurfaceCard className="terrain-map-panel">
      <CroppedArt src={mainTerrainMap} className="terrain-main-map" />
      <div className="terrain-layer-card">
        <h2>Layers</h2>
        {vm.layers.map(([label, state, enabled]) => (
          <p key={label}><b className={enabled ? "on" : ""}>{enabled ? "✓" : ""}</b><span>{label}</span><em>{state}</em></p>
        ))}
      </div>
      <div className="terrain-legend-card">
        <h2>Legend</h2>
        <p>Slope (%)</p>
        {vm.legendSlopes.map((item, index) => <span className={`slope-step s${index}`} key={item}>{item}</span>)}
      </div>
      <div className="terrain-map-tools">
        <button type="button">+</button>
        <button type="button">-</button>
        <button type="button"><Settings aria-hidden="true" /></button>
        <button type="button"><Layers aria-hidden="true" /></button>
      </div>
      <button className="reset-view-button" type="button"><RotateCcw aria-hidden="true" /> Reset view</button>
    </SurfaceCard>
  );
}

function ElevationProfilePanel() {
  return (
    <SurfaceCard className="terrain-panel elevation-profile-panel">
      <header>
        <h2>Elevation profile (A-B transect)</h2>
        <span>Length: {vm.transectLength}</span>
      </header>
      <CroppedArt src={elevationProfile} className="elevation-profile-image" />
    </SurfaceCard>
  );
}

function DetectedFeaturesPanel() {
  return (
    <SurfaceCard className="terrain-panel terrain-features-panel">
      <header>
        <h2>Detected features</h2>
        <button className="outlined-button" type="button">View on map <ChevronDown aria-hidden="true" /></button>
      </header>
      {vm.detected.map(([label, count, note]) => (
        <p key={label}><Waves aria-hidden="true" /><b>{label}</b><em>{count}</em><span>{note}</span></p>
      ))}
    </SurfaceCard>
  );
}

function TerrainSidebar({ terrain }) {
  const elevMin   = Math.round(parseFloat(terrain?.elevation?.minM ?? 240));
  const elevMax   = Math.round(parseFloat(terrain?.elevation?.maxM ?? 268));
  const elevRange = elevMax - elevMin;
  return (
    <aside className="terrain-sidebar">
      <SurfaceCard className="terrain-side-panel slope-panel">
        <h2>Slope map</h2>
        <CroppedArt src={slopeMap} className="terrain-slope-map" />
      </SurfaceCard>
      <SurfaceCard className="terrain-side-panel histogram-panel">
        <header>
          <h2>Elevation distribution</h2>
          <span>{elevRange} m range</span>
        </header>
        <CroppedArt src={elevationHistogram} className="terrain-histogram" />
      </SurfaceCard>
      <SurfaceCard className="terrain-side-panel insights-panel">
        <h2>Terrain insights</h2>
        {vm.insights.map((item) => <p key={item}><CheckCircle2 aria-hidden="true" />{item}</p>)}
      </SurfaceCard>
      <SurfaceCard className="terrain-side-panel next-actions-panel">
        <h2>Recommended next actions</h2>
        {vm.nextActions.map(([title, level, note]) => (
          <p key={title}><Droplet aria-hidden="true" /><b>{title}<small>{note}</small></b><em>{level}</em></p>
        ))}
      </SurfaceCard>
    </aside>
  );
}

function TerrainFooter() {
  const { siteBanner } = useBuiltinProject();
  return (
    <footer className="diagnostics-footer terrain-footer">
      <span><b>Site:</b> {siteBanner.siteName}</span>
      <span><b>Location:</b> {siteBanner.location}</span>
      <span><b>Elevation:</b> {siteBanner.elevationRange}</span>
      <span><b>Project start:</b> {siteBanner.projectStart}</span>
      <span><b>Last updated:</b> {siteBanner.lastUpdatedAbsolute} by {siteBanner.lastUpdatedBy}</span>
      <span className="synced-dot">{siteBanner.syncStatus}</span>
    </footer>
  );
}
