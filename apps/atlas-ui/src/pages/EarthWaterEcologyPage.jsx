import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Beaker,
  Binoculars,
  CalendarDays,
  Camera,
  ChevronDown,
  Download,
  Droplet,
  FlaskConical,
  Leaf,
  MapPin,
  Settings,
  Sprout,
  TriangleAlert
} from "lucide-react";
import {
  AppShell,
  CroppedArt,
  ProgressRing,
  QaOverlay,
  SideRail,
  SurfaceCard,
  TopStageBar
} from "../components/index.js";
import { screenCatalog } from "../screenCatalog.js";
import { earthWaterEcologyPage as vm } from "../data/builtin-sample.js";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";
import siteMap from "../assets/generated/earth-water-ecology/site-observations-map.png";
import hydrologyMap from "../assets/generated/earth-water-ecology/hydrology-map.png";
import speciesThumbs from "../assets/generated/earth-water-ecology/species-thumbnails.png";

const metadata = screenCatalog.find((screen) => screen.route === "/observe/earth-water-ecology");

const ecologyIconMap = { sprout: Sprout, settings: Settings, leaf: Leaf, droplet: Droplet, binoculars: Binoculars, flask: FlaskConical };

export function EarthWaterEcologyPage() {
  return (
    <AppShell className="observe-dashboard-shell">
      <SideRail active="Overview" />
      <main className="detail-page diagnostics-page">
        <TopStageBar
          stage="Stage 1 of 3"
          module="Roots & Diagnosis · Module 4"
          actionLabel="Module settings"
        />
        <ModuleHeader />
        <KpiStrip />
        <TabsAndActions />
        <section className="diagnostic-grid">
          <SiteMapCard />
          <SoilDiagnosticsCard />
          <HydrologyCard />
          <EcologyCard />
          <RecentObservationsCard />
          <RecommendedActionsCard />
        </section>
        <StatusFooter />
      </main>
      {import.meta.env.DEV ? (
        <QaOverlay
          reference={metadata.reference}
          nativeWidth={metadata.viewport.width}
          nativeHeight={metadata.viewport.height}
        />
      ) : null}
    </AppShell>
  );
}

function ModuleHeader() {
  return (
    <header className="module-header">
      <div className="module-title-block">
        <Link to="/observe/dashboard" className="back-link"><ArrowLeft aria-hidden="true" /> Back to overview</Link>
        <div className="module-title-row">
          <b>4</b>
          <div>
            <h1>{vm.header.title}</h1>
            <p>{vm.header.copy}</p>
          </div>
          <span className="status-pill">{vm.header.statusPill}</span>
        </div>
      </div>
      <SurfaceCard className="module-progress-card">
        <span>Module progress</span>
        <strong>{vm.header.progressLine}</strong>
        <div className="thin-progress"><i style={{ width: `${vm.header.progressPct}%` }} /></div>
        <em>{vm.header.progressPct}%</em>
        <button className="outlined-button" type="button">View module guide</button>
      </SurfaceCard>
    </header>
  );
}

