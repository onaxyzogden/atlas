import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Droplet,
  Leaf,
  ShieldAlert,
  Snowflake,
  Sun,
  TriangleAlert,
  Wind
} from "lucide-react";
import { Link } from "@tanstack/react-router";
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
import { macroclimateDashboard as vm } from "../data/builtin-sample.js";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";
import monthlyClimate from "../assets/generated/macroclimate-dashboard/monthly-climate.png";
import sunPath from "../assets/generated/macroclimate-dashboard/sun-path.png";
import hazardMatrix from "../assets/generated/macroclimate-dashboard/hazard-risk-matrix.png";
import hazardHotspots from "../assets/generated/macroclimate-dashboard/hazard-hotspots.png";

const metadata = screenCatalog.find((screen) => screen.route === "/observe/macroclimate-hazards");

const macroIconMap = { snowflake: Snowflake, droplet: Droplet, alert: TriangleAlert, calendar: CalendarDays, sun: Sun, wind: Wind };

export function MacroclimateDashboardPage() {
  const { project } = useBuiltinProject();
  const meta = project?.metadata ?? {};
  return (
    <AppShell navConfig={observeNav}>
      <div className="detail-page macroclimate-page">
        <TopStageBar stage="Stage 1 of 3" module="Roots & Diagnosis - Module 2" />
        <ProjectDataStatus />
        <section className="macroclimate-layout">
          <div className="macroclimate-main">
            <MacroHeader meta={meta} />
            <MacroKpis meta={meta} />
            <SolarClimateCard />
            <HazardsCard />
          </div>
          <MacroSidebar />
        </section>
      </div>
      {import.meta.env.DEV && metadata ? (
        <QaOverlay reference={metadata.reference} nativeWidth={metadata.viewport.width} nativeHeight={metadata.viewport.height} />
      ) : null}
    </AppShell>
  );
}

function MacroHeader({ meta }) {
  const badge = meta.climateRegion ?? vm.hero.badge;
  return (
    <header className="macro-header">
      <span>{vm.hero.moduleNumber}</span>
      <h1>{vm.hero.title}</h1>
      <p>{vm.hero.copy}</p>
      <b>{badge}</b>
    </header>
  );
}

function MacroKpis({ meta }) {
  const kpis = [
    ["snowflake", "Hardiness zone",    meta.hardinessZone ?? vm.kpis[0][2],                          "USDA",          "blue"],
    ["droplet",   "Annual precip",     meta.annualPrecipMm ? `${meta.annualPrecipMm} mm` : vm.kpis[1][2], "Average",  "blue"],
    ["alert",     "Logged hazards",    vm.kpis[2][2],                                                 "Active",        "gold"],
    ["calendar",  "Frost-free days",   meta.frostFreeDays ? String(meta.frostFreeDays) : vm.kpis[3][2],
                                       meta.lastFrostAvg ? `Last: ${meta.lastFrostAvg}` : vm.kpis[3][3], "green"],
    ["sun",       "Avg. solar",        meta.avgDailySolarKwhM2 ? `${meta.avgDailySolarKwhM2} kWh/m²/day` : vm.kpis[4][2], "Annual avg.", "gold"],
    ["wind",      "Prevailing wind",   meta.prevailingWindDir ?? vm.kpis[5]?.[2] ?? "W / SW",         "10-18 km/h",   "green"],
  ];
  return (
    <section className="macro-kpi-grid">
      {kpis.map(([iconKey, label, value, note, tone]) => {
        const Icon = macroIconMap[iconKey];
        return (
          <SurfaceCard className={`macro-kpi-card ${tone}`} key={label}>
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

function SolarClimateCard() {
  return (
    <SurfaceCard className="macro-section-card solar-card">
      <header>
        <div>
          <h2><Sun aria-hidden="true" /> Solar & Climate detail</h2>
          <p>Deep dive into sun, temperature, precipitation, and seasonality to identify opportunities for passive design and productivity.</p>
        </div>
        <Link to="/observe/macroclimate-hazards/solar-climate" className="green-button">Open page <ArrowRight aria-hidden="true" /></Link>
      </header>
      <div className="solar-grid">
        <div>
          <h3>Average Monthly Climate</h3>
          <CroppedArt src={monthlyClimate} className="macro-chart monthly-chart" />
        </div>
        <div>
          <h3>Sun path (Summer solstice)</h3>
          <CroppedArt src={sunPath} className="macro-chart sun-chart" />
        </div>
        <SurfaceCard className="climate-opportunities">
          <h3>Climate opportunities</h3>
          {vm.opportunities.map(([label, value]) => (
            <p key={label}><Leaf aria-hidden="true" /><span>{label}</span><b>{value}</b></p>
          ))}
        </SurfaceCard>
      </div>
      <button className="outlined-button section-link" type="button">See full climate analysis <ArrowRight aria-hidden="true" /></button>
    </SurfaceCard>
  );
}

function HazardsCard() {
  const rows = vm.hazards;
  return (
    <SurfaceCard className="macro-section-card hazards-card">
      <header>
        <div>
          <h2><TriangleAlert aria-hidden="true" /> Hazards log</h2>
          <p>Review natural hazards, risk levels, and mitigation strategies for your site.</p>
        </div>
        <button className="green-button" type="button">Open page <ArrowRight aria-hidden="true" /></button>
      </header>
      <div className="hazards-grid">
        <div>
          <h3>Hazard risk matrix</h3>
          <CroppedArt src={hazardMatrix} className="macro-chart hazard-matrix-image" />
        </div>
        <div>
          <h3>Hazard hotspots</h3>
          <CroppedArt src={hazardHotspots} className="macro-chart hazard-hotspots-image" />
        </div>
        <SurfaceCard className="active-hazards-table">
          <h3>Active hazards</h3>
          {rows.map(([hazard, risk, trend, mitigation, status], index) => (
            <p key={hazard}>
              <b>{index + 1}</b>
              <span>{hazard}<small>{risk} risk</small></span>
              <em>{trend}</em>
              <strong>{mitigation}</strong>
              <i>{status}</i>
            </p>
          ))}
        </SurfaceCard>
      </div>
      <button className="outlined-button section-link" type="button">See full hazards log <ArrowRight aria-hidden="true" /></button>
    </SurfaceCard>
  );
}

function MacroSidebar() {
  return (
    <aside className="macro-sidebar">
      <SurfaceCard className="macro-insights-card">
        <h2>Design insights & recommendations</h2>
        <h3>Key takeaways</h3>
        {vm.insights.keyTakeaways.map((item) => <p key={item}><CheckCircle2 aria-hidden="true" />{item}</p>)}
        <h3>Next actions</h3>
        {vm.insights.nextActions.map((item, index) => <p className="numbered" key={item}><b>{index + 1}</b>{item}</p>)}
        <section className="risk-priorities">
          <h3>Top risk priorities</h3>
          <ol>
            {vm.insights.riskPriorities.map((r) => <li key={r}>{r}</li>)}
          </ol>
        </section>
        <button className="green-button" type="button">Go to next: Site Analysis <ArrowRight aria-hidden="true" /></button>
      </SurfaceCard>
    </aside>
  );
}
