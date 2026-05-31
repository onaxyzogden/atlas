// ActTierObjectiveCard.tsx
//
// Objective card for the left rail: category eyebrow, title, focused
// question, and a REAL checklist-progress chip ("3/5 done") derived from the
// objective's checklist + planStratumStore completion (the same signal the
// right-rail execution panel shows). Mirrors the role="button" keyboard
// pattern of the real ObjectiveCard. The prototype's mock priority +
// SEED-coordinate badges are dropped — progress is the live signal here.

import type { KeyboardEvent } from 'react';
import type { PlanStratumObjective } from '@ogden/shared';
import type { ObjectiveProgress } from './objectiveProgress.js';
import styles from './ActTierShell.module.css';

interface Props {
  objective: PlanStratumObjective;
  eyebrow: string;
  progress: ObjectiveProgress;
  isActive: boolean;
  onSelect: () => void;
}

export default function ActTierObjectiveCard({
  objective,
  eyebrow,
  progress,
  isActive,
  onSelect,
}: Props) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  }

  const progressLabel =
    progress.total === 0
      ? 'No tasks yet'
      : `${progress.verified}/${progress.total} done`;

  return (
    <div
      className={styles.objCard}
      role="button"
      tabIndex={0}
      data-status={progress.state}
      data-active={isActive}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.objEyebrow}>{eyebrow}</span>
      <span className={styles.objTitle}>{objective.title}</span>
      <span className={styles.objDesc}>{objective.focusedQuestion}</span>
      <div className={styles.objFooter}>
        <span className={styles.objProgress} data-state={progress.state}>
          {progressLabel}
        </span>
      </div>
    </div>
  );
}
