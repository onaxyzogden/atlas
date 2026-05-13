/**
 * TreeRejectionToast — bottom-centre pill that surfaces spacing-snap
 * rejection reasons emitted by `useContinuousPointDrawTool` via the
 * `'plan:tree-rejected'` window CustomEvent. Auto-dismisses after 1.5s;
 * a fresh rejection resets the timer and replaces the message.
 */

import { useEffect, useState } from 'react';

const DISMISS_MS = 1500;

interface RejectionDetail {
  reason: string;
}

export default function TreeRejectionToast() {
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<RejectionDetail>).detail;
      if (!detail?.reason) return;
      setReason(detail.reason);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setReason(null), DISMISS_MS);
    };
    window.addEventListener('plan:tree-rejected', handler);
    return () => {
      window.removeEventListener('plan:tree-rejected', handler);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!reason) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 88,
        transform: 'translateX(-50%)',
        background: 'rgba(138, 79, 58, 0.94)',
        color: '#fdf6ec',
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
      {reason}
    </div>
  );
}
