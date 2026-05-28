/**
 * VerificationModeBadge — compact pill that names the verification mode for
 * a field action (self vs review) per OLOS Act Command Center Spec v1 §7.
 * Shown on ActTaskDetail header so the steward knows up-front whether the
 * task will collapse to `verified` on submit (self) or wait on a verifier
 * (review).
 */

import { ShieldCheck, UserCheck } from 'lucide-react';
import type { FieldActionVerificationMode } from '@ogden/shared';
import css from './Verification.module.css';

interface Props {
  mode: FieldActionVerificationMode;
}

export default function VerificationModeBadge({ mode }: Props) {
  const isSelf = mode === 'self';
  return (
    <span
      className={css.modeBadge}
      data-mode={mode}
      data-testid="verification-mode-badge"
      title={
        isSelf
          ? 'Self verify — submit collapses to verified.'
          : 'Needs review — a verifier confirms before verified.'
      }
    >
      {isSelf ? (
        <ShieldCheck size={10} strokeWidth={2.25} aria-hidden="true" />
      ) : (
        <UserCheck size={10} strokeWidth={2.25} aria-hidden="true" />
      )}
      {isSelf ? 'Self verify' : 'Needs review'}
    </span>
  );
}
