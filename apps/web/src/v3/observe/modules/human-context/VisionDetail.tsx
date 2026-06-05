import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  CheckCircle2,
  Edit3,
  Sprout,
  Sun,
  Trash2,
  TriangleAlert,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useVisionStore } from '../../../../store/visionStore.js';
import { MoodboardUploader } from './MoodboardUploader.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import hc from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';

type PhaseKey = 'year1' | 'years2to3' | 'years4plus';

const PHASE_LABELS: Record<PhaseKey, [string, string]> = {
  year1: ['Near term (1–2 yrs)', 'Year 1 priorities'],
  years2to3: ['Mid term (3–7 yrs)', 'Years 2–3 priorities'],
  years4plus: ['Long term (8+ yrs)', 'Years 4+ aspirations'],
};

export default function VisionDetail() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';

  const ensureDefaults = useVisionStore((s) => s.ensureDefaults);
  const updateSharedVision = useVisionStore((s) => s.updateSharedVision);
  const setSharedVisionList = useVisionStore((s) => s.setSharedVisionList);
  const updatePhaseNote = useVisionStore((s) => s.updatePhaseNote);
  const addMoodboardImage = useVisionStore((s) => s.addMoodboardImage);
  const removeMoodboardImage = useVisionStore((s) => s.removeMoodboardImage);
  const setConceptImage = useVisionStore((s) => s.setConceptImage);
  const vision = useVisionStore((s) => s.getVisionData(id));

  useEffect(() => {
    ensureDefaults(id);
  }, [id, ensureDefaults]);

  const sv = vision?.sharedVision;
  const phaseNotesMap = (vision?.phaseNotes ?? []).reduce<Record<string, string>>(
    (acc, p) => {
      acc[p.phaseKey] = p.notes;
      return acc;
    },
    {},
  );

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-human-context-vision"
        lede="Translate intention into a long-horizon direction. Clarify what this land is for, how it should feel, what functions it must support, and what success looks like over time."
      />

      <ConceptSection
        dataUrl={sv?.conceptImageDataUrl}
        onUpload={(url) => setConceptImage(id, url)}
        onClear={() => setConceptImage(id, undefined)}
      />

      <QuoteSection
        value={sv?.statement ?? ''}
        onChange={(v) => updateSharedVision(id, { statement: v })}
      />

      <div className={card.grid}>
        <ChipSection
          title="Core functions"
          icon={Sprout}
          items={sv?.coreFunctions ?? []}
          onAdd={(value) =>
            setSharedVisionList(id, 'coreFunctions', [
              ...(sv?.coreFunctions ?? []),
              value,
            ])
          }
          onRemove={(idx) =>
            setSharedVisionList(
              id,
              'coreFunctions',
              (sv?.coreFunctions ?? []).filter((_, i) => i !== idx),
            )
          }
          placeholder="New core function"
        />
        <ChipSection
          title="Experience goals"
          icon={Sun}
          items={sv?.experienceGoals ?? []}
          onAdd={(value) =>
            setSharedVisionList(id, 'experienceGoals', [
              ...(sv?.experienceGoals ?? []),
              value,
            ])
          }
          onRemove={(idx) =>
            setSharedVisionList(
              id,
              'experienceGoals',
              (sv?.experienceGoals ?? []).filter((_, i) => i !== idx),
            )
          }
          placeholder="New experience goal"
        />
      </div>

      <AspirationSection
        notesByPhase={phaseNotesMap}
        onChange={(phaseKey, notes) => updatePhaseNote(id, phaseKey, notes)}
      />

      <ListSection
        title="What success looks like"
        icon={CheckCircle2}
        items={sv?.successMetrics ?? []}
        onAdd={(value) =>
          setSharedVisionList(id, 'successMetrics', [
            ...(sv?.successMetrics ?? []),
            value,
          ])
        }
        onRemove={(idx) =>
          setSharedVisionList(
            id,
            'successMetrics',
            (sv?.successMetrics ?? []).filter((_, i) => i !== idx),
          )
        }
        placeholder="New success metric"
      />

      <div className={card.grid}>
        <ListSection
          title="Design principles"
          icon={Sprout}
          items={sv?.principles ?? []}
          onAdd={(v) =>
            setSharedVisionList(id, 'principles', [...(sv?.principles ?? []), v])
          }
          onRemove={(idx) =>
            setSharedVisionList(
              id,
              'principles',
              (sv?.principles ?? []).filter((_, i) => i !== idx),
            )
          }
          placeholder="New principle"
        />
        <ListSection
          title="Guiding values"
          icon={Sprout}
          items={sv?.guidingValues ?? []}
          onAdd={(v) =>
            setSharedVisionList(id, 'guidingValues', [...(sv?.guidingValues ?? []), v])
          }
          onRemove={(idx) =>
            setSharedVisionList(
              id,
              'guidingValues',
              (sv?.guidingValues ?? []).filter((_, i) => i !== idx),
            )
          }
          placeholder="New value"
        />
        <ListSection
          title="Key constraints"
          icon={TriangleAlert}
          items={sv?.constraints ?? []}
          onAdd={(v) =>
            setSharedVisionList(id, 'constraints', [...(sv?.constraints ?? []), v])
          }
          onRemove={(idx) =>
            setSharedVisionList(
              id,
              'constraints',
              (sv?.constraints ?? []).filter((_, i) => i !== idx),
            )
          }
          placeholder="New constraint"
        />
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Moodboard</h2>
          <MoodboardUploader
            images={sv?.moodboardImages ?? []}
            onAdd={(image) => addMoodboardImage(id, image)}
            onRemove={(imageId) => removeMoodboardImage(id, imageId)}
          />
        </section>
      </div>

      <blockquote className={hc.blockquote} style={{ marginTop: 16 }}>
        <Sprout aria-hidden="true" size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        We don&apos;t inherit the land from our ancestors; we borrow it from our children.
        <span style={{ display: 'block', marginTop: 6, fontStyle: 'normal', fontSize: 11, opacity: 0.6 }}>
          — Indigenous proverb
        </span>
      </blockquote>
    </div>
  );
}

