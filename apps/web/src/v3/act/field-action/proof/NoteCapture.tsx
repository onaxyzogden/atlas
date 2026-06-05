/**
 * NoteCapture — textarea-driven free-text note proof item.
 * Saves on blur so a long-form entry persists without a separate button.
 */

import { useEffect, useState } from 'react';
import type {
  FieldActionProofItem,
  ProofSchemaSlot,
} from '@ogden/shared';
import { useFieldActionStore } from '../../../../store/fieldActionStore.js';
import { baseProofItem } from './proofItemBuilder.js';
import css from './ProofCapture.module.css';

interface Props {
  projectId: string;
  actionId: string;
  slot: ProofSchemaSlot;
  existing: FieldActionProofItem | undefined;
}

export default function NoteCapture({
  projectId,
  actionId,
  slot,
  existing,
}: Props) {
  const attach = useFieldActionStore((s) => s.attachProofItem);
  const [draft, setDraft] = useState(existing?.noteText ?? '');

  useEffect(() => {
    setDraft(existing?.noteText ?? '');
  }, [existing?.id, existing?.noteText]);

  const commit = () => {
    const text = draft.trim();
    if (!text) return;
    if (existing && existing.noteText === text) return;
    const item: FieldActionProofItem = {
      ...baseProofItem({
        proofType: 'note',
        slotId: slot.id,
        id: existing?.id,
      }),
      noteText: text,
    };
    attach(projectId, actionId, item);
  };

  return (
    <div className={css.captureBody}>
      <textarea
        className={css.captureTextarea}
        placeholder={slot.instruction ?? 'Write your note here...'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        data-testid={`proof-note-${slot.id}`}
      />
      {existing?.noteText && draft.trim() === existing.noteText && (
        <span className={css.note}>Saved.</span>
      )}
    </div>
  );
}
