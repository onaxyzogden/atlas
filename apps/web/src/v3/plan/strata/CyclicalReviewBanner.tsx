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
  /** Localised reason — defaults to the 90-day cadence copy. When the review
   *  was triggered by an Observe divergence (ADR 11), the parent passes the
   *  specific Observe-driven copy ("A reading this decision relied on
   *  changed…") built from the resolver `triggerContext`. */
  reason?: string;
  /** Optional eyebrow override. Defaults to the cadence "Reviewing your
   *  earlier decision"; Observe-driven prompts pass "Conditions changed". */
  eyebrow?: string;
  onConfirm: () => void;
  onRevise: () => void;
  /** "Dismiss for now" — collapse the prompt without resolving it (parent owns
   *  the local hidden state). The advisory flag is unchanged, so the prompt
   *  reappears on the next visit while the divergence is still active. Absent
   *  for the cadence prompt, present for the Observe-driven prompt. */
  onDismiss?: () => void;
}

export default function CyclicalReviewBanner({
  reason,
  eyebrow,
  onConfirm,
  onRevise,
  onDismiss,
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
        <p className={css.eyebrow}>{eyebrow ?? 'Reviewing your earlier decision'}</p>
        <p className={css.copy}>
          {reason ??
            'It has been a while since you set this. Confirm it still holds, or revise it now.'}
        </p>
      </div>
      <div className={css.actions}>
        {onDismiss && (
          <button
            type="button"
            className={css.secondary}
            onClick={onDismiss}
            data-testid="plan-cyclical-review-dismiss"
          >
            <span>Dismiss for now</span>
          </button>
        )}
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
