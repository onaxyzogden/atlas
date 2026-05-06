import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Flag,
  Leaf,
  MapPin,
  Sprout,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  CroppedArt,
  ProgressRing,
  SurfaceCard,
} from '../../_shared/components/index.js';
import { useDetailNav } from '../../components/ModuleSlideUp.js';
import heroLandscape from '../../assets/human-context-dashboard/hero-landscape.png';
import regionalSnapshot from '../../assets/human-context-dashboard/regional-snapshot.png';

export default function HumanContextDashboard() {
  return (
    <div className="human-context-page">
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
  );
}

function HumanHero() {
  return (
    <SurfaceCard className="human-hero-card">
      <CroppedArt src={heroLandscape} className="human-hero-image" />
      <div className="human-hero-copy">
        <span>Module 1</span>
        <h1>
          Human Context <Sprout aria-hidden="true" />
        </h1>
        <p>
          This module captures who is stewarding the land, the regional and cultural
          context that shapes it, and the long-horizon vision that guides decisions
          across time and generations.
        </p>
      </div>
      <div className="human-hero-metrics">
        <ProgressRing value={78} label="78%" />
        <MetricBlock
          label="Module progress"
          value="Well on your way"
          note="9 of 11 areas captured"
          compact
        />
        <MetricBlock icon={Eye} label="Vision phases" value="3 / 3" note="Captured" />
        <MetricBlock icon={Flag} label="Milestones" value="0" note="Defined" />
        <MetricBlock icon={MapPin} label="Regional context" value="11" note="Captured" />
      </div>
    </SurfaceCard>
  );
}

interface MetricBlockProps {
  icon?: LucideIcon;
  label: string;
  value: string;
  note: string;
  compact?: boolean;
}

