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

function phBand(ph) {
  if (ph < 5.5) return ["Very acidic",      "Low",      30];
  if (ph < 6.0) return ["Acidic",           "Moderate", 45];
  if (ph < 6.5) return ["Slightly acidic",  "Good",     65];
  if (ph < 7.0) return ["Slightly acidic",  "Good",     72];
  if (ph < 7.5) return ["Neutral",          "Good",     80];
  return              ["Alkaline",          "Moderate", 60];
}

function omBand(pct) {
  if (pct >= 5)   return ["High — excellent for biology", "Good",     85];
  if (pct >= 3)   return ["Moderate",                     "Moderate", 58];
  return               ["Low — add amendments",           "Low",      30];
}

function scoreNote(n) {
  if (n >= 80) return "Good";
  if (n >= 60) return "Moderate";
  return "Low";
}

export function EarthWaterEcologyPage() {
  const { project, assessment } = useBuiltinProject();
  const meta   = project?.metadata  ?? {};
  const sb     = assessment?.scoreBreakdown ?? {};

  const rawPh  = parseFloat(meta.soilNotes?.ph ?? "6.8");
  const rawOm  = parseFloat(meta.soilNotes?.organicMatter ?? "3.2");
  const soilHealthScore = sb.agPotential
    ? Math.round((sb.agPotential.om + sb.agPotential.capability) / 2)
    : 65;
  const bioScore = (sb.suitability && sb.agPotential)
    ? Math.round((sb.suitability.soilDrainage + sb.agPotential.capability) / 2)
    : 62;
  const waterScore = sb.waterResilience
    ? Math.round((sb.waterResilience.baseflow + sb.waterResilience.storagePotential + sb.waterResilience.regulatoryConstraint) / 3)
    : null;

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
        <KpiStrip rawPh={rawPh} soilHealthScore={soilHealthScore} bioScore={bioScore} waterScore={waterScore} />
        <TabsAndActions />
        <section className="diagnostic-grid">
          <SiteMapCard />
          <SoilDiagnosticsCard rawPh={rawPh} rawOm={rawOm} soilNotes={meta.soilNotes} />
          <HydrologyCard fieldObservations={meta.fieldObservations} />
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

function KpiStrip({ rawPh, soilHealthScore, bioScore, waterScore }) {
  const [phNote] = phBand(rawPh);
  const kpis = [
    ["sprout",    "Latest soil pH",     rawPh.toFixed(1),                              phNote,                        "green"],
    ["settings",  "Soil health score",  `${soilHealthScore} /100`,                    scoreNote(soilHealthScore),    "gold" ],
    ["leaf",      "Biodiversity score", `${bioScore} /100`,                            scoreNote(bioScore),           "gold" ],
    ["droplet",   "Water security",     waterScore ? `${waterScore} /100` : vm.kpis[3][2],
                                        waterScore ? scoreNote(waterScore)             : vm.kpis[3][3],               "blue" ],
    ["binoculars","Field observations", vm.kpis[4][2], vm.kpis[4][3], "gold"],
    ["flask",     "Tests & samples",    vm.kpis[5][2], vm.kpis[5][3], "gold"],
  ];
  return (
    <SurfaceCard className="diagnostic-kpi-strip">
      {kpis.map(([iconKey, label, value, note, tone]) => {
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

function SoilDiagnosticsCard({ rawPh, rawOm, soilNotes }) {
  const [phNote, phRating, phPos] = phBand(rawPh);
  const [omNote, omRating, omPos] = omBand(rawOm);

  const soilRows = [
    ["pH (H2O)",        `${rawPh.toFixed(1)}`,  phNote,                               phRating, phPos],
    ["Infiltration rate", vm.soilRows[1][1],     vm.soilRows[1][2],                    vm.soilRows[1][3], vm.soilRows[1][4]],
    ["Compaction",       vm.soilRows[2][1],      soilNotes?.compaction?.split(".")[0] ?? vm.soilRows[2][2], vm.soilRows[2][3], vm.soilRows[2][4]],
    ["Organic matter",  `${rawOm.toFixed(1)}%`,  omNote,                               omRating, omPos],
    ["Soil texture",     vm.soilRows[4][1],      vm.soilRows[4][2],                    vm.soilRows[4][3], vm.soilRows[4][4]],
  ];

  const interpretation = soilNotes?.biologicalActivity
    ? soilNotes.biologicalActivity.split(".")[0] + "."
    : vm.soilInterpretation;

  return (
    <SurfaceCard className="diagnostic-panel soil-panel">
      <PanelHeader title="Soil diagnostics" action="View all tests" />
      <div className="soil-row-list">
        {soilRows.map(([name, value, note, rating, position]) => (
          <div className="soil-row" key={name}>
            <Beaker aria-hidden="true" />
            <div><strong>{name}</strong><span>{value} · {note}</span></div>
            <b className={rating === "Good" ? "good" : "moderate"}>{rating}</b>
            <i><em style={{ left: `${position}%` }} /></i>
          </div>
        ))}
      </div>
      <p className="interpretation"><Sprout aria-hidden="true" /> <b>Interpretation:</b> {interpretation}</p>
    </SurfaceCard>
  );
}

function HydrologyCard({ fieldObservations }) {
  const insight = fieldObservations
    ? fieldObservations.split(";")[0].trim() + "."
    : vm.hydrologyInsight;
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
      <p className="warning-note"><TriangleAlert aria-hidden="true" /> <b>Insight:</b> {insight}</p>
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
