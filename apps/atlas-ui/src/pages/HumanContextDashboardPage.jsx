import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Flag,
  Leaf,
  MapPin,
  Sprout,
  Users
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  AppShellV2,
  CroppedArt,
  ProgressRing,
  QaOverlay,
  SurfaceCard
} from "../components/index.js";
import { screenCatalog } from "../screenCatalog.js";
import { humanContextDashboard as vm } from "../data/builtin-sample.js";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";
import heroLandscape from "../assets/generated/human-context-dashboard/hero-landscape.png";
import regionalSnapshot from "../assets/generated/human-context-dashboard/regional-snapshot.png";

const metadata = screenCatalog.find((screen) => screen.route === "/observe/human-context");

const heroIconMap = { eye: Eye, flag: Flag, mapPin: MapPin };

export function HumanContextDashboardPage() {
  return (
    <AppShellV2 navConfig={observeNav}>
      <div className="human-context-page">
        <HumanBreadcrumb />
        <div className="human-context-layout">
          <div className="human-context-main">
            <HumanHero />
            <section className="human-card-grid">
              <StewardCard />
              <RegionalCard />
              <VisionSummaryCard />
            </section>
            <HealthStrip />
          </div>
          <SynthesisPanel />
        </div>
      </div>
      {import.meta.env.DEV && metadata ? (
        <QaOverlay
          reference={metadata.reference}
          nativeWidth={metadata.viewport.width}
          nativeHeight={metadata.viewport.height}
        />
      ) : null}
    </AppShellV2>
  );
}

