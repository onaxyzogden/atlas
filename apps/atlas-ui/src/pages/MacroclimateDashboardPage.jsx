import {
  ArrowRight,
  CalendarDays,
  Droplet,
  Leaf,
  ShieldAlert,
  Snowflake,
  Sun,
  TriangleAlert,
  Wind
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
import { macroclimateDashboard as vm } from "../data/builtin-sample.js";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";
import { SolarClimateContent } from "./SolarClimateDetailPage.jsx";
import monthlyClimate from "../assets/generated/macroclimate-dashboard/monthly-climate.png";
import sunPath from "../assets/generated/macroclimate-dashboard/sun-path.png";
import hazardMatrix from "../assets/generated/macroclimate-dashboard/hazard-risk-matrix.png";
import hazardHotspots from "../assets/generated/macroclimate-dashboard/hazard-hotspots.png";

const metadata = screenCatalog.find((screen) => screen.route === "/observe/macroclimate-hazards");

const macroIconMap = { snowflake: Snowflake, droplet: Droplet, alert: TriangleAlert, calendar: CalendarDays, sun: Sun, wind: Wind };

export function MacroclimateDashboardPage() {
  const { project } = useBuiltinProject();
  const meta = project?.metadata ?? {};
  const [pane, setPane] = useState(null);
  const close = () => setPane(null);
  return (
    <AppShell navConfig={observeNav}>
      <div className="detail-page macroclimate-page module-frame">
        <TopStageBar stage="Stage 1 of 3" module="Roots & Diagnosis — Module 2" />
        <ProjectDataStatus />
        <section className="macroclimate-layout">
          <div className="macroclimate-main">
            <ModuleHeroCard
              moduleNumber="Module 2"
              title="Macroclimate & Hazards"
              icon={Wind}
              copy={vm.hero.copy}
              progressPct={vm.hero.progressPct}
              metrics={vm.hero.metrics}
            />
            <MacroKpis meta={meta} />
            <SolarClimateCard onAction={() => setPane("solar")} />
            <HazardsCard />
          </div>
          <MacroSidebar />
        </section>
      </div>
      <SlideUpPane open={pane === "solar"} title="Solar & Climate detail" onClose={close}>
        <SolarClimateContent />
      </SlideUpPane>
      {import.meta.env.DEV && metadata ? (
        <QaOverlay reference={metadata.reference} nativeWidth={metadata.viewport.width} nativeHeight={metadata.viewport.height} />
      ) : null}
    </AppShell>
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
  return <ModuleKpiStrip items={kpis} iconMap={macroIconMap} />;
}

function SolarClimateCard({ onAction }) {
  return (
    <SurfaceCard className="macro-section-card solar-card">
      <header>
        <div>
          <h2><Sun aria-hidden="true" /> Solar & Climate detail</h2>
          <p>Deep dive into sun, temperature, precipitation, and seasonality to identify opportunities for passive design and productivity.</p>
        </div>
        <button className="green-button" type="button" onClick={onAction}>Open page <ArrowRight aria-hidden="true" /></button>
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
      <ModuleSynthesisPanel
        title="Macroclimate Synthesis"
        synthesis={vm.synthesis}
        alignmentLabel="Climate Alignment"
      />
    </aside>
  );
}
