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
} from 'lucide-react';
import {
  ChipList,
  SurfaceCard,
  TextAreaField,
} from '../../_shared/components/index.js';
import { useVisionStore } from '../../../../store/visionStore.js';
import { MoodboardUploader } from './MoodboardUploader.js';

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
  const updateSteward = useVisionStore((s) => s.updateSteward);
  const setStewardList = useVisionStore((s) => s.setStewardList);
  const updatePhaseNote = useVisionStore((s) => s.updatePhaseNote);
  const addMoodboardImage = useVisionStore((s) => s.addMoodboardImage);
  const removeMoodboardImage = useVisionStore((s) => s.removeMoodboardImage);
  const setConceptImage = useVisionStore((s) => s.setConceptImage);
  const vision = useVisionStore((s) => s.getVisionData(id));

  useEffect(() => {
    ensureDefaults(id);
  }, [id, ensureDefaults]);

  const steward = vision?.steward;

  return (
    <div className="detail-page vision-page">
      <section className="vision-top-grid">
        <VisionIntro />
        <ConceptPanel
          dataUrl={steward?.conceptImageDataUrl}
          onUpload={(url) => setConceptImage(id, url)}
          onClear={() => setConceptImage(id, undefined)}
        />
        <QuotePanel
          value={steward?.vision ?? ''}
          onChange={(v) => updateSteward(id, { vision: v })}
        />
      </section>

      <section className="vision-middle-grid">
        <ChipPanel
          title="Core functions"
          icon={Sprout}
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
          addPlaceholder="New core function"
        />
        <ChipPanel
          title="Experience goals"
          icon={Sun}
          items={steward?.experienceGoals ?? []}
          onAdd={(value) =>
            setStewardList(id, 'experienceGoals', [
              ...(steward?.experienceGoals ?? []),
              value,
            ])
          }
          onRemove={(idx) =>
            setStewardList(
              id,
              'experienceGoals',
              (steward?.experienceGoals ?? []).filter((_, i) => i !== idx),
            )
          }
          addPlaceholder="New experience goal"
        />
        <AspirationPanel
          notesByPhase={
            (vision?.phaseNotes ?? []).reduce<Record<string, string>>((acc, p) => {
              acc[p.phaseKey] = p.notes;
              return acc;
            }, {})
          }
          onChange={(phaseKey, notes) => updatePhaseNote(id, phaseKey, notes)}
        />
        <ListPanel
          title="What success looks like"
          icon={CheckCircle2}
          items={steward?.successMetrics ?? []}
          onAdd={(value) =>
            setStewardList(id, 'successMetrics', [
              ...(steward?.successMetrics ?? []),
              value,
            ])
          }
          onRemove={(idx) =>
            setStewardList(
              id,
              'successMetrics',
              (steward?.successMetrics ?? []).filter((_, i) => i !== idx),
            )
          }
          addPlaceholder="New success metric"
        />
      </section>

      <section className="vision-bottom-grid">
        <ListPanel
          title="Design principles"
          icon={Sprout}
          items={steward?.principles ?? []}
          onAdd={(v) =>
            setStewardList(id, 'principles', [...(steward?.principles ?? []), v])
          }
          onRemove={(idx) =>
            setStewardList(
              id,
              'principles',
              (steward?.principles ?? []).filter((_, i) => i !== idx),
            )
          }
          addPlaceholder="New principle"
        />
        <ListPanel
          title="Guiding values"
          icon={Sprout}
          items={steward?.guidingValues ?? []}
          onAdd={(v) =>
            setStewardList(id, 'guidingValues', [...(steward?.guidingValues ?? []), v])
          }
          onRemove={(idx) =>
            setStewardList(
              id,
              'guidingValues',
              (steward?.guidingValues ?? []).filter((_, i) => i !== idx),
            )
          }
          addPlaceholder="New value"
        />
        <ListPanel
          title="Key constraints"
          icon={TriangleAlert}
          tone="warning"
          items={steward?.constraints ?? []}
          onAdd={(v) =>
            setStewardList(id, 'constraints', [...(steward?.constraints ?? []), v])
          }
          onRemove={(idx) =>
            setStewardList(
              id,
              'constraints',
              (steward?.constraints ?? []).filter((_, i) => i !== idx),
            )
          }
          addPlaceholder="New constraint"
        />
        <SurfaceCard className="vision-panel moodboard-panel">
          <h2>Moodboard</h2>
          <MoodboardUploader
            images={steward?.moodboardImages ?? []}
            onAdd={(image) => addMoodboardImage(id, image)}
            onRemove={(imageId) => removeMoodboardImage(id, imageId)}
          />
        </SurfaceCard>
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

interface ConceptPanelProps {
  dataUrl?: string;
  onUpload: (dataUrl: string) => void;
  onClear: () => void;
}

function ConceptPanel({ dataUrl, onUpload, onClear }: ConceptPanelProps) {
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
    <SurfaceCard className="concept-panel">
      {dataUrl ? (
        <div className="concept-image-wrap">
          <img src={dataUrl} alt="Concept landscape" className="concept-image" />
          <button
            type="button"
            className="concept-clear"
            aria-label="Remove concept image"
            onClick={onClear}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label className="concept-empty">
          <Upload aria-hidden="true" />
          <span>Upload concept image</span>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
          />
        </label>
      )}
    </SurfaceCard>
  );
}