function HumanBreadcrumb() {
  return (
    <header className="human-breadcrumb">
      <nav aria-label="Breadcrumb">
        {vm.breadcrumb.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </nav>
      <div>
        <span>{vm.saveStatus}</span>
        <button className="save-button" type="button">Save</button>
      </div>
    </header>
  );
}

function HumanHero() {
  return (
    <SurfaceCard className="human-hero-card">
      <CroppedArt src={heroLandscape} className="human-hero-image" />
      <div className="human-hero-copy">
        <span>Module 1</span>
        <h1>Human Context <Sprout aria-hidden="true" /></h1>
        <p>
          This module captures who is stewarding the land, the regional and cultural
          context that shapes it, and the long-horizon vision that guides decisions
          across time and generations.
        </p>
      </div>
      <div className="human-hero-metrics">
        <ProgressRing value={vm.hero.progressPct} label={`${vm.hero.progressPct}%`} />
        <MetricBlock label="Module progress" value={vm.hero.progressLabel} note={vm.hero.progressNote} compact />
        {vm.hero.metrics.map((metric) => (
          <MetricBlock key={metric.label} icon={heroIconMap[metric.iconKey]} label={metric.label} value={metric.value} note={metric.note} />
        ))}
      </div>
    </SurfaceCard>
  );
}

function MetricBlock({ icon: Icon, label, value, note, compact = false }) {
  return (
    <div className={compact ? "human-metric-block compact" : "human-metric-block"}>
      {Icon ? <Icon aria-hidden="true" /> : null}
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function ModuleCardShell({ number, title, icon: Icon, children, action, actionTo, tone = "green" }) {
  const cls = tone === "gold" ? "gold-button" : "green-button";
  return (
    <SurfaceCard className={`human-module-card ${tone}`}>
      <header>
        <b>{number}</b>
        <h2>{title}</h2>
        {Icon ? <Icon aria-hidden="true" /> : null}
      </header>
      {children}
      {actionTo
        ? <Link to={actionTo} className={cls}>{action} <ArrowRight aria-hidden="true" /></Link>
        : <button className={cls} type="button">{action} <ArrowRight aria-hidden="true" /></button>}
    </SurfaceCard>
  );
}

function StewardCard() {
  const s = vm.steward;
  return (
    <ModuleCardShell number="1" title="Steward Survey" icon={Users} action="Open Steward Survey" actionTo="/observe/human-context/steward-survey">
      <p>Who is stewarding this land and what they bring.</p>
      <div className="steward-summary-grid">
        <div className="mini-profile">
          <span>Steward Profile</span>
          <ProgressRing value={s.profilePct} label={`${s.profilePct}%`} />
          <p>Well on your way<br />{s.profileNote}</p>
        </div>
        <div className="mini-profile">
          <span>Steward Archetype</span>
          <Leaf aria-hidden="true" />
          <p>{s.archetype}<br />{s.archetypeNote}</p>
        </div>
      </div>
      <div className="capacity-mini">
        <span>Capacity Overview</span>
        <strong>{s.capacityHrs}</strong>
        <small>{s.capacityNote}</small>
        <i><b /></i>
      </div>
      <ChipRow items={s.chips} />
      <FooterTabs items={s.tabs} />
    </ModuleCardShell>
  );
}

function RegionalCard() {
  const r = vm.regional;
  return (
    <ModuleCardShell number="2" title="Indigenous & Regional Context" icon={Sprout} action="Open Indigenous & Regional Context" actionTo="/observe/human-context/indigenous-regional-context" tone="gold">
      <p>Honour the land's story, culture, and regional systems.</p>
      <div className="regional-summary-grid">
        <CroppedArt src={regionalSnapshot} className="regional-summary-image" />
        <dl>
          {r.facts.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      </div>
      <ChipRow items={r.chips} />
      <FooterTabs items={r.tabs} />
    </ModuleCardShell>
  );
}

function VisionSummaryCard() {
  const { project } = useBuiltinProject();
  const visionStatement = project?.metadata?.visionStatement ?? null;
  const v = vm.vision;
  return (
    <ModuleCardShell number="3" title="Vision Detail" icon={Leaf} action="Open Vision Detail" actionTo="/observe/human-context/vision">
      <p>Where we're going and what success looks like.</p>
      <div className="vision-summary-grid">
        <blockquote>{visionStatement ?? v.quote}</blockquote>
        <div>
          {v.themes.map((item) => <span key={item}>{item}</span>)}
        </div>
      </div>
      <div className="vision-counts">
        {v.counts.map(([num, label]) => <span key={label}><b>{num}</b>{label}</span>)}
      </div>
      <FooterTabs items={v.tabs} />
    </ModuleCardShell>
  );
}

function ChipRow({ items }) {
  return <div className="human-chip-row">{items.map((item) => <span key={item}>{item}</span>)}</div>;
}

function FooterTabs({ items }) {
  return <div className="human-footer-tabs">{items.map((item) => <button type="button" key={item}>{item}</button>)}</div>;
}

function HealthStrip() {
  const { siteBanner } = useBuiltinProject();
  const h = vm.health;
  const lastUpdated = siteBanner?.lastUpdatedAbsolute ?? h.lastUpdated;
  return (
    <SurfaceCard className="human-health-strip">
      <span><Leaf /> <b>Overall Module Health</b>{h.summary}</span>
      {h.strips.map(([label, value]) => <span key={label}>{label} <b>{value}</b></span>)}
      <span>Last updated<br />{lastUpdated}</span>
    </SurfaceCard>
  );
}

function SynthesisPanel() {
  const s = vm.synthesis;
  return (
    <SurfaceCard className="human-synthesis-panel">
      <h2>Human Context Synthesis</h2>
      <div className="synthesis-score">
        <ProgressRing value={s.alignmentPct} label={`${s.alignmentPct}%`} />
        <p><b>Context Alignment</b>{s.alignmentNote}</p>
      </div>
      <SynthesisSection title="Key insights" items={s.keyInsights} />
      <SynthesisSection title="Design implications" items={s.designImplications} />
      <SynthesisSection title="Next steps" numbered items={s.nextSteps} />
      <button className="green-button" type="button">View full design implications <ArrowRight aria-hidden="true" /></button>
    </SurfaceCard>
  );
}

function SynthesisSection({ title, items, numbered = false }) {
  return (
    <section className="synthesis-section">
      <h3>{title}</h3>
      {items.map((item, index) => (
        <p key={item}>{numbered ? <b>{index + 1}</b> : <CheckCircle2 aria-hidden="true" />} {item}</p>
      ))}
    </section>
  );
}
