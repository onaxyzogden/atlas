import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CircleCheck,
  Clock3,
  Droplet,
  Leaf,
  Sprout,
  Timer,
  Users
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  AppShell,
  CroppedArt,
  ModuleSummaryCard,
  ProjectOverviewCard,
  QaOverlay,
  SideRail,
  TopStageBar
} from "../components/index.js";
import { ProgressRing } from "../components/ProgressRing.jsx";
import { screenCatalog } from "../screenCatalog.js";
import {
  observeStageProgress,
  observeDashboardModules
} from "../data/builtin-sample.js";
import heroLandscape from "../assets/generated/observe-dashboard/hero-landscape.png";
import siteMapThumb from "../assets/generated/observe-dashboard/site-map-thumb.png";
import topographyMap from "../assets/generated/observe-dashboard/topography-map.png";
import sectorMap from "../assets/generated/observe-dashboard/sector-map.png";

const dashboardMetadata = screenCatalog.find((screen) => screen.route === "/observe/dashboard");

export function ObserveDashboardPage() {
  return (
    <AppShell className="observe-dashboard-shell">
      <SideRail active="Overview" />
      <main className="dashboard-page">
        <TopStageBar />
        <section className="dashboard-hero-row">
          <DashboardHero />
          <ProjectOverviewCard mapSrc={siteMapThumb} />
        </section>
        <DashboardProgress />
        <DashboardCards />
      </main>
      {import.meta.env.DEV ? (
        <QaOverlay
          reference={dashboardMetadata.reference}
          nativeWidth={dashboardMetadata.viewport.width}
          nativeHeight={dashboardMetadata.viewport.height}
        />
      ) : null}
    </AppShell>
  );
}

function DashboardHero() {
  return (
    <section className="dashboard-hero">
      <div className="dashboard-hero__copy">
        <h1>Observe <span>— read the land before designing it.</span></h1>
        <p>
          Six modules of protracted, thoughtful observation. Capture human context,
          macroclimate, topography, earth/water/ecology diagnostics, sectors and
          zones, and a continuous SWOT journal. Each card summarises what you have
          so far and links to the detail surface.
        </p>
        <div className="dashboard-hero__actions">
          <button className="green-button" type="button">Continue where you left off <ArrowRight /></button>
          <button className="outlined-button" type="button"><BookOpen /> View Stage 1 guide</button>
        </div>
      </div>
      <CroppedArt className="dashboard-hero__image" src={heroLandscape} />
    </section>
  );
}

function DashboardProgress() {
  const p = observeStageProgress;
  return (
    <section className="dashboard-progress-band" aria-label="Stage progress">
      <div className="dashboard-progress-band__main">
        <span>Stage 1 Progress</span>
        <ProgressRing value={p.progressPct} label={`${p.progressPct}%`} />
        <div>
          <strong>{p.doneTasks} of {p.totalTasks} tasks complete</strong>
          <div className="thin-progress"><i style={{ width: `${p.taskBarPct}%` }} /></div>
          <p>Keep going — you're building<br />a strong foundation.</p>
        </div>
      </div>
      <ProgressMetric icon={<CircleCheck />} label="Complete" value={String(p.doneTasks - p.inProgressTasks)} note="Tasks done" />
      <ProgressMetric icon={<Timer />} label="In progress" value={String(p.inProgressTasks)} note="Tasks active" />
      <ProgressMetric icon={<Sprout />} label="Needs input" value={String(p.needsInputTasks)} note="Tasks waiting" tone="gold" />
      <ProgressMetric icon={<CalendarDays />} label="Last updated" value={p.lastUpdatedAbsolute} note={`By ${p.lastUpdatedBy}`} />
      <ProgressMetric icon={<BookOpen />} label="Journal entries" value={String(p.journalEntriesThisWeek)} note="This week" />
    </section>
  );
}

