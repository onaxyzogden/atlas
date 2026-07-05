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
import { orderByObjectiveScope, type SectionRoleScope } from '../../roles/viewScope.js';
import css from './SectionGroup.module.css';

interface Props {
  projectId: string;
  groups: FieldActionsByObjective[];
  /** Optional tap-target override forwarded to each card (e.g. open the hub walkthrough). */
  onOpen?: (action: FieldAction) => void;
  /**
   * Operational Role Layer scope (additive). Present ⇒ objective groups outside
   * the viewer's role focus sort last and render de-emphasized (never hidden);
   * absent ⇒ every group renders inline in tier order, exactly as before.
   */
  roleScope?: SectionRoleScope;
}

export default function ActiveTasksSection({
  projectId,
  groups,
  onOpen,
  roleScope,
}: Props) {
  // Count is always the full total -- de-emphasis never changes the tally.
  const count = groups.reduce((n, g) => n + g.tasks.length, 0);

  const { inScope, outScope, dim } = roleScope
    ? orderByObjectiveScope(groups, (g) => g.planObjectiveId, roleScope)
    : { inScope: groups, outScope: [] as FieldActionsByObjective[], dim: false };

  const renderGroup = (g: FieldActionsByObjective, dimmed: boolean) => (
    <div
      key={g.planObjectiveId}
      className={css.group}
      {...(dimmed ? { 'data-scope': 'out' } : {})}
    >
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
  );

  return (
    <CollapsibleSection title="Active tasks" count={count} defaultOpen>
      {groups.length === 0 ? (
        <div className={css.empty}>No active tasks right now.</div>
      ) : (
        <>
          {inScope.map((g) => renderGroup(g, false))}
          {outScope.map((g) => renderGroup(g, dim))}
        </>
      )}
    </CollapsibleSection>
  );
}