interface ConceptSectionProps {
  dataUrl?: string;
  onUpload: (dataUrl: string) => void;
  onClear: () => void;
}

function ConceptSection({ dataUrl, onUpload, onClear }: ConceptSectionProps) {
  async function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return;
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    onUpload(url);
  }

  return (
    <section className={card.section}>
      <h2 className={card.sectionTitle}>Concept image</h2>
      {dataUrl ? (
        <div style={{ position: 'relative' }}>
          <img
            src={dataUrl}
            alt="Concept landscape"
            style={{
              width: '100%',
              maxHeight: 280,
              objectFit: 'cover',
              borderRadius: 8,
              display: 'block',
            }}
          />
          <button
            type="button"
            className={card.removeBtn}
            aria-label="Remove concept image"
            onClick={onClear}
            style={{ position: 'absolute', top: 8, right: 8 }}
          >
            <X aria-hidden="true" size={12} />
          </button>
        </div>
      ) : (
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: 32,
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: 8,
            color: 'rgba(232,220,200,0.55)',
            cursor: 'pointer',
          }}
        >
          <Upload aria-hidden="true" size={20} />
          <span style={{ fontSize: 13 }}>Upload concept image</span>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
          />
        </label>
      )}
    </section>
  );
}

interface QuoteSectionProps {
  value: string;
  onChange: (value: string) => void;
}

function QuoteSection({ value, onChange }: QuoteSectionProps) {
  const [editing, setEditing] = useState(false);

  return (
    <section className={card.section}>
      <h2 className={card.sectionTitle}>
        Vision in one sentence
        <Sun aria-hidden="true" size={14} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
      </h2>
      {editing ? (
        <label className={`${card.field} ${card.full}`}>
          <span>Your vision</span>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="A small homestead that…"
            maxLength={500}
          />
        </label>
      ) : (
        <blockquote className={hc.blockquote}>
          {value || 'Not yet captured.'}
        </blockquote>
      )}
      <div className={card.btnRow}>
        <button
          type="button"
          className={card.btn}
          onClick={() => setEditing((v) => !v)}
        >
          <Edit3 aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {editing ? 'Done' : 'Edit vision statement'}
        </button>
      </div>
    </section>
  );
}

interface ChipSectionProps {
  title: string;
  icon: LucideIcon;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}

function ChipSection({ title, icon: Icon, items, onAdd, onRemove, placeholder }: ChipSectionProps) {
  return (
    <section className={card.section}>
      <h2 className={card.sectionTitle}>
        <Icon aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
        {title}
      </h2>
      <ChipEditor
        items={items}
        onAdd={onAdd}
        onRemove={onRemove}
        placeholder={placeholder}
      />
      {items.length === 0 ? <p className={card.empty}>Not yet captured.</p> : null}
    </section>
  );
}

interface AspirationSectionProps {
  notesByPhase: Record<string, string>;
  onChange: (phaseKey: PhaseKey, notes: string) => void;
}

function AspirationSection({ notesByPhase, onChange }: AspirationSectionProps) {
  return (
    <section className={card.section}>
      <h2 className={card.sectionTitle}>Phased aspiration</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(Object.keys(PHASE_LABELS) as PhaseKey[]).map((key) => {
          const [title, placeholder] = PHASE_LABELS[key];
          return (
            <label key={key} className={`${card.field} ${card.full}`}>
              <span>
                <Sprout aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {title}
              </span>
              <textarea
                value={notesByPhase[key] ?? ''}
                placeholder={placeholder}
                maxLength={500}
                onChange={(e) => onChange(key, e.target.value)}
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}

interface ListSectionProps {
  title: string;
  icon: LucideIcon;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}

function ListSection({
  title,
  icon: Icon,
  items,
  onAdd,
  onRemove,
  placeholder,
}: ListSectionProps) {
  const [draft, setDraft] = useState('');

  function commit(e: FormEvent) {
    e.preventDefault();
    const v = draft.trim();
    if (!v) return;
    onAdd(v);
    setDraft('');
  }

  return (
    <section className={card.section}>
      <h2 className={card.sectionTitle}>
        <Icon aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
        {title}
      </h2>
      {items.length > 0 ? (
        <ul className={card.list}>
          {items.map((item, idx) => (
            <li key={`${item}-${idx}`} className={card.listRow}>
              <span>{item}</span>
              <button
                type="button"
                className={card.removeBtn}
                onClick={() => onRemove(idx)}
                aria-label={`Remove ${item}`}
              >
                <Trash2 aria-hidden="true" size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={card.empty}>Not yet captured.</p>
      )}
      <form onSubmit={commit} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            padding: '8px 10px',
            fontSize: 13,
            color: 'rgba(232,220,200,0.92)',
            fontFamily: 'inherit',
          }}
        />
        <button type="submit" className={card.btn}>
          Add
        </button>
      </form>
    </section>
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
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        placeholder={placeholder ?? 'Add…'}
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
          flex: '1 1 160px',
          minWidth: 140,
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
