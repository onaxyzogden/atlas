/**
 * CompletedTodaySection — spec §4.2 "Completed Today". Verified actions
 * whose doneAt falls inside the rolling-24h window. Collapsed by
 * default; the count pill gives the steward a sense of momentum
 * without occupying screen real estate.
 */

import type { FieldAction } from '@ogden/shared';
import CollapsibleSection from './CollapsibleSection.js';
import FieldActionCard from './FieldActionCard.js';
import css from './SectionGroup.module.css';

interface Props {
  projectId: string;
  tasks: FieldAction[];
  /** Optional tap-target override forwarded to each card (e.g. open the hub walkthrough). */
  onOpen?: (action: FieldAction) => void;
}

export default function CompletedTodaySection({ projectId, tasks, onOpen }: Props) {
  return (
    <CollapsibleSection
      title="Completed today"
      count={tasks.length}
      defaultOpen={false}
      tone="muted"
    >
      {tasks.length === 0 ? (
        <div className={css.empty}>No verified field actions in the last 24 hours.</div>
      ) : (
        <div className={css.cardList}>
          {tasks.map((t) => (
            <FieldActionCard
              key={t.id}
              projectId={projectId}
              action={t}
              {...(onOpen ? { onOpen } : {})}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}
