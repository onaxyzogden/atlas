import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CircleCheck,
  Clock3,
  Droplet,
  Gauge,
  Leaf,
  Newspaper,
  Sprout,
  Timer,
  User,
  Users
} from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AppShell,
  CroppedArt,
  ModuleSummaryCard,
  ProjectOverviewCard,
  QaOverlay,
  SlideUpPane,
  TopStageBar
} from "../components/index.js";
import { EarthWaterEcologyContent } from "./EarthWaterEcologyPage.jsx";
import { EmptyState, Skeleton } from "../components/primitives/index.js";
import { ProgressRing } from "../components/ProgressRing.jsx";
import { observeNav } from "../data/navConfig.js";
import { screenCatalog } from "../screenCatalog.js";
import {
  observeStageProgress,
  observeDashboardModules
} from "../data/builtin-sample.js";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";
import heroLandscape from "../assets/generated/observe-dashboard/hero-landscape.png";
import siteMapThumb from "../assets/generated/observe-dashboard/site-map-thumb.png";
import topographyMap from "../assets/generated/observe-dashboard/topography-map.png";
import sectorMap from "../assets/generated/observe-dashboard/sector-map.png";

const dashboardMetadata = screenCatalog.find((screen) => screen.route === "/observe/dashboard");

export function ObserveDashboardPage() {
  const { assessment, siteBanner, status, retry } = useBuiltinProject();
  return (
    <AppShell navConfig={observeNav}>
      <div className="dashboard-page">
        <TopStageBar />
        <section className="dashboard-hero-row">
          <DashboardHero />
          <ProjectOverviewCard mapSrc={siteMapThumb} />
        </section>
        {status === "loading" && !assessment ? (
          <DashboardProgressSkeleton />
        ) : status === "error" && !assessment ? (
          <EmptyState
            variant="error"
            icon={AlertTriangle}
            title="Couldn't load site assessment"
            description="The data service is unreachable. Showing static sample where possible."
            action={{ label: "Retry", onClick: retry }}
          />
        ) : (
          <>
            <DashboardProgress assessment={assessment} siteBanner={siteBanner} />
            {assessment?.flags?.length > 0 && <SiteFlags flags={assessment.flags} />}
          </>
        )}
        <DashboardCards />
      </div>
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

function DashboardProgress({ assessment, siteBanner }) {
  const p = observeStageProgress;
  const lastUpdated = siteBanner?.lastUpdatedAbsolute ?? p.lastUpdatedAbsolute;
  const lastUpdatedBy = siteBanner?.lastUpdatedBy ?? p.lastUpdatedBy;
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
      <ProgressMetric icon={<CalendarDays />} label="Last updated" value={lastUpdated} note={`By ${lastUpdatedBy}`} />
      <ProgressMetric icon={<BookOpen />} label="Journal entries" value={String(p.journalEntriesThisWeek)} note="This week" />
      {assessment?.overallScore != null && (
        <ProgressMetric icon={<Gauge />} label="Site score" value={`${Math.round(assessment.overallScore)}`} note={`/ 100 · ${assessment.confidence ?? "medium"}`} />
      )}
    </section>
  );
}

function DashboardProgressSkeleton() {
  return (
    <section className="dashboard-progress-band" aria-busy="true" aria-label="Loading stage progress">
      <div className="dashboard-progress-band__main">
        <Skeleton width={120} height={14} />
        <Skeleton width={88} height={88} radius={44} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <Skeleton width="60%" height={18} />
          <Skeleton width="100%" height={6} radius={4} />
          <Skeleton width="80%" height={12} />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="dashboard-progress-metric green" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton width={28} height={28} radius={6} />
          <Skeleton width="60%" height={12} />
          <Skeleton width="40%" height={20} />
          <Skeleton width="80%" height={10} />
        </div>
      ))}
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

function scoreBand(n) {
  if (n >= 80) return "Good";
  if (n >= 60) return "Moderate";
  return "Low";
}

