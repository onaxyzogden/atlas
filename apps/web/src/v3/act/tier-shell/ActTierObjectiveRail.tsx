// ActTierObjectiveRail.tsx
//
// Left rail: the selected stratum's objectives as ActTierObjectiveCards. The
// per-objective progress map is computed once in ActTierShell (see
// objectiveProgress.ts) and passed in, so the rail and the map markers always
// agree and neither recomputes. Header shows the active stratum as category.
//
// A mode toggle at the top switches the rail between the objective list and the
// standing-protocol library (ProtocolLayerPanel, reused from the Plan spine).
// An aggregate amber badge on the Protocols segment flags triggered protocols.

import type {
  PlanStratum,
  PlanStratumObjective,
  ProjectTypeId,
} from '@ogden/shared';
import ActTierObjectiveCard from './ActTierObjectiveCard.js';
import ActRailModeToggle, { type RailMode } from './ActRailModeToggle.js';
import type { ObjectiveProgress } from './objectiveProgress.js';
import ProtocolLayerPanel from '../../plan/strata/ProtocolLayerPanel.js';
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
  mode: RailMode;
  onModeChange: (mode: RailMode) => void;
  triggeredCount: number;
  projectId: string;
  primaryTypeId: ProjectTypeId | null;
  secondaryTypeIds: readonly ProjectTypeId[];
}

export default function ActTierObjectiveRail({
  stratum,
  objectives,
  progressByObjective,
  activeObjectiveId,
  onSelectObjective,
  mode,
  onModeChange,
  triggeredCount,
  projectId,
  primaryTypeId,
  secondaryTypeIds,
}: Props) {
  const eyebrow = stratum ? `Stratum S${stratum.ordinal}` : 'Stratum';

  return (
    <div className={styles.railPanel}>
      <div className={styles.railModeBar}>
        <ActRailModeToggle
          mode={mode}
          onChange={onModeChange}
          attentionCount={triggeredCount}
        />
      </div>

      {mode === 'protocols' ? (
        <div className={styles.railProtocolBody}>
          <ProtocolLayerPanel
            projectId={projectId}
            primaryTypeId={primaryTypeId}
            secondaryTypeIds={secondaryTypeIds}
          />
        </div>
      ) : (
        <>
          <div className={styles.railHeader}>
            <span className={styles.railEyebrow}>{eyebrow}</span>
            <span className={styles.railTitle}>
              {stratum?.title ?? 'Objectives'}
            </span>
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
        </>
      )}
    </div>
  );
}
