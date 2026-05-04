import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  CloudLightning,
  Compass,
  Home,
  Layers,
  Leaf,
  Link as LinkIcon,
  MapPin,
  Mountain,
  PenLine,
  Settings,
  ShieldCheck,
  Sprout,
  Star,
  Target,
  Users,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { QaOverlay, SurfaceCard } from "../components/index.js";
import { screenCatalog } from "../screenCatalog.js";
import { swotDashboard as vm } from "../data/builtin-sample.js";

const metadata = screenCatalog.find((s) => s.route === "/observe/swot");

const QUAD_META = {
  STRENGTHS:     { icon: Leaf,           cls: "strengths",     note: "Internal assets and positive factors you can build upon." },
  WEAKNESSES:    { icon: Mountain,       cls: "weaknesses",    note: "Internal limitations or gaps that may constrain success." },
  OPPORTUNITIES: { icon: Sprout,         cls: "opportunities", note: "External conditions and trends that can be leveraged."     },
  THREATS:       { icon: CloudLightning, cls: "threats",       note: "External risks or pressures that could impact outcomes."   },
};

const CATEGORY_LABEL = {
  strength: "Strength",
  weakness: "Weakness",
  opportunity: "Opportunity",
  threat: "Threat",
};

export function SwotDashboardPage() {
  return (
    <div className="swot-suite-shell">
      <SwotSuiteRail />
      <main className="swot-page">
        <SwotTopBar />
        <section className="swot-content">
          <div className="swot-main">
            <SwotHero />
            <SwotQuadrants />
            <SynthesisHow />
            <section className="swot-middle-grid">
              <SwotJournalCard />
              <DiagnosisReportCard />
            </section>
          </div>
          <DesignImplications />
        </section>
        <SwotHealthStrip />
      </main>
      {import.meta.env.DEV && metadata ? (
        <QaOverlay reference={metadata.reference} nativeWidth={metadata.viewport.width} nativeHeight={metadata.viewport.height} />
      ) : null}
    </div>
  );
}

function SwotSuiteRail() {
  const nav = [
    [Home, "Dashboard"],
    [MapPin, "Site & Context"],
    [Compass, "Observations"],
    [Leaf, "Analysis"],
    [PenLine, "Design"],
    [Layers, "Plans"],
    [Settings, "Implementation"],
    [BarChart3, "Monitoring"],
    [BookOpen, "Library"],
    [Settings, "Settings"],
  ];
  return (
    <aside className="swot-suite-rail">
      <div className="swot-suite-logo">
        <Target aria-hidden="true" />
        <span>Permaculture<br />Design Suite</span>
      </div>
      <nav>
        {nav.map(([Icon, label]) => (
          <button className={label === "Analysis" ? "is-active" : ""} type="button" key={label}>
            <Icon aria-hidden="true" />{label}<ArrowRight aria-hidden="true" />
          </button>
        ))}
      </nav>
      <div className="swot-analysis-subnav">
        <span>Zones & Sectors</span>
        <span>Patterns & Relationships</span>
        <span className="is-active">SWOT Synthesis</span>
        <span>Needs & Resources</span>
      </div>
      <div className="swot-user-card"><b>YA</b><span>Yousef A.<small>351 House Sample</small></span></div>
    </aside>
  );
}

