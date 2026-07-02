/**
 * BlockedDivergedSection — spec §4.2 "Blocked + Diverged". Flat list,
 * collapsed by default so it doesn't dominate the dashboard; the count
 * pill keeps attention available when the steward needs it.
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

export default function BlockedDivergedSection({
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
      title="Blocked &amp; diverged"
      count={tasks.length}
      defaultOpen={false}
      tone="amber"
    >
      {tasks.length === 0 ? (
        <div className={css.empty}>Nothing blocked or diverged.</div>
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
