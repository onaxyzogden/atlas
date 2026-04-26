/**
 * Scholar #UX (Phase C / #2) — Interactive layer legend popover.
 *
 * Anchored to the "Data layers: N/7" label on the suitability card.
 * Clicking opens a popover listing every Tier-1 layer with its status
 * dot + label, plus a compact summary of derived (Tier-3) analyses.
 * Replaces the tiny color-dot-only row which showed *what* but not
 * *which*. Click-outside and Escape close the popover.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { confidence, semantic } from '../../lib/tokens.js';
import s from './SiteIntelligencePanel.module.css';
import type { LayerCompletenessRow, Tier3Row } from './sections/ScoresAndFlagsSection.js';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface LayerLegendPopoverProps {
  layerCompleteness: LayerCompletenessRow[];
  tier3Status: Tier3Row[];
  /** Rendered trigger — receives click handler + aria attributes via
   *  the returned ReactNode. We render the trigger as part of the
   *  popover so click-outside detection can ignore the anchor cleanly. */
  children: (props: {
    onClick: () => void;
    'aria-expanded': boolean;
    'aria-haspopup': 'dialog';
  }) => React.ReactElement;
}

function statusDotColor(status: LayerCompletenessRow['status']): string {
  if (status === 'complete') return confidence.high;
  if (status === 'pending') return semantic.sidebarActive;
  return 'var(--color-panel-muted, #666)';
}

function statusLabel(status: LayerCompletenessRow['status']): string {
  switch (status) {
    case 'complete':    return 'Ready';
    case 'pending':     return 'Fetching';
    case 'failed':      return 'Failed';
    case 'unavailable': return 'Not available';
  }
}

export const LayerLegendPopover = memo(function LayerLegendPopover({
  layerCompleteness,
  tier3Status,
  children,
}: LayerLegendPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  const getFocusableElements = useCallback(() => {
    if (!panelRef.current) return [];
    return Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
  }, []);

  // Click-outside + Escape + Tab-cycle focus trap. Attached only while open.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'Tab') {
        const focusable = getFocusableElements();
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    const raf = requestAnimationFrame(() => {
      const focusable = getFocusableElements();
      if (focusable.length > 0) focusable[0]?.focus();
      else panelRef.current?.focus();
    });
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      previousFocusRef.current?.focus();
    };
  }, [open, getFocusableElements]);

  const derivedComplete = tier3Status.filter((t) => t.status === 'complete').length;

  return (
    <span ref={wrapRef} className={s.legendAnchor}>
      {children({ onClick: toggle, 'aria-expanded': open, 'aria-haspopup': 'dialog' })}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Data layer legend"
          tabIndex={-1}
          className={s.legendPopover}
        >
          <div className={s.legendHeader}>Data layer status</div>
          <ul className={s.legendList}>
            {layerCompleteness.map((row) => (
              <li key={row.type} className={s.legendRow}>
                <span
                  className={s.legendDot}
                  style={{ background: statusDotColor(row.status) }}
                  aria-hidden="true"
                />
                <span className={s.legendLabel}>{row.label}</span>
                <span className={s.legendStatus}>{statusLabel(row.status)}</span>
              </li>
            ))}
          </ul>
          {tier3Status.length > 0 && (
            <>
              <div className={s.legendDivider} />
              <div className={s.legendHeader}>Derived analyses</div>
              <ul className={s.legendList}>
                {tier3Status.map((t) => (
                  <li key={t.label} className={s.legendRow}>
                    <span
                      className={s.legendDot}
                      style={{
                        background:
                          t.status === 'complete'
                            ? confidence.high
                            : t.status === 'computing'
                              ? semantic.sidebarActive
                              : 'var(--color-panel-muted, #666)',
                      }}
                      aria-hidden="true"
                    />
                    <span className={s.legendLabel}>{t.label}</span>
                    <span className={s.legendStatus}>
                      {t.status === 'complete'
                        ? 'Ready'
                        : t.status === 'computing'
                          ? 'Computing'
                          : t.blockedBy
                            ? `Awaiting ${t.blockedBy}`
                            : 'Waiting'}
                    </span>
                  </li>
                ))}
              </ul>
              <div className={s.legendFootnote}>
                {derivedComplete}/{tier3Status.length} derived analyses ready
              </div>
            </>
          )}
          <button type="button" className={s.legendClose} onClick={close}>
            Close
          </button>
        </div>
      )}
    </span>
  );
});
