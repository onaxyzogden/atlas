import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardList,
  CloudLightning,
  Compass,
  Leaf,
  Link,
  Mountain,
  ShieldCheck,
  Sprout,
  Star,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { SurfaceCard } from '../../_shared/components/index.js';
import { useDetailNav } from '../../components/ModuleSlideUp.js';
import AnnotationListCard from '../../components/AnnotationListCard.js';

export default function SwotDashboard() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  return (
    <div className="detail-page swot-page">
      <section className="swot-content">
        <div className="swot-main">
          <SwotHero />
          <SwotQuadrants />
          <SynthesisHow />
          <section className="swot-middle-grid">
            <SwotJournalCard />
            <DiagnosisReportCard />
          </section>
          <AnnotationListCard
            title="SWOT field tags"
            projectId={projectId ?? null}
            kinds={['swotTag']}
            emptyHint="No SWOT tags pinned to the map yet — drop a strength, weakness, opportunity, or threat with the tools panel."
          />
        </div>
        <DesignImplications />
      </section>
      <SwotHealthStrip />
    </div>
  );
}

function SwotHero() {
  return (
    <header className="swot-hero">
      <h1>SWOT Synthesis</h1>
      <i />
      <p>
        Synthesize insights from your journal and diagnosis to reveal strategic leverage points and
        inform robust, regenerative design decisions.
      </p>
    </header>
  );
}

function SwotQuadrants() {
  const cards: Array<[LucideIcon, string, string, string]> = [
    [Leaf, 'Strengths', '12', 'Internal assets and positive factors you can build upon.'],
    [Mountain, 'Weaknesses', '8', 'Internal limitations or gaps that may constrain success.'],
    [Sprout, 'Opportunities', '10', 'External conditions and trends that can be leveraged.'],
    [CloudLightning, 'Threats', '7', 'External risks or pressures that could impact outcomes.'],
  ];
  return (
    <section className="swot-quadrants">
      {cards.map(([Icon, title, count, note]) => (
        <SurfaceCard className={`swot-quadrant ${title.toLowerCase()}`} key={title}>
          <Icon aria-hidden="true" />
          <span>{title}</span>
          <strong>{count}</strong>
          <p>{note}</p>
          <ArrowRight aria-hidden="true" />
        </SurfaceCard>
      ))}
    </section>
  );
}

function SynthesisHow() {
  return (
    <SurfaceCard className="swot-how-card">
      <div className="swot-venn">
        <span />
        <span />
        <span />
      </div>
      <div>
        <h2>How the synthesis works</h2>
        <p>
          By combining your internal factors with external factors, we identify strategic leverage
          points and design implications to guide resilient decisions.
        </p>
      </div>
      <div className="swot-equations">
        <p>
          <b>S</b> + <b>O</b> <ArrowRight aria-hidden="true" /> Maximize opportunities using your
          strengths
        </p>
        <p>
          <b>W</b> + <b>T</b> <ArrowRight aria-hidden="true" /> Mitigate threats by addressing
          weaknesses
        </p>
      </div>
    </SurfaceCard>
  );
}

