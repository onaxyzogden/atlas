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
import { useVisionStore } from '../../../../store/visionStore.js';
import type { StewardProfile } from '../../../../store/visionStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import { api } from '../../../../lib/apiClient.js';
import { DEMO_OFFLINE_ENABLED } from '../../../../app/demoSession.js';
import {
  useServerProjectId,
  NOT_SYNCED_EXPORT_TITLE,
} from '../../../../hooks/useServerProjectId.js';
import ParcelSatelliteSnapshot from '../../../components/ParcelSatelliteSnapshot.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import hc from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
import Ring from '../../../_shared/stageCard/Ring.js';
import {
  archetypeFor,
  healthLabel,
  moduleCompleteness,
  phaseNotesCaptured,
  regionalCompleteness,
  regionalCounts,
  rosterCapacityHours,
  rosterCompleteness,
  stewardCompleteness,
  totalHoursPerWeek,
  visionCompleteness,
  visionCounts,
} from './derivations.js';
import { useStewardRoster, type StewardRosterEntry } from './roster.js';

export default function HumanContextDashboard() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  // The exports API addresses the SERVER project UUID; `id` is the local
  // store id (H4, deep-audit 2026-07-03). Null → not yet synced → disable.
  const serverProjectId = useServerProjectId(id);

  const ensureDefaults = useVisionStore((s) => s.ensureDefaults);
  const vision = useVisionStore((s) => s.getVisionData(id));
  const roster = useStewardRoster(id);

  useEffect(() => {
    ensureDefaults(id);
  }, [id, ensureDefaults]);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting || serverProjectId === null) return;
    setExporting(true);
    try {
      const sharedVision = vision?.sharedVision;
      const regional = vision?.regional;
      const profiles = roster.map((r) => r.profile);
      const overall = moduleCompleteness(vision, profiles);
      const rosterPct = rosterCompleteness(profiles).pct;
      const rg = regionalCompleteness(regional);
      const vs = visionCompleteness(vision);
      const totalHrs = rosterCapacityHours(profiles);

      const stewardsPayload = roster.map(({ member, profile }) => {
        const archetype = archetypeFor(profile);
        const completeness = stewardCompleteness(profile);
        return {
          userId: member.userId,
          name: member.displayName ?? member.email,
          role: member.role,
          ...pickTruthy(profile, [
            'relationship',
            'occupation',
            'lifestyle',
            'budget',
            'personalVision',
          ]),
          ...(profile.age != null ? { age: profile.age } : {}),
          ...(profile.maintenanceHrsInitial != null
            ? { maintenanceHrsInitial: profile.maintenanceHrsInitial }
            : {}),
          ...(profile.maintenanceHrsOngoing != null
            ? { maintenanceHrsOngoing: profile.maintenanceHrsOngoing }
            : {}),
          ...(profile.skills && profile.skills.length > 0
            ? { skills: profile.skills }
            : {}),
          ...(profile.personalExperienceGoals &&
          profile.personalExperienceGoals.length > 0
            ? { personalExperienceGoals: profile.personalExperienceGoals }
            : {}),
          hoursPerWeek: totalHoursPerWeek(profile),
          completenessPct: completeness.pct,
          archetype: { name: archetype.name, blurb: archetype.blurb },
        };
      });

      const visionPayload = sharedVision
        ? {
            ...pickTruthy(sharedVision, ['statement']),
            ...(sharedVision.coreFunctions && sharedVision.coreFunctions.length > 0
              ? { coreFunctions: sharedVision.coreFunctions }
              : {}),
            ...(sharedVision.experienceGoals && sharedVision.experienceGoals.length > 0
              ? { experienceGoals: sharedVision.experienceGoals }
              : {}),
            ...(sharedVision.successMetrics && sharedVision.successMetrics.length > 0
              ? { successMetrics: sharedVision.successMetrics }
              : {}),
            ...(sharedVision.principles && sharedVision.principles.length > 0
              ? { principles: sharedVision.principles }
              : {}),
            ...(sharedVision.guidingValues && sharedVision.guidingValues.length > 0
              ? { guidingValues: sharedVision.guidingValues }
              : {}),
            ...(sharedVision.constraints && sharedVision.constraints.length > 0
              ? { constraints: sharedVision.constraints }
              : {}),
            ...(sharedVision.moodboardImages
              ? { moodboardImageCount: sharedVision.moodboardImages.length }
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

      const { data } = await api.exports.generate(serverProjectId, {
        exportType: 'human_context_report',
        payload: {
          humanContext: {
            stewards: stewardsPayload,
            vision: visionPayload,
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
            totals: {
              overallPct: overall.pct,
              stewardPct: rosterPct,
              regionalPct: rg.pct,
              visionPct: vs.pct,
              totalHoursPerWeek: totalHrs,
              stewardCount: roster.length,
              milestonesDefined: vision?.milestones?.length ?? 0,
              moodboardImageCount: sharedVision?.moodboardImages?.length ?? 0,
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

  const profiles = roster.map((r) => r.profile);

  return (
    <div className={card.page}>
      <HumanHero
        vision={vision}
        profiles={profiles}
        canExport={serverProjectId !== null}
        onExport={handleExport}
        exporting={exporting}
      />

      <div className={card.grid}>
        <StewardCard projectId={id} vision={vision} roster={roster} />
        <RegionalCard projectId={id} vision={vision} />
      </div>

      <VisionSummaryCard projectId={id} vision={vision} />

      <HealthStrip vision={vision} profiles={profiles} />

      <SynthesisPanel vision={vision} roster={roster} />

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
  profiles: StewardProfile[];
  onExport: () => void;
  exporting: boolean;
  /** False while the project is local-only — the exports API wants the
   *  SERVER UUID (H4), so the export button disables with honest copy. */
  canExport: boolean;
}

function HumanHero({ vision, profiles, onExport, exporting, canExport }: HumanHeroProps) {
  const overall = moduleCompleteness(vision, profiles);
  const phases = phaseNotesCaptured(vision);
  const milestones = vision?.milestones?.length ?? 0;
  const regional = regionalCounts(vision?.regional);

  return (
    <>
      <ObserveHero
        sectionId="observe-human-context-dashboard"
        lede="This module captures who is stewarding the land, the regional and cultural context that shapes it, and the long-horizon vision that guides decisions across time and generations."
      />
      <div className={card.btnRow} style={{ marginBottom: 24 }}>
        <button
          type="button"
          className={card.btn}
          onClick={onExport}
          disabled={exporting || DEMO_OFFLINE_ENABLED || !canExport}
          title={!DEMO_OFFLINE_ENABLED && !canExport ? NOT_SYNCED_EXPORT_TITLE : undefined}
        >
          <Download aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {exporting ? 'Generating…' : 'Export human-context report'}
        </button>
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

interface StewardCardProps extends ProjectVisionProps {
  roster: StewardRosterEntry[];
}

function StewardCard({ roster }: StewardCardProps) {
  const profiles = roster.map((r) => r.profile);
  const rosterPct = rosterCompleteness(profiles).pct;
  const capacity = rosterCapacityHours(profiles);

  return (
    <section className={card.section}>
      <div className={hc.cardEyebrow}><b>1</b> Steward Survey</div>
      <h2 className={card.sectionTitle}>Who is stewarding this land</h2>
      <p className={card.sectionBody} style={{ marginBottom: 12 }}>
        {roster.length > 0
          ? `${roster.length} ${roster.length === 1 ? 'steward' : 'stewards'} and what they bring.`
          : 'Add stewards from your project team.'}
      </p>

      <div className={card.statRow}>
        <span>Stewards</span>
        <span>{roster.length > 0 ? roster.length : '—'}</span>
      </div>
      <div className={card.statRow}>
        <span>Roster completeness</span>
        <span>{roster.length > 0 ? `${rosterPct}%` : '—'}</span>
      </div>
      <div className={card.statRow}>
        <span>Combined capacity</span>
        <span>{capacity > 0 ? `${capacity} hrs / week` : '—'}</span>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {roster.length > 0 ? (
          roster.map(({ member, profile }) => {
            const archetype = archetypeFor(profile);
            const ArchetypeIcon =
              archetype.name === 'Cartographer-Steward'
                ? Compass
                : archetype.name === 'Practical Builder'
                ? Hammer
                : archetype.name === 'Hands-Off Caretaker'
                ? Leaf
                : Users;
            return (
              <div key={member.userId} className={card.statRow}>
                <span>{member.displayName ?? member.email}</span>
                <span>
                  <ArchetypeIcon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  {archetype.name}
                </span>
              </div>
            );
          })
        ) : (
          <span className={card.empty}>No stewards on the roster yet.</span>
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
  const sv = vision?.sharedVision;
  const counts = visionCounts(sv);
  const themes = (sv?.coreFunctions ?? []).slice(0, 5);

  return (
    <section className={card.section}>
      <div className={hc.cardEyebrow}><b>3</b> Vision</div>
      <h2 className={card.sectionTitle}>Where we&rsquo;re going</h2>
      <p className={card.sectionBody} style={{ marginBottom: 12 }}>And what success looks like.</p>

      <blockquote className={hc.blockquote} style={{ marginBottom: 12 }}>
        {sv?.statement || 'Not yet captured.'}
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

interface HealthStripProps extends VisionProps {
  profiles: StewardProfile[];
}

function HealthStrip({ vision, profiles }: HealthStripProps) {
  const overall = moduleCompleteness(vision, profiles);
  const sw = rosterCompleteness(profiles);
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

interface SynthesisPanelProps extends VisionProps {
  roster: StewardRosterEntry[];
}

function SynthesisPanel({ vision, roster }: SynthesisPanelProps) {
  const profiles = roster.map((r) => r.profile);
  const overall = moduleCompleteness(vision, profiles);
  const sv = vision?.sharedVision;
  const regional = vision?.regional;
  const totalHrs = rosterCapacityHours(profiles);
  const skills = profiles.flatMap((p) => p.skills ?? []);
  // Lead steward (or the first on the roster) drives the headline archetype.
  const lead = roster.find((r) => r.profile.relationship === 'lead') ?? roster[0];
  const archetype = archetypeFor(lead?.profile);
  const empty =
    roster.length === 0 &&
    !sv?.statement &&
    (regional?.indigenousNames?.length ?? 0) === 0 &&
    (regional?.culturalStrengths?.length ?? 0) === 0;

  const insights: string[] = [];
  if (roster.length > 0) {
    insights.push(
      `${roster.length} ${roster.length === 1 ? 'steward' : 'stewards'} on the roster${
        totalHrs > 0 ? ` - ${totalHrs} hrs/week combined capacity.` : '.'
      }`,
    );
  }
  if (totalHrs > 0) {
    insights.push(
      totalHrs >= 20
        ? `${totalHrs} hrs/week of stewardship capacity - strong foundation.`
        : `${totalHrs} hrs/week - light-touch capacity, favour resilient systems.`,
    );
  }
  if (archetype.name !== 'Observer-In-Residence') {
    insights.push(`Lead archetype: ${archetype.name}. ${archetype.blurb}`);
  }
  if ((regional?.culturalStrengths?.length ?? 0) > 0) {
    insights.push(
      `${regional?.culturalStrengths?.length ?? 0} cultural strengths identified - leverage them in design.`,
    );
  }
  if (insights.length === 0) {
    insights.push('Capture stewards, regional, and vision details to generate insights.');
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
  if ((sv?.coreFunctions?.length ?? 0) > 0) {
    implications.push('Vision themes should drive zone prioritization.');
  }
  if (implications.length === 0) {
    implications.push('Add skills, strengths, and themes to surface design implications.');
  }

  const nextSteps: string[] = [];
  if (roster.length === 0) {
    nextSteps.push('Add stewards from your project team.');
  }
  if ((regional?.localNetwork?.length ?? 0) === 0) {
    nextSteps.push('Add at least one local network contact.');
  }
  if (!sv?.statement) {
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
