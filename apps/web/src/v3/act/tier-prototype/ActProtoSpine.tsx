// ActProtoSpine.tsx
//
// PROTOTYPE-ONLY horizontal tier spine that sits ABOVE StageShell (which has
// no top slot). Renders the seven Plan tiers T0-T6 as a tab row; each shows its
// ordinal, a mock state chip (complete / locked), title, and objective count.
// Selecting a tier filters the left rail. Delete with folder.

import { Check, Lock } from 'lucide-react';
import type { PlanTier, PlanTierObjective, PlanTierObjectiveStatus } from '@ogden/shared';
import styles from './ActProtoTierShell.module.css';

interface Props {
  tiers: readonly PlanTier[];
  objectives: readonly PlanTierObjective[];
  tierState: (tierId: string) => PlanTierObjectiveStatus;
  activeTierId: string;
  onSelectTier: (tierId: string) => void;
}

export default function ActProtoSpine({
  tiers,
  objectives,
  tierState,
  activeTierId,
  onSelectTier,
}: Props) {
  return (
    <div className={styles.spine} role="tablist" aria-label="Act tiers">
      {tiers.map((tier) => {
        const status = tierState(tier.id);
        const count = objectives.filter((o) => o.tierId === tier.id).length;
        const isActive = tier.id === activeTierId;
        return (
          <button
            key={tier.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={styles.tier}
            data-status={status}
            data-active={isActive}
            onClick={() => onSelectTier(tier.id)}
          >
            <span className={styles.tierTop}>
              <span className={styles.tierOrdinal}>T{tier.ordinal}</span>
              {status === 'complete' && (
                <span className={styles.tierStateChip} data-status="complete">
                  <Check size={11} aria-hidden="true" />
                </span>
              )}
              {status === 'locked' && (
                <span className={styles.tierStateChip} data-status="locked">
                  <Lock size={10} aria-hidden="true" />
                </span>
              )}
            </span>
            <span className={styles.tierTitle}>{tier.title}</span>
            <span className={styles.tierMeta}>
              {count} objective{count === 1 ? '' : 's'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
