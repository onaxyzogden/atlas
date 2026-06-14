import { useEffect, type ReactNode } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  ArrowRight,
  Clock3,
  Compass,
  Hammer,
  Leaf,
  UserPlus,
  Users,
} from 'lucide-react';
import { useVisionStore } from '../../../../store/visionStore.js';
import type { StewardProfile, StewardRelationship } from '../../../../store/visionStore.js';
import { useStewardRoster, type StewardRosterEntry } from './roster.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import hc from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
import Ring from '../../../_shared/stageCard/Ring.js';
import {
  archetypeFor,
  rosterCapacityHours,
  rosterCompleteness,
  stewardCompleteness,
  totalHoursPerWeek,
} from './derivations.js';

const LIFESTYLE_OPTIONS = ['active', 'sedentary'];

const RELATIONSHIP_OPTIONS: StewardRelationship[] = [
  'lead',
  'co-steward',
  'family',
  'ally',
  'contributor',
];

const RELATIONSHIP_LABELS: Record<StewardRelationship, string> = {
  lead: 'Lead steward',
  'co-steward': 'Co-steward',
  family: 'Family member',
  ally: 'Allied contributor',
  contributor: 'Contributor',
};

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
  const roster = useStewardRoster(id);

  useEffect(() => {
    ensureDefaults(id);
  }, [id, ensureDefaults]);

  const profiles = roster.map((r) => r.profile);
  const capacity = rosterCapacityHours(profiles);
  const rosterPct = rosterCompleteness(profiles).pct;

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-human-context-steward-survey"
        lede="A protracted observation begins with the people. A piece of land is rarely stewarded by one person - capture every steward (a couple, a family, or a cohort), what each brings, and what they hope to grow. Stewards are drawn from your project team. All fields optional."
      />

      <RosterSummary count={roster.length} capacity={capacity} pct={rosterPct} />

      {roster.length === 0 ? (
        <EmptyRoster />
      ) : (
        roster.map((entry) => (
          <StewardEditor key={entry.member.userId} projectId={id} entry={entry} />
        ))
      )}

      <p className={card.hint}>
        Stewards are people on your project team. Add or remove them in the Team tab;
        their profile here is optional and can be updated anytime as your understanding
        deepens.
      </p>
    </div>
  );
}

interface RosterSummaryProps {
  count: number;
  capacity: number;
  pct: number;
}

function RosterSummary({ count, capacity, pct }: RosterSummaryProps) {
  return (
    <section className={card.section}>
      <div className={hc.cardEyebrow}>
        <Users aria-hidden="true" size={12} /> Steward Roster
      </div>
      <div className={card.statRow}>
        <span>Stewards</span>
        <span>{count > 0 ? `${count} ${count === 1 ? 'person' : 'people'}` : '- none yet'}</span>
      </div>
      <div className={card.statRow}>
        <span>Combined capacity</span>
        <span>{capacity > 0 ? `${capacity} hrs / week` : '-'}</span>
      </div>
      <div className={card.statRow}>
        <span>Roster completeness</span>
        <span>{count > 0 ? `${pct}%` : '-'}</span>
      </div>
    </section>
  );
}

function EmptyRoster() {
  return (
    <section className={card.section}>
      <div className={hc.cardEyebrow}>
        <UserPlus aria-hidden="true" size={12} /> No stewards yet
      </div>
      <p className={card.sectionBody}>
        Stewards are drawn from your project team. Invite the people stewarding this
        land in the Team tab - a lead steward, co-stewards, family, or allied
        contributors - and their profiles will appear here for you to fill in.
      </p>
    </section>
  );
}

interface StewardEditorProps {
  projectId: string;
  entry: StewardRosterEntry;
}

