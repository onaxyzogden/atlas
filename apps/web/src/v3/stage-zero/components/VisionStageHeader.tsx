/**
 * VisionStageHeader — the builder's own top spine
 * (STAGE ZERO VISION BUILDER → OBSERVE → PLAN → ACT) plus "Save Progress".
 *
 * Local to the builder page by design — the global HeaderStageSpine is left
 * untouched (lower blast radius; the builder is a full-screen takeover).
 */

import { Check, ChevronRight, Save } from 'lucide-react';
import styles from './VisionStageHeader.module.css';

const STAGES = ['Stage Zero Vision Builder', 'Observe', 'Plan', 'Act'] as const;

interface Props {
  onSave: () => void;
  saved: boolean;
}

export function VisionStageHeader({ onSave, saved }: Props) {
  return (
    <header className={styles.root}>
      <nav className={styles.spine} aria-label="Lifecycle stages">
        {STAGES.map((stage, i) => {
          const active = i === 0;
          return (
            <div key={stage} className={styles.spineItem}>
              <span
                className={`${styles.stage} ${active ? styles.stageActive : ''}`}
                aria-current={active ? 'step' : undefined}
              >
                {stage}
              </span>
              {i < STAGES.length - 1 && (
                <ChevronRight size={14} className={styles.sep} aria-hidden="true" />
              )}
            </div>
          );
        })}
      </nav>

      <button type="button" className={styles.save} onClick={onSave}>
        {saved ? <Check size={15} /> : <Save size={15} />}
        {saved ? 'Saved' : 'Save Progress'}
      </button>
    </header>
  );
}
