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

import { Fragment } from 'react';
import { Check, Loader, Lock } from 'lucide-react';
import type {
  PlanStratum,
  PlanStratumObjective,
  PlanStratumState,
} from '@ogden/shared';
import styles from './ActTierShell.module.css';

/** A project-type chip shown in the identity tile (Plan Declaration only). */
export interface SpineTypeChip {
  label: string;
  kind: 'primary' | 'secondary';
}

/** A threshold checkpoint divider rendered AFTER a given stratum tab. */
export interface SpineThreshold {
  afterStratumId: string;
  name: string;
  /**
   * OPTIONAL stable id. When provided AND listed in `clickableThresholdIds`, the
   * divider becomes an interactive entry (the Plan-side Threshold surface). The
   * Act spine omits it, so its dividers stay decorative `role="separator"`.
   */
  id?: string;
}

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
  /**
   * Accessible label for the stratum tablist. Defaults to "Act strata"; the
   * Plan tier shell (PlanTierShell) reuses this presentational spine and passes
   * "Plan strata" so the a11y label matches the surface. Additive + defaulted
   * so Act callers are unchanged.
   */
  ariaLabel?: string;
  /**
   * OPTIONAL project-type chips for the identity tile (Plan Declaration). When
   * provided AND non-empty, the chip stack REPLACES the joined `projectTypeLabel`
   * text. Default undefined -> the existing label renders (Act unchanged).
   */
  typeChips?: readonly SpineTypeChip[];
  /**
   * OPTIONAL threshold checkpoint dividers, each rendered AFTER the tab whose
   * stratum id matches `afterStratumId`. Default undefined/empty -> no dividers
   * (Act spine byte-identical).
   */
  thresholds?: readonly SpineThreshold[];
  /**
   * OPTIONAL set of threshold ids that are currently OPEN -> rendered as an
   * interactive button (the Plan-side Reality Check surface). A threshold id
   * absent from this set stays a decorative `role="separator"` divider. Default
   * undefined -> no threshold is clickable (Act spine byte-identical).
   */
  clickableThresholdIds?: readonly string[];
  /** OPTIONAL currently-active threshold id -> amber active styling on its entry. */
  thresholdActiveId?: string;
  /**
   * OPTIONAL handler fired when a clickable threshold entry is selected. Only
   * reached for ids in `clickableThresholdIds`; Act passes none.
   */
  onSelectThreshold?: (thresholdId: string) => void;
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
  ariaLabel = 'Act strata',
  typeChips,
  thresholds,
  clickableThresholdIds,
  thresholdActiveId,
  onSelectThreshold,
}: Props) {
  // Map afterStratumId -> threshold for an O(1) post-tab divider lookup.
  // Empty/undefined -> no entries -> no dividers (Act spine unchanged).
  const thresholdAfter = new Map<string, SpineThreshold>(
    (thresholds ?? []).map((t) => [t.afterStratumId, t]),
  );
  const clickable = new Set(clickableThresholdIds ?? []);
  return (
    <div className={styles.spineRow}>
      {/* Project identity tile — static, sticky-pinned, NOT a tab (sibling of
          the tablist so the tablist a11y semantics stay pure). */}
      <div className={styles.projectTile}>
        <span className={styles.projectTileTitle}>{projectTitle}</span>
        {typeChips && typeChips.length > 0 ? (
          <span className={styles.projectTileChips}>
            {typeChips.map((chip) => (
              <span
                key={`${chip.kind}:${chip.label}`}
                className={styles.typeChip}
                data-kind={chip.kind}
              >
                {chip.label}
              </span>
            ))}
          </span>
        ) : (
          <span
            className={styles.projectTileTypes}
            data-empty={projectTypeLabel ? undefined : 'true'}
          >
            {projectTypeLabel ?? 'Types not set'}
          </span>
        )}
      </div>
      <div className={styles.spine} role="tablist" aria-label={ariaLabel}>
        {strata.map((stratum) => {
        const status = stratumStates[stratum.id] ?? 'available';
        const isLocked = lockedStratumIds.has(stratum.id);
        const count = objectives.filter(
          (o) => o.stratumId === stratum.id,
        ).length;
        const isActive = stratum.id === activeStratumId;
        const threshold = thresholdAfter.get(stratum.id);
        const thresholdClickable =
          threshold?.id != null &&
          clickable.has(threshold.id) &&
          onSelectThreshold != null;
        return (
          <Fragment key={stratum.id}>
          <button
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
          {threshold && thresholdClickable ? (
            <button
              type="button"
              className={styles.spineThreshold}
              data-testid="spine-threshold"
              data-clickable="true"
              data-active={threshold.id === thresholdActiveId || undefined}
              aria-current={
                threshold.id === thresholdActiveId ? 'step' : undefined
              }
              onClick={() => onSelectThreshold?.(threshold.id as string)}
            >
              <span className={styles.spineThresholdName}>{threshold.name}</span>
            </button>
          ) : threshold ? (
            <div
              className={styles.spineThreshold}
              data-testid="spine-threshold"
              role="separator"
              aria-label={threshold.name}
            >
              <span className={styles.spineThresholdName}>{threshold.name}</span>
            </div>
          ) : null}
          </Fragment>
        );
        })}
      </div>
    </div>
  );
}