function StewardEditor({ projectId, entry }: StewardEditorProps) {
  const updateStewardProfile = useVisionStore((s) => s.updateStewardProfile);
  const setStewardProfileList = useVisionStore((s) => s.setStewardProfileList);

  const { member, profile } = entry;
  const userId = member.userId;
  const name = member.displayName ?? member.email;

  const skills = profile.skills ?? [];
  const personalGoals = profile.personalExperienceGoals ?? [];
  const needs = profile.needs ?? [];

  const initial = profile.maintenanceHrsInitial ?? 0;
  const ongoing = profile.maintenanceHrsOngoing ?? 0;
  const totalCapacity = initial + ongoing;
  const initialPct = totalCapacity > 0 ? (initial / totalCapacity) * 100 : 0;
  const ongoingPct = totalCapacity > 0 ? (ongoing / totalCapacity) * 100 : 0;

  return (
    <section className={card.section}>
      <div className={hc.cardEyebrow}>
        <Leaf aria-hidden="true" size={12} /> {name}
        <span className={`${card.pill} ${card.pillPartial}`} style={{ marginLeft: 8 }}>
          {member.role}
        </span>
      </div>
      <h2 className={card.sectionTitle}>{name}</h2>

      <div className={card.grid}>
        <Field label="Relationship to project">
          <select
            value={profile.relationship ?? 'contributor'}
            onChange={(e) =>
              updateStewardProfile(projectId, userId, {
                relationship: e.target.value as StewardRelationship,
              })
            }
          >
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {RELATIONSHIP_LABELS[opt]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Age">
          <input
            type="number"
            value={fmt(profile.age)}
            onChange={(e) =>
              updateStewardProfile(projectId, userId, { age: parseHrs(e.target.value) })
            }
          />
        </Field>
        <Field label="Occupation">
          <input
            type="text"
            value={profile.occupation ?? ''}
            onChange={(e) =>
              updateStewardProfile(projectId, userId, { occupation: e.target.value })
            }
          />
        </Field>
        <Field label="Lifestyle">
          <select
            value={profile.lifestyle ?? 'active'}
            onChange={(e) =>
              updateStewardProfile(projectId, userId, {
                lifestyle: e.target.value === 'sedentary' ? 'sedentary' : 'active',
              })
            }
          >
            {LIFESTYLE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className={card.grid} style={{ marginTop: 16 }}>
        <Field label="Maintenance hrs/wk - initial">
          <input
            type="number"
            value={fmt(profile.maintenanceHrsInitial)}
            onChange={(e) =>
              updateStewardProfile(projectId, userId, {
                maintenanceHrsInitial: parseHrs(e.target.value),
              })
            }
          />
        </Field>
        <Field label="Maintenance hrs/wk - ongoing">
          <input
            type="number"
            value={fmt(profile.maintenanceHrsOngoing)}
            onChange={(e) =>
              updateStewardProfile(projectId, userId, {
                maintenanceHrsOngoing: parseHrs(e.target.value),
              })
            }
          />
        </Field>
        <Field label="Budget" wide>
          <input
            type="text"
            value={profile.budget ?? ''}
            onChange={(e) =>
              updateStewardProfile(projectId, userId, { budget: e.target.value })
            }
          />
        </Field>
      </div>

      <div className={card.statRow} style={{ marginTop: 16 }}>
        <span>Capacity total</span>
        <span>{totalCapacity > 0 ? `${totalCapacity} hrs / week` : '-'}</span>
      </div>
      <div className={hc.capacityBar}>
        <i style={{ width: `${initialPct}%` }} />
        <b style={{ width: `${ongoingPct}%` }} />
      </div>
      <div className={hc.capacityLegend}>
        <span>{initial > 0 ? `${initial} hrs initial` : '- initial'}</span>
        <span>{ongoing > 0 ? `${ongoing} hrs ongoing` : '- ongoing'}</span>
      </div>

      <div style={{ marginTop: 16 }}>
        <Field label="Skills">
          <ChipEditor
            items={skills}
            onAdd={(value) =>
              setStewardProfileList(projectId, userId, 'skills', [...skills, value])
            }
            onRemove={(idx) =>
              setStewardProfileList(
                projectId,
                userId,
                'skills',
                skills.filter((_, i) => i !== idx),
              )
            }
            placeholder="New skill"
          />
        </Field>
      </div>

      <div style={{ marginTop: 16 }}>
        <Field label="Needs">
          <ChipEditor
            items={needs}
            onAdd={(value) =>
              setStewardProfileList(projectId, userId, 'needs', [...needs, value])
            }
            onRemove={(idx) =>
              setStewardProfileList(
                projectId,
                userId,
                'needs',
                needs.filter((_, i) => i !== idx),
              )
            }
            placeholder="New need"
          />
        </Field>
      </div>

      <div className={card.grid} style={{ marginTop: 16 }}>
        <Field label="Personal vision (in their own words)" wide>
          <textarea
            value={profile.personalVision ?? ''}
            placeholder="What this land means to me..."
            maxLength={500}
            onChange={(e) =>
              updateStewardProfile(projectId, userId, { personalVision: e.target.value })
            }
          />
        </Field>
        <Field label="Personal experience goals" wide>
          <ChipEditor
            items={personalGoals}
            onAdd={(value) =>
              setStewardProfileList(projectId, userId, 'personalExperienceGoals', [
                ...personalGoals,
                value,
              ])
            }
            onRemove={(idx) =>
              setStewardProfileList(
                projectId,
                userId,
                'personalExperienceGoals',
                personalGoals.filter((_, i) => i !== idx),
              )
            }
            placeholder="New goal"
          />
        </Field>
      </div>

      <StewardSnapshot profile={profile} name={name} />
    </section>
  );
}

interface FieldProps {
  label: string;
  wide?: boolean;
  children: ReactNode;
}

function Field({ label, wide, children }: FieldProps) {
  return (
    <label className={`${card.field} ${wide ? card.full : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

interface ChipEditorProps {
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (idx: number) => void;
  placeholder?: string;
}

function ChipEditor({ items, onAdd, onRemove, placeholder }: ChipEditorProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {items.map((item, idx) => (
        <span key={`${item}-${idx}`} className={`${card.pill} ${card.pillPartial}`}>
          {item}
          <button
            type="button"
            onClick={() => onRemove(idx)}
            style={{
              marginLeft: 6,
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: 1,
            }}
            aria-label={`Remove ${item}`}
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        placeholder={placeholder ?? 'Add...'}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const value = (e.target as HTMLInputElement).value.trim();
            if (value) {
              onAdd(value);
              (e.target as HTMLInputElement).value = '';
            }
            e.preventDefault();
          }
        }}
        style={{
          flex: '1 1 120px',
          minWidth: 120,
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 12,
          color: 'rgba(232,220,200,0.92)',
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

interface StewardSnapshotProps {
  profile: StewardProfile;
  name: string;
}

function StewardSnapshot({ profile, name }: StewardSnapshotProps) {
  const completeness = stewardCompleteness(profile);
  const archetype = archetypeFor(profile);
  const totalHrs = totalHoursPerWeek(profile);
  const skills = profile.skills ?? [];

  const ArchetypeIcon =
    archetype.name === 'Cartographer-Steward'
      ? Compass
      : archetype.name === 'Practical Builder'
      ? Hammer
      : archetype.name === 'Hands-Off Caretaker'
      ? Leaf
      : Users;

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
  if (profile.budget) {
    implications.push(`Budget noted: ${profile.budget}.`);
  }
  if (profile.lifestyle === 'active') {
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
    <aside className={hc.synthesisBlock} style={{ marginTop: 16 }}>
      <div className={hc.cardEyebrow}>
        <Leaf aria-hidden="true" size={12} /> Snapshot - {name}
      </div>

      <div className={hc.snapshotMetric}>
        <Ring value={completeness.pct} />
        <div className={hc.body}>
          <strong>
            {completeness.pct >= 70
              ? 'Well on their way.'
              : completeness.pct >= 30
              ? 'Filling in.'
              : 'Just getting started.'}
          </strong>
          <span>
            {completeness.filled} of {completeness.total} areas filled
          </span>
        </div>
      </div>

      <div className={hc.snapshotMetric}>
        <div className={hc.icon}>
          <ArchetypeIcon aria-hidden="true" size={18} />
        </div>
        <div className={hc.body}>
          <strong>{archetype.name}</strong>
          <span>{archetype.blurb}</span>
        </div>
      </div>

      <div className={hc.snapshotMetric}>
        <div className={hc.icon}>
          <Clock3 aria-hidden="true" size={18} />
        </div>
        <div className={hc.body}>
          <strong>{totalHrs > 0 ? `${totalHrs} hrs / wk` : '- hrs / wk'}</strong>
          <span>
            {totalHrs >= 20
              ? 'Strong capacity for both build and maintenance.'
              : totalHrs > 0
              ? 'Light-touch capacity - prioritize compounding systems.'
              : 'Capacity not yet captured.'}
          </span>
        </div>
      </div>

      <div className={hc.synthesisBlock} style={{ marginTop: 16 }}>
        <h3>What this implies for design</h3>
        {implications.map((item) => (
          <p key={item}>
            <b>&#10003;</b>
            <span>{item}</span>
          </p>
        ))}
      </div>

      <div className={card.btnRow}>
        <button type="button" className={card.btn}>
          View design implications <ArrowRight aria-hidden="true" size={12} />
        </button>
      </div>
    </aside>
  );
}
