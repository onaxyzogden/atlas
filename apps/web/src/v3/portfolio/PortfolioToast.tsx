/**
 * PortfolioToast — bottom-centre pill for Portfolio Home (§5) feedback.
 *
 * No global toast store exists in this app; this mirrors the established
 * `PlanStampToast` CustomEvent idiom. Any caller dispatches a `portfolio:toast`
 * window event (via the exported `emitPortfolioToast` helper) and this single
 * mounted listener renders the pill. Auto-dismisses after 2.6s; a fresh event
 * resets the timer and replaces the message.
 *
 * Primary use: surfacing cross-project Link outcomes (success / 409 duplicate /
 * 403 permission / 404 unsynced / generic) that were previously swallowed by an
 * empty `.catch(() => {})` in PortfolioMapPage.
 */

import { useEffect, useState } from 'react';

const DISMISS_MS = 2600;

export type PortfolioToastTone = 'success' | 'error' | 'info';

export interface PortfolioToastDetail {
  message: string;
  tone?: PortfolioToastTone;
}

/** Dispatch a Portfolio toast from anywhere (no store wiring required). */
export function emitPortfolioToast(
  message: string,
  tone: PortfolioToastTone = 'info',
): void {
  window.dispatchEvent(
    new CustomEvent<PortfolioToastDetail>('portfolio:toast', {
      detail: { message, tone },
    }),
  );
}

interface ToastState {
  message: string;
  tone: PortfolioToastTone;
}

const TONE_BG: Record<PortfolioToastTone, string> = {
  success: 'rgba(58, 122, 73, 0.95)',
  error: 'rgba(138, 79, 58, 0.95)',
  info: 'rgba(38, 50, 56, 0.95)',
};

export default function PortfolioToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onToast = (ev: Event) => {
      const detail = (ev as CustomEvent<PortfolioToastDetail>).detail;
      if (!detail?.message) return;
      setToast({ message: detail.message, tone: detail.tone ?? 'info' });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToast(null), DISMISS_MS);
    };

    window.addEventListener('portfolio:toast', onToast);
    return () => {
      window.removeEventListener('portfolio:toast', onToast);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 96,
        transform: 'translateX(-50%)',
        background: TONE_BG[toast.tone],
        color: '#fdf6ec',
        padding: '9px 18px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 500,
        maxWidth: 'min(92vw, 460px)',
        textAlign: 'center',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {toast.message}
    </div>
  );
}
