import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  CircleHelp,
  CloudLightning,
  Download,
  Eye,
  Filter,
  Grid2X2,
  Home,
  Layers,
  Leaf,
  Lightbulb,
  MoreVertical,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sun,
  TriangleAlert,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { QaOverlay, SurfaceCard } from "../components/index.js";
import { screenCatalog } from "../screenCatalog.js";
import { swotJournal as vm } from "../data/builtin-sample.js";

const metadata = screenCatalog.find((screen) => screen.route === "/observe/swot/journal");

const KPI_ICON = {
  STRENGTHS: ShieldCheck,
  WEAKNESSES: TriangleAlert,
  OPPORTUNITIES: Lightbulb,
  THREATS: CloudLightning,
  "TOTAL ENTRIES": BookOpen,
};

const KPI_LABEL_DISPLAY = {
  STRENGTHS: "Strengths",
  WEAKNESSES: "Weaknesses",
  OPPORTUNITIES: "Opportunities",
  THREATS: "Threats",
  "TOTAL ENTRIES": "Total entries",
};

const CATEGORY_LABEL = {
  strength: "Strengths",
  weakness: "Weaknesses",
  opportunity: "Opportunities",
  threat: "Threats",
};

const STATUS_FOR_IMPACT = {
  High: "High priority",
  Med: "Logged",
  Low: "Review",
};

export function SwotJournalPage() {
  return (
    <div className="terralens-shell">
      <TerraLensRail />
      <main className="swot-journal-page">
        <JournalTopProcess />
        <section className="journal-frame">
          <JournalHeader />
          <JournalMetrics />
          <section className="journal-layout">
            <div className="journal-main">
              <JournalFilters />
              <EntriesTable />
            </div>
            <JournalSidebar />
          </section>
        </section>
      </main>
      {import.meta.env.DEV && metadata ? (
        <QaOverlay reference={metadata.reference} nativeWidth={metadata.viewport.width} nativeHeight={metadata.viewport.height} />
      ) : null}
    </div>
  );
}

function TerraLensRail() {
  const nav = [[Home, "Dashboard"], [Grid2X2, "Site & Context"], [Layers, "Zones & Sectors"], [Eye, "Observations"], [BookOpen, "SWOT journal"], [BarChart3, "Analysis"], [Lightbulb, "Vision"], [Grid2X2, "Design"], [BookOpen, "Plans"], [Sun, "Implementation"], [Settings, "Monitoring"]];
  return (
    <aside className="terralens-rail">
      <div className="terralens-logo"><Sun aria-hidden="true" /><span>Terralens<small>Permaculture Design</small></span></div>
      <button className="terralens-project" type="button"><span>Project</span><b>351 House</b><ChevronDown aria-hidden="true" /></button>
      <nav>{nav.map(([Icon, label]) => <button className={label === "SWOT journal" ? "is-active" : ""} type="button" key={label}><Icon aria-hidden="true" />{label}</button>)}</nav>
      <div className="terralens-utility"><button type="button"><BookOpen aria-hidden="true" />Resources</button><button type="button"><Settings aria-hidden="true" />Settings</button></div>
      <button className="terralens-collapse" type="button"><CircleHelp aria-hidden="true" /> Collapse</button>
    </aside>
  );
}

function JournalTopProcess() {
  return (
    <header className="journal-process">
      <span>Design process</span>
      {["Brief", "Site Analysis", "Visioning", "Design", "Planning", "Implementation", "Monitoring"].map((item, index) => <p className={index === 5 ? "is-active" : ""} key={item}><b>{index + 1}</b>{item}</p>)}
      <Sun aria-hidden="true" /><Bell aria-hidden="true" /><div className="journal-avatar" />
    </header>
  );
}

function JournalHeader() {
  return (
    <header className="journal-header">
      <div><h1>SWOT journal</h1><p>Capture observations and insights about the 351 House sample using the SWOT framework. <button type="button">Learn more <ArrowRight aria-hidden="true" /></button></p></div>
      <nav><button className="green-button" type="button"><Plus aria-hidden="true" /> Add journal entry</button><button type="button"><Download aria-hidden="true" /> Export journal <ChevronDown aria-hidden="true" /></button><Link to="/observe/swot/diagnosis-report"><Send aria-hidden="true" /> Send to diagnosis report <ArrowRight aria-hidden="true" /></Link></nav>
    </header>
  );
}

