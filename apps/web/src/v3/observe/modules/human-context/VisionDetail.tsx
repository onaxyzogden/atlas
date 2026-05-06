import {
  ArrowRight,
  CheckCircle2,
  Droplet,
  Edit3,
  Heart,
  Home,
  Leaf,
  Sprout,
  Sun,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { ChipList, CroppedArt, SurfaceCard } from '../../_shared/components/index.js';
import conceptLandscape from '../../assets/vision/concept-landscape.png';
import moodboardGrid from '../../assets/vision/moodboard-grid.png';

void Home; // reserved for future expansion (matches reference imports)

export default function VisionDetail() {
  return (
    <div className="detail-page vision-page">
      <section className="vision-top-grid">
        <VisionIntro />
        <ConceptPanel />
        <QuotePanel />
      </section>
      <section className="vision-middle-grid">
        <CoreFunctions />
        <ExperienceGoals />
        <AspirationPanel />
        <SuccessPanel />
      </section>
      <section className="vision-bottom-grid">
        <ListPanel
          title="Design principles"
          items={[
            ['Observe & interact', 'Work with nature and local conditions.'],
            ['Catch & store energy', 'Capture sunlight, water, and nutrients.'],
            ['Obtain a yield', 'Produce food, learning, and community.'],
            ['Apply self-regulation', 'Use feedback and adaptive management.'],
            ['Use & value diversity', 'Plant, people, and systems diversity.'],
            ['Produce no waste', 'Cycle resources and close the loop.'],
          ]}
        />
        <ListPanel
          title="Guiding values"
          items={[
            ['Faith', 'Daily prayer and reliance on God.'],
            ['Stewardship', 'Care for creation with gratitude.'],
            ['Hospitality', 'Welcome others with generosity.'],
            ['Simplicity', 'Live simply, focus on what matters.'],
            ['Perseverance', 'Stay faithful for the long horizon.'],
          ]}
        />
        <ListPanel
          title="Key constraints"
          tone="warning"
          items={[
            ['Modest budget', 'Phased investments and low-cost solutions.'],
            ['Labour capacity', 'Mostly part-time, family-supported.'],
            ['Climate variability', 'Droughts, heavy rain, and cold winters.'],
            ['Regulatory requirements', 'Permits, setbacks, and stewardship rules.'],
            ['Scale', 'Small homestead; limited mechanization.'],
          ]}
        />
        <MoodboardPanel />
      </section>
      <footer className="vision-proverb">
        <Sprout aria-hidden="true" />
        <span>
          We don&apos;t inherit the land from our ancestors; we borrow it from our children.
        </span>
        <b>- Indigenous proverb</b>
      </footer>
    </div>
  );
}

function VisionIntro() {
  return (
    <SurfaceCard className="vision-intro-card">
      <span className="stage-kicker">Module 1 · Human Context</span>
      <h1>Vision</h1>
      <p>
        Translate intention into a long-horizon direction. Clarify what this land is for, how it
        should feel, what functions it must support, and what success looks like over time.
      </p>
    </SurfaceCard>
  );
}

function ConceptPanel() {
  return (
    <SurfaceCard className="concept-panel">
      <CroppedArt src={conceptLandscape} className="concept-image" />
    </SurfaceCard>
  );
}

function QuotePanel() {
  return (
    <SurfaceCard className="quote-panel">
      <h2>
        Vision in one sentence <Sun aria-hidden="true" />
      </h2>
      <blockquote>
        A small Carolinian homestead that produces food, hosts learning, and integrates daily
        prayer with regenerative care of land - modest scale, long horizon.
      </blockquote>
      <button className="outlined-button" type="button">
        <Edit3 aria-hidden="true" /> Edit vision statement
      </button>
    </SurfaceCard>
  );
}

function CoreFunctions() {
  const rows: Array<[LucideIcon, string, string]> = [
    [
      Sprout,
      'Food production',
      'Feed the household and share surplus through regenerative systems.',
    ],
    [
      Users,
      'Learning & hosting',
      'Welcome learners, friends, and neighbours to study, work, and grow together.',
    ],
    [Leaf, 'Prayer & retreat', 'Create space for daily prayer, reflection, and spiritual renewal.'],
    [
      Droplet,
      'Regeneration',
      'Restore soil, water, biodiversity, and resilience through living systems.',
    ],
    [
      Heart,
      'Long-horizon stewardship',
      'Build for the next 50-100+ years with wisdom, patience, and care.',
    ],
  ];

  return (
    <SurfaceCard className="vision-panel core-functions">
      <h2>Core functions</h2>
      {rows.map(([Icon, title, text]) => (
        <div className="function-row" key={title}>
          <Icon aria-hidden="true" />
          <strong>{title}</strong>
          <span>{text}</span>
        </div>
      ))}
    </SurfaceCard>
  );
}

function ExperienceGoals() {
  return (
    <SurfaceCard className="vision-panel experience-goals">
      <h2>
        Experience goals <Sun aria-hidden="true" />
      </h2>
      <ChipList items={['Calm', 'Productive', 'Reverent', 'Communal', 'Grounded']} />
      <p>
        <Leaf aria-hidden="true" /> A place that restores people and land.
      </p>
    </SurfaceCard>
  );
}

function AspirationPanel() {
  const phases: Array<[string, string]> = [
    [
      'Near term (1-2 yrs)',
      'Build soil, water systems, and core infrastructure. Establish food staples.',
    ],
    [
      'Mid term (3-7 yrs)',
      'Expand food forests, host learning programs, and deepen habitat.',
    ],
    [
      'Long term (8+ yrs)',
      'A resilient, self-sustaining homestead that inspires and regenerates.',
    ],
  ];

  return (
    <SurfaceCard className="vision-panel aspiration-panel">
      <h2>Phased aspiration</h2>
      {phases.map(([title, text]) => (
        <div className="phase-row" key={title}>
          <Sprout aria-hidden="true" />
          <strong>{title}</strong>
          <span>{text}</span>
        </div>
      ))}
    </SurfaceCard>
  );
}

function SuccessPanel() {
  const items = [
    '80%+ of food needs grown on-site.',
    'Regular learners and guests hosted year-round.',
    'Daily rhythms of prayer and work are sustained.',
    'Measurable gains in soil organic matter, water retention, and biodiversity.',
    'A place that can be stewarded well into the next generation.',
  ];

  return (
    <SurfaceCard className="vision-panel success-panel">
      <h2>
        What success looks like <Sun aria-hidden="true" />
      </h2>
      {items.map((item) => (
        <p key={item}>
          <CheckCircle2 aria-hidden="true" /> {item}
        </p>
      ))}
      <button className="green-button" type="button">
        Define success metrics <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

interface ListPanelProps {
  title: string;
  items: Array<[string, string]>;
  tone?: 'green' | 'warning';
}

function ListPanel({ title, items, tone = 'green' }: ListPanelProps) {
  return (
    <SurfaceCard className={`vision-panel list-panel ${tone}`}>
      <h2>{title}</h2>
      {items.map(([label, text]) => (
        <div className="list-panel-row" key={label}>
          {tone === 'warning' ? (
            <TriangleAlert aria-hidden="true" />
          ) : (
            <Sprout aria-hidden="true" />
          )}
          <strong>{label}</strong>
          <span>{text}</span>
        </div>
      ))}
    </SurfaceCard>
  );
}

function MoodboardPanel() {
  return (
    <SurfaceCard className="vision-panel moodboard-panel">
      <h2>Moodboard</h2>
      <CroppedArt src={moodboardGrid} className="moodboard-image" />
      <button className="green-button" type="button">
        Open inspiration library <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}
