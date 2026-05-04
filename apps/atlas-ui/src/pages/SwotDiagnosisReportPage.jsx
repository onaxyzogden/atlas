import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDot,
  Download,
  Flag,
  Home,
  Layers,
  Leaf,
  MapPin,
  Plus,
  Settings,
  Share2,
  Sprout,
  Target,
  Users,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { QaOverlay, SurfaceCard } from "../components/index.js";
import { screenCatalog } from "../screenCatalog.js";
import { swotSynthesis as vm } from "../data/builtin-sample.js";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";

const metadata = screenCatalog.find((screen) => screen.route === "/observe/swot/diagnosis-report");

export function SwotDiagnosisReportPage() {
  const { project, siteBanner } = useBuiltinProject();
  const meta = project?.metadata ?? {};
  const siteName = siteBanner?.title ?? "351 House";
  const siteAreaHa = meta.siteAreaHa ?? siteBanner?.areaHa;
  return (
    <div className="verdean-shell">
      <VerdeanRail siteName={siteName} siteAreaHa={siteAreaHa} />
      <main className="diagnosis-report-page">
        <ReportTopbar siteName={siteName} />
        <ReportStageBar />
        <section className="diagnosis-report-frame">
          <header className="diagnosis-report-hero">
            <div>
              <h1>Diagnosis report</h1>
              <p>Turning observations into a clear diagnosis to guide design decisions.</p>
            </div>
            <SurfaceCard className="report-generated-card"><CircleDot aria-hidden="true" /><span>Report generated<small>May 12, 2025 - 10:32 AM</small></span></SurfaceCard>
          </header>
          <section className="diagnosis-top-grid">
            <ExecutiveSummary siteName={siteName} meta={meta} />
            <SwotOverview />
            <TopInsights />
          </section>
          <section className="diagnosis-lower-grid">
            <PrioritizedFindings />
            <div className="diagnosis-stack">
              <RiskFlags />
              <EvidenceCard />
            </div>
            <RecommendedReportActions />
          </section>
          <p className="diagnosis-report-quote">A clear diagnosis today leads to a regenerative design tomorrow.</p>
        </section>
      </main>
      {import.meta.env.DEV && metadata ? (
        <QaOverlay reference={metadata.reference} nativeWidth={metadata.viewport.width} nativeHeight={metadata.viewport.height} />
      ) : null}
    </div>
  );
}

function VerdeanRail({ siteName, siteAreaHa }) {
  const process = [["1", "Observe", true], ["2", "Record", true], ["3", "Analyse", true], ["6", "SWOT Synthesis", false]];
  const design = [["7", "Concepts"], ["8", "Design plan"], ["9", "Implementation"]];
  return (
    <aside className="verdean-rail">
      <div className="verdean-logo"><Target aria-hidden="true" /><span>Verdean<br />Design</span></div>
      <button className="verdean-project" type="button"><b>{siteName}</b><span>{siteAreaHa ? `${siteAreaHa} ha` : "Atlas Sample"}</span><ChevronDown aria-hidden="true" /></button>
      <nav className="verdean-main-nav">
        <button type="button"><Home aria-hidden="true" /> Home</button>
        <button type="button"><MapPin aria-hidden="true" /> Site dashboard</button>
      </nav>
      <h2>Design process</h2>
      {process.map(([num, label, done]) => <button className={label === "SWOT Synthesis" ? "is-active" : ""} type="button" key={label}><span>{num}</span>{label}{done ? <Check aria-hidden="true" /> : <i />}</button>)}
      <div className="verdean-subnav"><Link to="/observe/swot/journal">SWOT journal</Link><span className="is-active">Diagnosis report</span></div>
      <h2>Design</h2>
      {design.map(([num, label]) => <button type="button" key={label}><span>{num}</span>{label}</button>)}
      <nav className="verdean-main-nav utility">
        <button type="button"><Layers aria-hidden="true" /> Layers</button>
        <button type="button"><BookOpen aria-hidden="true" /> Resources</button>
        <button type="button"><Users aria-hidden="true" /> Team</button>
        <button type="button"><Settings aria-hidden="true" /> Settings</button>
      </nav>
      <div className="verdean-user"><b>YA</b><span>Yousef A.<small>Steward</small></span></div>
    </aside>
  );
}

function ReportTopbar({ siteName }) {
  return (
    <header className="report-topbar">
      <p>Projects <ArrowRight aria-hidden="true" /> {siteName} <ArrowRight aria-hidden="true" /> Module 6 <ArrowRight aria-hidden="true" /> SWOT Synthesis <ArrowRight aria-hidden="true" /> <b>Diagnosis report</b></p>
      <nav><button type="button"><Download aria-hidden="true" /> Export report</button><button type="button"><Share2 aria-hidden="true" /> Share summary</button><button className="green-button" type="button"><Plus aria-hidden="true" /> Add to design plan</button></nav>
    </header>
  );
}

function ReportStageBar() {
  return (
    <SurfaceCard className="report-stage-bar">
      {["Observe", "Record", "Analyse", "Synthesize", "Integrate"].map((item, index) => <span className={index < 3 ? "is-done" : index === 3 ? "is-active" : ""} key={item}><b>{index < 3 ? <Check aria-hidden="true" /> : index + 1}</b>{item}</span>)}
    </SurfaceCard>
  );
}

function ExecutiveSummary({ siteName, meta }) {
  const facts = [
    `Site area ${meta.siteAreaHa ?? "—"} ha`,
    `Climate ${meta.climateZone ?? "Temperate"}`,
    `Land use ${meta.landUse ?? "Mixed use"}`,
    "Design stage Pre-concept",
  ];
  return (
    <SurfaceCard className="report-card executive-summary">
      <h2><Sprout aria-hidden="true" /> Executive summary</h2>
      <p>{vm.executiveSummary}</p>
      <div className="summary-facts">
        {facts.map((item) => <span key={item}>{item}</span>)}
      </div>
    </SurfaceCard>
  );
}