interface QuotePanelProps {
  value: string;
  onChange: (value: string) => void;
}

function QuotePanel({ value, onChange }: QuotePanelProps) {
  const [editing, setEditing] = useState(false);

  return (
    <SurfaceCard className="quote-panel">
      <h2>
        Vision in one sentence <Sun aria-hidden="true" />
      </h2>
      {editing ? (
        <TextAreaField
          label=""
          value={value}
          onChange={onChange}
          placeholder="A small homestead that…"
        />
      ) : (
        <blockquote>{value || 'Not yet captured.'}</blockquote>
      )}
      <button
        className="outlined-button"
        type="button"
        onClick={() => setEditing((v) => !v)}
      >
        <Edit3 aria-hidden="true" /> {editing ? 'Done' : 'Edit vision statement'}
      </button>
    </SurfaceCard>
  );
}

interface ChipPanelProps {
  title: string;
  icon: typeof Sprout;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  addPlaceholder: string;
}

function ChipPanel({ title, icon: Icon, items, onAdd, onRemove, addPlaceholder }: ChipPanelProps) {
  return (
    <SurfaceCard className="vision-panel chip-panel">
      <h2>
        {title} <Icon aria-hidden="true" />
      </h2>
      <ChipList
        items={items}
        removable
        onAdd={onAdd}
        onRemove={onRemove}
        addPlaceholder={addPlaceholder}
      />
      {items.length === 0 ? <p className="empty-note">Not yet captured.</p> : null}
    </SurfaceCard>
  );
}

interface AspirationPanelProps {
  notesByPhase: Record<string, string>;
  onChange: (phaseKey: PhaseKey, notes: string) => void;
}

function AspirationPanel({ notesByPhase, onChange }: AspirationPanelProps) {
  return (
    <SurfaceCard className="vision-panel aspiration-panel">
      <h2>Phased aspiration</h2>
      {(Object.keys(PHASE_LABELS) as PhaseKey[]).map((key) => {
        const [title, placeholder] = PHASE_LABELS[key];
        return (
          <div className="phase-row" key={key}>
            <Sprout aria-hidden="true" />
            <strong>{title}</strong>
            <TextAreaField
              label=""
              value={notesByPhase[key] ?? ''}
              placeholder={placeholder}
              onChange={(v) => onChange(key, v)}
            />
          </div>
        );
      })}
    </SurfaceCard>
  );
}

interface ListPanelProps {
  title: string;
  icon: typeof Sprout;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  addPlaceholder: string;
  tone?: 'green' | 'warning';
}

function ListPanel({
  title,
  icon: Icon,
  items,
  onAdd,
  onRemove,
  addPlaceholder,
  tone = 'green',
}: ListPanelProps) {
  const [draft, setDraft] = useState('');

  function commit(e: FormEvent) {
    e.preventDefault();
    const v = draft.trim();
    if (!v) return;
    onAdd(v);
    setDraft('');
  }

  return (
    <SurfaceCard className={`vision-panel list-panel ${tone}`}>
      <h2>{title}</h2>
      {items.length > 0 ? (
        items.map((item, idx) => (
          <div className="list-panel-row" key={`${item}-${idx}`}>
            <Icon aria-hidden="true" />
            <span>{item}</span>
            <button
              type="button"
              aria-label={`Remove ${item}`}
              className="icon-button"
              onClick={() => onRemove(idx)}
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        ))
      ) : (
        <p className="empty-note">Not yet captured.</p>
      )}
      <form className="add-row" onSubmit={commit}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={addPlaceholder}
        />
        <button type="submit" className="outlined-button">
          Add
        </button>
      </form>
    </SurfaceCard>
  );
}
