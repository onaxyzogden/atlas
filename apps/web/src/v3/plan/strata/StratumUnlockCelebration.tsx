// StratumUnlockCelebration — overlay shown when a Plan stratum transitions from
// `locked` to a reachable state (Plan Navigation Spec v1, Slice 1.10).
// Matches the spec's screenshot 4 — stratum ordinal + title, the steward's
// first available objective in the new stratum, and two CTAs: "Open Stratum"
// navigates and dismisses, "Close" simply dismisses.
//
// Dedup: trigger logic in PlanStratumShell consults
// `planStratumStore.hasCelebratedStratum` before mounting this component, and
// calls `markStratumCelebrated` when it dismisses. The component itself is
// stateless beyond focus management.

import { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import type { PlanStratum, PlanStratumObjective } from '@ogden/shared';
import css from './StratumUnlockCelebration.module.css';

interface Props {
  stratum: PlanStratum;
  firstObjective: PlanStratumObjective | null;
  onOpenStratum: () => void;
  onDismiss: () => void;
}

export default function StratumUnlockCelebration({
  stratum,
  firstObjective,
  onOpenStratum,
  onDismiss,
}: Props) {
  const openButtonRef = useRef<HTMLButtonElement | null>(null);

  // Focus the primary CTA on mount + close on Escape.
  useEffect(() => {
    openButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div
      className={css.backdrop}
      role="presentation"
      onClick={onDismiss}
      data-testid="plan-stratum-unlock-backdrop"
    >
      <div
        className={css.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stratum-unlock-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="plan-stratum-unlock-card"
      >
        <button
          type="button"
          className={css.close}
          onClick={onDismiss}
          aria-label="Close celebration"
          data-testid="plan-stratum-unlock-close"
        >
          <X size={16} aria-hidden />
        </button>

        <div className={css.iconWrap} aria-hidden>
          <Sparkles size={22} />
        </div>

        <p className={css.eyebrow}>Stratum {stratum.ordinal} unlocked</p>
        <h2 className={css.title} id="stratum-unlock-title">
          {stratum.title}
        </h2>
        <p className={css.summary}>{stratum.summary}</p>

        {firstObjective ? (
          <div className={css.objectiveBlock}>
            <p className={css.objectiveEyebrow}>Start with</p>
            <p className={css.objectiveTitle}>{firstObjective.title}</p>
            <p className={css.objectiveQuestion}>
              {firstObjective.focusedQuestion}
            </p>
          </div>
        ) : (
          <div className={css.objectiveBlock}>
            <p className={css.objectiveEyebrow}>This stratum has no objectives seeded yet</p>
            <p className={css.objectiveQuestion}>
              Open the stratum to review what is planned.
            </p>
          </div>
        )}

        <div className={css.actions}>
          <button
            type="button"
            className={css.secondary}
            onClick={onDismiss}
            data-testid="plan-stratum-unlock-dismiss"
          >
            Close
          </button>
          <button
            ref={openButtonRef}
            type="button"
            className={css.primary}
            onClick={onOpenStratum}
            data-testid="plan-stratum-unlock-open"
          >
            <span>Open stratum</span>
            <ArrowRight size={14} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
