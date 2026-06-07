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

import { Check, Loader, Lock } from 'lucide-react';
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
  /**
   * Strata whose Plan prerequisites are unmet. Act execution never locks on its
   * own, but the Plan dependency gate still applies — locked tabs get a lock
   * glyph + muted style, and clicking one opens the explanatory popover (the
   * parent's onSelectStratum guard) rather than navigating.
   */
  lockedStratumIds: ReadonlySet<string>;
  activeStratumId: string;
  onSelectStratum: (stratumId: string) => void;
  /** Current project name — shown in the leading identity tile. */
  projectTitle: string;
  /**
   * ` · `-joined project-type label (primary first), or null when no primary
   * type is set. Null renders a muted "Types not set" placeholder.
   */
  projectTypeLabel: string | null;
}

export default function ActTierSpine({
  strata,
  objectives,
  stratumStates,
  lockedStratumIds,
  activeStratumId,
  onSelectStratum,
  projectTitle,
  projectTypeLabel,
}: Props) {
  return (
    <div className={styles.spineRow}>
      {/* Project identity tile — static, sticky-pinned, NOT a tab (sibling of
          the tablist so the tablist a11y semantics stay pure). */}
      <div className={styles.projectTile}>
        <span className={styles.projectTileTitle}>{projectTitle}</span>
        <span
          className={styles.projectTileTypes}
          data-empty={projectTypeLabel ? undefined : 'true'}
        >
          {projectTypeLabel ?? 'Types not set'}
        </span>
      </div>
      <div className={styles.spine} role="tablist" aria-label="Act strata">
        {strata.map((stratum) => {
        const status = stratumStates[stratum.id] ?? 'available';
        const isLocked = lockedStratumIds.has(stratum.id);
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
            aria-disabled={isLocked || undefined}
            className={styles.tier}
            data-status={status}
            data-locked={isLocked || undefined}
            data-active={isActive}
            onClick={() => onSelectStratum(stratum.id)}
          >
            <span className={styles.tierTop}>
              <span className={styles.stratumOrdinal}>S{stratum.ordinal}</span>
              {isLocked ? (
                <span className={styles.tierStateChip} data-status="locked">
                  <Lock size={11} aria-hidden="true" />
                </span>
              ) : status === 'complete' ? (
                <span className={styles.tierStateChip} data-status="complete">
                  <Check size={11} aria-hidden="true" />
                </span>
              ) : status === 'active' ? (
                <span className={styles.tierStateChip} data-status="active">
                  <Loader size={11} aria-hidden="true" />
                </span>
              ) : null}
            </span>
            <span className={styles.tierTitle}>{stratum.title}</span>
            <span className={styles.tierMeta}>
              {count} objective{count === 1 ? '' : 's'}
            </span>
          </button>
        );
        })}
      </div>
    </div>
  );
}
