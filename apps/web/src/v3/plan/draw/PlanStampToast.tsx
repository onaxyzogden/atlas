/**
 * PlanStampToast — bottom-centre pill that surfaces two channels:
 *   - `plan:tree-rejected`         — single-placement spacing-snap rejection
 *     (fired-clay tint).
 *   - `plan:tree-stamp-summary`    — polygon-fill stamp tally
 *     ("Stamped N, skipped M", estate-gold tint).
 * Auto-dismisses after 1.8s; a fresh event resets the timer and replaces
 * the message. Renamed 2026-05-13 from `TreeRejectionToast` to cover both
 * channels for the polygon-fill stamp flow.
 */

import { useEffect, useState } from 'react';

const DISMISS_MS = 1800;

interface RejectionDetail {
  reason: string;
}

interface StampSummaryDetail {
  stamped: number;
  skipped: number;
  kind: string;
}

type ToastVariant = 'rejection' | 'summary';

interface ToastState {
  message: string;
  variant: ToastVariant;
}

export default function PlanStampToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const show = (next: ToastState) => {
      setToast(next);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToast(null), DISMISS_MS);
    };

    const onRejection = (ev: Event) => {
      const detail = (ev as CustomEvent<RejectionDetail>).detail;
      if (!detail?.reason) return;
      show({ message: detail.reason, variant: 'rejection' });
    };

    const onSummary = (ev: Event) => {
      const detail = (ev as CustomEvent<StampSummaryDetail>).detail;
      if (!detail) return;
      const { stamped, skipped } = detail;
      const message =
        skipped > 0
          ? `Stamped ${stamped}, skipped ${skipped}`
          : `Stamped ${stamped}`;
      show({ message, variant: 'summary' });
    };

    window.addEventListener('plan:tree-rejected', onRejection);
    window.addEventListener('plan:tree-stamp-summary', onSummary);
    return () => {
      window.removeEventListener('plan:tree-rejected', onRejection);
      window.removeEventListener('plan:tree-stamp-summary', onSummary);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  const background =
    toast.variant === 'rejection'
      ? 'rgba(138, 79, 58, 0.94)'
      : 'rgba(196, 162, 101, 0.94)';
  const color = toast.variant === 'rejection' ? '#fdf6ec' : '#1a1a14';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 88,
        transform: 'translateX(-50%)',
        background,
        color,
        padding: '8px 16px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
        pointerEvents: 'none',
        zIndex: 50,
        whiteSpace: 'nowrap',
      }}
    >
      {toast.message}
    </div>
  );
}
