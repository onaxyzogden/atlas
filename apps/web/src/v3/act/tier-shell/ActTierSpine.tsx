// ActTierSpine.tsx
//
// Horizontal stratum spine that sits ABOVE StageShell (which has no top
// slot). Renders the seven Plan strata S1-S7 as a tab row; each shows its
// ordinal, a real Act-execution state chip, title, and objective count.
// Selecting a stratum filters the left objectives rail.
//
// Unlike the prototype's ActProtoSpine, the state comes from real field-action
// execution rollup (computeAllActStratumStates) and there is NO `locked`
// path: Act execution reaches every stratum, so the spine never hides one
// behind a lock. Only `complete` and `active` earn a chip; `available`
// renders bare.

import { Check, Loader } from 'lucide-react';
import type {
  PlanStratum,
  PlanStratumObjective,
  PlanStratumState,
} from '@ogden/shared';
import styles from './ActTierShell.module.css';

interface Props {
  strata: readonly PlanStratum[];
  objectives: readonly PlanStratumObjective[];
  stratumStates: Readonly<Record<string, PlanStratumState>>;
  activeStratumId: string;
  onSelectStratum: (stratumId: string) => void;
}

export default function ActTierSpine({
  strata,
  objectives,
  stratumStates,
  activeStratumId,
  onSelectStratum,
}: Props) {
  return (
    <div className={styles.spine} role="tablist" aria-label="Act strata">
      {strata.map((stratum) => {
        const status = stratumStates[stratum.id] ?? 'available';
        const count = objectives.filter(
          (o) => o.stratumId === stratum.id,
        ).length;
        const isActive = stratum.id === activeStratumId;
        return (
          <button
            key={stratum.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={styles.tier}
            data-status={status}
            data-active={isActive}
            onClick={() => onSelectStratum(stratum.id)}
          >
            <span className={styles.tierTop}>
              <span className={styles.stratumOrdinal}>S{stratum.ordinal}</span>
              {status === 'complete' && (
                <span className={styles.tierStateChip} data-status="complete">
                  <Check size={11} aria-hidden="true" />
                </span>
              )}
              {status === 'active' && (
                <span className={styles.tierStateChip} data-status="active">
                  <Loader size={11} aria-hidden="true" />
                </span>
              )}
            </span>
            <span className={styles.tierTitle}>{stratum.title}</span>
            <span className={styles.tierMeta}>
              {count} objective{count === 1 ? '' : 's'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
