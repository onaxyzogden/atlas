import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  CloudLightning,
  Compass,
  Home,
  Leaf,
  Link as LinkIcon,
  Mountain,
  PenLine,
  ShieldCheck,
  Sprout,
  Star,
  Target,
  Users,
} from "lucide-react";
import { useState } from "react";
import { AppShell, QaOverlay, SlideUpPane, SurfaceCard, TopStageBar, ProjectDataStatus } from "../components/index.js";
import { observeNav } from "../data/navConfig.js";
import { screenCatalog } from "../screenCatalog.js";
import { swotDashboard as vm } from "../data/builtin-sample.js";
import { SwotJournalContent } from "./SwotJournalPage.jsx";
import { SwotDiagnosisReportContent } from "./SwotDiagnosisReportPage.jsx";

const metadata = screenCatalog.find((screen) => screen.route === "/observe/swot");

const KPI_BY_LABEL = Object.fromEntries(vm.kpis.map((k) => [k.label, k.value]));

export function SwotDashboardPage() {
  const [pane, setPane] = useState(null);
  const close = () => setPane(null);
  return (
    <AppShell navConfig={observeNav}>
      <div className="swot-page module-frame">
        <TopStageBar stage="Stage 1 of 3" module="Roots & Diagnosis — SWOT Synthesis" />
        <ProjectDataStatus />
        <section className="swot-content">
          <div className="swot-main">
            <SwotHero />
            <SwotQuadrants />
            <SynthesisHow />
            <section className="swot-middle-grid">
              <SwotJournalCard onAction={() => setPane("journal")} />
              <DiagnosisReportCard onAction={() => setPane("diagnosis")} />
            </section>
          </div>
          <DesignImplications />
        </section>
        <SwotHealthStrip />
      </div>
      <SlideUpPane open={pane === "journal"} title="SWOT journal" onClose={close}>
        <SwotJournalContent />
      </SlideUpPane>
      <SlideUpPane open={pane === "diagnosis"} title="Diagnosis report" onClose={close}>
        <SwotDiagnosisReportContent />
      </SlideUpPane>
      {import.meta.env.DEV && metadata ? (
        <QaOverlay reference={metadata.reference} nativeWidth={metadata.viewport.width} nativeHeight={metadata.viewport.height} />
      ) : null}
    </AppShell>
  );
}

function SwotHero() {
  return (
    <header className="swot-hero">
      <h1>SWOT Synthesis</h1>
      <i />
      <p>Synthesize insights from your journal and diagnosis to reveal strategic leverage points and inform robust, regenerative design decisions.</p>
    </header>
  );
}

function SwotQuadrants() {
  const cards = [
    [Leaf,           "Strengths",     KPI_BY_LABEL.STRENGTHS,     "Internal assets and positive factors you can build upon."],
    [Mountain,       "Weaknesses",    KPI_BY_LABEL.WEAKNESSES,    "Internal limitations or gaps that may constrain success."],
    [Sprout,         "Opportunities", KPI_BY_LABEL.OPPORTUNITIES, "External conditions and trends that can be leveraged."],
    [CloudLightning, "Threats",       KPI_BY_LABEL.THREATS,       "External risks or pressures that could impact outcomes."],
  ];
  return (
    <section className="swot-quadrants">
      {cards.map(([Icon, title, count, note]) => (
        <SurfaceCard className={`swot-quadrant ${title.toLowerCase()}`} key={title}>
          <Icon aria-hidden="true" /><span>{title}</span><strong>{count}</strong><p>{note}</p><ArrowRight aria-hidden="true" />
        </SurfaceCard>
      ))}
    </section>
  );
}

function SynthesisHow() {
  return (
    <SurfaceCard className="swot-how-card">
      <div className="swot-venn"><span /><span /><span /></div>
      <div><h2>How the synthesis works</h2><p>By combining your internal factors with external factors, we identify strategic leverage points and design implications to guide resilient decisions.</p></div>
      <div className="swot-equations"><p><b>S</b> + <b>O</b> <ArrowRight aria-hidden="true" /> Maximize opportunities using your strengths</p><p><b>W</b> + <b>T</b> <ArrowRight aria-hidden="true" /> Mitigate threats by addressing weaknesses</p></div>
    </SurfaceCard>
  );
}

const CATEGORY_LABEL = {
  strength: "Strength",
  weakness: "Weakness",
  opportunity: "Opportunity",
  threat: "Threat",
};

