import { useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Eye,
  Flag,
  Hammer,
  Leaf,
  MapPin,
  Sprout,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import {
  CroppedArt,
  ProgressRing,
  SurfaceCard,
} from '../../_shared/components/index.js';
import AnnotationListCard from '../../components/AnnotationListCard.js';
import heroLandscape from '../../assets/human-context-dashboard/hero-landscape.png';
import { useVisionStore } from '../../../../store/visionStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import ParcelSatelliteSnapshot from '../../../components/ParcelSatelliteSnapshot.js';
import {
  archetypeFor,
  healthLabel,
  moduleCompleteness,
  phaseNotesCaptured,
  regionalCompleteness,
  regionalCounts,
  stewardCompleteness,
  totalHoursPerWeek,
  visionCompleteness,
  visionCounts,
} from './derivations.js';

export default function HumanContextDashboard() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';

  const ensureDefaults = useVisionStore((s) => s.ensureDefaults);
  const vision = useVisionStore((s) => s.getVisionData(id));

  useEffect(() => {
    ensureDefaults(id);
  }, [id, ensureDefaults]);

  return (
    <div className="human-context-page">
      <div className="human-context-layout">
        <div className="human-context-main">
          <HumanHero vision={vision} />
          <section className="human-card-grid">
            <StewardCard projectId={id} vision={vision} />
            <RegionalCard projectId={id} vision={vision} />
            <VisionSummaryCard projectId={id} vision={vision} />
          </section>
          <HealthStrip vision={vision} />
          <AnnotationListCard
            title="Field annotations"
            projectId={projectId ?? null}
            kinds={['neighbourPin', 'household', 'accessRoad']}
            emptyHint="No neighbours, households, or access roads pinned yet — drop one with the tools panel."
          />
        </div>
        <SynthesisPanel vision={vision} />
      </div>
    </div>
  );
}

type Vision = ReturnType<typeof useVisionStore.getState>['visions'][number] | undefined;

interface VisionProps {
  vision: Vision;
}

interface ProjectVisionProps extends VisionProps {
  projectId: string;
}

