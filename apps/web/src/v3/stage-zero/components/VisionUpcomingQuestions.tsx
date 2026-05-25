/**
 * VisionUpcomingQuestions — collapsible preview of the next few visible
 * questions, so the steward can see what's ahead without losing focus on the
 * current one. Count is dynamic (conditional questions appear/disappear).
 */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { VisionQuestion } from '../data/visionBuilderQuestions.js';
import styles from './VisionUpcomingQuestions.module.css';

interface Props {
  upcoming: VisionQuestion[];
  onJump: (id: string) => void;
}

export function VisionUpcomingQuestions({ upcoming, onJump }: Props) {
  const [open, setOpen] = useState(false);
  if (upcoming.length === 0) return null;

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <ChevronDown
          size={15}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          aria-hidden="true"
        />
        Upcoming questions
        <span className={styles.count}>{upcoming.length}</span>
      </button>

      {open && (
        <ol className={styles.list}>
          {upcoming.map((q) => (
            <li key={q.id}>
              <button
                type="button"
                className={styles.item}
                onClick={() => onJump(q.id)}
              >
                <span className={styles.itemEyebrow}>{q.eyebrow}</span>
                <span className={styles.itemTitle}>{q.title}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