function deriveEweScores(sb) {
  const soilHealth = sb.agPotential
    ? Math.round((sb.agPotential.om + sb.agPotential.capability) / 2)
    : null;
  const waterSecurity = sb.waterResilience
    ? Math.round((sb.waterResilience.baseflow + sb.waterResilience.storagePotential + sb.waterResilience.regulatoryConstraint) / 3)
    : null;
  const biodiversity = sb.suitability && sb.agPotential
    ? Math.round((sb.suitability.soilDrainage + sb.agPotential.capability) / 2)
    : null;
  return [
    { label: "Soil Health",    band: soilHealth    ? scoreBand(soilHealth)    : "Good"     },
    { label: "Biodiversity",   band: biodiversity  ? scoreBand(biodiversity)  : "Moderate" },
    { label: "Water Security", band: waterSecurity ? scoreBand(waterSecurity) : "Low"      },
  ];
}

function DashboardCards() {
  const m = observeDashboardModules;
  const { assessment } = useBuiltinProject();
  const eweScores = assessment?.scoreBreakdown
    ? deriveEweScores(assessment.scoreBreakdown)
    : m.earthWaterEcology.scores;
  const [pane, setPane] = useState(null);
  const close = () => setPane(null);

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

      <ModuleSummaryCard number="4" title="Earth, Water & Ecology Diagnostics" footer={<CardActions primary="Hydrology detail" onPrimary={() => setPane("ewe")} secondary="Ecological detail" tertiary="Jar / Perc / Roof" />}>
        <FactList rows={m.earthWaterEcology.facts} />
        <ScoreRings scores={eweScores} />
        <BadgeRow items={m.earthWaterEcology.badges} />
      </ModuleSummaryCard>

      <ModuleSummaryCard number="5" title="Sectors, Microclimates & Zones" status="Needs input" tone="gold" mediaSrc={sectorMap} footer={<CardActions primary="Sector compass" secondary="Cartographic detail" />}>
        <FactList rows={m.sectors.facts} />
        <BadgeRow items={m.sectors.badges} />
      </ModuleSummaryCard>

      <ModuleSummaryCard number="6" title="SWOT Synthesis" footer={<CardActions primary="SWOT journal" secondary="Diagnosis report" />}>
        <SwotGrid quadrants={m.swot.quadrants} />
        <BadgeRow items={m.swot.badges} />
      </ModuleSummaryCard>
      <SlideUpPane open={pane === "ewe"} title="Earth, Water & Ecology" onClose={close}>
        <EarthWaterEcologyContent />
      </SlideUpPane>
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
      <span className="people-orbit-small__center"><User /></span>
      {Array.from({ length: 6 }).map((_, index) => <i key={index}><User /></i>)}
    </div>
  );
}

const MINI_STAT_ICONS = { users: Users, newspaper: Newspaper };

function MiniStats({ items }) {
  return (
    <div className="mini-stat-row">
      {items.map((item) => {
        const Icon = MINI_STAT_ICONS[item.icon] ?? Users;
        return (
          <span key={item.label} className={item.tone === "amber" ? "amber" : undefined}>
            <Icon />
            {item.label}
            <b>{item.value}</b>
          </span>
        );
      })}
    </div>
  );
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

const FLAG_CSS_TONE = { info: "low", warning: "medium", error: "high" };

function SiteFlags({ flags }) {
  return (
    <section className="dashboard-site-flags" aria-label="Site flags">
      <h3 className="dashboard-site-flags__heading"><AlertTriangle aria-hidden="true" /> Site Flags</h3>
      <div className="dashboard-site-flags__list">
        {flags.map((f, i) => {
          const tone = FLAG_CSS_TONE[f.severity] ?? "low";
          const label = (f.flag ?? "").replace(/_/g, " ");
          return (
            <div key={f.flag ?? i} className={`site-flag site-flag--${tone}`}>
              <div className="site-flag__meta">
                <span className="site-flag__severity">{f.severity}</span>
              </div>
              <strong className="site-flag__title">{label}</strong>
              <p className="site-flag__body">{f.message}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CardActions({ primary, primaryTo, onPrimary, secondary, secondaryTo, tertiary, tertiaryTo }) {
  return (
    <div className="dashboard-card-actions">
      {onPrimary
        ? <button className="green-button" type="button" onClick={onPrimary}>{primary} <ArrowRight /></button>
        : primaryTo
          ? <Link to={primaryTo} className="green-button">{primary} <ArrowRight /></Link>
          : <button className="green-button" type="button">{primary} <ArrowRight /></button>}
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
