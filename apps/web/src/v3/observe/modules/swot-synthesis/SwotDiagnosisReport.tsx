import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CircleDot,
  Download,
  Flag,
  Leaf,
  Plus,
  Share2,
  Sprout,
  Target,
} from 'lucide-react';
import { SurfaceCard } from '../../_shared/components/index.js';

export default function SwotDiagnosisReport() {
  return (
    <div className="detail-page diagnosis-report-page">
      <ReportTopbar />
      <ReportStageBar />
      <section className="diagnosis-report-frame">
        <header className="diagnosis-report-hero">
          <div>
            <h1>Diagnosis report</h1>
            <p>Turning observations into a clear diagnosis to guide design decisions.</p>
          </div>
          <SurfaceCard className="report-generated-card">
            <CircleDot aria-hidden="true" />
            <span>
              Report generated<small>May 12, 2025 - 10:32 AM</small>
            </span>
          </SurfaceCard>
        </header>
        <section className="diagnosis-top-grid">
          <ExecutiveSummary />
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
        <p className="diagnosis-report-quote">
          A clear diagnosis today leads to a regenerative design tomorrow.
        </p>
      </section>
    </div>
  );
}

function ReportTopbar() {
  return (
    <header className="report-topbar">
      <p>
        Module 6 <ArrowRight aria-hidden="true" /> SWOT Synthesis{' '}
        <ArrowRight aria-hidden="true" /> <b>Diagnosis report</b>
      </p>
      <nav>
        <button type="button">
          <Download aria-hidden="true" /> Export report
        </button>
        <button type="button">
          <Share2 aria-hidden="true" /> Share summary
        </button>
        <button className="green-button" type="button">
          <Plus aria-hidden="true" /> Add to design plan
        </button>
      </nav>
    </header>
  );
}

function ReportStageBar() {
  const stages = ['Observe', 'Record', 'Analyse', 'Synthesize', 'Integrate'];
  return (
    <SurfaceCard className="report-stage-bar">
      {stages.map((item, index) => (
        <span
          className={index < 3 ? 'is-done' : index === 3 ? 'is-active' : ''}
          key={item}
        >
          <b>{index < 3 ? <Check aria-hidden="true" /> : index + 1}</b>
          {item}
        </span>
      ))}
    </SurfaceCard>
  );
}