function SwotTopBar() {
  return (
    <header className="swot-topbar">
      <p>Home <ArrowRight aria-hidden="true" /> Analysis <ArrowRight aria-hidden="true" /> <b>SWOT Synthesis</b></p>
      <nav>
        {["Observe", "Analyze", "Design", "Plan", "Implement", "Monitor"].map((item, index) => (
          <span className={index === 1 ? "is-active" : ""} key={item}><b>{index + 1}</b>{item}</span>
        ))}
      </nav>
    </header>
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
  return (
    <section className="swot-quadrants">
      {vm.kpis.map((k) => {
        const meta = QUAD_META[k.label] ?? QUAD_META.STRENGTHS;
        const Icon = meta.icon;
        return (
          <SurfaceCard className={`swot-quadrant ${meta.cls}`} key={k.label}>
            <Icon aria-hidden="true" />
            <span>{k.label.charAt(0) + k.label.slice(1).toLowerCase()}</span>
            <strong>{k.value}</strong>
            <p>{meta.note}</p>
            <ArrowRight aria-hidden="true" />
          </SurfaceCard>
        );
      })}
    </section>
  );
}

function SynthesisHow() {
  return (
    <SurfaceCard className="swot-how-card">
      <div className="swot-venn"><span /><span /><span /></div>
      <div>
        <h2>How the synthesis works</h2>
        <p>By combining your internal factors with external factors, we identify strategic leverage points and design implications to guide resilient decisions.</p>
      </div>
      <div className="swot-equations">
        <p><b>S</b> + <b>O</b> <ArrowRight aria-hidden="true" /> Maximize opportunities using your strengths</p>
        <p><b>W</b> + <b>T</b> <ArrowRight aria-hidden="true" /> Mitigate threats by addressing weaknesses</p>
      </div>
    </SurfaceCard>
  );
}

function SwotJournalCard() {
  return (
    <SurfaceCard className="swot-panel-card">
      <header>
        <h2><BookOpen aria-hidden="true" /> SWOT Journal <span>Captured insights and field notes</span></h2>
        <Link to="/observe/swot/journal" className="swot-panel-link">View all entries</Link>
      </header>
      <div className="swot-journal-rows">
        {vm.journalPreview.map((row) => (
          <p key={row.title}>
            <span>{row.title}</span>
            <b className={row.category}>{CATEGORY_LABEL[row.category]}</b>
            <time>{row.date}</time>
          </p>
        ))}
      </div>
      <div className="swot-tags">
        {["Soil", "Water", "Climate", "Access", "Community", "+4 more"].map((tag) => <span key={tag}>{tag}</span>)}
      </div>
      <Link to="/observe/swot/journal" className="green-button swot-panel-cta">Open SWOT journal <ArrowRight aria-hidden="true" /></Link>
    </SurfaceCard>
  );
}

function DiagnosisReportCard() {
  const score = Math.round(vm.moduleHealth.dataCompleteness);
  const ratingDots = (n) => "•".repeat(n) + "·".repeat(5 - n);
  return (
    <SurfaceCard className="swot-panel-card diagnosis-card">
      <header>
        <h2><ClipboardList aria-hidden="true" /> Diagnosis Report <span>Summary of site diagnosis and analysis</span></h2>
        <Link to="/observe/swot/diagnosis-report" className="swot-panel-link">View full report</Link>
      </header>
      <section>
        <div>
          <h3>Executive summary</h3>
          <p>351 House has strong intrinsic assets — productive soils, accessible water table, and mature Carolinian cover. Key constraints centre on water storage capacity, access path circulation, and seasonal labour.</p>
        </div>
        <div className="swot-score"><b>{score}%</b><span>Overall Site Resilience Score</span></div>
      </section>
      <div className="diagnosis-lists">
        <p>
          <b>Key findings</b>
          {vm.diagnosticPreview.slice(0, 4).map((f) => (
            <span key={f.title} className={f.category}>{f.title} <em>{ratingDots(f.rating)}</em></span>
          ))}
        </p>
        <p>
          <b>Priority areas</b>
          {vm.designImplications.slice(0, 4).map((it) => <span key={it}>{it}</span>)}
        </p>
      </div>
      <Link to="/observe/swot/diagnosis-report" className="green-button swot-panel-cta">Open diagnosis report <ArrowRight aria-hidden="true" /></Link>
    </SurfaceCard>
  );
}

function DesignImplications() {
  const ICONS = [Leaf, ArrowRight, CloudLightning, Users];
  return (
    <SurfaceCard className="swot-implications-card">
      <h2><Target aria-hidden="true" /> Design implications <span>Recommended next actions</span></h2>
      <section>
        {vm.designImplications.map((title, index) => {
          const Icon = ICONS[index % ICONS.length];
          return (
            <p key={title}>
              <b>{index + 1}</b>
              <span>{title}<small>From your SWOT synthesis.</small></span>
              <Icon aria-hidden="true" />
            </p>
          );
        })}
      </section>
      <button className="green-button" type="button">Create action plan from synthesis <ArrowRight aria-hidden="true" /></button>
      <button type="button">Export synthesis summary</button>
    </SurfaceCard>
  );
}

function SwotHealthStrip() {
  const h = vm.moduleHealth;
  const items = [
    [ShieldCheck,  "Module health",        "Your analysis is strong. Keep refining insights to strengthen your design."],
    [Compass,      "Data completeness",    `${h.dataCompleteness}% — good coverage across all SWOT categories`],
    [Star,         "Insight quality",      `${h.insightQuality}. Well-supported insights with clear observations.`],
    [LinkIcon,     "Synthesis strength",   `${h.synthesisStrength}. Connections between factors and implications still firming up.`],
    [CalendarDays, "Last updated",         `${h.lastUpdated} by Yousef A.`],
    [Leaf,         "Next recommendation",  h.nextRecommendation],
  ];
  return (
    <SurfaceCard className="swot-health-strip">
      {items.map(([Icon, title, text]) => (
        <div key={title}><Icon aria-hidden="true" /><b>{title}</b><span>{text}</span></div>
      ))}
    </SurfaceCard>
  );
}
