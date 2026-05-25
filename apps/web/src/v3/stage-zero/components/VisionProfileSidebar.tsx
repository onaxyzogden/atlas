/**
 * VisionProfileSidebar — the live Vision Profile summary. Lists every
 * answered (and currently visible) question with its selected option labels
 * and an "Edit" jump back to that question. Marked "Live" — it updates on
 * every answer because it reads the same store-backed profile.
 */

import { Pencil } from 'lucide-react';
import type { VisionProfile } from '@ogden/shared';
import type { VisionQuestion } from '../data/visionBuilderQuestions.js';
import styles from './VisionProfileSidebar.module.css';

interface Props {
  visibleQuestions: VisionQuestion[];
  selectedFor: (question: VisionQuestion) => string[];
  onJump: (id: string) => void;
}

function labelsFor(question: VisionQuestion, ids: string[]): string[] {
  return ids.map((id) => {
    const opt = question.options.find((o) => o.id === id);
    return opt?.label ?? id;
  });
}

export function VisionProfileSidebar({
  visibleQuestions,
  selectedFor,
  onJump,
}: Props) {
  const answered = visibleQuestions
    .map((q) => ({ q, ids: selectedFor(q) }))
    .filter((row) => row.ids.length > 0);

  return (
    <aside className={styles.root} aria-label="Vision Profile summary">
      <div className={styles.header}>
        <h2 className={styles.heading}>Vision Profile</h2>
        <span className={styles.live}>
          <span className={styles.liveDot} aria-hidden="true" />
          Live
        </span>
      </div>

      {answered.length === 0 ? (
        <p className={styles.empty}>
          Your answers appear here as you build your land vision.
        </p>
      ) : (
        <dl className={styles.list}>
          {answered.map(({ q, ids }) => (
            <div key={q.id} className={styles.row}>
              <dt className={styles.term}>
                <span>{q.eyebrow}</span>
                <button
                  type="button"
                  className={styles.edit}
                  onClick={() => onJump(q.id)}
                  aria-label={`Edit ${q.eyebrow}`}
                >
                  <Pencil size={12} />
                  Edit
                </button>
              </dt>
              <dd className={styles.values}>
                {labelsFor(q, ids).map((label) => (
                  <span key={label} className={styles.chip}>
                    {label}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
}
