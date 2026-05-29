// ActProtoObjectiveRail.tsx
//
// PROTOTYPE-ONLY left rail. Given the selected tier, lists that tier's
// objectives as ActProtoObjectiveCards with mock status / priority / SEED
// coordinates. Header shows the tier as the active "category". Delete w/ folder.

import type { PlanTier, PlanTierObjective } from '@ogden/shared';
import ActProtoObjectiveCard from './ActProtoObjectiveCard.js';
import {
  protoObjectiveStatus,
  protoPriority,
  protoSeed,
} from './actProtoMock.js';
import styles from './ActProtoTierShell.module.css';

interface Props {
  tier: PlanTier | undefined;
  objectives: PlanTierObjective[];
  centroid: [number, number];
  activeObjectiveId: string | null;
  onSelectObjective: (objectiveId: string) => void;
}

export default function ActProtoObjectiveRail({
  tier,
  objectives,
  centroid,
  activeObjectiveId,
  onSelectObjective,
}: Props) {
  const eyebrow = tier ? `Tier T${tier.ordinal}` : 'Tier';
  return (
    <div className={styles.railPanel}>
      <div className={styles.railHeader}>
        <span className={styles.railEyebrow}>{eyebrow}</span>
        <span className={styles.railTitle}>{tier?.title ?? 'Objectives'}</span>
        {tier?.summary && (
          <span className={styles.railSummary}>{tier.summary}</span>
        )}
      </div>
      {objectives.length === 0 ? (
        <p className={styles.railEmpty}>No objectives in this tier.</p>
      ) : (
        <div className={styles.railList}>
          {objectives.map((objective, index) => (
            <ActProtoObjectiveCard
              key={objective.id}
              objective={objective}
              eyebrow={tier?.title ?? 'Objective'}
              status={protoObjectiveStatus(objective.tierId, index)}
              priority={protoPriority(index)}
              seedLabel={protoSeed(centroid, index).label}
              isActive={objective.id === activeObjectiveId}
              onSelect={() => onSelectObjective(objective.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