function HumanHero({ vision }: VisionProps) {
  const overall = moduleCompleteness(vision);
  const phases = phaseNotesCaptured(vision);
  const milestones = vision?.milestones?.length ?? 0;
  const regional = regionalCounts(vision?.regional);

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
        <ProgressRing value={overall.pct} label={`${overall.pct}%`} />
        <MetricBlock
          label="Module progress"
          value={
            overall.pct >= 70
              ? 'Well on your way'
              : overall.pct >= 30
              ? 'Filling in'
              : 'Just getting started'
          }
          note={`${overall.filled} of ${overall.total} areas captured`}
          compact
        />
        <MetricBlock
          icon={Eye}
          label="Vision phases"
          value={`${phases.filled} / ${phases.total}`}
          note="Captured"
        />
        <MetricBlock
          icon={Flag}
          label="Milestones"
          value={String(milestones)}
          note="Defined"
        />
        <MetricBlock
          icon={MapPin}
          label="Regional context"
          value={regional.total > 0 ? String(regional.total) : '—'}
          note="Captured"
        />
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

function StewardCard({ vision }: ProjectVisionProps) {
  const steward = vision?.steward;
  const completeness = stewardCompleteness(steward);
  const archetype = archetypeFor(steward);
  const totalHrs = totalHoursPerWeek(steward);
  const skills = (steward?.skills ?? []).slice(0, 3);
  const ArchetypeIcon =
    archetype.name === 'Cartographer-Steward'
      ? Compass
      : archetype.name === 'Practical Builder'
      ? Hammer
      : archetype.name === 'Hands-Off Caretaker'
      ? Leaf
      : Users;

  return (
    <ModuleCardShell
      number="1"
      title="Steward Survey"
      icon={Users}
      action="Open Steward Survey"
      onAction={() => {}}
    >
      <p>Who is stewarding this land and what they bring.</p>
      <div className="steward-summary-grid">
        <div className="mini-profile">
          <span>Steward Profile</span>
          <ProgressRing value={completeness.pct} label={`${completeness.pct}%`} />
          <p>
            {completeness.pct >= 70
              ? 'Well on your way'
              : completeness.pct >= 30
              ? 'Filling in'
              : 'Just getting started'}
            <br />
            {completeness.filled} of {completeness.total} areas filled
          </p>
        </div>
        <div className="mini-profile">
          <span>Steward Archetype</span>
          <ArchetypeIcon aria-hidden="true" />
          <p>
            {archetype.name}
            <br />
            {archetype.blurb}
          </p>
        </div>
      </div>
      <div className="capacity-mini">
        <span>Capacity Overview</span>
        <strong>{totalHrs > 0 ? totalHrs : '—'}</strong>
        <small>hrs / week total</small>
      </div>
      <ChipRow items={skills.length > 0 ? skills : ['No skills captured yet.']} />
      <FooterTabs
        items={['Profile insights', 'Capacity & resources', 'Local network']}
        onSelect={() => {}}
      />
    </ModuleCardShell>
  );
}

function RegionalCard({ projectId, vision }: ProjectVisionProps) {
  const project = useV3Project(projectId);
  const counts = regionalCounts(vision?.regional);
  const strengths = (vision?.regional?.culturalStrengths ?? []).slice(0, 3);

  return (
    <ModuleCardShell
      number="2"
      title="Indigenous & Regional Context"
      icon={Sprout}
      action="Open Indigenous & Regional Context"
      tone="gold"
      onAction={() => {}}
    >
      <p>Honour the land&apos;s story, culture, and regional systems.</p>
      <div className="regional-summary-grid">
        <ParcelSatelliteSnapshot
          boundary={project?.location?.boundary}
          width={220}
          height={160}
        />
        <dl>
          {[
            ['Indigenous place-names', counts.placeNames],
            ['Cultural challenges', counts.challenges],
            ['Cultural strengths', counts.strengths],
            ['Local contacts', counts.contacts],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt>{label}</dt>
              <dd>{Number(value) > 0 ? value : '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
      <ChipRow items={strengths.length > 0 ? strengths : ['No strengths captured yet.']} />
      <FooterTabs
        items={['Place-names', 'Cultural challenges', 'Cultural strengths', 'Local network']}
        onSelect={() => {}}
      />
    </ModuleCardShell>
  );
}

function VisionSummaryCard({ vision }: ProjectVisionProps) {
  const steward = vision?.steward;
  const counts = visionCounts(steward);
  const themes = (steward?.coreFunctions ?? []).slice(0, 5);

  return (
    <ModuleCardShell
      number="3"
      title="Vision Detail"
      icon={Leaf}
      action="Open Vision Detail"
      onAction={() => {}}
    >
      <p>Where we&apos;re going and what success looks like.</p>
      <div className="vision-summary-grid">
        <blockquote>{steward?.vision || 'Not yet captured.'}</blockquote>
        <div>
          {themes.length > 0 ? (
            themes.map((item) => <span key={item}>{item}</span>)
          ) : (
            <span>No themes yet.</span>
          )}
        </div>
      </div>
      <div className="vision-counts">
        <span>
          <b>{counts.coreFunctions}</b>Core Functions
        </span>
        <span>
          <b>{counts.successMetrics}</b>Success Metrics
        </span>
        <span>
          <b>{counts.moodboardImages}</b>Moodboard Images
        </span>
      </div>
      <FooterTabs
        items={['Vision concept', 'Success metrics', 'Moodboard', 'Core functions']}
        onSelect={() => {}}
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
  onSelect: (item: string) => void;
}
function FooterTabs({ items, onSelect }: FooterTabsProps) {
  return (
    <div className="human-footer-tabs">
      {items.map((item) => (
        <button type="button" key={item} onClick={() => onSelect(item)}>
          {item}
        </button>
      ))}
    </div>
  );
}

function HealthStrip({ vision }: VisionProps) {
  const overall = moduleCompleteness(vision);
  const sw = stewardCompleteness(vision?.steward);
  const rg = regionalCompleteness(vision?.regional);
  const vs = visionCompleteness(vision);
  const challenges = vision?.regional?.culturalChallenges?.length ?? 0;

  return (
    <SurfaceCard className="human-health-strip">
      <span>
        <Leaf /> <b>Overall Module Health</b>
        {overall.pct >= 70
          ? 'Strong foundation with clear direction.'
          : overall.pct >= 30
          ? 'Forming — keep filling in the picture.'
          : 'Sparse — start with the steward survey.'}
      </span>
      <span>
        People &amp; Capacity <b>{healthLabel(sw.pct)}</b>
      </span>
      <span>
        Place &amp; Culture <b>{healthLabel(rg.pct)}</b>
      </span>
      <span>
        Vision &amp; Purpose <b>{healthLabel(vs.pct)}</b>
      </span>
      <span>
        Risks to Address <b>{challenges}</b>
      </span>
    </SurfaceCard>
  );
}

function SynthesisPanel({ vision }: VisionProps) {
  const overall = moduleCompleteness(vision);
  const steward = vision?.steward;
  const regional = vision?.regional;
  const archetype = archetypeFor(steward);
  const totalHrs = totalHoursPerWeek(steward);
  const skills = steward?.skills ?? [];
  const empty =
    !steward?.vision &&
    (regional?.indigenousNames?.length ?? 0) === 0 &&
    (regional?.culturalStrengths?.length ?? 0) === 0;

  const insights: string[] = [];
  if (totalHrs > 0) {
    insights.push(
      totalHrs >= 20
        ? `${totalHrs} hrs/week of stewardship capacity — strong foundation.`
        : `${totalHrs} hrs/week — light-touch capacity, favour resilient systems.`,
    );
  }
  if (archetype.name !== 'Observer-In-Residence') {
    insights.push(`Archetype: ${archetype.name}. ${archetype.blurb}`);
  }
  if ((regional?.culturalStrengths?.length ?? 0) > 0) {
    insights.push(
      `${regional?.culturalStrengths?.length ?? 0} cultural strengths identified — leverage them in design.`,
    );
  }
  if (insights.length === 0) {
    insights.push('Capture steward, regional, and vision details to generate insights.');
  }

  const implications: string[] = [];
  if (skills.some((s) => /cad|gis|map/i.test(s))) {
    implications.push('Mapping skills support detailed spatial layout.');
  }
  if (skills.some((s) => /carp|build|wood/i.test(s))) {
    implications.push('Building skills support phased infrastructure.');
  }
  if ((regional?.culturalChallenges?.length ?? 0) > 0) {
    implications.push('Address cultural challenges in early design phases.');
  }
  if ((steward?.coreFunctions?.length ?? 0) > 0) {
    implications.push('Vision themes should drive zone prioritization.');
  }
  if (implications.length === 0) {
    implications.push('Add skills, strengths, and themes to surface design implications.');
  }

  const nextSteps: string[] = [];
  if ((regional?.localNetwork?.length ?? 0) === 0) {
    nextSteps.push('Add at least one local network contact.');
  }
  if (!steward?.vision) {
    nextSteps.push('Write a one-sentence vision statement.');
  }
  if ((vision?.phaseNotes ?? []).every((p) => !p.notes.trim())) {
    nextSteps.push('Capture phased aspirations (year 1, 2-3, 4+).');
  }
  if (nextSteps.length === 0) {
    nextSteps.push('Move to Macroclimate to deepen site analysis.');
  }

  return (
    <SurfaceCard className="human-synthesis-panel">
      <h2>Human Context Synthesis</h2>
      {empty ? (
        <p>Fill in the steward survey, regional context, and vision to see synthesis.</p>
      ) : (
        <>
          <div className="synthesis-score">
            <ProgressRing value={overall.pct} label={`${overall.pct}%`} />
            <p>
              <b>Context Alignment</b>
              {overall.pct >= 70
                ? 'Strong foundation across people, place, and purpose.'
                : overall.pct >= 30
                ? 'Forming — keep building.'
                : 'Sparse — capture the basics first.'}
            </p>
          </div>
          <SynthesisSection title="Key insights" items={insights} />
          <SynthesisSection title="Design implications" items={implications} />
          <SynthesisSection title="Next steps" numbered items={nextSteps} />
        </>
      )}
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
