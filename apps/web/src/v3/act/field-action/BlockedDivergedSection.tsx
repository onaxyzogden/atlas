/**
 * BlockedDivergedSection — spec §4.2 "Blocked + Diverged". Flat list,
 * collapsed by default so it doesn't dominate the dashboard; the count
 * pill keeps attention available when the steward needs it.
 */

import type { FieldAction } from '@ogden/shared';
import CollapsibleSection from './CollapsibleSection.js';
import FieldActionCard from './FieldActionCard.js';
import css from './SectionGroup.module.css';

interface Props {
  projectId: string;
  tasks: FieldAction[];
}

export default function BlockedDivergedSection({ projectId, tasks }: Props) {
  return (
    <CollapsibleSection
      title="Blocked &amp; diverged"
      count={tasks.length}
      defaultOpen={false}
      tone="amber"
    >
      {tasks.length === 0 ? (
        <div className={css.empty}>Nothing blocked or diverged.</div>
      ) : (
        <div className={css.cardList}>
          {tasks.map((t) => (
            <FieldActionCard key={t.id} projectId={projectId} action={t} />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}
