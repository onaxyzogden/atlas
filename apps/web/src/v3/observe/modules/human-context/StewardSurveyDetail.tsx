import { useEffect, type ReactNode } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  ArrowRight,
  Clock3,
  Compass,
  Hammer,
  Leaf,
  Users,
} from 'lucide-react';
import { useVisionStore } from '../../../../store/visionStore.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import hc from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
import Ring from '../../../_shared/stageCard/Ring.js';
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
  const coreFunctions = steward?.coreFunctions ?? [];

  const initial = steward?.maintenanceHrsInitial ?? 0;
  const ongoing = steward?.maintenanceHrsOngoing ?? 0;
  const totalCapacity = initial + ongoing;
  const initialPct = totalCapacity > 0 ? (initial / totalCapacity) * 100 : 0;
  const ongoingPct = totalCapacity > 0 ? (ongoing / totalCapacity) * 100 : 0;

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-human-context-steward-survey"
        lede="A protracted observation begins with the people. Capture who is stewarding this land, what they bring, and what they hope to grow. All fields optional â€” fill in what you have."
      />

      <div>
          <FormSection number="1" title="Identity">
            <div className={card.grid}>
              <Field label="Name">
                <input
                  type="text"
                  value={steward?.name ?? ''}
                  onChange={(e) => updateSteward(id, { name: e.target.value })}
                />
              </Field>
              <Field label="Age">
                <input
                  type="number"
                  value={fmt(steward?.age)}
                  onChange={(e) => updateSteward(id, { age: parseHrs(e.target.value) })}
                />
              </Field>
              <Field label="Occupation">
                <input
                  type="text"
                  value={steward?.occupation ?? ''}
                  onChange={(e) => updateSteward(id, { occupation: e.target.value })}
                />
              </Field>
              <Field label="Lifestyle">
                <select
                  value={steward?.lifestyle ?? 'active'}
                  onChange={(e) =>
                    updateSteward(id, {
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
          </FormSection>

          <FormSection number="2" title="Capacity & Resources">
            <div className={card.grid}>
              <Field label="Maintenance hrs/wk â€” initial">
                <input
                  type="number"
                  value={fmt(steward?.maintenanceHrsInitial)}
                  onChange={(e) =>
                    updateSteward(id, { maintenanceHrsInitial: parseHrs(e.target.value) })
                  }
                />
              </Field>
              <Field label="Maintenance hrs/wk â€” ongoing">
                <input
                  type="number"
                  value={fmt(steward?.maintenanceHrsOngoing)}
                  onChange={(e) =>
                    updateSteward(id, { maintenanceHrsOngoing: parseHrs(e.target.value) })
                  }
                />
              </Field>
              <Field label="Budget" wide>
                <input
                  type="text"
                  value={steward?.budget ?? ''}
                  onChange={(e) => updateSteward(id, { budget: e.target.value })}
                />
              </Field>
            </div>

            <div className={card.statRow} style={{ marginTop: 16 }}>
              <span>Capacity total</span>
              <span>{totalCapacity > 0 ? `${totalCapacity} hrs / week` : 'â€”'}</span>
            </div>
            <div className={hc.capacityBar}>
              <i style={{ width: `${initialPct}%` }} />
              <b style={{ width: `${ongoingPct}%` }} />
            </div>
            <div className={hc.capacityLegend}>
              <span>{initial > 0 ? `${initial} hrs initial` : 'â€” initial'}</span>
              <span>{ongoing > 0 ? `${ongoing} hrs ongoing` : 'â€” ongoing'}</span>
            </div>

            <div style={{ marginTop: 16 }}>
              <Field label="Skills">
                <ChipEditor
                  items={skills}
                  onAdd={(value) => setStewardList(id, 'skills', [...skills, value])}
                  onRemove={(idx) =>
                    setStewardList(
                      id,
                      'skills',
                      skills.filter((_, i) => i !== idx),
                    )
                  }
                  placeholder="New skill"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection number="3" title="Vision">
            <div className={card.grid}>
              <Field label="In your own words" wide>
                <textarea
                  value={steward?.vision ?? ''}
                  placeholder="A small homestead thatâ€¦"
                  maxLength={500}
                  onChange={(e) => updateSteward(id, { vision: e.target.value })}
                />
              </Field>
              <Field label="Vision themes" wide>
                <ChipEditor
                  items={coreFunctions}
                  onAdd={(value) =>
                    setStewardList(id, 'coreFunctions', [...coreFunctions, value])
                  }
                  onRemove={(idx) =>
                    setStewardList(
                      id,
                      'coreFunctions',
                      coreFunctions.filter((_, i) => i !== idx),
                    )
                  }
                  placeholder="New theme"
                />
              </Field>
            </div>
          </FormSection>

          <p className={card.hint}>
            All fields are optional. You can update this anytime as your understanding
            deepens.
          </p>

          <StewardSnapshot />
        </div>
    </div>
  );
}

interface FormSectionProps {
  number: string;
  title: string;
  children: ReactNode;
}

function FormSection({ number, title, children }: FormSectionProps) {
  return (
    <section className={card.section}>
      <div className={hc.cardEyebrow}>
        <b>{number}</b> Step {number}
      </div>
      <h2 className={card.sectionTitle}>{title}</h2>
      {children}
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
            Ã—
          </button>
        </span>
      ))}
      <input
        type="text"
        placeholder={placeholder ?? 'Addâ€¦'}
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

function StewardSnapshot() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  const steward = useVisionStore((s) => s.getVisionData(id)?.steward);

  const completeness = stewardCompleteness(steward);
  const archetype = archetypeFor(steward);
  const totalHrs = totalHoursPerWeek(steward);
  const skills = steward?.skills ?? [];

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
      'Strong implementation capacity â€” designs can be more build-intensive.',
    );
  } else if (totalHrs > 0) {
    implications.push(
      'Light-touch capacity â€” prefer durable, low-maintenance systems.',
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
    <aside className={card.section}>
      <div className={hc.cardEyebrow}>
        <Leaf aria-hidden="true" size={12} /> Steward Snapshot
      </div>
      <p className={card.sectionBody} style={{ marginBottom: 12 }}>
        A quick read on who you are as a steward and what it means for your design.
      </p>

      <div className={hc.snapshotMetric}>
        <Ring value={completeness.pct} />
        <div className={hc.body}>
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
          <strong>{totalHrs > 0 ? `${totalHrs} hrs / wk` : 'â€” hrs / wk'}</strong>
          <span>
            {totalHrs >= 20
              ? 'Strong capacity for both build and maintenance.'
              : totalHrs > 0
              ? 'Light-touch capacity â€” prioritize compounding systems.'
              : 'Capacity not yet captured.'}
          </span>
        </div>
      </div>

      <div className={hc.synthesisBlock} style={{ marginTop: 16 }}>
        <h3>What this implies for design</h3>
        {implications.map((item) => (
          <p key={item}>
            <b>âœ“</b>
            <span>{item}</span>
          </p>
        ))}
      </div>

      <blockquote className={hc.blockquote} style={{ marginTop: 12 }}>
        <strong style={{ display: 'block', marginBottom: 4 }}>Design tip</strong>
        Focus on resilient, low-maintenance systems that compound over time. Match
        ambition to your real capacity, not aspirational hours.
      </blockquote>

      <div className={card.btnRow}>
        <button type="button" className={card.btn}>
          View design implications <ArrowRight aria-hidden="true" size={12} />
        </button>
      </div>
    </aside>
  );
}
