// TierUnlockCelebration — overlay shown when a Plan tier transitions from
// `locked` to a reachable state (Plan Navigation Spec v1, Slice 1.10).
// Matches the spec's screenshot 4 — tier ordinal + title, the steward's
// first available objective in the new tier, and two CTAs: "Open Tier"
// navigates and dismisses, "Close" simply dismisses.
//
// Dedup: trigger logic in PlanTierShell consults
// `planTierStore.hasCelebratedTier` before mounting this component, and
// calls `markTierCelebrated` when it dismisses. The component itself is
// stateless beyond focus management.

import { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import type { PlanTier, PlanTierObjective } from '@ogden/shared';
import css from './TierUnlockCelebration.module.css';

interface Props {
  tier: PlanTier;
  firstObjective: PlanTierObjective | null;
  onOpenTier: () => void;
  onDismiss: () => void;
}

export default function TierUnlockCelebration({
  tier,
  firstObjective,
  onOpenTier,
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
      data-testid="plan-tier-unlock-backdrop"
    >
      <div
        className={css.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tier-unlock-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="plan-tier-unlock-card"
      >
        <button
          type="button"
          className={css.close}
          onClick={onDismiss}
          aria-label="Close celebration"
          data-testid="plan-tier-unlock-close"
        >
          <X size={16} aria-hidden />
        </button>

        <div className={css.iconWrap} aria-hidden>
          <Sparkles size={22} />
        </div>

        <p className={css.eyebrow}>Tier {tier.ordinal} unlocked</p>
        <h2 className={css.title} id="tier-unlock-title">
          {tier.title}
        </h2>
        <p className={css.summary}>{tier.summary}</p>

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
            <p className={css.objectiveEyebrow}>This tier has no objectives seeded yet</p>
            <p className={css.objectiveQuestion}>
              Open the tier to review what is planned.
            </p>
          </div>
        )}

        <div className={css.actions}>
          <button
            type="button"
            className={css.secondary}
            onClick={onDismiss}
            data-testid="plan-tier-unlock-dismiss"
          >
            Close
          </button>
          <button
            ref={openButtonRef}
            type="button"
            className={css.primary}
            onClick={onOpenTier}
            data-testid="plan-tier-unlock-open"
          >
            <span>Open tier</span>
            <ArrowRight size={14} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
