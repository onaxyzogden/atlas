// ActProtoObjectiveCard.tsx
//
// PROTOTYPE-ONLY rich objective card for the left rail, matching the concept
// screenshot: category eyebrow, title, description, a SEED + coords badge, and
// a priority chip. Mirrors the role="button" keyboard pattern of the real
// ObjectiveCard but is laid out vertically (card, not row). Delete with folder.

import { MapPin } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import type { PlanTierObjective, PlanTierObjectiveStatus } from '@ogden/shared';
import type { ProtoPriority } from './actProtoMock.js';
import styles from './ActProtoTierShell.module.css';

interface Props {
  objective: PlanTierObjective;
  eyebrow: string;
  status: PlanTierObjectiveStatus;
  priority: ProtoPriority;
  seedLabel: string;
  isActive: boolean;
  onSelect: () => void;
}

export default function ActProtoObjectiveCard({
  objective,
  eyebrow,
  status,
  priority,
  seedLabel,
  isActive,
  onSelect,
}: Props) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      className={styles.objCard}
      role="button"
      tabIndex={0}
      data-status={status}
      data-active={isActive}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.objEyebrow}>{eyebrow}</span>
      <span className={styles.objTitle}>{objective.title}</span>
      <span className={styles.objDesc}>{objective.focusedQuestion}</span>
      <div className={styles.objFooter}>
        <span className={styles.objSeed}>
          <MapPin size={11} aria-hidden="true" />
          SEED {seedLabel}
        </span>
        <span className={styles.objPriority} data-priority={priority}>
          {priority}
        </span>
      </div>
    </div>
  );
}
