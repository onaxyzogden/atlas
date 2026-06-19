/**
 * PlanStratumSwitcher -- the Plan tier shell's stratum navigation, slotted into
 * the objective rail header (ActTierObjectiveRail's `headerSlot`). It replaces
 * the horizontal Plan spine: the active stratum (or active threshold) stays
 * visible as a clickable disclosure button; clicking it expands a VERTICAL list
 * of all strata S1-S7 with the two reachable thresholds interleaved at their
 * positions, plus a compact project-identity row (name + type chips) that the
 * spine used to carry.
 *
 * Plan-only. It owns NO routing or locking logic: selecting a stratum calls
 * `onSelectStratum` (the shell's handleSelectStratum, which opens the locked
 * popover or navigates) and selecting a reachable threshold calls
 * `onSelectThreshold`. Pure display + a local open/closed toggle.
 *
 * ASCII-only; icons are lucide. Mirrors the IntentLensAccordion disclosure
 * pattern (local useState, chevron, conditional content).
 */

import { useState } from 'react';
import { Check, ChevronDown, Loader, Lock } from 'lucide-react';
import type { PlanStratum, PlanStratumState } from '@ogden/shared';
import type { SpineTypeChip } from '../../act/tier-shell/ActTierSpine.js';
import type { ThresholdMarker } from '../../act/tier-shell/declarationModel.js';
import css from './PlanStratumSwitcher.module.css';

export interface PlanStratumSwitcherProps {
  strata: readonly PlanStratum[];
  stratumStates: Readonly<Record<string, PlanStratumState>>;
  lockedStratumIds: ReadonlySet<string>;
  /** Resolved active stratum id (selectedStratumId). */
  activeStratumId: string;
  /** Resolved active stratum object (for the collapsed title/summary). */
  activeStratum: PlanStratum | undefined;
  thresholds: readonly ThresholdMarker[];
  clickableThresholdIds: readonly string[];
  /** Active threshold id when a threshold surface is open -> header shows it. */
  thresholdActiveId?: string;
  onSelectStratum: (stratumId: string) => void;
  onSelectThreshold: (thresholdId: string) => void;
  projectTitle: string;
  typeChips: readonly SpineTypeChip[];
}

function StatusDot({ status }: { status: PlanStratumState }): JSX.Element | null {
  if (status === 'complete')
    return (
      <span className={css.statusChip} data-status="complete">
        <Check size={11} aria-hidden="true" />
      </span>
    );
  if (status === 'active')
    return (
      <span className={css.statusChip} data-status="active">
        <Loader size={11} aria-hidden="true" />
      </span>
    );
  return null;
}

export default function PlanStratumSwitcher({
  strata,
  stratumStates,
  lockedStratumIds,
  activeStratumId,
  activeStratum,
  thresholds,
  clickableThresholdIds,
  thresholdActiveId,
  onSelectStratum,
  onSelectThreshold,
  projectTitle,
  typeChips,
}: PlanStratumSwitcherProps): JSX.Element {
  const [open, setOpen] = useState(false);

  const clickable = new Set(clickableThresholdIds);
  const thresholdAfter = new Map<string, ThresholdMarker>(
    thresholds.map((t) => [t.afterStratumId, t]),
  );
  const activeThreshold = thresholdActiveId
    ? thresholds.find((t) => t.id === thresholdActiveId)
    : undefined;

  // Collapsed header reflects the active context: a threshold when one is open,
  // otherwise the active stratum (mirrors the spine's activeStratumId='' rule).
  const eyebrow = activeThreshold
    ? 'Checkpoint'
    : activeStratum
      ? `Stratum S${activeStratum.ordinal}`
      : 'Stratum';
  const title = activeThreshold
    ? activeThreshold.name
    : (activeStratum?.title ?? 'Objectives');

  const choose = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <div className={css.root} data-testid="plan-stratum-switcher">
      <button
        type="button"
        className={css.head}
        data-testid="switcher-header"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={css.headText}>
          <span className={css.eyebrow}>{eyebrow}</span>
          <span className={css.title}>{title}</span>
          {!activeThreshold && activeStratum?.summary && (
            <span className={css.summary}>{activeStratum.summary}</span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={css.chevron}
          data-open={open || undefined}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className={css.panel} data-testid="switcher-panel">
          <div className={css.identity}>
            <span className={css.projectName}>{projectTitle}</span>
            {typeChips.length > 0 && (
              <span className={css.chips}>
                {typeChips.map((chip) => (
                  <span
                    key={`${chip.kind}:${chip.label}`}
                    className={css.chip}
                    data-kind={chip.kind}
                  >
                    {chip.label}
                  </span>
                ))}
              </span>
            )}
          </div>

          <ul className={css.list} role="list">
            {strata.map((stratum) => {
              const status = stratumStates[stratum.id] ?? 'available';
              const isLocked = lockedStratumIds.has(stratum.id);
              const isActive =
                !activeThreshold && stratum.id === activeStratumId;
              const threshold = thresholdAfter.get(stratum.id);
              const thresholdClickable =
                threshold != null && clickable.has(threshold.id);
              const thresholdActive =
                threshold != null && threshold.id === thresholdActiveId;
              return (
                <li key={stratum.id} className={css.group}>
                  <button
                    type="button"
                    className={css.stratumRow}
                    data-testid={`switcher-stratum-${stratum.id}`}
                    data-status={status}
                    data-active={isActive || undefined}
                    data-locked={isLocked || undefined}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => choose(() => onSelectStratum(stratum.id))}
                  >
                    <span className={css.ordinal}>S{stratum.ordinal}</span>
                    <span className={css.rowTitle}>{stratum.title}</span>
                    {isLocked ? (
                      <span className={css.statusChip} data-status="locked">
                        <Lock size={11} aria-hidden="true" />
                      </span>
                    ) : (
                      <StatusDot status={status} />
                    )}
                  </button>

                  {threshold && thresholdClickable ? (
                    <button
                      type="button"
                      className={css.thresholdRow}
                      data-testid={`switcher-threshold-${threshold.id}`}
                      data-clickable="true"
                      data-active={thresholdActive || undefined}
                      aria-current={thresholdActive ? 'step' : undefined}
                      onClick={() =>
                        choose(() => onSelectThreshold(threshold.id))
                      }
                    >
                      <span className={css.thresholdName}>{threshold.name}</span>
                    </button>
                  ) : threshold ? (
                    <div
                      className={css.thresholdRow}
                      data-testid={`switcher-threshold-${threshold.id}`}
                      role="separator"
                      aria-label={threshold.name}
                    >
                      <span className={css.thresholdName}>{threshold.name}</span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
