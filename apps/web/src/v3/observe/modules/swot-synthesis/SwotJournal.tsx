import { useMemo } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  CloudLightning,
  Download,
  Filter,
  Leaf,
  Lightbulb,
  MoreVertical,
  Plus,
  Search,
  Send,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { SurfaceCard } from '../../_shared/components/index.js';
import { useSwotStore, type SwotEntry } from '../../../../store/swotStore.js';
import { journalMetrics, type MetricItem } from './derivations.js';

const BUCKET_LABELS: Record<SwotEntry['bucket'], string> = {
  S: 'Strengths',
  W: 'Weaknesses',
  O: 'Opportunities',
  T: 'Threats',
};

const METRIC_ICONS: Record<string, LucideIcon> = {
  Strengths:     ShieldCheck,
  Weaknesses:    TriangleAlert,
  Opportunities: Lightbulb,
  Threats:       CloudLightning,
  'Total entries': BookOpen,
};

export default function SwotJournal() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';

  const allEntries = useSwotStore((s) => s.swot);
  const entries = useMemo(
    () => allEntries.filter((e) => e.projectId === id),
    [allEntries, id],
  );

  const metrics = journalMetrics(entries);
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries],
  );

  return (
    <div className="detail-page swot-journal-page">
      <section className="journal-frame">
        <JournalHeader />
        <JournalMetrics metrics={metrics} />
        <section className="journal-layout">
          <div className="journal-main">
            <JournalFilters />
            <EntriesTable entries={sorted} />
          </div>
          <JournalSidebar />
        </section>
      </section>
    </div>
  );
}

function JournalHeader() {
  return (
    <header className="journal-header">
      <div>
        <h1>SWOT journal</h1>
        <p>Capture observations and insights about your site using the SWOT framework.</p>
      </div>
      <nav>
        <button type="button">
          <Download aria-hidden="true" /> Export journal <ChevronDown aria-hidden="true" />
        </button>
        <button type="button">
          <Send aria-hidden="true" /> Send to diagnosis report <ArrowRight aria-hidden="true" />
        </button>
      </nav>
    </header>
  );
}

interface JournalMetricsProps {
  metrics: MetricItem[];
}

function JournalMetrics({ metrics }: JournalMetricsProps) {
  return (
    <section className="journal-metrics">
      {metrics.map(({ label, value, delta }) => {
        const Icon = METRIC_ICONS[label] ?? BookOpen;
        return (
          <SurfaceCard className={`journal-metric ${label.toLowerCase().replace(/\s+/g, '-')}`} key={label}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{delta}</small>
          </SurfaceCard>
        );
      })}
    </section>
  );
}

function JournalFilters() {
  const buttons = [
    'Category      All',
    'Date range      All time',
    'Zone      All zones',
    'Status      All',
  ];
  return (
    <SurfaceCard className="journal-filters">
      <label>
        <Search aria-hidden="true" />
        <input placeholder="Search entries..." />
      </label>
      {buttons.map((item) => (
        <button type="button" key={item}>
          {item}
          <ChevronDown aria-hidden="true" />
        </button>
      ))}
      <button type="button">
        <Filter aria-hidden="true" /> Filters
      </button>
      <button type="button">Clear</button>
    </SurfaceCard>
  );
}

interface EntriesTableProps {
  entries: SwotEntry[];
}

function EntriesTable({ entries }: EntriesTableProps) {
  return (
    <SurfaceCard className="entries-table-card">
      <div className="entries-head">
        <span>Date</span>
        <span>Entry</span>
        <span>Notes</span>
        <span>Category</span>
        <span>Tags</span>
        <span>Zone / Module</span>
        <span>Status</span>
        <span />
      </div>
      {entries.length === 0 ? (
        <p className="empty-note">No journal entries yet — add one from the toolbar above.</p>
      ) : (
        entries.map((e) => {
          const category = BUCKET_LABELS[e.bucket];
          return (
            <div className="entry-row" key={e.id}>
              <time>{new Date(e.createdAt).toLocaleDateString()}</time>
              <b className={category.toLowerCase()}>{e.title}</b>
              <span>{e.body ?? ''}</span>
              <em className={category.toLowerCase()}>{category}</em>
              <p>
                {(e.tags ?? []).map((tag) => (
                  <i key={tag}>{tag}</i>
                ))}
              </p>
              <span>—</span>
              <strong>Logged</strong>
              <MoreVertical aria-hidden="true" />
            </div>
          );
        })
      )}
      <footer>
        <span>
          {entries.length === 0
            ? 'No entries'
            : `Showing 1–${Math.min(entries.length, 50)} of ${entries.length} entries`}
        </span>
        <nav>
          <button type="button">Prev</button>
          <button className="is-active" type="button">1</button>
          <button type="button">Next</button>
        </nav>
      </footer>
    </SurfaceCard>
  );
}

function JournalSidebar() {
  const patterns = [
    'Water is a recurring theme in both opportunities and threats.',
    'Erosion and slope appear in 5 recent weaknesses.',
    'Biodiversity and habitat are strong across multiple zones.',
  ];
  const themes: Array<[string, string]> = [
    ['Water management',      '—'],
    ['Slope & erosion',       '—'],
    ['Biodiversity & habitat','—'],
    ['Access & infrastructure','—'],
    ['Climate variability',   '—'],
  ];
  const followups: Array<[string, string]> = [
    ['Investigate erosion control options', 'High'],
    ['Map seasonal water flows',            'High'],
    ['Assess water storage potential',      'Med'],
    ['Plan wildlife protection strategy',   'Med'],
    ['Explore eco-tourism opportunities',   'Low'],
  ];
  return (
    <aside className="journal-sidebar">
      <SurfaceCard className="journal-side-card">
        <h2>Emerging patterns</h2>
        {patterns.map((item) => (
          <p key={item}>
            <Leaf aria-hidden="true" />
            {item}
          </p>
        ))}
        <button type="button">
          View pattern map <ArrowRight aria-hidden="true" />
        </button>
      </SurfaceCard>
      <SurfaceCard className="journal-side-card themes">
        <h2>Recurring themes</h2>
        {themes.map(([name, count]) => (
          <p key={name}>
            <span>{name}</span>
            <b>{count}</b>
          </p>
        ))}
        <button type="button">
          View all themes <ArrowRight aria-hidden="true" />
        </button>
      </SurfaceCard>
      <SurfaceCard className="journal-side-card followups">
        <h2>Recommended follow-ups</h2>
        {followups.map(([name, priority]) => (
          <p key={name}>
            <span>{name}</span>
            <b>{priority}</b>
          </p>
        ))}
        <button type="button">
          View all follow-ups <ArrowRight aria-hidden="true" />
        </button>
      </SurfaceCard>
    </aside>
  );
}