function ProgressMetric({ icon, label, value, note, tone = "green" }) {
  return (
    <div className={`dashboard-progress-metric ${tone}`}>
      <span className="dashboard-progress-metric__icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function DashboardCards() {
  const m = observeDashboardModules;
  return (
    <section className="dashboard-card-grid" aria-label="Observation modules">
      <ModuleSummaryCard number="1" title="Human Context" footer={<CardActions primary="Open Steward Survey" primaryTo="/observe/human-context/steward-survey" secondary="Regional detail" secondaryTo="/observe/human-context/indigenous-regional-context" tertiary="Vision detail" tertiaryTo="/observe/human-context/vision" />}>
        <FactList rows={m.humanContext.facts} />
        <PeopleOrbit />
        <MiniStats items={m.humanContext.miniStats} />
      </ModuleSummaryCard>

      <ModuleSummaryCard number="2" title="Macroclimate & Hazards" footer={<CardActions primary="Solar & Climate detail" primaryTo="/observe/macroclimate-hazards/solar-climate" secondary="Hazards log" secondaryTo="/observe/macroclimate-hazards" />}>
        <FactList rows={m.macroclimate.facts} />
        <RainChart bars={m.macroclimate.monthlyRainPct} />
        <BadgeRow items={m.macroclimate.badges} />
      </ModuleSummaryCard>

      <ModuleSummaryCard number="3" title="Topography & Base Map" mediaSrc={topographyMap} footer={<CardActions primary="Terrain detail" primaryTo="/observe/topography/terrain-detail" secondary="Cross-section tool" secondaryTo="/observe/topography/cross-section-tool" />}>
        <FactList rows={m.topography.facts} />
        <BadgeRow items={m.topography.badges} />
      </ModuleSummaryCard>

      <ModuleSummaryCard number="4" title="Earth, Water & Ecology Diagnostics" footer={<CardActions primary="Hydrology detail" primaryTo="/observe/earth-water-ecology" secondary="Ecological detail" tertiary="Jar / Perc / Roof" />}>
        <FactList rows={m.earthWaterEcology.facts} />
        <ScoreRings scores={m.earthWaterEcology.scores} />
        <BadgeRow items={m.earthWaterEcology.badges} />
      </ModuleSummaryCard>

      <ModuleSummaryCard number="5" title="Sectors, Microclimates & Zones" status="Needs input" tone="gold" mediaSrc={sectorMap} footer={<CardActions primary="Sector compass" secondary="Cartographic detail" />}>
        <FactList rows={m.sectors.facts} />
        <BadgeRow items={m.sectors.badges} />
      </ModuleSummaryCard>

      <ModuleSummaryCard number="6" title="SWOT Synthesis" footer={<CardActions primary="SWOT journal →" secondary="Diagnosis report" />}>
        <SwotGrid quadrants={m.swot.quadrants} />
        <BadgeRow items={m.swot.badges} />
      </ModuleSummaryCard>
    </section>
  );
}

function FactList({ rows }) {
  return (
    <dl className="dashboard-facts">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PeopleOrbit() {
  return (
    <div className="people-orbit-small" aria-hidden="true">
      <Users />
      {Array.from({ length: 6 }).map((_, index) => <i key={index} />)}
    </div>
  );
}

function MiniStats({ items }) {
  return <div className="mini-stat-row">{items.map((item) => <span key={item}>{item}</span>)}</div>;
}

function RainChart({ bars }) {
  return (
    <div className="rain-chart" aria-hidden="true">
      {bars.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
    </div>
  );
}

function BadgeRow({ items }) {
  return <div className="dashboard-badge-row">{items.map((item) => <span key={item}>{item}</span>)}</div>;
}

function ScoreRings({ scores }) {
  const iconFor = { "Soil Health": Leaf, Biodiversity: Sprout, "Water Security": Droplet };
  return (
    <div className="score-rings">
      {scores.map(({ label, band }) => {
        const Icon = iconFor[label] ?? Leaf;
        return <span key={label}><Icon />{label} <b>{band}</b></span>;
      })}
    </div>
  );
}

function SwotGrid({ quadrants }) {
  return (
    <div className="swot-mini-grid">
      <span><b>Strengths</b>{quadrants.strengths}</span>
      <span><b>Weaknesses</b>{quadrants.weaknesses}</span>
      <span><b>Opportunities</b>{quadrants.opportunities}</span>
      <span><b>Threats</b>{quadrants.threats}</span>
    </div>
  );
}

function CardActions({ primary, primaryTo, secondary, secondaryTo, tertiary, tertiaryTo }) {
  return (
    <div className="dashboard-card-actions">
      {primaryTo
        ? <Link to={primaryTo} className="green-button">{primary}</Link>
        : <button className="green-button" type="button">{primary}</button>}
      {secondaryTo
        ? <Link to={secondaryTo} className="outlined-button">{secondary}</Link>
        : <button className="outlined-button" type="button">{secondary}</button>}
      {tertiary
        ? tertiaryTo
          ? <Link to={tertiaryTo} className="outlined-button">{tertiary}</Link>
          : <button className="outlined-button" type="button">{tertiary}</button>
        : null}
    </div>
  );
}
