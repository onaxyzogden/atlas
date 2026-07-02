/**
 * CompletedTodaySection — spec §4.2 "Completed Today". Verified actions
 * whose doneAt falls inside the rolling-24h window. Collapsed by
 * default; the count pill gives the steward a sense of momentum
 * without occupying screen real estate.
 */

import type { FieldAction } from '@ogden/shared';
import CollapsibleSection from './CollapsibleSection.js';
import FieldActionCard from './FieldActionCard.js';
import { orderByObjectiveScope, type SectionRoleScope } from '../../roles/viewScope.js';
import css from './SectionGroup.module.css';

interface Props {
  projectId: string;
  tasks: FieldAction[];
  /**
   * Operational Role Layer scope (additive). Present ⇒ tasks outside the
   * viewer's role focus sort last and render de-emphasized (never hidden);
   * absent ⇒ the flat list renders exactly as before.
   */
  roleScope?: SectionRoleScope;
}

export default function CompletedTodaySection({
  projectId,
  tasks,
  roleScope,
}: Props) {
  const { inScope, outScope, dim } = roleScope
    ? orderByObjectiveScope(tasks, (t) => t.planObjectiveId, roleScope)
    : { inScope: tasks, outScope: [] as FieldAction[], dim: false };

  const renderCard = (t: FieldAction) => (
    <FieldActionCard
      key={t.id}
      projectId={projectId}
      action={t}
    />
  );

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
        <>
          {inScope.length > 0 && (
            <div className={css.cardList}>{inScope.map(renderCard)}</div>
          )}
          {outScope.length > 0 && (
            <div
              className={css.cardList}
              {...(dim ? { 'data-scope': 'out' } : {})}
            >
              {outScope.map(renderCard)}
            </div>
          )}
        </>
      )}
    </CollapsibleSection>
  );
}
