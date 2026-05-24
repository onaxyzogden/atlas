/**
 * ObjectiveEvidenceCapture — one evidence requirement's capture control inside
 * the Objective Execution aside. Presentational + local input state only; all
 * persistence flows through the `onAdd` / `onRemove` handlers the aside wires to
 * `fieldObjectiveStore`. Capture UI varies by `spec.kind`:
 *   - photo        — file picker → data URL per file, thumbnail strip
 *   - confirmation — single toggle (Confirm ↔ Confirmed)
 *   - annotation   — manual "Mark captured" record (v1; auto-detection deferred)
 *   - note         — single editable textarea (also mirrored to the run summary
 *                    by the aside, so it doubles as the completion summary)
 */

import { useRef, useState } from 'react';
import { Camera, Check, MapPin, Plus, X } from 'lucide-react';
import type {
  CapturedEvidence,
  EvidenceSpec,
} from '../../objectives/fieldObjective.js';
import css from './ObjectiveExecutionAside.module.css';

/** A captured item paired with its index in the full run.evidence array. */
export interface IndexedEvidence {
  evidence: CapturedEvidence;
  index: number;
}

interface Props {
  spec: EvidenceSpec;
  items: IndexedEvidence[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export default function ObjectiveEvidenceCapture({
  spec,
  items,
  onAdd,
  onRemove,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const min = spec.min ?? 1;
  const count = items.length;
  const satisfied = count >= min;

  const header = (
    <div className={css.evHead}>
      <span className={css.evLabel}>
        {spec.label}
        {spec.required && <span className={css.req}>*</span>}
      </span>
      <span className={`${css.evCount} ${satisfied ? css.evCountDone : ''}`}>
        {count}/{min}
      </span>
    </div>
  );

  if (spec.kind === 'photo') {
    const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      for (const file of files) {
        try {
          onAdd(await readFileAsDataUrl(file));
        } catch {
          /* skip unreadable file */
        }
      }
      if (fileRef.current) fileRef.current.value = '';
    };
    return (
      <div className={css.evItem}>
        {header}
        {count > 0 && (
          <div className={css.thumbRow}>
            {items.map(({ evidence, index }) => (
              <div key={index} className={css.thumb}>
                <img
                  className={css.thumbImg}
                  src={evidence.value}
                  alt={`${spec.label} ${index + 1}`}
                />
                <button
                  type="button"
                  className={css.thumbRemove}
                  aria-label="Remove photo"
                  onClick={() => onRemove(index)}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          className={css.actionBtn}
          onClick={() => fileRef.current?.click()}
        >
          <Camera size={14} strokeWidth={2} /> Add photo
        </button>
        <input
          ref={fileRef}
          className={css.fileInput}
          type="file"
          accept="image/*"
          multiple
          onChange={onPick}
        />
      </div>
    );
  }

  if (spec.kind === 'confirmation') {
    const first = items[0];
    const confirmed = first !== undefined;
    return (
      <div className={css.evItem}>
        {header}
        <button
          type="button"
          className={`${css.actionBtn} ${confirmed ? css.confirmOn : ''}`}
          onClick={() => (first ? onRemove(first.index) : onAdd(''))}
        >
          <Check size={14} strokeWidth={2} />
          {confirmed ? 'Confirmed' : 'Confirm'}
        </button>
      </div>
    );
  }

  if (spec.kind === 'note') {
    return (
      <NoteCapture spec={spec} items={items} header={header} onAdd={onAdd} />
    );
  }

  // annotation (and audio fallback): manual record capture for v1.
  return (
    <div className={css.evItem}>
      {header}
      {count > 0 && (
        <div className={css.recordRow}>
          {items.map(({ index }, i) => (
            <div key={index} className={css.record}>
              <MapPin size={13} strokeWidth={2} />
              <span>
                {spec.label} {i + 1}
              </span>
              <button
                type="button"
                className={css.recordRemove}
                aria-label="Remove record"
                onClick={() => onRemove(index)}
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button" className={css.actionBtn} onClick={() => onAdd('')}>
        <Plus size={14} strokeWidth={2} /> Mark captured
      </button>
    </div>
  );
}

/** Single-entry note: editable textarea seeded from the existing record. */
function NoteCapture({
  spec,
  items,
  header,
  onAdd,
}: {
  spec: EvidenceSpec;
  items: IndexedEvidence[];
  header: React.ReactNode;
  onAdd: (value: string) => void;
}) {
  const existing = items[0]?.evidence.value ?? '';
  const [draft, setDraft] = useState(existing);
  const dirty = draft.trim() !== existing.trim();
  const saved = !dirty && existing.trim().length > 0;
  return (
    <div className={css.evItem}>
      {header}
      <textarea
        className={css.noteArea}
        value={draft}
        placeholder={spec.label}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className={css.noteRow}>
        {saved && <span className={css.savedHint}>Saved</span>}
        <button
          type="button"
          className={css.actionBtn}
          disabled={!dirty || draft.trim().length === 0}
          onClick={() => onAdd(draft.trim())}
          style={{ marginLeft: 'auto' }}
        >
          Save note
        </button>
      </div>
    </div>
  );
}
