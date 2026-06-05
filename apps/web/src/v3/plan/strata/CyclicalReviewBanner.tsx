// CyclicalReviewBanner — banner mounted at the top of ObjectiveDetailPanel
// when `isCyclicalReviewDue` returns true (Plan Navigation Spec v1, §3.6 +
// Slice 1.11). Prompts the steward to confirm an earlier decision is still
// valid, or revise it. Mirrors the "Reviewing your earlier decision" copy
// in screenshot 3.
//
// Pure presentational — store wiring stays in ObjectiveDetailPanel so the
// banner can be reused for the Phase 4 Observe-driven revision prompt
// without a refactor.

import { RefreshCw, CheckCircle2, PenSquare } from 'lucide-react';
import css from './CyclicalReviewBanner.module.css';

interface Props {
  /** Localised reason — defaults to the 90-day cadence copy. Phase 4 will
   *  swap in Observe-driven copy ("Conditions on the land have changed"). */
  reason?: string;
  onConfirm: () => void;
  onRevise: () => void;
}

export default function CyclicalReviewBanner({
  reason,
  onConfirm,
  onRevise,
}: Props) {
  return (
    <aside
      className={css.banner}
      role="status"
      aria-label="Cyclical review prompt"
      data-testid="plan-cyclical-review-banner"
    >
      <div className={css.iconWrap} aria-hidden>
        <RefreshCw size={16} />
      </div>
      <div className={css.body}>
        <p className={css.eyebrow}>Reviewing your earlier decision</p>
        <p className={css.copy}>
          {reason ??
            'It has been a while since you set this. Confirm it still holds, or revise it now.'}
        </p>
      </div>
      <div className={css.actions}>
        <button
          type="button"
          className={css.secondary}
          onClick={onRevise}
          data-testid="plan-cyclical-review-revise"
        >
          <PenSquare size={13} aria-hidden />
          <span>Revise decision</span>
        </button>
        <button
          type="button"
          className={css.primary}
          onClick={onConfirm}
          data-testid="plan-cyclical-review-confirm"
        >
          <CheckCircle2 size={13} aria-hidden />
          <span>Confirm decision</span>
        </button>
      </div>
    </aside>
  );
}