function JournalMetrics() {
  return <section className="journal-metrics">{vm.kpis.map((k) => {
    const Icon = KPI_ICON[k.label] ?? ShieldCheck;
    const display = KPI_LABEL_DISPLAY[k.label] ?? k.label;
    return <SurfaceCard className={`journal-metric ${display.toLowerCase().split(" ")[0]}`} key={k.label}><Icon aria-hidden="true" /><span>{display}</span><strong>{k.value}</strong><small>{k.sub}</small></SurfaceCard>;
  })}</section>;
}

function JournalFilters() {
  return (
    <SurfaceCard className="journal-filters">
      <label><Search aria-hidden="true" /><input placeholder="Search entries..." /></label>
      {["Category      All", "Date range      All time", "Zone      All zones", "Status      All"].map((item) => <button type="button" key={item}>{item}<ChevronDown aria-hidden="true" /></button>)}
      <button type="button"><Filter aria-hidden="true" /> Filters</button>
      <button type="button">Clear</button>
    </SurfaceCard>
  );
}

function EntriesTable() {
  return (
    <SurfaceCard className="entries-table-card">
      <div className="entries-head"><span>Date</span><span>Entry</span><span>Notes</span><span>Category</span><span>Tags</span><span>Zone / Module</span><span>Status</span><span /></div>
      {vm.entries.map((e) => {
        const category = CATEGORY_LABEL[e.category];
        const tags = [e.location.toLowerCase().split(" ")[0], e.category, "+1"];
        const status = STATUS_FOR_IMPACT[e.impact] ?? "Logged";
        return (
          <div className="entry-row" key={e.title}>
            <time>{`${e.date}, 2026\n10:42 AM`}</time>
            <b className={e.category}>{e.title}</b>
            <span>{e.description}</span>
            <em className={e.category}>{category}</em>
            <p>{tags.map((tag) => <i key={tag}>{tag}</i>)}</p>
            <span>{`Zone ${e.zone}\n${e.location}`}</span>
            <strong>{status}</strong>
            <MoreVertical aria-hidden="true" />
          </div>
        );
      })}
      <footer><span>Showing 1-{vm.entries.length} of 80 entries</span><nav><button type="button">Prev</button><button className="is-active" type="button">1</button><button type="button">2</button><button type="button">3</button><button type="button">...</button><button type="button">10</button><button type="button">Next</button></nav></footer>
    </SurfaceCard>
  );
}

function JournalSidebar() {
  const followups = [
    ["Investigate water storage options", "High"],
    ["Schedule buckthorn removal crew", "High"],
    ["Document soil test sample locations", "Med"],
    ["Map seasonal frost pocket boundary", "Med"],
    ["Explore CSA partnership scope", "Low"],
  ];
  return (
    <aside className="journal-sidebar">
      <SurfaceCard className="journal-side-card">
        <h2>Emerging patterns</h2>
        {vm.featuredItems.map((item) => <p key={item.title}><Leaf aria-hidden="true" />{item.title}</p>)}
        <p><Leaf aria-hidden="true" />Water-related entries appear in both opportunities and threats — a recurring leverage axis.</p>
        <button type="button">View pattern map <ArrowRight aria-hidden="true" /></button>
      </SurfaceCard>
      <SurfaceCard className="journal-side-card themes">
        <h2>Recurring themes</h2>
        {vm.recurringThemes.map((name, i) => <p key={name}><span>{name}</span><b>{18 - i * 2}</b></p>)}
        <button type="button">View all themes <ArrowRight aria-hidden="true" /></button>
      </SurfaceCard>
      <SurfaceCard className="journal-side-card followups">
        <h2>Recommended follow-ups</h2>
        {followups.map(([name, priority]) => <p key={name}><span>{name}</span><b>{priority}</b></p>)}
        <button type="button">View all follow-ups <ArrowRight aria-hidden="true" /></button>
      </SurfaceCard>
    </aside>
  );
}
