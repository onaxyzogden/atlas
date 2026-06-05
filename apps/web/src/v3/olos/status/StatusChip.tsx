/**
 * StatusChip — pill-shaped chip rendering any OLOS status from the
 * universal STATUS_LABELS map with a stage-appropriate color family.
 *
 * Color families:
 *   - greens: clear, approved-for-act, verified-complete, archived
 *   - limes: conditionally-approved
 *   - ambers: unknown, needs-investigation, paused-for-conditions,
 *             completed-pending-verification, needs-follow-up, deferred
 *   - oranges: major-constraint, needs-more-observation,
 *              needs-professional-review, needs-rework, in-progress,
 *              assigned, blocked, escalated
 *   - reds: potential-disqualifier, redesign-required, rejected, cancelled
 *   - neutrals: ready (unstarted)
 */

import css from './StatusChip.module.css';
import { STATUS_LABELS } from '@ogden/shared';

const COLOR_BY_STATUS: Record<string, string> = {
  // greens
  'clear': '#16a34a',
  'approved-for-act': '#16a34a',
  'verified-complete': '#16a34a',
  'archived': '#15803d',
  // limes
  'conditionally-approved': '#84cc16',
  // ambers
  'unknown': '#d97706',
  'needs-investigation': '#d97706',
  'paused-for-conditions': '#d97706',
  'completed-pending-verification': '#d97706',
  'needs-follow-up': '#d97706',
  'deferred': '#a16207',
  // oranges
  'major-constraint': '#ea580c',
  'needs-more-observation': '#ea580c',
  'needs-professional-review': '#ea580c',
  'needs-rework': '#ea580c',
  'in-progress': '#0284c7',
  'assigned': '#0284c7',
  'blocked': '#ea580c',
  'escalated': '#ea580c',
  // reds
  'potential-disqualifier': '#dc2626',
  'redesign-required': '#dc2626',
  'rejected': '#991b1b',
  'cancelled': '#7f1d1d',
  // neutrals
  'ready': '#475569',
};

export interface StatusChipProps {
  status: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  /** Suppresses the leading dot. Useful in tight layouts. */
  hideDot?: boolean;
  /** Override label; defaults to STATUS_LABELS[status]. */
  label?: string;
}

export default function StatusChip({
  status,
  size = 'md',
  hideDot,
  label,
}: StatusChipProps) {
  if (!status) {
    return (
      <span
        className={`${css.chip} ${css[size]} ${css.placeholder}`}
        style={{ color: '#94a3b8' }}
      >
        No status set
      </span>
    );
  }
  const color = COLOR_BY_STATUS[status] ?? '#475569';
  const display = label ?? STATUS_LABELS[status] ?? status;
  return (
    <span
      className={`${css.chip} ${css[size]}`}
      style={{ color }}
      aria-label={`Status: ${display}`}
    >
      {hideDot ? null : <span className={css.dot} aria-hidden />}
      {display}
    </span>
  );
}
