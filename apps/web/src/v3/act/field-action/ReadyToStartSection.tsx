/**
 * ReadyToStartSection — spec §4.2 "Ready to Start". Lists not_started
 * actions whose parent objective is already active or complete, grouped
 * by parent objective in tier order so the steward sees the lowest
 * tier's runway first.
 */

import type { FieldActionsByObjective } from './useFieldActions.js';
import CollapsibleSection from './CollapsibleSection.js';
import FieldActionCard from './FieldActionCard.js';
import { getObjectiveTitle, getTierTitle } from './objectiveLookup.js';
import css from './SectionGroup.module.css';

interface Props {
  projectId: string;
  groups: FieldActionsByObjective[];
}

export default function ReadyToStartSection({ projectId, groups }: Props) {
  const count = groups.reduce((n, g) => n + g.tasks.length, 0);
  return (
    <CollapsibleSection title="Ready to start" count={count} defaultOpen>
      {groups.length === 0 ? (
        <div className={css.empty}>
          Nothing is queued up. Complete a few planning objectives to unlock new field actions.
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.planObjectiveId} className={css.group}>
            <div className={css.groupHeader}>
              <span className={css.objTitle}>
                {getObjectiveTitle(g.planObjectiveId) ?? g.planObjectiveId}
              </span>
              <span className={css.tierTitle}>
                {getTierTitle(g.tierId) ?? g.tierId}
              </span>
            </div>
            <div className={css.cardList}>
              {g.tasks.map((t) => (
                <FieldActionCard
                  key={t.id}
                  projectId={projectId}
                  action={t}
                  hideObjectiveLine
                />
              ))}
            </div>
          </div>
        ))
      )}
    </CollapsibleSection>
  );
}
