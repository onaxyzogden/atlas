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
import { SurfaceCard } from '../../_shared/components/index.js';

type Entry = [string, string, string, string, string[], string, string];

const entries: Entry[] = [
  [
    'May 18, 2025\n10:42 AM',
    'Mature trees provide strong shade & habitat',
    'Large established canopy on north slope. Supports birds and beneficial...',
    'Strengths',
    ['trees', 'habitat', '+2'],
    'Zone 2\nWater access',
    'Logged',
  ],
  [
    'May 17, 2025\n4:15 PM',
    'Steep slope causes erosion in heavy rain',
    'Bare patches near access track. Sediment flows into swale.',
    'Weaknesses',
    ['erosion', 'soil', '+1'],
    'Zone 3\nUpper slope',
    'Review',
  ],
  [
    'May 16, 2025\n9:08 AM',
    'Opportunity to expand food forest downslope',
    'Underutilized area with good sun and existing water catchment.',
    'Opportunities',
    ['food forest', 'water', '+1'],
    'Zone 1\nLower valley',
    'Logged',
  ],
  [
    'May 15, 2025\n2:33 PM',
    'Long dry season increasing water stress',
    'Rainfall pattern variability noted over past 5 years.',
    'Threats',
    ['climate', 'drought', '+1'],
    'Whole site\nClimate',
    'High priority',
  ],
  [
    'May 14, 2025\n11:20 AM',
    'Diverse understory supports ecosystem',
    'Native shrubs and groundcovers abundant in shaded areas.',
    'Strengths',
    ['biodiversity', 'native', '+1'],
    'Zone 2\nWoodland edge',
    'Logged',
  ],
  [
    'May 13, 2025\n3:47 PM',
    'Limited flat space for building',
    'Most areas are sloped. Earthworks will be needed.',
    'Weaknesses',
    ['slope', 'infrastructure'],
    'Zone 4\nBuilding area',
    'Review',
  ],
  [
    'May 12, 2025\n8:55 AM',
    'Potential for eco-tourism and education',
    'Scenic views and existing trails attract visitors.',
    'Opportunities',
    ['tourism', 'education', '+1'],
    'Zone 5\nAccess & entry',
    'Logged',
  ],
  [
    'May 11, 2025\n6:12 PM',
    'Pest pressure on young fruit trees',
    'Possums and birds damaging new plantings.',
    'Threats',
    ['pests', 'wildlife', '+1'],
    'Zone 1\nOrchard',
    'High priority',
  ],
];

export default function SwotJournal() {
  return (
    <div className="detail-page swot-journal-page">
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
    </div>
  );
}

function JournalHeader() {
  return (
    <header className="journal-header">
      <div>
        <h1>SWOT journal</h1>
        <p>
          Capture observations and insights about your site using the SWOT framework.{' '}
          <button type="button">
            Learn more <ArrowRight aria-hidden="true" />
          </button>
        </p>
      </div>
      <nav>
        <button className="green-button" type="button">
          <Plus aria-hidden="true" /> Add journal entry
        </button>
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

function JournalMetrics() {
  const metrics: Array<[LucideIcon, string, string, string]> = [
    [ShieldCheck, 'Strengths', '24', '3 new'],
    [TriangleAlert, 'Weaknesses', '18', '2 new'],
    [Lightbulb, 'Opportunities', '22', '4 new'],
    [CloudLightning, 'Threats', '16', '1 new'],
    [BookOpen, 'Total entries', '80', 'This project'],
  ];
  return (
    <section className="journal-metrics">
      {metrics.map(([Icon, label, value, delta]) => (
        <SurfaceCard className={`journal-metric ${label.toLowerCase()}`} key={label}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{delta}</small>
        </SurfaceCard>
      ))}
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

function EntriesTable() {
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
      {entries.map(([date, entry, notes, category, tags, zone, status]) => (
        <div className="entry-row" key={entry}>
          <time>{date}</time>
          <b className={category.toLowerCase()}>{entry}</b>
          <span>{notes}</span>
          <em className={category.toLowerCase()}>{category}</em>
          <p>
            {tags.map((tag) => (
              <i key={tag}>{tag}</i>
            ))}
          </p>
          <span>{zone}</span>
          <strong>{status}</strong>
          <MoreVertical aria-hidden="true" />
        </div>
      ))}
      <footer>
        <span>Showing 1-8 of 80 entries</span>
        <nav>
          <button type="button">Prev</button>
          <button className="is-active" type="button">
            1
          </button>
          <button type="button">2</button>
          <button type="button">3</button>
          <button type="button">...</button>
          <button type="button">10</button>
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
    ['Water management', '18'],
    ['Slope & erosion', '12'],
    ['Biodiversity & habitat', '11'],
    ['Access & infrastructure', '9'],
    ['Climate variability', '8'],
  ];
  const followups: Array<[string, string]> = [
    ['Investigate erosion control options', 'High'],
    ['Map seasonal water flows', 'High'],
    ['Assess water storage potential', 'Med'],
    ['Plan wildlife protection strategy', 'Med'],
    ['Explore eco-tourism opportunities', 'Low'],
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