function MetricBlock({ icon: Icon, label, value, note, compact = false }: MetricBlockProps) {
  return (
    <div className={compact ? 'human-metric-block compact' : 'human-metric-block'}>
      {Icon ? <Icon aria-hidden="true" /> : null}
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

interface ModuleCardShellProps {
  number: string;
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  action: string;
  tone?: 'green' | 'gold';
  onAction: () => void;
}

function ModuleCardShell({
  number,
  title,
  icon: Icon,
  children,
  action,
  tone = 'green',
  onAction,
}: ModuleCardShellProps) {
  return (
    <SurfaceCard className={`human-module-card ${tone}`}>
      <header>
        <b>{number}</b>
        <h2>{title}</h2>
        {Icon ? <Icon aria-hidden="true" /> : null}
      </header>
      {children}
      <button
        className={tone === 'gold' ? 'gold-button' : 'green-button'}
        type="button"
        onClick={onAction}
      >
        {action} <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function StewardCard() {
  const nav = useDetailNav();
  return (
    <ModuleCardShell
      number="1"
      title="Steward Survey"
      icon={Users}
      action="Open Steward Survey"
      onAction={() => nav.push('steward-survey')}
    >
      <p>Who is stewarding this land and what they bring.</p>
      <div className="steward-summary-grid">
        <div className="mini-profile">
          <span>Steward Profile</span>
          <ProgressRing value={78} label="78%" />
          <p>
            Well on your way
            <br />
            6 of 8 areas filled
          </p>
        </div>
        <div className="mini-profile">
          <span>Steward Archetype</span>
          <Leaf aria-hidden="true" />
          <p>
            Practical Builder
            <br />
            Hands-on, skilled, and ready to implement.
          </p>
        </div>
      </div>
      <div className="capacity-mini">
        <span>Capacity Overview</span>
        <strong>28</strong>
        <small>hrs / week total</small>
        <i>
          <b />
        </i>
      </div>
      <ChipRow
        items={[
          'Active Halton Hills agricultural community',
          'Conservation mindset',
          'Long-term stewardship',
        ]}
      />
      <FooterTabs items={['Profile insights', 'Capacity & resources', 'Local network']} />
    </ModuleCardShell>
  );
}

function RegionalCard() {
  const nav = useDetailNav();
  return (
    <ModuleCardShell
      number="2"
      title="Indigenous & Regional Context"
      icon={Sprout}
      action="Open Indigenous & Regional Context"
      tone="gold"
      onAction={() => nav.push('indigenous-regional-context')}
    >
      <p>Honour the land&apos;s story, culture, and regional systems.</p>
      <div className="regional-summary-grid">
        <CroppedArt src={regionalSnapshot} className="regional-summary-image" />
        <dl>
          {[
            ['Indigenous place-names', '3'],
            ['Cultural challenges', '3'],
            ['Cultural strengths', '3'],
            ['Local contacts', '3'],
            ['Warnings', '2'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <ChipRow
        items={['Land acknowledgement', 'Sacred site care', 'Stewardship partnerships']}
      />
      <FooterTabs
        items={['Place-names', 'Cultural challenges', 'Cultural strengths', 'Local network']}
      />
    </ModuleCardShell>
  );
}

function VisionSummaryCard() {
  const nav = useDetailNav();
  return (
    <ModuleCardShell
      number="3"
      title="Vision Detail"
      icon={Leaf}
      action="Open Vision Detail"
      onAction={() => nav.push('vision')}
    >
      <p>Where we&apos;re going and what success looks like.</p>
      <div className="vision-summary-grid">
        <blockquote>
          A small Carolinian homestead that produces food, hosts learning, and integrates
          daily prayer with regenerative care of land - modest scale, long horizon.
        </blockquote>
        <div>
          {[
            'Food production',
            'Learning & community',
            'Spiritual practice',
            'Regenerative care',
            'Long-term stewardship',
          ].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
      <div className="vision-counts">
        <span>
          <b>6</b>Core Functions
        </span>
        <span>
          <b>5</b>Success Metrics
        </span>
        <span>
          <b>6</b>Moodboard Images
        </span>
      </div>
      <FooterTabs
        items={['Vision concept', 'Success metrics', 'Moodboard', 'Core functions']}
      />
    </ModuleCardShell>
  );
}

interface ChipRowProps {
  items: string[];
}
function ChipRow({ items }: ChipRowProps) {
  return (
    <div className="human-chip-row">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

interface FooterTabsProps {
  items: string[];
}
function FooterTabs({ items }: FooterTabsProps) {
  return (
    <div className="human-footer-tabs">
      {items.map((item) => (
        <button type="button" key={item}>
          {item}
        </button>
      ))}
    </div>
  );
}

function HealthStrip() {
  return (
    <SurfaceCard className="human-health-strip">
      <span>
        <Leaf /> <b>Overall Module Health</b>Strong foundation with clear direction.
      </span>
      <span>
        People &amp; Capacity <b>Strong</b>
      </span>
      <span>
        Place &amp; Culture <b>Strong</b>
      </span>
      <span>
        Vision &amp; Purpose <b>Strong</b>
      </span>
      <span>
        Risks to Address <b>2</b>
      </span>
      <span>
        Last updated
        <br />
        Today, 10:24 AM
      </span>
    </SurfaceCard>
  );
}

function SynthesisPanel() {
  return (
    <SurfaceCard className="human-synthesis-panel">
      <h2>Human Context Synthesis</h2>
      <div className="synthesis-score">
        <ProgressRing value={82} label="82%" />
        <p>
          <b>Context Alignment</b>Strong foundation across people, place, and purpose.
        </p>
      </div>
      <SynthesisSection
        title="Key insights"
        items={[
          'Strong stewardship capacity and clear intention to build a resilient homestead.',
          'Deep local roots and cultural strengths provide a solid foundation.',
          'Long-term vision is coherent and grounded in care for land and people.',
        ]}
      />
      <SynthesisSection
        title="Design implications"
        items={[
          'Leverage community network for shared infrastructure and knowledge.',
          'Address land acknowledgement and sacred site care in early designs.',
          'Plan for water resilience and soil health to support long-term food production.',
          'Build flexible spaces for learning, retreat, and community gatherings.',
        ]}
      />
      <SynthesisSection
        title="Next steps"
        numbered
        items={[
          'Finalize land acknowledgement and cultural consultation.',
          'Co-develop stewardship goals with local partners.',
          'Use vision themes to prioritize design zones and sequences.',
        ]}
      />
      <button className="green-button" type="button">
        View full design implications <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

interface SynthesisSectionProps {
  title: string;
  items: string[];
  numbered?: boolean;
}

function SynthesisSection({ title, items, numbered = false }: SynthesisSectionProps) {
  return (
    <section className="synthesis-section">
      <h3>{title}</h3>
      {items.map((item, index) => (
        <p key={item}>
          {numbered ? <b>{index + 1}</b> : <CheckCircle2 aria-hidden="true" />} {item}
        </p>
      ))}
    </section>
  );
}