function SwotJournalCard() {
  const nav = useDetailNav();
  const rows: Array<[string, string, string]> = [
    ['Rich soil in lower terrace', 'Strength', 'May 12, 2024'],
    ['Steep slope limits access', 'Weakness', 'May 10, 2024'],
    ['Increasing demand for local produce', 'Opportunity', 'May 9, 2024'],
    ['Late spring frost risk', 'Threat', 'May 8, 2024'],
    ['Strong community interest in workshops', 'Strength', 'May 7, 2024'],
  ];
  const tags = ['Soil', 'Water', 'Climate', 'Access', 'Community', '+4 more'];
  return (
    <SurfaceCard className="swot-panel-card">
      <header>
        <h2>
          <BookOpen aria-hidden="true" /> SWOT Journal{' '}
          <span>Captured insights and field notes</span>
        </h2>
        <button type="button" onClick={() => nav.push('journal')}>
          View all entries
        </button>
      </header>
      <div className="swot-journal-rows">
        {rows.map(([text, tag, date]) => (
          <p key={text}>
            <span>{text}</span>
            <b>{tag}</b>
            <time>{date}</time>
          </p>
        ))}
      </div>
      <div className="swot-tags">
        {tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <button className="green-button" type="button" onClick={() => nav.push('journal')}>
        Open SWOT journal <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function DiagnosisReportCard() {
  const nav = useDetailNav();
  return (
    <SurfaceCard className="swot-panel-card diagnosis-card">
      <header>
        <h2>
          <ClipboardList aria-hidden="true" /> Diagnosis Report{' '}
          <span>Summary of site diagnosis and analysis</span>
        </h2>
        <button type="button" onClick={() => nav.push('diagnosis-report')}>
          View full report
        </button>
      </header>
      <section>
        <div>
          <h3>Executive summary</h3>
          <p>
            The site has strong intrinsic assets, particularly in soil fertility, water resources,
            and community support. Key constraints include access, erosion risk, and climate
            variability.
          </p>
        </div>
        <div className="swot-score">
          <b>72%</b>
          <span>Overall Site Resilience Score</span>
        </div>
      </section>
      <div className="diagnosis-lists">
        <p>
          <b>Key findings</b>
          <span>High soil potential and biodiversity</span>
          <span>Reliable water source on site</span>
          <span>Erosion risk on exposed slopes</span>
          <span>Limited vehicle access in wet season</span>
        </p>
        <p>
          <b>Priority areas</b>
          <span>Improve access & circulation</span>
          <span>Soil conservation & erosion control</span>
          <span>Extend growing season</span>
          <span>Community engagement</span>
        </p>
      </div>
      <button
        className="green-button"
        type="button"
        onClick={() => nav.push('diagnosis-report')}
      >
        Open diagnosis report <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function DesignImplications() {
  const priorities: Array<[string, string, LucideIcon]> = [
    [
      'Leverage soil fertility & water',
      'Design gardens and systems that maximize productive capacity while conserving water.',
      Leaf,
    ],
    [
      'Address access constraints',
      'Improve year-round access for people, materials, and maintenance with low-impact solutions.',
      ArrowRight,
    ],
    [
      'Build resilience to climate risks',
      'Incorporate frost protection, diversity, and microclimate design to increase system resilience.',
      CloudLightning,
    ],
    [
      'Engage & co-create with community',
      'Strengthen local partnerships and share knowledge to support long-term stewardship.',
      Users,
    ],
  ];
  return (
    <SurfaceCard className="swot-implications-card">
      <h2>
        <Target aria-hidden="true" /> Design implications{' '}
        <span>Recommended next actions</span>
      </h2>
      <section>
        {priorities.map(([title, text, Icon], index) => (
          <p key={title}>
            <b>{index + 1}</b>
            <span>
              {title}
              <small>{text}</small>
            </span>
            <Icon aria-hidden="true" />
          </p>
        ))}
      </section>
      <button className="green-button" type="button">
        Create action plan from synthesis <ArrowRight aria-hidden="true" />
      </button>
      <button type="button">Export synthesis summary</button>
    </SurfaceCard>
  );
}

function SwotHealthStrip() {
  const items: Array<[LucideIcon, string, string]> = [
    [
      ShieldCheck,
      'Module health',
      'Your analysis is strong. Keep refining insights to strengthen your design.',
    ],
    [Compass, 'Data completeness', '78% Good coverage across all SWOT categories'],
    [Star, 'Insight quality', 'High. Well-supported insights with clear observations.'],
    [Link, 'Synthesis strength', 'Strong. Clear connections between factors and implications.'],
    [CalendarDays, 'Last updated', 'May 15, 2024 by Daniel W. 2:34 PM'],
    [Leaf, 'Next recommendation', 'Move to Design to explore solutions aligned with your synthesis.'],
  ];
  return (
    <SurfaceCard className="swot-health-strip">
      {items.map(([Icon, title, text]) => (
        <div key={title}>
          <Icon aria-hidden="true" />
          <b>{title}</b>
          <span>{text}</span>
        </div>
      ))}
    </SurfaceCard>
  );
}
