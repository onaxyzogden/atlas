// StratumLockedPopover — popover triggered when the steward taps a locked
// stratum in the spine (Plan Navigation Spec v1, screenshot 2). Lists the
// unmet prerequisite objectives for the stratum and offers an Acknowledge
// CTA that routes to the first one so the steward can immediately work
// it. Dismiss via overlay click, Escape, or the close button.

import { useEffect, useMemo, useRef } from 'react';
import { Lock, X } from 'lucide-react';
import type {
  PlanStratum,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import css from './StratumLockedPopover.module.css';

interface Props {
  stratum: PlanStratum;
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
  onAcknowledge: (objective: PlanStratumObjective) => void;
  onDismiss: () => void;
}

export default function StratumLockedPopover({
  stratum,
  objectives,
  objectiveStatuses,
  onAcknowledge,
  onDismiss,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Collect distinct unmet prerequisite objectives referenced by any
  // objective in this stratum. We preserve seed order so the first
  // unfinished prereq is the natural "next step" target.
  const unmetPrereqs = useMemo(() => {
    const stratumObjectives = objectives.filter((o) => o.stratumId === stratum.id);
    const referenced = new Set<string>();
    for (const obj of stratumObjectives) {
      for (const prereqId of obj.prerequisiteObjectiveIds) {
        referenced.add(prereqId);
      }
    }
    return objectives.filter(
      (o) => referenced.has(o.id) && objectiveStatuses[o.id] !== 'complete',
    );
  }, [stratum.id, objectives, objectiveStatuses]);

  const firstUnmet = unmetPrereqs[0] ?? null;

  // Focus the popover on mount + close on Escape for keyboard parity
  // with the surrounding modals.
  useEffect(() => {
    dialogRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDismiss]);

  return (
    <div
      className={css.overlay}
      onClick={onDismiss}
      data-testid="stratum-locked-overlay"
    >
      <div
        ref={dialogRef}
        className={css.popover}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stratum-locked-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        data-testid="stratum-locked-popover"
      >
        <header className={css.header}>
          <span className={css.iconBadge} aria-hidden="true">
            <Lock size={14} strokeWidth={2} />
          </span>
          <div className={css.headerText}>
            <p className={css.eyebrow}>Stratum {stratum.ordinal} locked</p>
            <h3 className={css.title} id="stratum-locked-title">
              {stratum.title}
            </h3>
          </div>
          <button
            type="button"
            className={css.close}
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </header>

        <p className={css.body}>
          Finish the upstream decisions below before opening this stratum.
        </p>

        {unmetPrereqs.length === 0 ? (
          <p className={css.empty}>
            No specific prerequisites recorded. Complete the earlier strata
            in order.
          </p>
        ) : (
          <ul className={css.prereqList}>
            {unmetPrereqs.map((obj) => (
              <li key={obj.id} className={css.prereqItem}>
                <span className={css.prereqDot} aria-hidden="true" />
                <div className={css.prereqText}>
                  <span className={css.prereqTitle}>{obj.title}</span>
                  <span className={css.prereqMeta}>
                    Status: {objectiveStatuses[obj.id] ?? 'locked'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className={css.footer}>
          <button
            type="button"
            className={css.secondaryBtn}
            onClick={onDismiss}
          >
            Not now
          </button>
          <button
            type="button"
            className={css.primaryBtn}
            onClick={() => {
              if (firstUnmet) onAcknowledge(firstUnmet);
              else onDismiss();
            }}
            disabled={!firstUnmet}
          >
            {firstUnmet ? 'Acknowledge & open' : 'Acknowledge'}
          </button>
        </footer>
      </div>
    </div>
  );
}
