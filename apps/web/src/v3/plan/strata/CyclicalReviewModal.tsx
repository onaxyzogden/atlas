// CyclicalReviewModal — the ADR 11 "Screen 2" outcome surface shown after the
// steward resolves a cyclical-review prompt on CyclicalReviewBanner.
//
// Two variants:
//   - 'confirmed' (green)  — the steward clicked "Confirm decision"; the
//     decision still holds. Matches the original Slice 1.11 screenshot 3.
//   - 'updated'   (blue)   — the steward clicked "Revise decision"; the
//     decision was updated to reflect an Observe change. New in the Full
//     ADR 11 build.
//
// Stateless beyond focus management — the parent (ObjectiveDetailPanel) owns
// the open boolean and fires the store mutation (confirmDecision /
// acknowledgeRevise) before the modal mounts, so a closed modal still leaves a
// clean record. When the review was Observe-driven, the parent passes the
// `effects` it reflected (the diverged domains under review) for the
// downstream-effects summary.

import { useEffect, useRef } from 'react';
import { CheckCircle2, RefreshCw, X } from 'lucide-react';
import type { PlanStratumObjective } from '@ogden/shared';
import css from './CyclicalReviewModal.module.css';

type Variant = 'confirmed' | 'updated';

interface Props {
  objective: PlanStratumObjective;
  onDismiss: () => void;
  /** Which outcome to render. Defaults to 'confirmed' (the legacy behaviour). */
  variant?: Variant;
  /** Human-readable downstream effects (e.g. domain labels the review
   *  advanced against). Rendered as a short list under the copy when present. */
  effects?: readonly string[];
}

// Accent colours applied inline so the single CSS module serves both variants
// without a second stylesheet. Confirmed = positive green; updated = blue.
const ACCENT: Record<Variant, string> = {
  confirmed: 'rgba(100, 190, 130, 0.95)',
  updated: 'rgba(95, 155, 213, 0.95)',
};

export default function CyclicalReviewModal({
  objective,
  onDismiss,
  variant = 'confirmed',
  effects,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  const accent = ACCENT[variant];
  const isUpdated = variant === 'updated';
  const title = isUpdated ? 'Decision updated' : 'Decision confirmed';

  return (
    <div
      className={css.backdrop}
      role="presentation"
      onClick={onDismiss}
      data-testid="plan-cyclical-confirm-backdrop"
    >
      <div
        className={css.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cyclical-confirm-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="plan-cyclical-confirm-card"
        data-variant={variant}
      >
        <button
          type="button"
          className={css.close}
          onClick={onDismiss}
          aria-label="Close confirmation"
          data-testid="plan-cyclical-confirm-close"
        >
          <X size={16} aria-hidden />
        </button>

        <div
          className={css.iconWrap}
          aria-hidden
          style={{
            background: `color-mix(in srgb, ${accent} 22%, transparent)`,
            color: accent,
          }}
        >
          {isUpdated ? <RefreshCw size={22} /> : <CheckCircle2 size={22} />}
        </div>

        <h2 className={css.title} id="cyclical-confirm-title">
          {title}
        </h2>
        <p className={css.copy}>
          {isUpdated ? (
            <>
              Your decision for{' '}
              <strong className={css.strong}>{objective.title}</strong> has been
              updated to reflect the change. We have logged it and advanced the
              review cycle.
            </>
          ) : (
            <>
              Your decision for{' '}
              <strong className={css.strong}>{objective.title}</strong> still
              holds. We will check in again in 90 days.
            </>
          )}
        </p>

        {effects && effects.length > 0 && (
          <div
            data-testid="plan-cyclical-confirm-effects"
            style={{ marginTop: 2 }}
          >
            <p
              style={{
                margin: '0 0 4px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: accent,
              }}
            >
              {isUpdated ? 'Reflected changes in' : 'Reviewed against changes in'}
            </p>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              {effects.map((label) => (
                <li
                  key={label}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '1px 8px',
                    borderRadius: 999,
                    border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`,
                    color: accent,
                  }}
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={css.actions}>
          <button
            ref={closeButtonRef}
            type="button"
            className={css.primary}
            onClick={onDismiss}
            data-testid="plan-cyclical-confirm-done"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
