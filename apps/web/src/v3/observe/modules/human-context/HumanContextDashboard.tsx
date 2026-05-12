import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Compass,
  Download,
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
import { pickTruthy } from '@ogden/shared';
import AnnotationListCard from '../../components/AnnotationListCard.js';
import heroLandscape from '../../assets/human-context-dashboard/hero-landscape.png';
import { useVisionStore } from '../../../../store/visionStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import { api } from '../../../../lib/apiClient.js';
import ParcelSatelliteSnapshot from '../../../components/ParcelSatelliteSnapshot.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import hc from '../../../_shared/stageCard/observeExtras.module.css';
import Ring from '../../../_shared/stageCard/Ring.js';
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

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const steward = vision?.steward;
      const regional = vision?.regional;
      const archetype = archetypeFor(steward);
      const overall = moduleCompleteness(vision);
      const sw = stewardCompleteness(steward);
      const rg = regionalCompleteness(regional);
      const vs = visionCompleteness(vision);
      const totalHrs = totalHoursPerWeek(steward);

      const stewardPayload = steward
        ? {
            ...pickTruthy(steward, [
              'name',
              'occupation',
              'lifestyle',
              'budget',
              'vision',
            ]),
            ...(steward.age != null ? { age: steward.age } : {}),
            ...(steward.maintenanceHrsInitial != null
              ? { maintenanceHrsInitial: steward.maintenanceHrsInitial }
              : {}),
            ...(steward.maintenanceHrsOngoing != null
              ? { maintenanceHrsOngoing: steward.maintenanceHrsOngoing }
              : {}),
            ...(steward.skills && steward.skills.length > 0
              ? { skills: steward.skills }
              : {}),
            ...(steward.coreFunctions && steward.coreFunctions.length > 0
              ? { coreFunctions: steward.coreFunctions }
              : {}),
            ...(steward.experienceGoals && steward.experienceGoals.length > 0
              ? { experienceGoals: steward.experienceGoals }
              : {}),
            ...(steward.successMetrics && steward.successMetrics.length > 0
              ? { successMetrics: steward.successMetrics }
              : {}),
            ...(steward.principles && steward.principles.length > 0
              ? { principles: steward.principles }
              : {}),
            ...(steward.guidingValues && steward.guidingValues.length > 0
              ? { guidingValues: steward.guidingValues }
              : {}),
            ...(steward.constraints && steward.constraints.length > 0
              ? { constraints: steward.constraints }
              : {}),
            ...(steward.moodboardImages
              ? { moodboardImageCount: steward.moodboardImages.length }
              : {}),
          }
        : {};

      const regionalPayload = regional
        ? {
            ...(regional.indigenousNames && regional.indigenousNames.length > 0
              ? { indigenousNames: regional.indigenousNames }
              : {}),
            ...(regional.culturalChallenges &&
            regional.culturalChallenges.length > 0
              ? { culturalChallenges: regional.culturalChallenges }
              : {}),
            ...(regional.culturalStrengths &&
            regional.culturalStrengths.length > 0
              ? { culturalStrengths: regional.culturalStrengths }
              : {}),
            ...(regional.localNetwork && regional.localNetwork.length > 0
              ? {
                  localNetwork: regional.localNetwork.map((c) => ({
                    id: c.id,
                    name: c.name,
                    type: c.type,
                    ...pickTruthy(c, ['contact']),
                  })),
                }
              : {}),
          }
        : {};

      const { data } = await api.exports.generate(id, {
        exportType: 'human_context_report',
        payload: {
          humanContext: {
            steward: stewardPayload,
            regional: regionalPayload,
            phaseNotes: (vision?.phaseNotes ?? []).map((p) => ({
              phaseKey: p.phaseKey,
              label: p.label,
              notes: p.notes,
            })),
            milestones: (vision?.milestones ?? []).map((m) => ({
              id: m.id,
              phaseId: m.phaseId,
              note: m.note,
              targetDate: m.targetDate,
            })),
            archetype: { name: archetype.name, blurb: archetype.blurb },
            totals: {
              overallPct: overall.pct,
              stewardPct: sw.pct,
              regionalPct: rg.pct,
              visionPct: vs.pct,
              totalHoursPerWeek: totalHrs,
              milestonesDefined: vision?.milestones?.length ?? 0,
              moodboardImageCount: steward?.moodboardImages?.length ?? 0,
            },
          },
        },
      });
      window.open(data.storageUrl, '_blank');
    } catch (err) {
      console.error('Human Context report export failed', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={card.page}>
      <HumanHero vision={vision} onExport={handleExport} exporting={exporting} />

      <div className={card.grid}>
        <StewardCard projectId={id} vision={vision} />
        <RegionalCard projectId={id} vision={vision} />
      </div>

      <VisionSummaryCard projectId={id} vision={vision} />

      <HealthStrip vision={vision} />

      <SynthesisPanel vision={vision} />

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Field annotations</h2>
        <AnnotationListCard
          title=""
          projectId={projectId ?? null}
          kinds={['neighbourPin', 'household', 'accessRoad']}
          emptyHint="No neighbours, households, or access roads pinned yet — drop one with the tools panel."
        />
      </section>
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

interface HumanHeroProps extends VisionProps {
  onExport: () => void;
  exporting: boolean;
}

function HumanHero({ vision, onExport, exporting }: HumanHeroProps) {
  const overall = moduleCompleteness(vision);
  const phases = phaseNotesCaptured(vision);
  const milestones = vision?.milestones?.length ?? 0;
  const regional = regionalCounts(vision?.regional);

  return (
    <>
      <div className={card.hero} data-stage="observe">
        <div className={hc.heroRow}>
          <div>
            <p className={card.lede}>
              This module captures who is stewarding the land, the regional and cultural
              context that shapes it, and the long-horizon vision that guides decisions
              across time and generations.
            </p>
            <div className={card.btnRow}>
              <button
                type="button"
                className={card.btn}
                onClick={onExport}
                disabled={exporting}
              >
                <Download aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {exporting ? 'Generating…' : 'Export human-context report'}
              </button>
            </div>
          </div>
          <img src={heroLandscape} alt="" aria-hidden="true" className={hc.heroArt} />
        </div>
      </div>

      <section className={card.section}>
        <div className={hc.kpiGrid}>
          <div className={`${hc.kpiBlock} ${hc.kpiBlockWithRing}`}>
            <Ring value={overall.pct} />
            <span className={hc.label}>Module progress</span>
            <span className={hc.value}>
              {overall.pct >= 70
                ? 'Well on your way'
                : overall.pct >= 30
                ? 'Filling in'
                : 'Just getting started'}
            </span>
            <span className={hc.note}>{overall.filled} of {overall.total} areas captured</span>
          </div>
          <KpiBlock icon={Eye} label="Vision phases" value={`${phases.filled} / ${phases.total}`} note="Captured" />
          <KpiBlock icon={Flag} label="Milestones" value={String(milestones)} note="Defined" />
          <KpiBlock icon={MapPin} label="Regional context" value={regional.total > 0 ? String(regional.total) : '—'} note="Captured" />
        </div>
      </section>
    </>
  );
}

interface KpiBlockProps {
  icon?: LucideIcon;
  label: string;
  value: string;
  note: string;
}

function KpiBlock({ icon: Icon, label, value, note }: KpiBlockProps) {
  return (
    <div className={hc.kpiBlock}>
      <span className={hc.label}>
        {Icon ? <Icon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> : null}
        {label}
      </span>
      <span className={hc.value}>{value}</span>
      <span className={hc.note}>{note}</span>
    </div>
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
    <section className={card.section}>
      <div className={hc.cardEyebrow}><b>1</b> Steward Survey</div>
      <h2 className={card.sectionTitle}>Who is stewarding this land</h2>
      <p className={card.sectionBody} style={{ marginBottom: 12 }}>What they bring.</p>

      <div className={card.statRow}>
        <span>Profile completeness</span>
        <span>{completeness.pct}%</span>
      </div>
      <div className={card.statRow}>
        <span>Archetype</span>
        <span><ArchetypeIcon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> {archetype.name}</span>
      </div>
      <div className={card.statRow}>
        <span>Capacity</span>
        <span>{totalHrs > 0 ? `${totalHrs} hrs / week` : '—'}</span>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {skills.length > 0 ? (
          skills.map((s) => (
            <span key={s} className={`${card.pill} ${card.pillPartial}`}>{s}</span>
          ))
        ) : (
          <span className={card.empty}>No skills captured yet.</span>
        )}
      </div>
    </section>
  );
}

function RegionalCard({ projectId, vision }: ProjectVisionProps) {
  const project = useV3Project(projectId);
  const counts = regionalCounts(vision?.regional);
  const strengths = (vision?.regional?.culturalStrengths ?? []).slice(0, 3);

  return (
    <section className={card.section}>
      <div className={hc.cardEyebrow}><b>2</b> Indigenous &amp; Regional</div>
      <h2 className={card.sectionTitle}>Honour the land&rsquo;s story</h2>
      <p className={card.sectionBody} style={{ marginBottom: 12 }}>Culture and regional systems.</p>

      <div style={{ marginBottom: 12 }}>
        <ParcelSatelliteSnapshot
          boundary={project?.location?.boundary}
          width={260}
          height={110}
        />
      </div>

      {[
        ['Indigenous place-names', counts.placeNames],
        ['Cultural challenges', counts.challenges],
        ['Cultural strengths', counts.strengths],
        ['Local contacts', counts.contacts],
      ].map(([label, value]) => (
        <div key={String(label)} className={card.statRow}>
          <span>{label}</span>
          <span>{Number(value) > 0 ? value : '—'}</span>
        </div>
      ))}

      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {strengths.length > 0 ? (
          strengths.map((s) => (
            <span key={s} className={`${card.pill} ${card.pillPartial}`}>{s}</span>
          ))
        ) : (
          <span className={card.empty}>No strengths captured yet.</span>
        )}
      </div>
    </section>
  );
}

function VisionSummaryCard({ vision }: ProjectVisionProps) {
  const steward = vision?.steward;
  const counts = visionCounts(steward);
  const themes = (steward?.coreFunctions ?? []).slice(0, 5);

  return (
    <section className={card.section}>
      <div className={hc.cardEyebrow}><b>3</b> Vision</div>
      <h2 className={card.sectionTitle}>Where we&rsquo;re going</h2>
      <p className={card.sectionBody} style={{ marginBottom: 12 }}>And what success looks like.</p>

      <blockquote className={hc.blockquote} style={{ marginBottom: 12 }}>
        {steward?.vision || 'Not yet captured.'}
      </blockquote>

      <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {themes.length > 0 ? (
          themes.map((item) => (
            <span key={item} className={`${card.pill} ${card.pillPartial}`}>{item}</span>
          ))
        ) : (
          <span className={card.empty}>No themes yet.</span>
        )}
      </div>

      <div className={card.statRow}>
        <span>Core functions</span>
        <span>{counts.coreFunctions}</span>
      </div>
      <div className={card.statRow}>
        <span>Success metrics</span>
        <span>{counts.successMetrics}</span>
      </div>
      <div className={card.statRow}>
        <span>Moodboard images</span>
        <span>{counts.moodboardImages}</span>
      </div>
    </section>
  );
}

function HealthStrip({ vision }: VisionProps) {
  const overall = moduleCompleteness(vision);
  const sw = stewardCompleteness(vision?.steward);
  const rg = regionalCompleteness(vision?.regional);
  const vs = visionCompleteness(vision);
  const challenges = vision?.regional?.culturalChallenges?.length ?? 0;

  return (
    <section className={card.section}>
      <h2 className={card.sectionTitle}>
        <Leaf aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
        Overall module health
      </h2>
      <p className={card.sectionBody} style={{ marginBottom: 12 }}>
        {overall.pct >= 70
          ? 'Strong foundation with clear direction.'
          : overall.pct >= 30
          ? 'Forming — keep filling in the picture.'
          : 'Sparse — start with the steward survey.'}
      </p>
      <div className={card.statRow}>
        <span>People &amp; capacity</span>
        <span>{healthLabel(sw.pct)}</span>
      </div>
      <div className={card.statRow}>
        <span>Place &amp; culture</span>
        <span>{healthLabel(rg.pct)}</span>
      </div>
      <div className={card.statRow}>
        <span>Vision &amp; purpose</span>
        <span>{healthLabel(vs.pct)}</span>
      </div>
      <div className={card.statRow}>
        <span>Risks to address</span>
        <span>{challenges}</span>
      </div>
    </section>
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
    <section className={card.section}>
      <h2 className={card.sectionTitle}>Synthesis</h2>
      {empty ? (
        <p className={card.sectionBody}>Fill in the steward survey, regional context, and vision to see synthesis.</p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Ring value={overall.pct} />
            <div>
              <div className={hc.cardEyebrow} style={{ margin: 0 }}>Context alignment</div>
              <p className={card.sectionBody} style={{ margin: 0 }}>
                {overall.pct >= 70
                  ? 'Strong foundation.'
                  : overall.pct >= 30
                  ? 'Forming — keep building.'
                  : 'Sparse — capture the basics first.'}
              </p>
            </div>
          </div>

          <div className={hc.synthesisGrid}>
            <SynthesisBlock title="Key insights" items={insights} />
            <SynthesisBlock title="Design implications" items={implications} />
            <SynthesisBlock title="Next steps" numbered items={nextSteps} />
          </div>
        </>
      )}
    </section>
  );
}

interface SynthesisBlockProps {
  title: string;
  items: string[];
  numbered?: boolean;
}

function SynthesisBlock({ title, items, numbered = false }: SynthesisBlockProps) {
  return (
    <div className={hc.synthesisBlock}>
      <h3>{title}</h3>
      {items.map((item, index) => (
        <p key={item}>
          {numbered ? <b>{index + 1}</b> : <CheckCircle2 aria-hidden="true" size={14} />}
          <span>{item}</span>
        </p>
      ))}
    </div>
  );
}
