import {
  ArrowRight,
  Download,
  Droplet,
  ExternalLink,
  Leaf,
  Plus,
  Snowflake,
  Sprout,
  Sun,
  Wind
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
import { solarClimateDetail as vm } from "../data/builtin-sample.js";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";
import heroSunscape from "../assets/generated/solar-climate-detail/hero-sunscape.png";
import monthlyClimate from "../assets/generated/solar-climate-detail/monthly-climate-overview.png";
import solarPath from "../assets/generated/solar-climate-detail/solar-path-angles.png";
import windRose from "../assets/generated/solar-climate-detail/wind-rose.png";

const metadata = screenCatalog.find((screen) => screen.route === "/observe/macroclimate-hazards/solar-climate");

const solarIconMap = { sun: Sun, droplet: Droplet, leaf: Leaf, wind: Wind, snowflake: Snowflake, sprout: Sprout };

export function SolarClimateDetailPage() {
  const { project, siteBanner } = useBuiltinProject();
  const meta = project?.metadata ?? {};
  return (
    <AppShell navConfig={observeNav}>
      <div className="detail-page solar-detail-page">
        <TopStageBar stage="Stage 1 of 3" module="Roots & Diagnosis - Module 2" />
        <ProjectDataStatus />
        <section className="solar-detail-layout">
          <div className="solar-detail-main">
            <SolarHero />
            <SolarKpis meta={meta} />
            <section className="solar-chart-grid">
              <ClimateOverviewCard />
              <SolarPathCard />
            </section>
            <section className="solar-bottom-grid">
              <WindExposureCard />
              <ExposureShelterCard />
              <ClimateOpportunitiesCard />
            </section>
            <SeasonalSummary />
          </div>
          <SolarActionRail />
        </section>
        <footer className="diagnostics-footer solar-footer">
          <span><b>Site:</b> {siteBanner.siteName}</span>
          <span><b>Location:</b> {siteBanner.location}</span>
          <span><b>Elevation:</b> {siteBanner.elevationRange}</span>
          <span><b>Project start:</b> {siteBanner.projectStart}</span>
          <span><b>Last updated:</b> {siteBanner.lastUpdatedAbsolute} by {siteBanner.lastUpdatedBy}</span>
          <span className="synced-dot">{siteBanner.syncStatus}</span>
        </footer>
      </div>
      {import.meta.env.DEV && metadata ? (
        <QaOverlay reference={metadata.reference} nativeWidth={metadata.viewport.width} nativeHeight={metadata.viewport.height} />
      ) : null}
    </AppShell>
  );
}

function SolarHero() {
  return (
    <header className="solar-hero">
      <div>
        <h1>{vm.hero.title}</h1>
        <p>{vm.hero.copy}</p>
        <div className="solar-hero-actions">
          <button className="green-button" type="button"><Download aria-hidden="true" /> Export climate report</button>
          <button className="outlined-button" type="button">Compare seasons</button>
          <button className="outlined-button" type="button"><ExternalLink aria-hidden="true" /> Open climate sources</button>
        </div>
      </div>
      <CroppedArt src={heroSunscape} className="solar-hero-art" />
    </header>
  );
}

function SolarKpis({ meta }) {
  const kpis = [
    ["sun",       "Hardiness zone",    meta.hardinessZone ?? vm.kpis[0][2],                                                    vm.kpis[0][3], "gold"],
    ["droplet",   "Annual precip.",    meta.annualPrecipMm  ? `${meta.annualPrecipMm} mm`          : vm.kpis[1][2],             vm.kpis[1][3], "blue"],
    ["leaf",      "Frost-free days",   meta.frostFreeDays   ? String(meta.frostFreeDays)            : vm.kpis[2][2],             vm.kpis[2][3], "green"],
    ["sun",       "Avg daily solar",   meta.avgDailySolarKwhM2 ? `${meta.avgDailySolarKwhM2} kWh/m²/day` : vm.kpis[3][2],      vm.kpis[3][3], "gold"],
    ["wind",      "Prevailing wind",   meta.prevailingWindDir ?? vm.kpis[4][2],                                                 vm.kpis[4][3], "green"],
    ["sun",       "Last spring frost", meta.lastFrostAvg    ?? vm.kpis[5][2],                                                   vm.kpis[5][3], "dim"],
    ["snowflake", "First fall frost",  meta.firstFallFrostAvg ?? vm.kpis[6][2],                                                 vm.kpis[6][3], "blue"],
  ];
  return (
    <section className="solar-kpi-grid">
      {kpis.map(([iconKey, label, value, note, tone]) => {
        const Icon = solarIconMap[iconKey];
        return (
          <SurfaceCard className={`solar-kpi ${tone}`} key={label}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </SurfaceCard>
        );
      })}
    </section>
  );
}

function ClimateOverviewCard() {
  return (
    <SurfaceCard className="solar-panel climate-overview-panel">
      <header><h2>Monthly climate overview</h2><button type="button">Monthly</button></header>
      <CroppedArt src={monthlyClimate} className="climate-overview-image" />
    </SurfaceCard>
  );
}

function SolarPathCard() {
  return (
    <SurfaceCard className="solar-panel solar-path-panel">
      <h2>Solar path & seasonal sun angles</h2>
      <div className="solar-path-content">
        <CroppedArt src={solarPath} className="solar-path-image" />
        <SurfaceCard className="daylight-hours">
          <h3>Daylight hours</h3>
          {vm.daylight.map(([month, hours]) => <p key={month}><Sun aria-hidden="true" /><span>{month}</span><b>{hours}</b></p>)}
          <strong>{vm.daylightAnnualAvg} <small>Annual avg daylight</small></strong>
        </SurfaceCard>
      </div>
    </SurfaceCard>
  );
}

function WindExposureCard() {
  return (
    <SurfaceCard className="solar-panel wind-panel">
      <h2>Wind & exposure</h2>
      <CroppedArt src={windRose} className="wind-rose-image" />
    </SurfaceCard>
  );
}

function ExposureShelterCard() {
  return (
    <SurfaceCard className="solar-panel exposure-panel">
      <h2>Exposure & shelter</h2>
      {vm.exposure.map(([title, text, rating]) => (
        <p key={title}><Wind aria-hidden="true" /><b>{title}<small>{text}</small></b><em>{rating}</em></p>
      ))}
    </SurfaceCard>
  );
}

function ClimateOpportunitiesCard() {
  return (
    <SurfaceCard className="solar-panel opportunities-panel">
      <h2>Climate opportunities & site implications</h2>
      {vm.opportunities.map(([title, text]) => <p key={title}><Sprout aria-hidden="true" /><b>{title}</b><span>{text}</span></p>)}
    </SurfaceCard>
  );
}

function SeasonalSummary() {
  return (
    <SurfaceCard className="seasonal-summary-strip">
      {vm.seasonal.map(([iconKey, label, value, note]) => {
        const Icon = solarIconMap[iconKey];
        return (
          <div key={label}><Icon aria-hidden="true" /><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
        );
      })}
    </SurfaceCard>
  );
}

function SolarActionRail() {
  return (
    <aside className="solar-action-rail">
      <SurfaceCard className="climate-priorities-card">
        <h2>Climate insights & next actions</h2>
        <h3>Top priorities</h3>
        {vm.topPriorities.map(([title, text], index) => (
          <p key={title}><b>{index + 1}</b><span>{title}<small>{text}</small></span><ArrowRight aria-hidden="true" /></p>
        ))}
      </SurfaceCard>
      <SurfaceCard className="recommended-climate-actions">
        <h2>Recommended next actions</h2>
        {vm.recommendedActions.map(([title, priority]) => <p key={title}><Sun aria-hidden="true" /><span>{title}</span><em>{priority}</em></p>)}
        <button className="green-button" type="button">Add to design plan <Plus aria-hidden="true" /></button>
      </SurfaceCard>
    </aside>
  );
}
