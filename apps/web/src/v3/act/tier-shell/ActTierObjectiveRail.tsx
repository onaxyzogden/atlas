// ActTierObjectiveRail.tsx
//
// Left rail: the selected stratum's objectives as ActTierObjectiveCards. The
// per-objective progress map is computed once in ActTierShell (see
// objectiveProgress.ts) and passed in, so the rail and the map markers always
// agree and neither recomputes. Header shows the active stratum as category.

import type { PlanStratum, PlanStratumObjective } from '@ogden/shared';
import ActTierObjectiveCard from './ActTierObjectiveCard.js';
import type { ObjectiveProgress } from './objectiveProgress.js';
import styles from './ActTierShell.module.css';

const EMPTY_PROGRESS: ObjectiveProgress = {
  total: 0,
  verified: 0,
  state: 'available',
};

interface Props {
  stratum: PlanStratum | undefined;
  objectives: readonly PlanStratumObjective[];
  progressByObjective: Readonly<Record<string, ObjectiveProgress>>;
  activeObjectiveId: string | null;
  onSelectObjective: (objectiveId: string) => void;
}

export default function ActTierObjectiveRail({
  stratum,
  objectives,
  progressByObjective,
  activeObjectiveId,
  onSelectObjective,
}: Props) {
  const eyebrow = stratum ? `Stratum S${stratum.ordinal}` : 'Stratum';

  return (
    <div className={styles.railPanel}>
      <div className={styles.railHeader}>
        <span className={styles.railEyebrow}>{eyebrow}</span>
        <span className={styles.railTitle}>{stratum?.title ?? 'Objectives'}</span>
        {stratum?.summary && (
          <span className={styles.railSummary}>{stratum.summary}</span>
        )}
      </div>
      {objectives.length === 0 ? (
        <p className={styles.railEmpty}>No objectives in this stratum.</p>
      ) : (
        <div className={styles.railList}>
          {objectives.map((objective) => (
            <ActTierObjectiveCard
              key={objective.id}
              objective={objective}
              eyebrow={stratum?.title ?? 'Objective'}
              progress={progressByObjective[objective.id] ?? EMPTY_PROGRESS}
              isActive={objective.id === activeObjectiveId}
              onSelect={() => onSelectObjective(objective.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
