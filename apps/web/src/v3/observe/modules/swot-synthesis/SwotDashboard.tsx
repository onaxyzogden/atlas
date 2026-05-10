import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardList,
  CloudLightning,
  Compass,
  Download,
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
import AnnotationListCard from '../../components/AnnotationListCard.js';
import { useSwotStore, type SwotEntry } from '../../../../store/swotStore.js';
import { swotCounts } from './derivations.js';
import { api } from '../../../../lib/apiClient.js';

const BUCKET_LABELS: Record<SwotEntry['bucket'], string> = {
  S: 'Strength',
  W: 'Weakness',
  O: 'Opportunity',
  T: 'Threat',
};

export default function SwotDashboard() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';

  const allEntries = useSwotStore((s) => s.swot);
  const entries = useMemo(() => allEntries.filter((e) => e.projectId === id), [allEntries, id]);

  const counts = swotCounts(entries);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { data } = await api.exports.generate(id, {
        exportType: 'swot_synthesis',
        payload: { swot: { entries } },
      });
      window.open(data.storageUrl, '_blank');
    } catch (err) {
      console.error('SWOT synthesis export failed', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="detail-page swot-page">
      <section className="swot-content">
        <div className="swot-main">
          <SwotHero />
          <SwotQuadrants counts={counts} />
          <SynthesisHow />
          <section className="swot-middle-grid">
            <SwotJournalCard entries={entries} />
            <DiagnosisReportCard />
          </section>
          <AnnotationListCard
            title="SWOT field tags"
            projectId={id}
            kinds={['swotTag']}
            emptyHint="No SWOT tags pinned to the map yet — drop a strength, weakness, opportunity, or threat with the tools panel."
          />
        </div>
        <DesignImplications onExport={handleExport} exporting={exporting} />
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

interface SwotQuadrantsProps {
  counts: ReturnType<typeof swotCounts>;
}

function SwotQuadrants({ counts }: SwotQuadrantsProps) {
  const cards: Array<[LucideIcon, string, number, string]> = [
    [Leaf,          'Strengths',    counts.S, 'Internal assets and positive factors you can build upon.'],
    [Mountain,      'Weaknesses',   counts.W, 'Internal limitations or gaps that may constrain success.'],
    [Sprout,        'Opportunities',counts.O, 'External conditions and trends that can be leveraged.'],
    [CloudLightning,'Threats',      counts.T, 'External risks or pressures that could impact outcomes.'],
  ];
  return (
    <section className="swot-quadrants">
      {cards.map(([Icon, title, count, note]) => (
        <SurfaceCard className={`swot-quadrant ${title.toLowerCase()}`} key={title}>
          <Icon aria-hidden="true" />
          <span>{title}</span>
          <strong>{count > 0 ? count : '—'}</strong>
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

interface SwotJournalCardProps {
  entries: SwotEntry[];
}

function SwotJournalCard({ entries }: SwotJournalCardProps) {
  const recent = useMemo(
    () => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [entries],
  );
  const tags = ['Soil', 'Water', 'Climate', 'Access', 'Community'];
  return (
    <SurfaceCard className="swot-panel-card">
      <header>
        <h2>
          <BookOpen aria-hidden="true" /> SWOT Journal{' '}
          <span>Captured insights and field notes</span>
        </h2>
      </header>
      <div className="swot-journal-rows">
        {recent.length === 0 ? (
          <p className="empty-note">No entries yet — add one from the journal.</p>
        ) : (
          recent.map((e) => (
            <p key={e.id}>
              <span>{e.title}</span>
              <b>{BUCKET_LABELS[e.bucket]}</b>
              <time>{new Date(e.createdAt).toLocaleDateString()}</time>
            </p>
          ))
        )}
      </div>
      <div className="swot-tags">
        {tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </SurfaceCard>
  );
}

function DiagnosisReportCard() {
  return (
    <SurfaceCard className="swot-panel-card diagnosis-card">
      <header>
        <h2>
          <ClipboardList aria-hidden="true" /> Diagnosis Report{' '}
          <span>Summary of site diagnosis and analysis</span>
        </h2>
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
          <b>—</b>
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
          <span>Improve access &amp; circulation</span>
          <span>Soil conservation &amp; erosion control</span>
          <span>Extend growing season</span>
          <span>Community engagement</span>
        </p>
      </div>
    </SurfaceCard>
  );
}

interface DesignImplicationsProps {
  onExport: () => void;
  exporting: boolean;
}

function DesignImplications({ onExport, exporting }: DesignImplicationsProps) {
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
      <button type="button" onClick={onExport} disabled={exporting}>
        <Download aria-hidden="true" />{' '}
        {exporting ? 'Generating…' : 'Export synthesis summary'}
      </button>
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
    [Compass,     'Data completeness', '—'],
    [Star,        'Insight quality',   '—'],
    [Link,        'Synthesis strength','—'],
    [CalendarDays,'Last updated',      '—'],
    [Leaf,        'Next recommendation','Move to Design to explore solutions aligned with your synthesis.'],
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
