/**
 * ActTierStratumSwitcher -- the tier shell's stratum navigation, slotted into
 * the objective rail header (ActTierObjectiveRail's `headerSlot`). It replaces
 * the horizontal spine: the active stratum (or active threshold) stays visible
 * as a clickable disclosure button; clicking it expands a VERTICAL list of all
 * strata S1-S7, with any reachable thresholds interleaved at their positions,
 * plus a compact project-identity row (name + type chips) the spine carried.
 *
 * Shared by both shells. On Plan it receives thresholds + type chips; on Act
 * the threshold props are omitted (Act has no planning checkpoints) so no
 * threshold rows render -- mirroring how ActTierSpine itself makes thresholds
 * optional. It owns NO routing or locking logic: selecting a stratum calls
 * `onSelectStratum` (the shell's handleSelectStratum, which opens the locked
 * popover or navigates) and selecting a reachable threshold calls
 * `onSelectThreshold`. Pure display + a local open/closed toggle.
 *
 * ASCII-only; icons are lucide. Mirrors the IntentLensAccordion disclosure
 * pattern (local useState, chevron, conditional content).
 */

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Loader, Lock } from 'lucide-react';
import type { PlanStratum, PlanStratumState } from '@ogden/shared';
import type { SpineTypeChip } from './ActTierSpine.js';
import type { ThresholdMarker } from './declarationModel.js';
import css from './ActTierStratumSwitcher.module.css';

export interface ActTierStratumSwitcherProps {
  strata: readonly PlanStratum[];
  stratumStates: Readonly<Record<string, PlanStratumState>>;
  lockedStratumIds: ReadonlySet<string>;
  /** Resolved active stratum id (selectedStratumId). */
  activeStratumId: string;
  /** Resolved active stratum object (for the collapsed title/summary). */
  activeStratum: PlanStratum | undefined;
  /** Planning checkpoints (Plan only); omitted on Act -> no threshold rows. */
  thresholds?: readonly ThresholdMarker[];
  clickableThresholdIds?: readonly string[];
  /** Active threshold id when a threshold surface is open -> header shows it. */
  thresholdActiveId?: string;
  onSelectThreshold?: (thresholdId: string) => void;
  onSelectStratum: (stratumId: string) => void;
  projectTitle: string;
  typeChips?: readonly SpineTypeChip[];
  /**
   * OPTIONAL (Plan only). When provided, the PRIMARY type chip becomes a button
   * that opens the project-type change flow. Absent (Act) -> the chip renders as
   * a static span, byte-identical to before.
   */
  onEditPrimaryType?: () => void;
  /**
   * OPTIONAL (Operational Role Layer). Per-stratum "N in focus / M total" under
   * the viewer's role scope. Present only when the layer is engaged; absent ->
   * no count badges render (byte-identical for Act, solo, no-role, full view).
   */
  focusCountByStratum?: Readonly<
    Record<string, { inFocus: number; total: number }>
  >;
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

export default function ActTierStratumSwitcher({
  strata,
  stratumStates,
  lockedStratumIds,
  activeStratumId,
  activeStratum,
  thresholds = [],
  clickableThresholdIds = [],
  thresholdActiveId,
  onSelectThreshold,
  onSelectStratum,
  projectTitle,
  typeChips = [],
  onEditPrimaryType,
  focusCountByStratum,
}: ActTierStratumSwitcherProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Dismiss on Escape (return focus to the trigger) or click-outside, mirroring
  // the dropdown idiom used across the v3 popovers (ActStructurePopover,
  // InlineFeaturePopover) and the modal StratumLockedPopover. Listeners only
  // attach while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      const node = rootRef.current;
      if (!node) return;
      if (e.target instanceof Node && node.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

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
    ? 'Threshold'
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

  // Operational Role Layer: the active stratum's in-focus count for the
  // collapsed header (only when scoped and not on a threshold surface).
  const activeFocus =
    !activeThreshold && activeStratum
      ? focusCountByStratum?.[activeStratum.id]
      : undefined;

  return (
    <div className={css.root} ref={rootRef} data-testid="plan-stratum-switcher">
      <button
        type="button"
        ref={triggerRef}
        className={css.head}
        data-testid="switcher-header"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={css.headText}>
          <span className={css.eyebrow}>{eyebrow}</span>
          <span className={css.title}>{title}</span>
          {!activeThreshold && activeStratum?.summary && (
            <span className={css.summary}>{activeStratum.summary}</span>
          )}
          {activeFocus && (
            <span className={css.focusBadge} data-testid="switcher-active-focus">
              {activeFocus.inFocus} / {activeFocus.total} in focus
            </span>
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
        <div className={css.panel} id={panelId} data-testid="switcher-panel">
          <div className={css.identity}>
            <span className={css.projectName}>{projectTitle}</span>
            {typeChips.length > 0 && (
              <span className={css.chips}>
                {typeChips.map((chip) =>
                  chip.kind === 'primary' && onEditPrimaryType ? (
                    <button
                      key={`${chip.kind}:${chip.label}`}
                      type="button"
                      className={css.chip}
                      data-kind={chip.kind}
                      data-testid="switcher-edit-primary-type"
                      title="Change project type"
                      onClick={onEditPrimaryType}
                    >
                      {chip.label}
                    </button>
                  ) : (
                    <span
                      key={`${chip.kind}:${chip.label}`}
                      className={css.chip}
                      data-kind={chip.kind}
                    >
                      {chip.label}
                    </span>
                  ),
                )}
              </span>
            )}
          </div>

          <ul className={css.list} role="list">
            {strata.map((stratum) => {
              const status = stratumStates[stratum.id] ?? 'available';
              const isLocked = lockedStratumIds.has(stratum.id);
              const focus = focusCountByStratum?.[stratum.id];
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
                    {focus && (
                      <span
                        className={css.focusCount}
                        data-testid={`switcher-focus-${stratum.id}`}
                        title={`${focus.inFocus} of ${focus.total} objectives in your focus`}
                      >
                        {focus.inFocus}/{focus.total}
                      </span>
                    )}
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
                        choose(() => onSelectThreshold?.(threshold.id))
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
