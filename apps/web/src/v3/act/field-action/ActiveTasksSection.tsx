/**
 * ActiveTasksSection — spec §4.2 "Active Tasks". Lists in_progress
 * actions plus submitted-in-review-mode actions (the steward owns
 * them until the verifier acts), grouped by parent objective so
 * the dashboard reads tier-foundation-first.
 */

import type { FieldAction } from '@ogden/shared';
import type { FieldActionsByObjective } from './useFieldActions.js';
import CollapsibleSection from './CollapsibleSection.js';
import FieldActionCard from './FieldActionCard.js';
import { getObjectiveTitle, getTierTitle } from './objectiveLookup.js';
import css from './SectionGroup.module.css';

interface Props {
  projectId: string;
  groups: FieldActionsByObjective[];
  /** Optional tap-target override forwarded to each card (e.g. open the hub walkthrough). */
  onOpen?: (action: FieldAction) => void;
}

export default function ActiveTasksSection({ projectId, groups, onOpen }: Props) {
  const count = groups.reduce((n, g) => n + g.tasks.length, 0);
  return (
    <CollapsibleSection title="Active tasks" count={count} defaultOpen>
      {groups.length === 0 ? (
        <div className={css.empty}>No active tasks right now.</div>
      ) : (
        groups.map((g) => (
          <div key={g.planObjectiveId} className={css.group}>
            <div className={css.groupHeader}>
              <span className={css.objTitle}>
                {getObjectiveTitle(g.planObjectiveId) ?? g.planObjectiveId}
              </span>
              <span className={css.tierTitle}>
                {getTierTitle(g.stratumId) ?? g.stratumId}
              </span>
            </div>
            <div className={css.cardList}>
              {g.tasks.map((t) => (
                <FieldActionCard
                  key={t.id}
                  projectId={projectId}
                  action={t}
                  hideObjectiveLine
                  {...(onOpen ? { onOpen } : {})}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </CollapsibleSection>
  );
}