function ExecutiveSummary() {
  const facts = ['Site area 42.6 ha', 'Climate Temperate', 'Land use Mixed use', 'Design stage Pre-concept'];
  return (
    <SurfaceCard className="report-card executive-summary">
      <h2>
        <Sprout aria-hidden="true" /> Executive summary
      </h2>
      <p>
        Riverbend Land has strong natural assets and stewardship potential, with key opportunities
        to improve water resilience, soil function, and access layout. Addressing erosion risk and
        invasive pressure will unlock long-term productivity and ecological stability.
      </p>
      <div className="summary-facts">
        {facts.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </SurfaceCard>
  );
}

function SwotOverview() {
  return (
    <SurfaceCard className="report-card report-swot-overview">
      <h2>
        <Leaf aria-hidden="true" /> SWOT overview
      </h2>
      <div className="radar-wrap">
        <div>
          <b>Strengths</b>
          <span>Strong foundation to build on</span>
          <strong>7.6 /10</strong>
        </div>
        <ReportRadar />
        <div>
          <b>Weaknesses</b>
          <span>Limit performance and resilience</span>
          <strong>5.4 /10</strong>
        </div>
        <div>
          <b>Opportunities</b>
          <span>High leverage for improvement</span>
          <strong>8.1 /10</strong>
        </div>
        <div>
          <b>Threats</b>
          <span>External risks to monitor</span>
          <strong>4.8 /10</strong>
        </div>
      </div>
      <p>Scores reflect synthesis of 63 journal entries.</p>
    </SurfaceCard>
  );
}

function ReportRadar() {
  return (
    <svg className="report-radar" viewBox="0 0 180 180" aria-hidden="true">
      <circle cx="90" cy="90" r="20" />
      <circle cx="90" cy="90" r="40" />
      <circle cx="90" cy="90" r="60" />
      <line x1="90" y1="10" x2="90" y2="170" />
      <line x1="10" y1="90" x2="170" y2="90" />
      <polygon points="90,18 165,90 90,154 25,90" />
      <polygon points="90,28 150,90 90,143 38,90" />
      <text x="90" y="15">S</text>
      <text x="166" y="94">W</text>
      <text x="90" y="170">T</text>
      <text x="8" y="94">O</text>
    </svg>
  );
}

function TopInsights() {
  const rows: Array<[string, string]> = [
    [
      'Water is the organizing factor.',
      'Seasonal flows and infiltration opportunities shape most design decisions.',
    ],
    [
      'Soil biological activity is a key leverage.',
      'Build soil organic matter to unlock water holding capacity and fertility.',
    ],
    [
      'Access needs rethinking.',
      'Current circulation creates erosion risk and inefficient movement.',
    ],
  ];
  return (
    <SurfaceCard className="report-card top-insights">
      <h2>
        <Target aria-hidden="true" /> Top insights
      </h2>
      {rows.map(([title, text]) => (
        <p key={title}>
          <Leaf aria-hidden="true" />
          <span>
            {title}
            <small>{text}</small>
          </span>
        </p>
      ))}
      <button type="button">
        See full analysis in the SWOT journal <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function PrioritizedFindings() {
  const rows = [
    'Water resilience',
    'Soil health',
    'Access & circulation',
    'Biodiversity',
    'Stewardship capacity',
  ];
  return (
    <SurfaceCard className="report-card findings-card">
      <h2>
        <Leaf aria-hidden="true" /> Prioritized findings
      </h2>
      <header>
        <span /> <span>Impact</span>
        <span>Certainty</span>
      </header>
      {rows.map((row) => (
        <p key={row}>
          <Leaf aria-hidden="true" />
          <span>
            {row}
            <small>
              {row === 'Access & circulation'
                ? 'Access is limited; internal routes cause erosion.'
                : 'Strong potential with targeted improvement.'}
            </small>
          </span>
          <b>•••••</b>
          <b>•••••</b>
          <ArrowRight aria-hidden="true" />
        </p>
      ))}
      <button type="button">
        View all findings in SWOT journal <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function RiskFlags() {
  const rows: Array<[string, string]> = [
    ['High', 'Erosion risk on north-facing slopes'],
    ['High', 'Overland flow damaging access track'],
    ['Medium', 'Invasive species along waterways'],
    ['Medium', 'Limited dry-season water availability'],
    ['Low', 'Wildfire exposure (low site risk)'],
  ];
  return (
    <SurfaceCard className="report-card risk-flags-report">
      <h2>
        <Flag aria-hidden="true" /> Risk flags
      </h2>
      {rows.map(([level, text]) => (
        <p key={text}>
          <b>{level}</b>
          {text}
        </p>
      ))}
      <button type="button">
        View mitigation ideas in design plan <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function EvidenceCard() {
  const items = [
    'Water flows & erosion on lower slope',
    'Soil tests - low OM in Zone 2',
    'Access mapping & constraints',
  ];
  return (
    <SurfaceCard className="report-card evidence-card">
      <h2>
        <BookOpen aria-hidden="true" /> Evidence from SWOT journal
      </h2>
      {items.map((item, index) => (
        <p key={item}>
          <time>May {10 - index * 2}</time>
          {item}
          <b>W {index + 1}</b>
        </p>
      ))}
      <button type="button">
        Open SWOT journal <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function RecommendedReportActions() {
  const rows: Array<[string, string, string]> = [
    ['Establish keyline swales on contour in upper slopes', 'High', 'Jun 15'],
    ['Implement cover cropping + compost program in priority zones', 'High', 'Jun 30'],
    ['Reroute main access to ridge alignment and stabilize track', 'Medium', 'Jul 15'],
    ['Remove priority invasive species along waterways', 'Medium', 'Aug 01'],
    ['Install monitoring for soil moisture + rainfall', 'Low', 'Aug 15'],
  ];
  return (
    <SurfaceCard className="report-card report-actions-card">
      <h2>
        <CalendarDays aria-hidden="true" /> Recommended actions
      </h2>
      <header>
        <span>Action</span>
        <span>Priority</span>
        <span>Due</span>
      </header>
      {rows.map(([title, priority, due]) => (
        <p key={title}>
          <Check aria-hidden="true" />
          <span>{title}</span>
          <b>{priority}</b>
          <time>{due}</time>
        </p>
      ))}
      <button type="button">
        Add actions to design plan <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}