function SwotOverview() {
  const d = vm.swotDiamond;
  return (
    <SurfaceCard className="report-card report-swot-overview">
      <h2><Leaf aria-hidden="true" /> SWOT overview</h2>
      <div className="radar-wrap">
        <div><b>Strengths</b><span>Strong foundation to build on</span><strong>{d.strengths.toFixed(1)} /10</strong></div>
        <ReportRadar values={d} />
        <div><b>Weaknesses</b><span>Limit performance and resilience</span><strong>{d.weaknesses.toFixed(1)} /10</strong></div>
        <div><b>Opportunities</b><span>High leverage for improvement</span><strong>{d.opportunities.toFixed(1)} /10</strong></div>
        <div><b>Threats</b><span>External risks to monitor</span><strong>{d.threats.toFixed(1)} /10</strong></div>
      </div>
      <p>Scores reflect synthesis of 80 journal entries.</p>
    </SurfaceCard>
  );
}

function ReportRadar({ values }) {
  // Diamond chart: S top, W right, T bottom, O left. Outer ring uses OGDEN's static
  // outer polygon points; inner polygon scales with vm.swotDiamond values.
  const r = 80;
  const cx = 90, cy = 90;
  const sY = cy - (values.strengths / 10) * r;
  const wX = cx + (values.weaknesses / 10) * r;
  const tY = cy + (values.threats / 10) * r;
  const oX = cx - (values.opportunities / 10) * r;
  const innerPoints = `${cx},${sY} ${wX},${cy} ${cx},${tY} ${oX},${cy}`;
  return (
    <svg className="report-radar" viewBox="0 0 180 180" aria-hidden="true">
      <circle cx="90" cy="90" r="20" />
      <circle cx="90" cy="90" r="40" />
      <circle cx="90" cy="90" r="60" />
      <line x1="90" y1="10" x2="90" y2="170" />
      <line x1="10" y1="90" x2="170" y2="90" />
      <polygon points="90,18 165,90 90,154 25,90" />
      <polygon points={innerPoints} />
      <text x="90" y="15">S</text><text x="166" y="94">W</text><text x="90" y="170">T</text><text x="8" y="94">O</text>
    </svg>
  );
}

function TopInsights() {
  return (
    <SurfaceCard className="report-card top-insights">
      <h2><Target aria-hidden="true" /> Top insights</h2>
      {vm.topInsights.map((insight) => {
        const [headline, ...rest] = insight.split("—");
        return (
          <p key={insight}>
            <Leaf aria-hidden="true" />
            <span>{headline.trim()}<small>{rest.length ? rest.join("—").trim() : "Synthesised from SWOT journal."}</small></span>
          </p>
        );
      })}
      <Link to="/observe/swot/journal">See full analysis in the SWOT journal <ArrowRight aria-hidden="true" /></Link>
    </SurfaceCard>
  );
}

function PrioritizedFindings() {
  return (
    <SurfaceCard className="report-card findings-card">
      <h2><Leaf aria-hidden="true" /> Prioritized findings</h2>
      <header><span /> <span>Impact</span><span>Certainty</span></header>
      {vm.provisionalFindings.map((row) => (
        <p key={row.title}>
          <Leaf aria-hidden="true" />
          <span>{row.title}<small>From SWOT synthesis — category: {row.category}.</small></span>
          <b>{"•".repeat(Math.max(0, Math.min(5, row.rating))) + "·".repeat(5 - Math.max(0, Math.min(5, row.rating)))}</b>
          <b>{"•".repeat(Math.min(5, row.rating + 1)) + "·".repeat(5 - Math.min(5, row.rating + 1))}</b>
          <ArrowRight aria-hidden="true" />
        </p>
      ))}
      <Link to="/observe/swot/journal">View all findings in SWOT journal <ArrowRight aria-hidden="true" /></Link>
    </SurfaceCard>
  );
}

function RiskFlags() {
  return (
    <SurfaceCard className="report-card risk-flags-report">
      <h2><Flag aria-hidden="true" /> Risk flags</h2>
      {vm.riskFlags.map((row) => (
        <p key={row.title}>
          <b>{row.level.charAt(0).toUpperCase() + row.level.slice(1)}</b>
          {row.title}
        </p>
      ))}
      <button type="button">View mitigation ideas in design plan <ArrowRight aria-hidden="true" /></button>
    </SurfaceCard>
  );
}

function EvidenceCard() {
  return (
    <SurfaceCard className="report-card evidence-card">
      <h2><BookOpen aria-hidden="true" /> Evidence from SWOT journal</h2>
      {vm.evidenceFromJournal.map((row, index) => (
        <p key={row.title}>
          <time>{row.date}</time>
          {row.title}
          <b>{row.category[0].toUpperCase()} {index + 1}</b>
        </p>
      ))}
      <Link to="/observe/swot/journal">Open SWOT journal <ArrowRight aria-hidden="true" /></Link>
    </SurfaceCard>
  );
}

function RecommendedReportActions() {
  return (
    <SurfaceCard className="report-card report-actions-card">
      <h2><CalendarDays aria-hidden="true" /> Recommended actions</h2>
      <header><span>Action</span><span>Priority</span><span>Due</span></header>
      {vm.recommendedActions.map((row) => (
        <p key={row.title}>
          <Check aria-hidden="true" />
          <span>{row.title}</span>
          <b>{row.priority}</b>
          <time>{row.due}</time>
        </p>
      ))}
      <button type="button">Add actions to design plan <ArrowRight aria-hidden="true" /></button>
    </SurfaceCard>
  );
}