function SwotJournalCard({ onAction }) {
  return (
    <SurfaceCard className="swot-panel-card">
      <header><h2><BookOpen aria-hidden="true" /> SWOT Journal <span>Captured insights and field notes</span></h2><button type="button" className="text-link" onClick={onAction}>View all entries</button></header>
      <div className="swot-journal-rows">
        {vm.journalPreview.map((row) => (
          <p key={row.title}><span>{row.title}</span><b>{CATEGORY_LABEL[row.category]}</b><time>{row.date}</time></p>
        ))}
      </div>
      <div className="swot-tags">{["Soil", "Water", "Climate", "Access", "Community", "+4 more"].map((tag) => <span key={tag}>{tag}</span>)}</div>
      <button type="button" className="green-button" onClick={onAction}>Open SWOT journal <ArrowRight aria-hidden="true" /></button>
    </SurfaceCard>
  );
}

function DiagnosisReportCard({ onAction }) {
  const score = Math.round(vm.moduleHealth.dataCompleteness);
  return (
    <SurfaceCard className="swot-panel-card diagnosis-card">
      <header><h2><ClipboardList aria-hidden="true" /> Diagnosis Report <span>Summary of site diagnosis and analysis</span></h2><button type="button" className="text-link" onClick={onAction}>View full report</button></header>
      <section><div><h3>Executive summary</h3><p>The site has strong intrinsic assets, particularly in soil fertility, water resources, and community support. Key constraints include access, erosion risk, and climate variability.</p></div><div className="swot-score"><b>{score}%</b><span>Overall Site Resilience Score</span></div></section>
      <div className="diagnosis-lists">
        <p>
          <b>Key findings</b>
          {vm.diagnosticPreview.slice(0, 4).map((f) => <span key={f.title}>{f.title}</span>)}
        </p>
        <p>
          <b>Priority areas</b>
          {vm.designImplications.slice(0, 4).map((it) => <span key={it}>{it}</span>)}
        </p>
      </div>
      <button type="button" className="green-button" onClick={onAction}>Open diagnosis report <ArrowRight aria-hidden="true" /></button>
    </SurfaceCard>
  );
}

function DesignImplications() {
  const ICONS = [Leaf, RouteIcon, CloudLightning, Users];
  const NOTES = [
    "Design gardens and systems that maximize productive capacity while conserving water.",
    "Improve year-round access for people, materials, and maintenance with low-impact solutions.",
    "Incorporate frost protection, diversity, and microclimate design to increase system resilience.",
    "Strengthen local partnerships and share knowledge to support long-term stewardship.",
  ];
  return (
    <SurfaceCard className="swot-implications-card">
      <h2><Target aria-hidden="true" /> Design implications <span>Recommended next actions</span></h2>
      <section>{vm.designImplications.map((title, index) => {
        const Icon = ICONS[index % ICONS.length];
        const note = NOTES[index % NOTES.length];
        return <p key={title}><b>{index + 1}</b><span>{title}<small>{note}</small></span><Icon aria-hidden="true" /></p>;
      })}</section>
      <button className="green-button" type="button">Create action plan from synthesis <ArrowRight aria-hidden="true" /></button>
      <button type="button">Export synthesis summary</button>
    </SurfaceCard>
  );
}

function RouteIcon(props) {
  return <ArrowRight {...props} />;
}

function SwotHealthStrip() {
  const h = vm.moduleHealth;
  const items = [
    [ShieldCheck,  "Module health",       "Your analysis is strong. Keep refining insights to strengthen your design."],
    [Compass,      "Data completeness",   `${h.dataCompleteness}% Good coverage across all SWOT categories`],
    [Star,         "Insight quality",     `${h.insightQuality}. Well-supported insights with clear observations.`],
    [LinkIcon,     "Synthesis strength",  `${h.synthesisStrength}. Connections between factors and implications still firming up.`],
    [CalendarDays, "Last updated",        `${h.lastUpdated} by Yousef A.`],
    [Leaf,         "Next recommendation", h.nextRecommendation],
  ];
  return (
    <SurfaceCard className="swot-health-strip">
      {items.map(([Icon, title, text]) => <div key={title}><Icon aria-hidden="true" /><b>{title}</b><span>{text}</span></div>)}
    </SurfaceCard>
  );
}