function KpiStrip() {
  return (
    <SurfaceCard className="diagnostic-kpi-strip">
      {vm.kpis.map(([iconKey, label, value, note, tone]) => {
        const Icon = ecologyIconMap[iconKey];
        return (
          <div className={`diagnostic-kpi ${tone}`} key={label}>
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

function TabsAndActions() {
  return (
    <div className="diagnostic-tabs-row">
      <nav className="diagnostic-tabs" aria-label="Diagnostics sections">
        {vm.tabs.map((tab, index) => (
          <button className={index === 0 ? "is-active" : ""} type="button" key={tab}>{tab}</button>
        ))}
      </nav>
      <div className="diagnostic-actions">
        <button className="outlined-button" type="button"><Download aria-hidden="true" /> Export report <ChevronDown aria-hidden="true" /></button>
        <button className="outlined-button" type="button"><CalendarDays aria-hidden="true" /> This season <ChevronDown aria-hidden="true" /></button>
      </div>
    </div>
  );
}

function PanelHeader({ title, action }) {
  return (
    <header className="panel-header">
      <h2>{title}</h2>
      {action ? <button className="outlined-button" type="button">{action} <ArrowRight aria-hidden="true" /></button> : null}
    </header>
  );
}

function SiteMapCard() {
  return (
    <SurfaceCard className="diagnostic-panel site-map-panel">
      <PanelHeader title="Site map & observations" />
      <div className="site-map-wrap">
        <CroppedArt src={siteMap} className="site-map-image" />
      </div>
      <div className="map-legend">
        <span><Droplet /> Water point</span>
        <span><Leaf /> Soil sample</span>
        <span><MapPin /> Erosion risk</span>
        <span><Sprout /> Vegetation</span>
        <button type="button">View full map <ArrowRight aria-hidden="true" /></button>
      </div>
    </SurfaceCard>
  );
}

function SoilDiagnosticsCard() {
  return (
    <SurfaceCard className="diagnostic-panel soil-panel">
      <PanelHeader title="Soil diagnostics" action="View all tests" />
      <div className="soil-row-list">
        {vm.soilRows.map(([name, value, note, rating, position]) => (
          <div className="soil-row" key={name}>
            <Beaker aria-hidden="true" />
            <div><strong>{name}</strong><span>{value} · {note}</span></div>
            <b className={rating === "Good" ? "good" : "moderate"}>{rating}</b>
            <i><em style={{ left: `${position}%` }} /></i>
          </div>
        ))}
      </div>
      <p className="interpretation"><Sprout aria-hidden="true" /> <b>Interpretation:</b> {vm.soilInterpretation}</p>
    </SurfaceCard>
  );
}

function HydrologyCard() {
  return (
    <SurfaceCard className="diagnostic-panel hydrology-panel">
      <PanelHeader title="Hydrology overview" action="Details" />
      <div className="hydrology-layout">
        <dl>
          {vm.hydrologyFacts.map(([label, value, note]) => (
            <div key={label}><dt>{label}</dt><dd>{value}<span>{note}</span></dd></div>
          ))}
        </dl>
        <CroppedArt src={hydrologyMap} className="hydrology-image" />
      </div>
      <div className="flow-legend">
        <span>Surface flow</span><span>Intermittent flow</span><span>Watershed divide</span>
      </div>
      <p className="warning-note"><TriangleAlert aria-hidden="true" /> <b>Insight:</b> {vm.hydrologyInsight}</p>
    </SurfaceCard>
  );
}

function EcologyCard() {
  return (
    <SurfaceCard className="diagnostic-panel ecology-panel">
      <PanelHeader title="Ecology observations" action="View all species" />
      <div className="species-tabs">
        {vm.ecologyTabs.map((tab, index) => (
          <button className={index === 0 ? "is-active" : ""} type="button" key={tab}>{tab}</button>
        ))}
      </div>
      <CroppedArt src={speciesThumbs} className="species-image" />
      <p className="biodiversity-note"><Leaf aria-hidden="true" /> <b>Biodiversity insight:</b> {vm.biodiversityInsight}</p>
    </SurfaceCard>
  );
}

function RecentObservationsCard() {
  const { siteBanner } = useBuiltinProject();
  return (
    <SurfaceCard className="diagnostic-panel recent-panel">
      <PanelHeader title="Recent observations" action="View journal" />
      <div className="timeline-list">
        {vm.recentObservations.map(([time, text, tag]) => (
          <div className="timeline-item" key={text}>
            <i />
            <div><span>{time} · {siteBanner.lastUpdatedBy}</span><p>{text}</p></div>
            <b>{tag}</b>
          </div>
        ))}
      </div>
      <button className="green-button" type="button">+ Add observation</button>
      <button className="camera-button" type="button" aria-label="Attach photo"><Camera aria-hidden="true" /></button>
    </SurfaceCard>
  );
}

function RecommendedActionsCard() {
  return (
    <SurfaceCard className="diagnostic-panel actions-panel">
      <PanelHeader title="Recommended next actions" action="Prioritize" />
      <div className="action-list">
        {vm.recommendedActions.map(([title, note, priority, due], index) => (
          <div className="action-item" key={title}>
            <b>{index + 1}</b>
            <div><strong>{title}</strong><span>{note}</span></div>
            <em className={priority.toLowerCase()}>{priority}</em>
            <small>{due}</small>
          </div>
        ))}
      </div>
      <button className="text-link" type="button">View all actions <ArrowRight aria-hidden="true" /></button>
    </SurfaceCard>
  );
}

function StatusFooter() {
  const { siteBanner } = useBuiltinProject();
  return (
    <footer className="diagnostic-footer">
      <span><b>Site:</b> {siteBanner.siteName}</span>
      <span><b>Location:</b> {siteBanner.location}</span>
      <span><b>Elevation:</b> {siteBanner.elevationRange}</span>
      <span><b>Project start:</b> {siteBanner.projectStart}</span>
      <span>Last updated: {siteBanner.lastUpdatedAbsolute} by {siteBanner.lastUpdatedBy}</span>
      <span className="synced">{siteBanner.syncStatus}</span>
    </footer>
  );
}
