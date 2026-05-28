/**
 * PendingVerificationBadge — visible on review-mode actions sitting in the
 * `submitted` state, per OLOS Act Command Center Spec v1 §7.2. Visually
 * distinct from `in_progress` so a steward looking at a task immediately
 * knows it's waiting on a verifier rather than waiting on more work.
 */

import css from './Verification.module.css';

export default function PendingVerificationBadge() {
  return (
    <span
      className={css.pendingBadge}
      data-testid="pending-verification-badge"
    >
      <span className={css.pendingBadgeDot} aria-hidden="true" />
      Pending verification
    </span>
  );
}
