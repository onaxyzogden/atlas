/**
 * VisionProfileSidebar — the live Vision Profile summary. Lists every
 * answered (and currently visible) question with its selected option labels
 * and an "Edit" jump back to that question. Marked "Live" — it updates on
 * every answer because it reads the same store-backed profile.
 */

import { Pencil } from 'lucide-react';
import type { VisionProfile } from '@ogden/shared';
import type {
  DeferredTopic,
  VisionQuestion,
} from '../data/visionBuilderQuestions.js';
import styles from './VisionProfileSidebar.module.css';

interface Props {
  visibleQuestions: VisionQuestion[];
  selectedFor: (question: VisionQuestion) => string[];
  onJump: (id: string) => void;
  /** Topics deferred to the Plan stage, surfaced read-only so nothing feels lost. */
  deferredTopics?: DeferredTopic[];
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
  deferredTopics = [],
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

      {deferredTopics.length > 0 && (
        <section className={styles.deferred} aria-label="Explored later in the Plan stage">
          <h3 className={styles.deferredHeading}>Explored later in the Plan stage</h3>
          <p className={styles.deferredNote}>
            These are advised from what Observe captures and your guided layout —
            no need to decide them now.
          </p>
          <div className={styles.deferredChips}>
            {deferredTopics.map((topic) => (
              <span
                key={topic.id}
                className={styles.deferredChip}
                title={topic.title}
              >
                {topic.eyebrow}
              </span>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
