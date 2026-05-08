import { useEffect, type ReactNode } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  ArrowRight,
  Clock3,
  Compass,
  Hammer,
  Leaf,
  Sprout,
  UserRound,
  Users,
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
import { useVisionStore } from '../../../../store/visionStore.js';
import heroLandscape from '../../assets/steward-survey/hero-landscape.png';
import { CapacityOrbit } from './CapacityOrbit.js';
import {
  archetypeFor,
  stewardCompleteness,
  totalHoursPerWeek,
} from './derivations.js';

const LIFESTYLE_OPTIONS = ['active', 'sedentary'];

function fmt(value: number | undefined): string {
  return value === undefined || Number.isNaN(value) ? '' : String(value);
}

function parseHrs(text: string): number | undefined {
  const t = text.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export default function StewardSurveyDetail() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';

  const ensureDefaults = useVisionStore((s) => s.ensureDefaults);
  const updateSteward = useVisionStore((s) => s.updateSteward);
  const setStewardList = useVisionStore((s) => s.setStewardList);
  const steward = useVisionStore((s) => s.getVisionData(id)?.steward);

  useEffect(() => {
    ensureDefaults(id);
  }, [id, ensureDefaults]);

  const skills = steward?.skills ?? [];

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

          <FormCard number="1" title="Identity" icon={UserRound}>
            <div className="field-grid identity-grid">
              <TextInput
                label="Name"
                value={steward?.name ?? ''}
                onChange={(v) => updateSteward(id, { name: v })}
              />
              <TextInput
                label="Age"
                type="number"
                value={fmt(steward?.age)}
                onChange={(v) => {
                  const n = parseHrs(v);
                  updateSteward(id, { age: n });
                }}
              />
              <TextInput
                label="Occupation"
                value={steward?.occupation ?? ''}
                onChange={(v) => updateSteward(id, { occupation: v })}
              />
              <SelectField
                label="Lifestyle"
                value={steward?.lifestyle ?? 'active'}
                options={LIFESTYLE_OPTIONS}
                onChange={(v) =>
                  updateSteward(id, {
                    lifestyle: v === 'sedentary' ? 'sedentary' : 'active',
                  })
                }
              />
            </div>
          </FormCard>

          <FormCard
            number="2"
            title="Capacity & Resources"
            icon={Clock3}
            className="capacity-card"
          >
            <div className="capacity-grid">
              <div className="field-grid capacity-fields">
                <TextInput
                  label="Maintenance hrs/wk - initial"
                  type="number"
                  value={fmt(steward?.maintenanceHrsInitial)}
                  onChange={(v) =>
                    updateSteward(id, { maintenanceHrsInitial: parseHrs(v) })
                  }
                />
                <TextInput
                  label="Budget"
                  value={steward?.budget ?? ''}
                  onChange={(v) => updateSteward(id, { budget: v })}
                />
                <TextInput
                  label="Maintenance hrs/wk - ongoing"
                  type="number"
                  value={fmt(steward?.maintenanceHrsOngoing)}
                  onChange={(v) =>
                    updateSteward(id, { maintenanceHrsOngoing: parseHrs(v) })
                  }
                />

                <CapacityOverview steward={steward} />

                <div className="skills-row">
                  <span>Skills</span>
                  <ChipList
                    removable
                    items={skills}
                    onRemove={(idx) =>
                      setStewardList(
                        id,
                        'skills',
                        skills.filter((_, i) => i !== idx),
                      )
                    }
                    onAdd={(value) =>
                      setStewardList(id, 'skills', [...skills, value])
                    }
                    addPlaceholder="New skill"
                  />
                </div>
              </div>

              <CapacityOrbit
                initialHrs={steward?.maintenanceHrsInitial}
                ongoingHrs={steward?.maintenanceHrsOngoing}
                className="capacity-orbit"
              />
            </div>
          </FormCard>

          <FormCard number="3" title="Vision" icon={Sprout}>
            <div className="vision-grid">
              <TextAreaField
                label="In your own words"
                value={steward?.vision ?? ''}
                placeholder="A small homestead that…"
                onChange={(v) => updateSteward(id, { vision: v })}
              />
              <div className="theme-box">
                <span>Vision themes</span>
                <ChipList
                  removable
                  items={steward?.coreFunctions ?? []}
                  onAdd={(value) =>
                    setStewardList(id, 'coreFunctions', [
                      ...(steward?.coreFunctions ?? []),
                      value,
                    ])
                  }
                  onRemove={(idx) =>
                    setStewardList(
                      id,
                      'coreFunctions',
                      (steward?.coreFunctions ?? []).filter((_, i) => i !== idx),
                    )
                  }
                  addPlaceholder="New theme"
                />
              </div>
            </div>
          </FormCard>

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
  icon?: typeof UserRound;
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

interface CapacityOverviewProps {
  steward: ReturnType<typeof useVisionStore.getState>['visions'][number]['steward'];
}

function CapacityOverview({ steward }: CapacityOverviewProps) {
  const initial = steward?.maintenanceHrsInitial ?? 0;
  const ongoing = steward?.maintenanceHrsOngoing ?? 0;
  const total = initial + ongoing;
  const initialPct = total > 0 ? (initial / total) * 100 : 0;
  const ongoingPct = total > 0 ? (ongoing / total) * 100 : 0;

  return (
    <div className="capacity-overview">
      <span>Capacity overview</span>
      <strong>{total > 0 ? total : '—'}</strong>
      <small>hrs / week total</small>
      <div className="stacked-bar">
        <i style={{ width: `${initialPct}%` }} />
        <b style={{ width: `${ongoingPct}%` }} />
      </div>
      <em>{initial > 0 ? `${initial} hrs initial` : '— initial'}</em>
      <em>{ongoing > 0 ? `${ongoing} hrs ongoing` : '— ongoing'}</em>
    </div>
  );
}

function StewardSnapshot() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  const steward = useVisionStore((s) => s.getVisionData(id)?.steward);

  const completeness = stewardCompleteness(steward);
  const archetype = archetypeFor(steward);
  const totalHrs = totalHoursPerWeek(steward);
  const skills = steward?.skills ?? [];

  const implications: string[] = [];
  if (totalHrs >= 20) {
    implications.push(
      'Strong implementation capacity - designs can be more build-intensive.',
    );
  } else if (totalHrs > 0) {
    implications.push(
      'Light-touch capacity - prefer durable, low-maintenance systems.',
    );
  }
  if (skills.some((s) => /cad|gis|map/i.test(s))) {
    implications.push(
      'Mapping/CAD skills support detailed spatial layout and recordkeeping.',
    );
  }
  if (skills.some((s) => /carp|build|wood/i.test(s))) {
    implications.push(
      'Building skills support phased infrastructure (sheds, barns, fences).',
    );
  }
  if (steward?.budget) {
    implications.push(`Budget noted: ${steward.budget}.`);
  }
  if (steward?.lifestyle === 'active') {
    implications.push(
      'Active lifestyle suggests energy for regular maintenance and physical work.',
    );
  }
  if (implications.length === 0) {
    implications.push(
      'Fill in capacity, skills, and budget to surface design implications.',
    );
  }

  return (
    <InsightSidebar
      title="Steward Snapshot"
      icon={Leaf}
      intro="A quick read on who you are as a steward and what it means for your design."
    >
      <SnapshotMetric label="Profile completeness">
        <ProgressRing value={completeness.pct} label={`${completeness.pct}%`} />
        <div>
          <strong>
            {completeness.pct >= 70
              ? 'Well on your way.'
              : completeness.pct >= 30
              ? 'Filling in.'
              : 'Just getting started.'}
          </strong>
          <span>
            {completeness.filled} of {completeness.total} areas filled
          </span>
        </div>
      </SnapshotMetric>
      <SnapshotMetric label="Steward archetype">
        <div className="round-icon">
          {archetype.name === 'Cartographer-Steward' ? (
            <Compass aria-hidden="true" />
          ) : archetype.name === 'Practical Builder' ? (
            <Hammer aria-hidden="true" />
          ) : (
            <Users aria-hidden="true" />
          )}
        </div>
        <div>
          <strong>{archetype.name}</strong>
          <span>{archetype.blurb}</span>
        </div>
      </SnapshotMetric>
      <SnapshotMetric label="Time capacity">
        <div className="round-icon">
          <Clock3 aria-hidden="true" />
        </div>
        <div>
          <strong>{totalHrs > 0 ? `${totalHrs} hrs / wk` : '— hrs / wk'}</strong>
          <span>
            {totalHrs >= 20
              ? 'Strong capacity for both build and maintenance.'
              : totalHrs > 0
              ? 'Light-touch capacity — prioritize compounding systems.'
              : 'Capacity not yet captured.'}
          </span>
        </div>
      </SnapshotMetric>
      <section className="sidebar-list">
        <h3>What this implies for design</h3>
        {implications.map((item) => (
          <p key={item}>✓ {item}</p>
        ))}
      </section>
      <div className="design-tip">
        <b>Design tip</b>
        <p>
          Focus on resilient, low-maintenance systems that compound over time. Match
          ambition to your real capacity, not aspirational hours.
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
