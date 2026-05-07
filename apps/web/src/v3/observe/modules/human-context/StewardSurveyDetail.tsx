import type { ReactNode } from 'react';
import {
  ArrowRight,
  Clock3,
  Hammer,
  Leaf,
  Plus,
  Sprout,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  ChipList,
  CroppedArt,
  InsightSidebar,
  ProgressRing,
  SurfaceCard,
  TextInput,
  SelectField,
  TextAreaField,
} from '../../_shared/components/index.js';
import heroLandscape from '../../assets/steward-survey/hero-landscape.png';
import capacityOrbit from '../../assets/steward-survey/capacity-orbit.png';

export default function StewardSurveyDetail() {
  return (
    <div className="detail-page steward-page">
      <div className="detail-layout">
        <div className="detail-main">
          <ModuleHero
            kicker="Module 1 · Human Context"
            title="Steward Survey"
            copy="A protracted observation begins with the people. Capture who is stewarding this land, what they bring, and what they hope to grow. All fields optional - fill in what you have."
            image={heroLandscape}
          />
          <IdentityCard />
          <CapacityCard />
          <VisionCard />
          <div className="detail-note">
            All fields are optional. You can update this anytime as your understanding deepens.
          </div>
        </div>
        <StewardSnapshot />
      </div>
    </div>
  );
}

interface ModuleHeroProps {
  kicker: string;
  title: string;
  copy: string;
  image: string;
}

function ModuleHero({ kicker, title, copy, image }: ModuleHeroProps) {
  return (
    <SurfaceCard className="module-hero-card">
      <div className="module-hero-copy">
        <span className="stage-kicker">{kicker}</span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      <CroppedArt src={image} className="module-hero-image" />
    </SurfaceCard>
  );
}

interface FormCardProps {
  number: string;
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

function FormCard({ number, title, icon: Icon, children, className = '' }: FormCardProps) {
  return (
    <SurfaceCard className={`form-card ${className}`}>
      <header className="form-card__header">
        {Icon ? <Icon aria-hidden="true" /> : null}
        <b>{number}</b>
        <h2>{title}</h2>
      </header>
      {children}
    </SurfaceCard>
  );
}

function IdentityCard() {
  return (
    <FormCard number="1" title="Identity" icon={UserRound}>
      <div className="field-grid identity-grid">
        <TextInput label="Name" value="Yousef Abdelsalam" />
        <TextInput label="Age" value="34" />
        <TextInput label="Occupation" value="Software / regenerative design" />
        <SelectField label="Lifestyle" value="Active" options={['Quiet', 'Seasonal']} />
      </div>
    </FormCard>
  );
}

function CapacityCard() {
  return (
    <FormCard number="2" title="Capacity & Resources" icon={Clock3} className="capacity-card">
      <div className="capacity-grid">
        <div className="field-grid capacity-fields">
          <TextInput label="Maintenance hrs/wk - initial" value="20" />
          <TextInput label="Budget" value="$15k/yr establishment, $3k/yr ongoing" />
          <TextInput label="Maintenance hrs/wk - ongoing" value="8" />
          <div className="capacity-overview">
            <span>Capacity overview</span>
            <strong>28</strong>
            <small>hrs / week total</small>
            <div className="stacked-bar">
              <i />
              <b />
            </div>
            <em>20 hrs initial</em>
            <em>8 hrs ongoing</em>
          </div>
          <div className="budget-card">
            <span>
              <Leaf />$15k / yr{' '}
              <small>
                Establishment
                <br />
                83%
              </small>
            </span>
            <ProgressRing value={83} label="$" />
            <span>
              $3k / yr{' '}
              <small>
                Ongoing
                <br />
                17%
              </small>
            </span>
          </div>
          <div className="skills-row">
            <span>Skills</span>
            <ChipList
              removable
              items={['carpentry (intermediate)', 'orcharding', 'gardening', 'CAD/GIS']}
            />
            <button className="add-chip" type="button">
              <Plus aria-hidden="true" /> Add skill
            </button>
          </div>
        </div>
        <CroppedArt src={capacityOrbit} className="capacity-orbit" />
      </div>
    </FormCard>
  );
}

function VisionCard() {
  return (
    <FormCard number="3" title="Vision" icon={Sprout}>
      <div className="vision-grid">
        <TextAreaField
          label="In your own words"
          value="A small Carolinian homestead that produces food, hosts learning, and integrates daily prayer with regenerative care of land - modest scale, long horizon."
        />
        <div className="theme-box">
          <span>Vision themes detected</span>
          <ChipList
            items={[
              { label: 'Food production', icon: Leaf },
              { label: 'Learning & community', icon: Users },
              'Spiritual practice',
              { label: 'Regenerative care', icon: Leaf },
              { label: 'Long-term stewardship', icon: Clock3 },
            ]}
          />
        </div>
      </div>
    </FormCard>
  );
}

function StewardSnapshot() {
  return (
    <InsightSidebar
      title="Steward Snapshot"
      icon={Leaf}
      intro="A quick read on who you are as a steward and what it means for your design."
    >
      <SnapshotMetric label="Profile completeness">
        <ProgressRing value={78} label="78%" />
        <div>
          <strong>Well on your way.</strong>
          <span>6 of 8 areas filled</span>
        </div>
      </SnapshotMetric>
      <SnapshotMetric label="Steward archetype">
        <div className="round-icon">
          <Hammer aria-hidden="true" />
        </div>
        <div>
          <strong>Practical Builder</strong>
          <span>Hands-on, skilled, and ready to implement.</span>
        </div>
      </SnapshotMetric>
      <SnapshotMetric label="Time capacity">
        <div className="round-icon">
          <Clock3 aria-hidden="true" />
        </div>
        <div>
          <strong>28 hrs / wk</strong>
          <span>Strong capacity for both build and maintenance.</span>
        </div>
      </SnapshotMetric>
      <section className="sidebar-list">
        <h3>What this implies for design</h3>
        {[
          'You have strong implementation capacity - designs can be more build-intensive.',
          'Skills in carpentry, orcharding and CAD/GIS support infrastructure, planting systems, and mapping.',
          'Budget supports a modest, phased build - prioritize durable, multi-functional elements.',
          'Active lifestyle suggests energy for regular maintenance and physical work.',
        ].map((item) => (
          <p key={item}>✓ {item}</p>
        ))}
      </section>
      <div className="design-tip">
        <b>Design tip</b>
        <p>
          Focus on resilient, low-maintenance systems that compound over time. Your capacity and
          skills are ideal for a phased, skillfully built homestead.
        </p>
        <button type="button">
          View design implications <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </InsightSidebar>
  );
}

interface SnapshotMetricProps {
  label: string;
  children: ReactNode;
}

function SnapshotMetric({ label, children }: SnapshotMetricProps) {
  return (
    <section className="snapshot-metric">
      <h3>{label}</h3>
      <div>{children}</div>
    </section>
  );
}
